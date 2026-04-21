"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface SearchRoom {
  id: string;
  title: string;
  status: string;
  meetLink: string | null;
  startTime: string;
  participants: Array<{ displayName: string | null; userEmail: string; avatarUrl: string | null }>;
}

interface SearchPerson {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export function SearchCommand() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ rooms: SearchRoom[]; people: SearchPerson[] } | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } catch {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Input
        placeholder="Search rooms and people..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results && setOpen(true)}
        className="h-9"
      />

      {open && results && (results.rooms.length > 0 || results.people.length > 0) && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border bg-popover p-2 shadow-lg">
          {results.rooms.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Rooms</p>
              {results.rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    if (room.meetLink) window.open(room.meetLink, "_blank");
                    setOpen(false);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{room.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(room.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge variant={room.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px]">
                    {room.status === "ACTIVE" ? "Live" : room.status === "SCHEDULED" ? "Upcoming" : "Ended"}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {results.people.length > 0 && (
            <div className={results.rooms.length > 0 ? "mt-2 border-t pt-2" : ""}>
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">People</p>
              {results.people.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={person.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {person.name?.slice(0, 2).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{person.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
