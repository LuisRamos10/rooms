const ROOM_IMAGES = [
  "/office/room-1.png",
  "/office/room-2.png",
  "/office/room-3.png",
  "/office/room-4.png",
  "/office/room-5.png",
  "/office/room-6.png",
];

export const LOBBY_IMAGE = "/office/lobby.png";

export const TILE_W = 520;
export const TILE_H = 290;

export const LOBBY_W = TILE_W;
export const LOBBY_H = TILE_H;

export interface RoomPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  image: string;
}

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash % ROOM_IMAGES.length);
}

export function getRoomImage(roomId: string): string {
  return ROOM_IMAGES[seededRandom(roomId)];
}

export function computeRoomPositions(roomCount: number): RoomPosition[] {
  if (roomCount === 0) return [];

  const W = TILE_W;
  const H = TILE_H;

  const slots: { x: number; y: number }[] = [
    { x: -W, y: 0 },
    { x: W, y: 0 },
    { x: 0, y: -H },
    { x: 0, y: H },
    { x: -W, y: -H },
    { x: W, y: -H },
    { x: -W, y: H },
    { x: W, y: H },
    { x: -W * 2, y: 0 },
    { x: W * 2, y: 0 },
    { x: -W * 2, y: -H },
    { x: W * 2, y: -H },
    { x: -W * 2, y: H },
    { x: W * 2, y: H },
    { x: 0, y: -H * 2 },
    { x: 0, y: H * 2 },
  ];

  const positions: RoomPosition[] = [];
  for (let i = 0; i < roomCount && i < slots.length; i++) {
    positions.push({
      x: slots[i].x,
      y: slots[i].y,
      width: W,
      height: H,
      image: ROOM_IMAGES[i % ROOM_IMAGES.length],
    });
  }

  return positions;
}
