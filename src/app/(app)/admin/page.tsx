import { getRequiredSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const session = await getRequiredSession();

  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [memberCount, roomCount, recentSyncs] = await Promise.all([
    prisma.user.count({ where: { orgId: session.orgId } }),
    prisma.room.count({
      where: {
        orgId: session.orgId,
        startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.syncLog.findMany({
      where: { orgId: session.orgId },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
  ]);

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: {
      name: true,
      domain: true,
      encryptedGoogleServiceAccount: true,
    },
  });

  return (
    <AdminDashboard
      stats={{
        memberCount,
        roomCount,
        hasServiceAccount: !!org?.encryptedGoogleServiceAccount,
        orgName: org?.name ?? "",
        domain: org?.domain ?? "",
      }}
      recentSyncs={recentSyncs.map((s) => ({
        id: s.id,
        syncType: s.syncType,
        status: s.status,
        errorMessage: s.errorMessage,
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
      }))}
    />
  );
}
