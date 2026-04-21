import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
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

  const { name } = await req.json();

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { name },
    select: {
      id: true,
      name: true,
      domain: true,
      delegatedUser: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(org);
}
