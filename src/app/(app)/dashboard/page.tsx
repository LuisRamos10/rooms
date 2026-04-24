import { getRequiredSession } from "@/lib/session";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const session = await getRequiredSession();

  return (
    <DashboardView
      orgName={session.orgName ?? "your organization"}
      userName={session.user?.name ?? "User"}
      userImage={session.user?.image}
    />
  );
}
