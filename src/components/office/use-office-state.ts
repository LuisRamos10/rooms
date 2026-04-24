"use client";

import { useState, useCallback, useRef } from "react";

export interface OfficePosition {
  x: number;
  y: number;
}

export interface OfficeState {
  userPosition: OfficePosition;
  targetPosition: OfficePosition | null;
  isMoving: boolean;
  targetRoomMeetLink: string | null;
}

export function useOfficeState(initialX: number, initialY: number) {
  const [userPosition, setUserPosition] = useState<OfficePosition>({ x: initialX, y: initialY });
  const [targetPosition, setTargetPosition] = useState<OfficePosition | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [targetRoomMeetLink, setTargetRoomMeetLink] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);

  const moveTo = useCallback((x: number, y: number, meetLink?: string | null) => {
    setTargetPosition({ x, y });
    setIsMoving(true);
    setTargetRoomMeetLink(meetLink ?? null);
  }, []);

  const updatePosition = useCallback((pos: OfficePosition) => {
    setUserPosition(pos);
  }, []);

  const onArrived = useCallback(() => {
    setIsMoving(false);
    setTargetPosition(null);
    if (targetRoomMeetLink) {
      window.open(targetRoomMeetLink, "_blank");
      setTargetRoomMeetLink(null);
    }
  }, [targetRoomMeetLink]);

  return {
    userPosition,
    targetPosition,
    isMoving,
    targetRoomMeetLink,
    moveTo,
    updatePosition,
    onArrived,
    animationRef,
  };
}
