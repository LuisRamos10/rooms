import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

async function getMeetClient(orgId: string) {
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
    scopes: ["https://www.googleapis.com/auth/meetings.space.readonly"],
    subject,
  });

  return auth;
}

interface ConferenceRecord {
  name: string;
  startTime: string;
  endTime?: string;
  space: string;
}

interface Participant {
  name: string;
  earliestStartTime: string;
  latestEndTime?: string;
  signedinUser?: {
    user: string;
    displayName: string;
  };
  anonymousUser?: {
    displayName: string;
  };
  phoneUser?: {
    displayName: string;
  };
}

interface SpaceInfo {
  name: string;
  meetingUri?: string;
  meetingCode?: string;
}

const MEET_API_BASE = "https://meet.googleapis.com/v2";

async function fetchWithAuth(auth: InstanceType<typeof google.auth.JWT>, url: string) {
  const token = await auth.getAccessToken();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token.token}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Meet API error (${response.status}): ${text}`);
  }
  return response.json();
}

export async function fetchActiveConferenceRecords(orgId: string): Promise<ConferenceRecord[]> {
  const auth = await getMeetClient(orgId);
  const data = await fetchWithAuth(auth, `${MEET_API_BASE}/conferenceRecords?filter=end_time%20IS%20NULL`);
  return data.conferenceRecords ?? [];
}

async function fetchSpaceInfo(auth: InstanceType<typeof google.auth.JWT>, spaceName: string): Promise<SpaceInfo | null> {
  try {
    return await fetchWithAuth(auth, `${MEET_API_BASE}/${spaceName}`);
  } catch {
    return null;
  }
}

async function fetchConferenceRecord(auth: InstanceType<typeof google.auth.JWT>, recordName: string): Promise<ConferenceRecord | null> {
  try {
    return await fetchWithAuth(auth, `${MEET_API_BASE}/${recordName}`);
  } catch {
    return null;
  }
}

export async function fetchParticipantsForRecord(
  orgId: string,
  conferenceRecordName: string
): Promise<Participant[]> {
  const auth = await getMeetClient(orgId);
  const allParticipants: Participant[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${MEET_API_BASE}/${conferenceRecordName}/participants`);
    url.searchParams.set("filter", "latest_end_time IS NULL");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const data = await fetchWithAuth(auth, url.toString());
    allParticipants.push(...(data.participants ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allParticipants;
}

function extractMeetCodeFromUrl(meetLink: string): string | null {
  const match = meetLink.match(/meet\.google\.com\/([a-z]+-[a-z]+-[a-z]+)/i);
  return match ? match[1] : null;
}

function getParticipantEmail(participant: Participant): string | null {
  if (participant.signedinUser?.user) {
    const match = participant.signedinUser.user.match(/users\/(.+)/);
    return match ? match[1] : null;
  }
  return null;
}

function getParticipantDisplayName(participant: Participant): string {
  return (
    participant.signedinUser?.displayName ??
    participant.anonymousUser?.displayName ??
    participant.phoneUser?.displayName ??
    "Unknown"
  );
}

export async function syncMeetParticipantsForOrg(orgId: string) {
  const syncLog = await prisma.syncLog.create({
    data: { orgId, syncType: "MEET", status: "RUNNING" },
  });

  try {
    const auth = await getMeetClient(orgId);
    const conferenceRecords = await fetchActiveConferenceRecords(orgId);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todaysRooms = await prisma.room.findMany({
      where: {
        orgId,
        meetLink: { not: null },
        startTime: { gte: startOfDay },
      },
    });
    const activeRooms = todaysRooms;

    const roomByMeetCode = new Map<string, typeof activeRooms[number]>();
    for (const room of activeRooms) {
      if (room.meetLink) {
        const code = extractMeetCodeFromUrl(room.meetLink);
        if (code) roomByMeetCode.set(code, room);
      }
    }

    let matched = 0;
    const liveRoomIds = new Set<string>();

    for (const record of conferenceRecords) {
      const spaceInfo = await fetchSpaceInfo(auth, record.space);
      if (!spaceInfo) continue;

      const meetCode = spaceInfo.meetingCode ?? (spaceInfo.meetingUri ? extractMeetCodeFromUrl(spaceInfo.meetingUri) : null);
      if (!meetCode) continue;

      const matchingRoom = roomByMeetCode.get(meetCode);
      if (!matchingRoom) continue;

      matched++;
      liveRoomIds.add(matchingRoom.id);

      await prisma.room.update({
        where: { id: matchingRoom.id },
        data: {
          conferenceRecordId: matchingRoom.conferenceRecordId ?? record.name,
          status: "ACTIVE",
        },
      });

      const participants = await fetchParticipantsForRecord(orgId, record.name);

      await prisma.roomParticipant.updateMany({
        where: { roomId: matchingRoom.id, isActive: true },
        data: { isActive: false, leaveTime: now },
      });

      for (const participant of participants) {
        const email = getParticipantEmail(participant);
        const displayName = getParticipantDisplayName(participant);

        if (email) {
          const existing = await prisma.roomParticipant.findFirst({
            where: { roomId: matchingRoom.id, userEmail: email },
          });

          if (existing) {
            await prisma.roomParticipant.update({
              where: { id: existing.id },
              data: {
                isActive: true,
                displayName,
                joinTime: existing.joinTime ?? new Date(participant.earliestStartTime),
                leaveTime: null,
              },
            });
          } else {
            await prisma.roomParticipant.create({
              data: {
                roomId: matchingRoom.id,
                userEmail: email,
                displayName,
                isActive: true,
                joinTime: new Date(participant.earliestStartTime),
              },
            });
          }
        } else {
          await prisma.roomParticipant.create({
            data: {
              roomId: matchingRoom.id,
              userEmail: `anonymous-${Date.now()}@meet`,
              displayName,
              isActive: true,
              joinTime: new Date(participant.earliestStartTime),
            },
          });
        }
      }

      await prisma.room.update({
        where: { id: matchingRoom.id },
        data: { syncedAt: now },
      });
    }

    const roomsToCheck = todaysRooms.filter(
      (r) => !liveRoomIds.has(r.id) && r.conferenceRecordId
    );

    for (const room of roomsToCheck) {
      const record = await fetchConferenceRecord(auth, room.conferenceRecordId!);

      if (record && !record.endTime) continue;

      const leaveTime = record?.endTime ? new Date(record.endTime) : now;

      await prisma.roomParticipant.updateMany({
        where: { roomId: room.id, isActive: true },
        data: { isActive: false, leaveTime },
      });

      await prisma.room.update({
        where: { id: room.id },
        data: { status: "ENDED", syncedAt: now },
      });
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "SUCCESS", completedAt: new Date() },
    });

    return { success: true, recordsProcessed: conferenceRecords.length, roomsMatched: matched };
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

export async function syncMeetAllOrganizations() {
  const orgs = await prisma.organization.findMany({
    where: {
      encryptedGoogleServiceAccount: { not: null },
    },
    select: { id: true, name: true },
  });

  const results = await Promise.allSettled(
    orgs.map((org) => syncMeetParticipantsForOrg(org.id))
  );

  return orgs.map((org, i) => ({
    orgId: org.id,
    orgName: org.name,
    status: results[i].status,
    error: results[i].status === "rejected" ? (results[i] as PromiseRejectedResult).reason : null,
  }));
}
