import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

async function getCalendarClientForOrg(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { encryptedGoogleServiceAccount: true, domain: true, delegatedUser: true },
  });

  if (!org?.encryptedGoogleServiceAccount) {
    throw new Error("Organization has no Google service account configured");
  }

  const keyJson = JSON.parse(decrypt(org.encryptedGoogleServiceAccount));
  const subject = org.delegatedUser ?? keyJson.delegated_user ?? `admin@${org.domain}`;

  const auth = new google.auth.JWT({
    email: keyJson.client_email,
    key: keyJson.private_key,
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    subject,
  });

  return google.calendar({ version: "v3", auth });
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface ConflictInfo {
  email: string;
  displayName?: string;
  conflicts: Array<{
    title: string;
    start: string;
    end: string;
  }>;
}

export async function checkConflicts(
  orgId: string,
  attendeeEmails: string[],
  startTime: Date,
  endTime: Date
): Promise<ConflictInfo[]> {
  const calendar = await getCalendarClientForOrg(orgId);

  const freeBusyResponse = await calendar.freebusy.query({
    requestBody: {
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      items: attendeeEmails.map((email) => ({ id: email })),
    },
  });

  const conflicts: ConflictInfo[] = [];
  const calendars = freeBusyResponse.data.calendars ?? {};

  for (const email of attendeeEmails) {
    const calData = calendars[email];
    if (calData?.busy && calData.busy.length > 0) {
      conflicts.push({
        email,
        conflicts: calData.busy.map((slot) => ({
          title: "Busy",
          start: slot.start ?? "",
          end: slot.end ?? "",
        })),
      });
    }
  }

  return conflicts;
}

export async function suggestOpenSlots(
  orgId: string,
  attendeeEmails: string[],
  desiredDurationMinutes: number,
  searchDate: Date,
  count: number = 3
): Promise<TimeSlot[]> {
  const calendar = await getCalendarClientForOrg(orgId);

  const dayStart = new Date(searchDate);
  dayStart.setHours(9, 0, 0, 0);
  const dayEnd = new Date(searchDate);
  dayEnd.setHours(18, 0, 0, 0);

  const freeBusyResponse = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      items: attendeeEmails.map((email) => ({ id: email })),
    },
  });

  const allBusySlots: TimeSlot[] = [];
  const calendars = freeBusyResponse.data.calendars ?? {};

  for (const email of attendeeEmails) {
    const calData = calendars[email];
    if (calData?.busy) {
      for (const slot of calData.busy) {
        allBusySlots.push({
          start: new Date(slot.start!),
          end: new Date(slot.end!),
        });
      }
    }
  }

  allBusySlots.sort((a, b) => a.start.getTime() - b.start.getTime());

  const mergedBusy: TimeSlot[] = [];
  for (const slot of allBusySlots) {
    const last = mergedBusy[mergedBusy.length - 1];
    if (last && slot.start <= last.end) {
      last.end = new Date(Math.max(last.end.getTime(), slot.end.getTime()));
    } else {
      mergedBusy.push({ start: new Date(slot.start), end: new Date(slot.end) });
    }
  }

  const durationMs = desiredDurationMinutes * 60 * 1000;
  const suggestions: TimeSlot[] = [];

  let cursor = new Date(Math.max(dayStart.getTime(), Date.now()));
  if (cursor.getMinutes() % 15 !== 0) {
    cursor.setMinutes(Math.ceil(cursor.getMinutes() / 15) * 15, 0, 0);
  }

  for (const busy of mergedBusy) {
    if (suggestions.length >= count) break;

    if (busy.start.getTime() - cursor.getTime() >= durationMs) {
      suggestions.push({
        start: new Date(cursor),
        end: new Date(cursor.getTime() + durationMs),
      });
    }

    cursor = new Date(Math.max(cursor.getTime(), busy.end.getTime()));
    if (cursor.getMinutes() % 15 !== 0) {
      cursor.setMinutes(Math.ceil(cursor.getMinutes() / 15) * 15, 0, 0);
    }
  }

  if (suggestions.length < count && dayEnd.getTime() - cursor.getTime() >= durationMs) {
    suggestions.push({
      start: new Date(cursor),
      end: new Date(cursor.getTime() + durationMs),
    });
  }

  return suggestions.slice(0, count);
}

export async function createCalendarEvent(
  orgId: string,
  params: {
    title: string;
    startTime: Date;
    endTime: Date;
    attendeeEmails: string[];
    description?: string;
  }
) {
  const calendar = await getCalendarClientForOrg(orgId);

  const event = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: {
      summary: params.title,
      description: params.description,
      start: { dateTime: params.startTime.toISOString() },
      end: { dateTime: params.endTime.toISOString() },
      attendees: params.attendeeEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `rooms-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return {
    eventId: event.data.id!,
    meetLink: event.data.hangoutLink ?? event.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video"
    )?.uri ?? null,
    htmlLink: event.data.htmlLink,
  };
}
