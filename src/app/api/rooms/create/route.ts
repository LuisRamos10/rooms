import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent, checkConflicts } from "@/lib/google/scheduling";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, startTime, endTime, attendeeEmails, description, skipConflictCheck } = body;

  if (!title || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Title, start time, and end time are required" },
      { status: 400 }
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  const emails: string[] = attendeeEmails ?? [];

  if (!skipConflictCheck && emails.length > 0) {
    const conflicts = await checkConflicts(session.orgId, emails, start, end);
    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: "Conflicts detected", conflicts },
        { status: 409 }
      );
    }
  }

  try {
    const result = await createCalendarEvent(session.orgId, {
      title,
      startTime: start,
      endTime: end,
      attendeeEmails: emails,
      description,
    });

    const room = await prisma.room.create({
      data: {
        orgId: session.orgId,
        title,
        meetLink: result.meetLink,
        calendarEventId: result.eventId,
        startTime: start,
        endTime: end,
        status: start <= new Date() ? "ACTIVE" : "SCHEDULED",
        createdById: session.user.id,
        syncedAt: new Date(),
      },
    });

    for (const email of emails) {
      await prisma.roomParticipant.create({
        data: {
          roomId: room.id,
          userEmail: email,
          displayName: email,
          isActive: false,
        },
      });
    }

    return NextResponse.json({
      room,
      meetLink: result.meetLink,
      htmlLink: result.htmlLink,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create room" },
      { status: 500 }
    );
  }
}
