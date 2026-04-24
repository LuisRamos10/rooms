import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const rooms = await prisma.room.findMany({
    where: { startTime: { gte: startOfDay } },
    select: {
      id: true,
      title: true,
      status: true,
      meetLink: true,
      _count: { select: { participants: { where: { isActive: true } } } },
    },
    orderBy: { startTime: "asc" },
    take: 30,
  });

  return NextResponse.json({
    total: rooms.length,
    byStatus: {
      active: rooms.filter((r) => r.status === "ACTIVE").length,
      scheduled: rooms.filter((r) => r.status === "SCHEDULED").length,
      ended: rooms.filter((r) => r.status === "ENDED").length,
    },
    rooms: rooms.map((r) => ({
      title: r.title,
      status: r.status,
      activeParticipants: r._count.participants,
      hasMeetLink: !!r.meetLink,
    })),
  });
}
