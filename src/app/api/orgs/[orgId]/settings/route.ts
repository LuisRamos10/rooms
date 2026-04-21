import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";

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

  const { serviceAccountKey } = await req.json();

  if (!serviceAccountKey) {
    return NextResponse.json(
      { error: "Service account key is required" },
      { status: 400 }
    );
  }

  try {
    JSON.parse(serviceAccountKey);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON for service account key" },
      { status: 400 }
    );
  }

  const encryptedKey = encrypt(serviceAccountKey);

  await prisma.organization.update({
    where: { id: orgId },
    data: { encryptedGoogleServiceAccount: encryptedKey },
  });

  return NextResponse.json({ success: true });
}

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

  const { delegatedUser } = await req.json();

  if (!delegatedUser) {
    return NextResponse.json({ error: "Delegated user email is required" }, { status: 400 });
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { delegatedUser },
  });

  return NextResponse.json({ success: true });
}
