"use client";

import { useState, useMemo } from "react";
import { useRooms, type Room } from "@/hooks/use-rooms";
import { RoomCard } from "./room-card";
import { RoomDetail } from "./room-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export function RoomsDashboard() {
  const { data: rooms, isLoading, error } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filter, setFilter] = useState("");

  const filteredRooms = useMemo(() => {
    if (!rooms) return [];
    if (!filter.trim()) return rooms;

    const q = filter.toLowerCase();
    return rooms.filter((room) =>
      room.title.toLowerCase().includes(q) ||
      room.participants.some(
        (p) =>
          (p.displayName ?? "").toLowerCase().includes(q) ||
          p.userEmail.toLowerCase().includes(q)
      )
    );
  }, [rooms, filter]);

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-destructive/30 text-destructive">
        <p className="text-sm">Failed to load rooms. Please try again later.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24" />
            <div className="flex justify-between pt-2">
              <div className="flex -space-x-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-7 w-7 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-7 w-14 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hasActivePeople = (r: Room) => r.participants.some((p) => p.isActive);
  const liveRooms = filteredRooms.filter(hasActivePeople);
  const liveIds = new Set(liveRooms.map((r) => r.id));
  const scheduledRooms = filteredRooms.filter((r) => !liveIds.has(r.id) && r.status === "SCHEDULED");
  const activeEmpty = filteredRooms.filter((r) => !liveIds.has(r.id) && r.status === "ACTIVE");
  const endedRooms = filteredRooms.filter((r) => !liveIds.has(r.id) && r.status === "ENDED");

  const hasRooms = (rooms?.length ?? 0) > 0;
  const hasResults = filteredRooms.length > 0;

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        {hasRooms && (
          <Input
            placeholder="Filter by person name, email, or room title..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
        )}

        {!hasRooms && (
          <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground">
            <div className="text-center">
              <p className="text-sm font-medium">No rooms yet</p>
              <p className="text-xs">
                Rooms will appear here once calendar sync is configured
              </p>
            </div>
          </div>
        )}

        {hasRooms && !hasResults && (
          <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground">
            <p className="text-sm">No rooms match &ldquo;{filter}&rdquo;</p>
          </div>
        )}

        {liveRooms.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live Now ({liveRooms.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {liveRooms.map((room) => (
                <RoomCard key={room.id} room={room} onSelect={setSelectedRoom} />
              ))}
            </div>
          </section>
        )}

        {activeEmpty.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              In Progress ({activeEmpty.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeEmpty.map((room) => (
                <RoomCard key={room.id} room={room} onSelect={setSelectedRoom} />
              ))}
            </div>
          </section>
        )}

        {scheduledRooms.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Upcoming ({scheduledRooms.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {scheduledRooms.map((room) => (
                <RoomCard key={room.id} room={room} onSelect={setSelectedRoom} />
              ))}
            </div>
          </section>
        )}

        {endedRooms.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Ended ({endedRooms.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {endedRooms.map((room) => (
                <RoomCard key={room.id} room={room} onSelect={setSelectedRoom} />
              ))}
            </div>
          </section>
        )}
      </div>

      {selectedRoom && (
        <aside className="hidden w-80 shrink-0 rounded-xl border bg-card p-4 xl:block">
          <RoomDetail
            room={selectedRoom}
            onClose={() => setSelectedRoom(null)}
          />
        </aside>
      )}
    </div>
  );
}
