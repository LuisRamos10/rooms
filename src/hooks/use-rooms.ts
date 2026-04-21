"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface RoomParticipant {
  id: string;
  userEmail: string;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}

export interface Room {
  id: string;
  orgId: string;
  title: string;
  meetLink: string | null;
  calendarEventId: string | null;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "ACTIVE" | "ENDED";
  syncedAt: string | null;
  participants: RoomParticipant[];
  _count: {
    participants: number;
  };
}

export function useRooms() {
  return useSWR<Room[]>("/api/rooms", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
}
