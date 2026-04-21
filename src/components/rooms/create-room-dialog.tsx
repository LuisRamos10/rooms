"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePeople } from "@/hooks/use-people";
import { useSWRConfig } from "swr";

interface ConflictInfo {
  email: string;
  conflicts: Array<{ title: string; start: string; end: string }>;
}

interface TimeSuggestion {
  start: string;
  end: string;
}

export function CreateRoomDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [suggestions, setSuggestions] = useState<TimeSuggestion[]>([]);
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instant, setInstant] = useState(false);

  const { data: people } = usePeople();
  const { mutate } = useSWRConfig();

  const filteredPeople =
    people?.filter(
      (p) =>
        !selectedEmails.includes(p.email) &&
        (p.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.email.toLowerCase().includes(search.toLowerCase()))
    ) ?? [];

  function getStartEnd() {
    if (instant) {
      const now = new Date();
      return {
        start: now,
        end: new Date(now.getTime() + duration * 60 * 1000),
      };
    }
    const start = new Date(`${date}T${startTime}`);
    return {
      start,
      end: new Date(start.getTime() + duration * 60 * 1000),
    };
  }

  async function handleCheckConflicts() {
    if (selectedEmails.length === 0) return;
    setChecking(true);
    setConflicts([]);
    setSuggestions([]);
    setError(null);

    const { start, end } = getStartEnd();

    try {
      const res = await fetch("/api/rooms/conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeEmails: selectedEmails,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });

      const data = await res.json();
      if (data.hasConflicts) {
        setConflicts(data.conflicts);

        const suggestRes = await fetch("/api/rooms/suggest-times", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attendeeEmails: selectedEmails,
            durationMinutes: duration,
            date,
          }),
        });
        const suggestData = await suggestRes.json();
        setSuggestions(suggestData.suggestions ?? []);
      }
    } catch {
      setError("Failed to check conflicts");
    } finally {
      setChecking(false);
    }
  }

  async function handleCreate(skipConflictCheck = false) {
    if (!title.trim()) {
      setError("Please enter a room title");
      return;
    }

    setCreating(true);
    setError(null);

    const { start, end } = getStartEnd();

    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          attendeeEmails: selectedEmails,
          skipConflictCheck,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.conflicts) {
        setConflicts(data.conflicts);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Failed to create room");
        return;
      }

      if (data.meetLink && instant) {
        window.open(data.meetLink, "_blank");
      }

      mutate("/api/rooms");
      resetForm();
      setOpen(false);
    } catch {
      setError("Failed to create room");
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setTitle("");
    setStartTime("09:00");
    setDuration(30);
    setSelectedEmails([]);
    setSearch("");
    setConflicts([]);
    setSuggestions([]);
    setError(null);
    setInstant(false);
  }

  function applySuggestion(suggestion: TimeSuggestion) {
    const start = new Date(suggestion.start);
    setStartTime(`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`);
    setConflicts([]);
    setSuggestions([]);
  }

  function formatSuggestionTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14"/><path d="M12 5v14"/>
        </svg>
        New Room
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a New Room</DialogTitle>
          <DialogDescription>
            Schedule a meeting or start an instant room
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Room title</Label>
            <Input
              id="title"
              placeholder="Quick sync, Design review..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInstant(false)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!instant ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Schedule
            </button>
            <button
              type="button"
              onClick={() => setInstant(true)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${instant ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Instant
            </button>
          </div>

          {!instant && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="time">Start time</Label>
                <Input id="time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input id="duration" type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
            </div>
          )}

          {instant && (
            <div className="space-y-1">
              <Label htmlFor="duration-instant">Duration (min)</Label>
              <Input id="duration-instant" type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-32" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Invite people</Label>
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && filteredPeople.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg border">
                {filteredPeople.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setSelectedEmails((prev) => [...prev, p.email]);
                      setSearch("");
                    }}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{p.email}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedEmails.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedEmails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => setSelectedEmails((prev) => prev.filter((e) => e !== email))}
                      className="ml-1 hover:text-destructive"
                    >
                      x
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {conflicts.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <p className="text-sm font-medium text-destructive">Scheduling conflicts found:</p>
              {conflicts.map((c) => (
                <div key={c.email} className="text-xs text-muted-foreground">
                  <span className="font-medium">{c.email}</span> is busy during this time
                </div>
              ))}

              {suggestions.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium">Suggested open times:</p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="block w-full rounded-md bg-background px-2 py-1 text-left text-xs hover:bg-muted"
                      onClick={() => applySuggestion(s)}
                    >
                      {formatSuggestionTime(s.start)} - {formatSuggestionTime(s.end)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            {selectedEmails.length > 0 && !instant && (
              <Button variant="outline" onClick={handleCheckConflicts} disabled={checking}>
                {checking ? "Checking..." : "Check Conflicts"}
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={() => handleCreate(conflicts.length > 0)}
              disabled={creating || !title.trim()}
            >
              {creating
                ? "Creating..."
                : conflicts.length > 0
                  ? "Create Anyway"
                  : instant
                    ? "Start Now"
                    : "Create Room"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
