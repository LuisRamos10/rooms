"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Room } from "@/hooks/use-rooms";

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RoomDetailProps {
  room: Room;
  onClose: () => void;
}

export function RoomDetail({ room, onClose }: RoomDetailProps) {
  const activeParticipants = room.participants.filter((p) => p.isActive);
  const invitedParticipants = room.participants.filter((p) => !p.isActive);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{room.title}</h2>
          <p className="text-sm text-muted-foreground">
            {formatTime(room.startTime)} - {formatTime(room.endTime)}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>

      {room.meetLink && room.status !== "ENDED" && (
        <Button
          className="w-full"
          onClick={() => window.open(room.meetLink!, "_blank")}
        >
          Join Meeting
        </Button>
      )}

      {room.syncedAt && (
        <p className="text-xs text-muted-foreground">
          Last synced {new Date(room.syncedAt).toLocaleTimeString()}
        </p>
      )}

      <Separator />

      {activeParticipants.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            In the room ({activeParticipants.length})
          </h3>
          <div className="space-y-2">
            {activeParticipants.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={p.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {(p.displayName ?? p.userEmail)
                      .split(/[\s@]/)[0]
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.userEmail}</p>
                </div>
                <Badge variant="default" className="ml-auto shrink-0 text-[10px]">
                  Active
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {invitedParticipants.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Invited ({invitedParticipants.length})
          </h3>
          <div className="space-y-2">
            {invitedParticipants.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={p.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {(p.displayName ?? p.userEmail)
                      .split(/[\s@]/)[0]
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.displayName ?? p.userEmail}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.userEmail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
