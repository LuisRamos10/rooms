"use client";

import { usePeople } from "@/hooks/use-people";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export function PeopleList() {
  const { data: people, isLoading, error } = usePeople();

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-destructive/30 text-destructive">
        <p className="text-sm">Failed to load people.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const inRoom = people?.filter((p) => p.currentRoom) ?? [];
  const available = people?.filter((p) => !p.currentRoom) ?? [];

  return (
    <div className="space-y-6">
      {inRoom.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            In a room ({inRoom.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {inRoom.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Available ({available.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {available.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      </section>

      {(!people || people.length === 0) && (
        <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground">
          <p className="text-sm">People will appear here as they sign in</p>
        </div>
      )}
    </div>
  );
}

function PersonCard({ person }: { person: ReturnType<typeof usePeople>["data"] extends (infer T)[] | undefined ? T : never }) {
  if (!person) return null;

  const initials = person.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <div className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={person.avatarUrl ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {person.currentRoom && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{person.name}</p>
        <p className="truncate text-xs text-muted-foreground">{person.email}</p>
        {person.currentRoom && (
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] font-normal truncate max-w-[150px]">
              {person.currentRoom.roomTitle}
            </Badge>
            {person.currentRoom.meetLink && (
              <Link href={person.currentRoom.meetLink} target="_blank">
                <Button size="xs" variant="ghost" className="h-5 text-[10px]">
                  Join
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
