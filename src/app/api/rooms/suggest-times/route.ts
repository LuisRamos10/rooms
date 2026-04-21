import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { suggestOpenSlots } from "@/lib/google/scheduling";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { attendeeEmails, durationMinutes, date } = await req.json();

  if (!attendeeEmails?.length || !durationMinutes) {
    return NextResponse.json(
      { error: "Attendee emails and duration are required" },
      { status: 400 }
    );
  }

  try {
    const slots = await suggestOpenSlots(
      session.orgId,
      attendeeEmails,
      durationMinutes,
      date ? new Date(date) : new Date(),
      3
    );

    return NextResponse.json({
      suggestions: slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to suggest times" },
      { status: 500 }
    );
  }
}
