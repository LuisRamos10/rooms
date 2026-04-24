"use client";

import { useState, useEffect } from "react";
import { RoomsDashboard } from "@/components/rooms/rooms-dashboard";
import { OfficeCanvas } from "@/components/office";
import { CreateRoomDialog } from "@/components/rooms/create-room-dialog";

interface DashboardViewProps {
  orgName: string;
  userName: string;
  userImage?: string | null;
}

export function DashboardView({ orgName, userName, userImage }: DashboardViewProps) {
  const [view, setView] = useState<"office" | "list">("office");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    if (mq.matches) setView("list");
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setView("list"); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground">
            Today&apos;s meetings at {orgName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border bg-muted p-0.5">
            <button
              onClick={() => setView("office")}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                view === "office"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
                Office
              </span>
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" x2="21" y1="6" y2="6" />
                  <line x1="8" x2="21" y1="12" y2="12" />
                  <line x1="8" x2="21" y1="18" y2="18" />
                  <line x1="3" x2="3.01" y1="6" y2="6" />
                  <line x1="3" x2="3.01" y1="12" y2="12" />
                  <line x1="3" x2="3.01" y1="18" y2="18" />
                </svg>
                List
              </span>
            </button>
          </div>
          <CreateRoomDialog />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {view === "office" ? (
          <div className="h-full rounded-xl border overflow-hidden">
            <OfficeCanvas user={{ name: userName, image: userImage }} />
          </div>
        ) : (
          <RoomsDashboard />
        )}
      </div>
    </div>
  );
}
