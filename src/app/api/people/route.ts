import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { orgId: session.orgId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
    },
  });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const activeParticipants = await prisma.roomParticipant.findMany({
    where: {
      isActive: true,
      room: {
        orgId: session.orgId,
        status: "ACTIVE",
        startTime: { gte: startOfDay },
      },
    },
    include: {
      room: {
        select: {
          id: true,
          title: true,
          meetLink: true,
        },
      },
    },
  });

  const emailToRoom = new Map<string, { roomId: string; roomTitle: string; meetLink: string | null }>();
  for (const p of activeParticipants) {
    emailToRoom.set(p.userEmail, {
      roomId: p.room.id,
      roomTitle: p.room.title,
      meetLink: p.room.meetLink,
    });
  }

  const enrichedUsers = users.map((user) => ({
    ...user,
    currentRoom: emailToRoom.get(user.email) ?? null,
  }));

  return NextResponse.json(enrichedUsers);
}
