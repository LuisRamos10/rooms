import { NextRequest, NextResponse } from "next/server";
import { syncMeetAllOrganizations } from "@/lib/google/meet";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await syncMeetAllOrganizations();
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Meet sync failed" },
      { status: 500 }
    );
  }
}
