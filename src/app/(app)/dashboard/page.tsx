import { getRequiredSession } from "@/lib/session";
import { RoomsDashboard } from "@/components/rooms/rooms-dashboard";
import { CreateRoomDialog } from "@/components/rooms/create-room-dialog";

export default async function DashboardPage() {
  const session = await getRequiredSession();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground">
            Today&apos;s meetings at {session.orgName ?? "your organization"}
          </p>
        </div>
        <CreateRoomDialog />
      </div>

      <RoomsDashboard />
    </div>
  );
}
