import { prisma } from "@/lib/prisma";
import { fetchTodaysEvents, getMeetLinkFromEvent, getEventStatus } from "./calendar";
import type { RoomStatus } from "@/generated/prisma/client";

export async function syncCalendarForOrg(orgId: string) {
  const syncLog = await prisma.syncLog.create({
    data: { orgId, syncType: "CALENDAR", status: "RUNNING" },
  });

  try {
    const events = await fetchTodaysEvents(orgId);

    for (const event of events) {
      if (!event.id) continue;

      const meetLink = getMeetLinkFromEvent(event);
      const calendarStatus = getEventStatus(event) as RoomStatus;
      const startTime = new Date(event.start?.dateTime ?? event.start?.date ?? new Date());
      const endTime = new Date(event.end?.dateTime ?? event.end?.date ?? new Date());
      const title = event.summary ?? "Untitled Meeting";

      const existingRoom = await prisma.room.findUnique({
        where: { orgId_calendarEventId: { orgId, calendarEventId: event.id } },
        select: { status: true },
      });

      const status = existingRoom?.status === "ACTIVE" && calendarStatus === "ENDED"
        ? "ACTIVE" as RoomStatus
        : calendarStatus;

      await prisma.room.upsert({
        where: {
          orgId_calendarEventId: {
            orgId,
            calendarEventId: event.id,
          },
        },
        update: {
          title,
          meetLink,
          startTime,
          endTime,
          status,
          syncedAt: new Date(),
        },
        create: {
          orgId,
          calendarEventId: event.id,
          title,
          meetLink,
          startTime,
          endTime,
          status: calendarStatus,
          syncedAt: new Date(),
        },
      });

      const attendees = event.attendees ?? [];
      for (const attendee of attendees) {
        if (!attendee.email) continue;

        const existingRoom = await prisma.room.findUnique({
          where: {
            orgId_calendarEventId: {
              orgId,
              calendarEventId: event.id,
            },
          },
        });

        if (!existingRoom) continue;

        const existing = await prisma.roomParticipant.findFirst({
          where: {
            roomId: existingRoom.id,
            userEmail: attendee.email,
          },
        });

        if (!existing) {
          await prisma.roomParticipant.create({
            data: {
              roomId: existingRoom.id,
              userEmail: attendee.email,
              displayName: attendee.displayName ?? attendee.email,
              isActive: false,
            },
          });
        }
      }
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const calendarEventIds = events.map((e) => e.id).filter(Boolean) as string[];

    if (calendarEventIds.length > 0) {
      const staleRooms = await prisma.room.findMany({
        where: {
          orgId,
          calendarEventId: { notIn: calendarEventIds },
          conferenceRecordId: null,
          startTime: { gte: startOfDay },
          status: { not: "ENDED" },
        },
        select: { id: true },
      });

      if (staleRooms.length > 0) {
        const staleIds = staleRooms.map((r) => r.id);
        await prisma.room.updateMany({
          where: { id: { in: staleIds } },
          data: { status: "ENDED" },
        });
      }
    }

    const pastEndRooms = await prisma.room.findMany({
      where: {
        orgId,
        startTime: { gte: startOfDay },
        endTime: { lte: now },
        conferenceRecordId: null,
        status: { not: "ENDED" },
      },
      select: { id: true },
    });

    if (pastEndRooms.length > 0) {
      const pastEndIds = pastEndRooms.map((r) => r.id);
      await prisma.room.updateMany({
        where: { id: { in: pastEndIds } },
        data: { status: "ENDED" },
      });
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "SUCCESS", completedAt: new Date() },
    });

    return { success: true, roomsSynced: events.length };
  } catch (error) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

export async function syncAllOrganizations() {
  const orgs = await prisma.organization.findMany({
    where: {
      encryptedGoogleServiceAccount: { not: null },
    },
    select: { id: true, name: true },
  });

  const results = await Promise.allSettled(
    orgs.map((org) => syncCalendarForOrg(org.id))
  );

  return orgs.map((org, i) => ({
    orgId: org.id,
    orgName: org.name,
    status: results[i].status,
    error: results[i].status === "rejected" ? (results[i] as PromiseRejectedResult).reason : null,
  }));
}
