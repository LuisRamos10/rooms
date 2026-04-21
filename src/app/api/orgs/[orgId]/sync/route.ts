import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncCalendarForOrg } from "@/lib/google/sync-calendar";
import { syncMeetParticipantsForOrg } from "@/lib/google/meet";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  if (session.orgId !== orgId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};

  try {
    results.calendar = await syncCalendarForOrg(orgId);
  } catch (error) {
    results.calendar = { error: error instanceof Error ? error.message : String(error) };
  }

  try {
    results.meet = await syncMeetParticipantsForOrg(orgId);
  } catch (error) {
    results.meet = { error: error instanceof Error ? error.message : String(error) };
  }

  const hasError = Object.values(results).some(
    (r) => r && typeof r === "object" && "error" in r
  );

  return NextResponse.json(
    { results },
    { status: hasError ? 207 : 200 }
  );
}
