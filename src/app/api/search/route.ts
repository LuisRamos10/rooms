import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ rooms: [], people: [] });
  }

  const [rooms, people] = await Promise.all([
    prisma.room.findMany({
      where: {
        orgId: session.orgId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          {
            participants: {
              some: {
                OR: [
                  { displayName: { contains: query, mode: "insensitive" } },
                  { userEmail: { contains: query, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      },
      include: {
        participants: {
          where: { isActive: true },
          select: { displayName: true, userEmail: true, avatarUrl: true },
          take: 5,
        },
      },
      orderBy: { startTime: "desc" },
      take: 10,
    }),
    prisma.user.findMany({
      where: {
        orgId: session.orgId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
      take: 10,
    }),
  ]);

  return NextResponse.json({ rooms, people });
}
