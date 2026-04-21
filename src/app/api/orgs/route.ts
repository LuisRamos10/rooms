import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, domain } = await req.json();

  if (!name || !domain) {
    return NextResponse.json(
      { error: "Name and domain are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.organization.findUnique({
    where: { domain },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Organization with this domain already exists" },
      { status: 409 }
    );
  }

  const org = await prisma.organization.create({
    data: { name, domain },
  });

  return NextResponse.json(org, { status: 201 });
}
