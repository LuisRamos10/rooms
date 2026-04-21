"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface PersonRoom {
  roomId: string;
  roomTitle: string;
  meetLink: string | null;
}

export interface Person {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  currentRoom: PersonRoom | null;
}

export function usePeople() {
  return useSWR<Person[]>("/api/people", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
}
