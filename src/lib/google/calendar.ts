import { google, type calendar_v3 } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

function getServiceAccountCredentials(keyJson: Record<string, string>) {
  return {
    client_email: keyJson.client_email,
    private_key: keyJson.private_key,
    project_id: keyJson.project_id,
  };
}

async function getOrgCredentials(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { encryptedGoogleServiceAccount: true, domain: true, delegatedUser: true },
  });

  if (!org?.encryptedGoogleServiceAccount) {
    throw new Error("Organization has no Google service account configured");
  }

  const keyJson = JSON.parse(decrypt(org.encryptedGoogleServiceAccount));
  const delegatedUser = org.delegatedUser ?? keyJson.delegated_user ?? `admin@${org.domain}`;
  return { keyJson, domain: org.domain, delegatedUser };
}

function createAuthForUser(keyJson: Record<string, string>, userEmail: string) {
  return new google.auth.JWT({
    email: keyJson.client_email,
    key: keyJson.private_key,
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    subject: userEmail,
  });
}

export async function getCalendarClient(orgId: string) {
  const { keyJson, delegatedUser } = await getOrgCredentials(orgId);
  const auth = createAuthForUser(keyJson, delegatedUser);
  return google.calendar({ version: "v3", auth });
}

interface OrgUser {
  email: string;
  name: string;
  photoUrl: string | null;
}

async function listOrgUsers(keyJson: Record<string, string>, domain: string, delegatedUser: string): Promise<OrgUser[]> {
  const auth = new google.auth.JWT({
    email: keyJson.client_email,
    key: keyJson.private_key,
    scopes: ["https://www.googleapis.com/auth/admin.directory.user.readonly"],
    subject: delegatedUser,
  });

  const admin = google.admin({ version: "directory_v1", auth });
  const users: OrgUser[] = [];
  let pageToken: string | undefined;

  do {
    const res = await admin.users.list({
      domain,
      maxResults: 200,
      pageToken,
      fields: "users(primaryEmail,name,thumbnailPhotoUrl),nextPageToken",
    });
    for (const user of res.data.users ?? []) {
      if (user.primaryEmail) {
        users.push({
          email: user.primaryEmail,
          name: user.name?.fullName ?? user.primaryEmail.split("@")[0],
          photoUrl: user.thumbnailPhotoUrl ?? null,
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return users;
}

async function fetchEventsForUser(
  keyJson: Record<string, string>,
  userEmail: string,
  startOfDay: Date,
  endOfDay: Date
): Promise<calendar_v3.Schema$Event[]> {
  try {
    const auth = createAuthForUser(keyJson, userEmail);
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    return (response.data.items ?? []).filter(
      (event) => event.conferenceData?.conferenceId || event.hangoutLink
    );
  } catch {
    return [];
  }
}

export async function fetchTodaysEvents(
  orgId: string
): Promise<calendar_v3.Schema$Event[]> {
  const { keyJson, domain, delegatedUser } = await getOrgCredentials(orgId);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const orgUsers = await listOrgUsers(keyJson, domain, delegatedUser);

  for (const u of orgUsers) {
    await prisma.roomParticipant.updateMany({
      where: { userEmail: u.email, avatarUrl: null },
      data: { avatarUrl: u.photoUrl, displayName: u.name },
    });
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (org) {
    for (const u of orgUsers) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (existing) {
        if (!existing.avatarUrl || !existing.name) {
          await prisma.user.update({
            where: { email: u.email },
            data: {
              avatarUrl: existing.avatarUrl ?? u.photoUrl,
              name: existing.name ?? u.name,
            },
          });
        }
      }
    }
  }

  const allEvents: calendar_v3.Schema$Event[] = [];
  const seenEventIds = new Set<string>();

  const batchSize = 10;
  for (let i = 0; i < orgUsers.length; i += batchSize) {
    const batch = orgUsers.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((u) => fetchEventsForUser(keyJson, u.email, startOfDay, endOfDay))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const event of result.value) {
          const dedupeKey = event.conferenceData?.conferenceId ?? event.id;
          if (dedupeKey && !seenEventIds.has(dedupeKey)) {
            seenEventIds.add(dedupeKey);
            allEvents.push(event);
          }
        }
      }
    }
  }

  return allEvents;
}

export function getMeetLinkFromEvent(event: calendar_v3.Schema$Event): string | null {
  if (event.hangoutLink) return event.hangoutLink;

  const entryPoint = event.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === "video"
  );
  return entryPoint?.uri ?? null;
}

export function getEventStatus(event: calendar_v3.Schema$Event): "SCHEDULED" | "ACTIVE" | "ENDED" {
  const now = new Date();
  const start = new Date(event.start?.dateTime ?? event.start?.date ?? now);
  const end = new Date(event.end?.dateTime ?? event.end?.date ?? now);

  if (now < start) return "SCHEDULED";
  if (now >= start && now < end) return "ACTIVE";
  return "ENDED";
}
