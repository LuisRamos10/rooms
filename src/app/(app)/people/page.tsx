import { getRequiredSession } from "@/lib/session";
import { PeopleList } from "@/components/people/people-list";

export default async function PeoplePage() {
  await getRequiredSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">People</h1>
        <p className="text-muted-foreground">
          See who&apos;s in which room right now
        </p>
      </div>

      <PeopleList />
    </div>
  );
}
