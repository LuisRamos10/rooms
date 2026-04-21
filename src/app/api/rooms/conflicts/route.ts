import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkConflicts } from "@/lib/google/scheduling";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { attendeeEmails, startTime, endTime } = await req.json();

  if (!attendeeEmails?.length || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Attendee emails, start time, and end time are required" },
      { status: 400 }
    );
  }

  try {
    const conflicts = await checkConflicts(
      session.orgId,
      attendeeEmails,
      new Date(startTime),
      new Date(endTime)
    );

    return NextResponse.json({ conflicts, hasConflicts: conflicts.length > 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check conflicts" },
      { status: 500 }
    );
  }
}
