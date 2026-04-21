"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Room } from "@/hooks/use-rooms";

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: Room["status"]) {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "SCHEDULED":
      return "secondary";
    case "ENDED":
      return "outline";
  }
}

function getStatusLabel(status: Room["status"]) {
  switch (status) {
    case "ACTIVE":
      return "Live";
    case "SCHEDULED":
      return "Upcoming";
    case "ENDED":
      return "Ended";
  }
}

function getInitials(name: string) {
  return name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

interface RoomCardProps {
  room: Room;
  onSelect: (room: Room) => void;
}

export function RoomCard({ room, onSelect }: RoomCardProps) {
  const activeParticipants = room.participants.filter((p) => p.isActive);
  const totalInvited = room.participants.length;

  return (
    <div
      className="group cursor-pointer rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 flex flex-col"
      onClick={() => onSelect(room)}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight line-clamp-2">
          {room.title}
        </h3>
        <Badge variant={getStatusColor(room.status)} className="shrink-0">
          {room.status === "ACTIVE" && (
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
          {getStatusLabel(room.status)}
        </Badge>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {formatTime(room.startTime)} - {formatTime(room.endTime)}
      </p>

      <div className="mt-3 flex-1">
        {activeParticipants.length > 0 ? (
          <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              {activeParticipants.length} in room
            </p>
            {activeParticipants.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={p.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {getInitials(p.displayName ?? p.userEmail)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs truncate">
                  {p.displayName ?? p.userEmail.split("@")[0]}
                </span>
                <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {room.status === "ACTIVE"
              ? "Empty room"
              : `${totalInvited} invited`}
          </p>
        )}
      </div>

      {room.meetLink && room.status !== "ENDED" && (
        <div className="mt-3 pt-2 border-t">
          <Button
            size="sm"
            variant={room.status === "ACTIVE" ? "default" : "outline"}
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              window.open(room.meetLink!, "_blank");
            }}
          >
            Join
          </Button>
        </div>
      )}
    </div>
  );
}
