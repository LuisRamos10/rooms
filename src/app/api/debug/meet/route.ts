import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findFirst({
    where: { encryptedGoogleServiceAccount: { not: null } },
    select: { id: true, encryptedGoogleServiceAccount: true, domain: true, delegatedUser: true },
  });

  if (!org?.encryptedGoogleServiceAccount) {
    return NextResponse.json({ error: "No service account" }, { status: 400 });
  }

  const keyJson = JSON.parse(decrypt(org.encryptedGoogleServiceAccount));
  const subject = org.delegatedUser ?? keyJson.delegated_user ?? `admin@${org.domain}`;

  const auth = new google.auth.JWT({
    email: keyJson.client_email,
    key: keyJson.private_key,
    scopes: ["https://www.googleapis.com/auth/meetings.space.readonly"],
    subject,
  });

  try {
    const token = await auth.getAccessToken();
    const headers = { Authorization: `Bearer ${token.token}` };

    const activeRes = await fetch(
      "https://meet.googleapis.com/v2/conferenceRecords?filter=end_time%20IS%20NULL",
      { headers }
    );
    const activeData = await activeRes.json();
    const records = activeData.conferenceRecords ?? [];

    const activeRooms = await prisma.room.findMany({
      where: { orgId: org.id, status: "ACTIVE", meetLink: { not: null } },
      select: { id: true, title: true, meetLink: true, conferenceRecordId: true },
    });

    const roomMeetCodes = activeRooms.map((r) => {
      const match = r.meetLink?.match(/meet\.google\.com\/([a-z]+-[a-z]+-[a-z]+)/i);
      return { ...r, meetCode: match ? match[1] : null };
    });

    const spaceDetails = [];
    for (const record of records) {
      let spaceInfo = null;
      try {
        const spaceRes = await fetch(`https://meet.googleapis.com/v2/${record.space}`, { headers });
        spaceInfo = await spaceRes.json();
      } catch {}

      const spaceMeetCode = spaceInfo?.meetingCode ??
        (spaceInfo?.meetingUri?.match(/meet\.google\.com\/([a-z]+-[a-z]+-[a-z]+)/i)?.[1]) ?? null;

      const matchedRoom = roomMeetCodes.find((r) => r.meetCode === spaceMeetCode);

      let participants = null;
      try {
        const partRes = await fetch(
          `https://meet.googleapis.com/v2/${record.name}/participants?filter=latest_end_time%20IS%20NULL`,
          { headers }
        );
        participants = await partRes.json();
      } catch {}

      spaceDetails.push({
        conferenceRecord: record.name,
        space: record.space,
        spaceInfo: { meetingCode: spaceInfo?.meetingCode, meetingUri: spaceInfo?.meetingUri },
        spaceMeetCode,
        matchedRoom: matchedRoom ? { id: matchedRoom.id, title: matchedRoom.title, meetCode: matchedRoom.meetCode } : null,
        activeParticipants: participants?.participants?.length ?? 0,
        participantDetails: (participants?.participants ?? []).map((p: Record<string, Record<string, string>>) => ({
          name: p.signedinUser?.displayName ?? p.anonymousUser?.displayName ?? "unknown",
          user: p.signedinUser?.user ?? null,
        })),
      });
    }

    return NextResponse.json({
      subject,
      activeConferenceRecordCount: records.length,
      activeRoomsInDb: roomMeetCodes,
      spaceDetails,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
