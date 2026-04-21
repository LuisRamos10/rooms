import { getRequiredSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await getRequiredSession();

  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: {
      id: true,
      name: true,
      domain: true,
      encryptedGoogleServiceAccount: true,
      delegatedUser: true,
      createdAt: true,
    },
  });

  if (!org) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization&apos;s configuration
        </p>
      </div>

      <SettingsForm
        org={{
          id: org.id,
          name: org.name,
          domain: org.domain,
          hasServiceAccount: !!org.encryptedGoogleServiceAccount,
          delegatedUser: org.delegatedUser ?? "",
        }}
      />
    </div>
  );
}
