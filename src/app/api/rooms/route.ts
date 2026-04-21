import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const rooms = await prisma.room.findMany({
    where: {
      orgId: session.orgId,
      startTime: { gte: startOfDay },
      endTime: { lte: endOfDay },
    },
    include: {
      participants: {
        select: {
          id: true,
          userEmail: true,
          displayName: true,
          avatarUrl: true,
          isActive: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const orgUsers = await prisma.user.findMany({
    where: { orgId: session.orgId },
    select: { email: true, name: true, avatarUrl: true },
  });

  const userMap = new Map(orgUsers.map((u) => [u.email, u]));

  const enrichedRooms = rooms.map((room) => ({
    ...room,
    participants: room.participants.map((p) => {
      const orgUser = userMap.get(p.userEmail);
      return {
        ...p,
        displayName: orgUser?.name ?? p.displayName ?? p.userEmail.split("@")[0],
        avatarUrl: orgUser?.avatarUrl ?? p.avatarUrl,
      };
    }),
  }));

  return NextResponse.json(enrichedRooms);
}
