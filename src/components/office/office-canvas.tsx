"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Container, Graphics, Text, TextStyle, Sprite, Assets, FederatedPointerEvent, FederatedWheelEvent } from "pixi.js";
import { useRooms, type Room } from "@/hooks/use-rooms";
import { computeRoomPositions, getRoomImage, LOBBY_IMAGE, LOBBY_W, LOBBY_H, TILE_W, TILE_H, type RoomPosition } from "./office-layout";

const AVATAR_SPEED = 3;
const AVATAR_RADIUS = 14;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

interface OfficeCanvasProps {
  user: { name: string; image?: string | null };
}

const ROOM_IMAGES = [
  "/office/room-1.png",
  "/office/room-2.png",
  "/office/room-3.png",
  "/office/room-4.png",
  "/office/room-5.png",
  "/office/room-6.png",
];

let assetsLoaded = false;

export function OfficeCanvas({ user }: OfficeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const { data: rooms } = useRooms();
  const [loaded, setLoaded] = useState(false);

  const worldRef = useRef<Container | null>(null);
  const roomLayerRef = useRef<Container | null>(null);
  const avatarRef = useRef<Container | null>(null);
  const userPosRef = useRef({ x: 0, y: 0 });
  const targetPosRef = useRef<{ x: number; y: number } | null>(null);
  const targetMeetLinkRef = useRef<string | null>(null);
  const joinedRef = useRef(false);

  const initApp = useCallback(async () => {
    if (!containerRef.current || appRef.current) return;

    const app = new Application();
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    await app.init({
      width,
      height,
      backgroundColor: 0x12121f,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    containerRef.current.appendChild(app.canvas as HTMLCanvasElement);
    appRef.current = app;

    if (!assetsLoaded) {
      Assets.add({ alias: "lobby", src: LOBBY_IMAGE });
      for (const img of ROOM_IMAGES) {
        Assets.add({ alias: img, src: img });
      }
      await Assets.load(["lobby", ...ROOM_IMAGES]);
      assetsLoaded = true;
    }

    const world = new Container();
    app.stage.addChild(world);
    worldRef.current = world;

    const lobbySprite = Sprite.from("lobby");
    lobbySprite.width = LOBBY_W;
    lobbySprite.height = LOBBY_H;
    world.addChild(lobbySprite);

    const lobbyLabelBg = new Graphics();
    lobbyLabelBg.rect(0, LOBBY_H - 20, LOBBY_W, 20);
    lobbyLabelBg.fill({ color: 0x000000, alpha: 0.5 });
    world.addChild(lobbyLabelBg);

    const lobbyLabel = new Text({
      text: "Lobby",
      style: new TextStyle({ fontSize: 11, fill: 0xffffff, fontFamily: "sans-serif", fontWeight: "bold" }),
    });
    lobbyLabel.anchor.set(0.5);
    lobbyLabel.x = LOBBY_W / 2;
    lobbyLabel.y = LOBBY_H - 10;
    world.addChild(lobbyLabel);

    const roomLayer = new Container();
    world.addChild(roomLayer);
    roomLayerRef.current = roomLayer;

    userPosRef.current = { x: LOBBY_W / 2, y: LOBBY_H / 2 };
    const avatar = buildAvatar(user.name);
    avatar.x = userPosRef.current.x;
    avatar.y = userPosRef.current.y;
    avatarRef.current = avatar;
    world.addChild(avatar);

    world.x = width / 2 - LOBBY_W / 2;
    world.y = height / 2 - LOBBY_H / 2;

    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;

    app.stage.on("pointerdown", (e: FederatedPointerEvent) => {
      const worldPos = world.toLocal(e.global);
      targetPosRef.current = { x: worldPos.x, y: worldPos.y };
      targetMeetLinkRef.current = null;
      joinedRef.current = false;
    });

    app.stage.on("wheel", (e: FederatedWheelEvent) => {
      const direction = e.deltaY > 0 ? -1 : 1;
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, world.scale.x + direction * ZOOM_STEP));

      const mouseWorld = world.toLocal(e.global);
      world.scale.set(newScale);
      const mouseAfter = world.toLocal(e.global);

      world.x += (mouseAfter.x - mouseWorld.x) * newScale;
      world.y += (mouseAfter.y - mouseWorld.y) * newScale;
    });

    app.ticker.add(() => {
      if (!targetPosRef.current || !avatarRef.current) return;
      const dx = targetPosRef.current.x - userPosRef.current.x;
      const dy = targetPosRef.current.y - userPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < AVATAR_SPEED) {
        userPosRef.current = { ...targetPosRef.current };
        avatarRef.current.x = userPosRef.current.x;
        avatarRef.current.y = userPosRef.current.y;
        targetPosRef.current = null;
        if (targetMeetLinkRef.current && !joinedRef.current) {
          joinedRef.current = true;
          const link = targetMeetLinkRef.current;
          targetMeetLinkRef.current = null;
          setTimeout(() => window.open(link, "_blank"), 200);
        }
        return;
      }

      userPosRef.current.x += (dx / dist) * AVATAR_SPEED;
      userPosRef.current.y += (dy / dist) * AVATAR_SPEED;
      avatarRef.current.x = userPosRef.current.x;
      avatarRef.current.y = userPosRef.current.y;
    });

    setLoaded(true);
  }, [user.name]);

  useEffect(() => {
    initApp();
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: false });
        appRef.current = null;
        worldRef.current = null;
        roomLayerRef.current = null;
        avatarRef.current = null;
      }
    };
  }, [initApp]);

  useEffect(() => {
    if (!appRef.current || !loaded || !rooms || !roomLayerRef.current || !worldRef.current) return;

    const roomLayer = roomLayerRef.current;
    const world = worldRef.current;
    roomLayer.removeChildren();

    const visibleRooms = rooms.filter((r) => r.participants.some((p) => p.isActive));
    const positions = computeRoomPositions(visibleRooms.length);

    visibleRooms.forEach((room, i) => {
      if (i >= positions.length) return;
      const pos = positions[i];
      const hasActive = room.participants.some((p) => p.isActive);
      const activeP = room.participants.filter((p) => p.isActive);

      const card = buildRoomSprite(room, pos, hasActive, activeP);
      card.x = pos.x;
      card.y = pos.y;
      card.eventMode = "static";
      card.cursor = "pointer";

      card.on("pointerdown", (e: FederatedPointerEvent) => {
        e.stopPropagation();
        const worldPos = { x: pos.x + pos.width / 2, y: pos.y + pos.height / 2 };
        targetPosRef.current = worldPos;
        targetMeetLinkRef.current = room.meetLink;
        joinedRef.current = false;
      });

      roomLayer.addChild(card);
    });

    if (avatarRef.current) {
      world.removeChild(avatarRef.current);
      world.addChild(avatarRef.current);
    }
  }, [rooms, loaded]);

  function buildRoomSprite(
    room: Room,
    pos: RoomPosition,
    hasActive: boolean,
    activeParticipants: Room["participants"]
  ): Container {
    const container = new Container();

    const imgAlias = getRoomImage(room.id);
    const roomSprite = Sprite.from(imgAlias);
    roomSprite.width = pos.width;
    roomSprite.height = pos.height;
    container.addChild(roomSprite);

    const labelBg = new Graphics();
    labelBg.rect(0, pos.height - 24, pos.width, 24);
    labelBg.fill({ color: 0x000000, alpha: 0.7 });
    container.addChild(labelBg);

    const title = room.title.length > 24 ? room.title.slice(0, 22) + ".." : room.title;
    const titleText = new Text({
      text: title,
      style: new TextStyle({ fontSize: 10, fill: 0xffffff, fontFamily: "sans-serif", fontWeight: "bold" }),
    });
    titleText.anchor.set(0.5);
    titleText.x = pos.width / 2;
    titleText.y = pos.height - 12;
    container.addChild(titleText);

    const cols = Math.min(activeParticipants.length, 3);
    const rows = Math.ceil(Math.min(activeParticipants.length, 9) / cols);
    const spacingX = 36;
    const spacingY = 32;
    const totalW = cols * spacingX;
    const totalH = rows * spacingY;
    const startX = (pos.width - totalW) / 2 + spacingX / 2;
    const startY = (pos.height - 20 - totalH) / 2 + spacingY / 2;

    activeParticipants.slice(0, 9).forEach((p, j) => {
      const col = j % cols;
      const row = Math.floor(j / cols);
      const pAvatar = buildSmallAvatar(p.displayName ?? p.userEmail, true);
      pAvatar.x = startX + col * spacingX;
      pAvatar.y = startY + row * spacingY;
      container.addChild(pAvatar);
    });

    if (activeParticipants.length > 9) {
      const moreBg = new Graphics();
      moreBg.roundRect(pos.width - 28, 2, 26, 14, 3);
      moreBg.fill({ color: 0x000000, alpha: 0.6 });
      container.addChild(moreBg);
      const more = new Text({
        text: `+${activeParticipants.length - 9}`,
        style: new TextStyle({ fontSize: 8, fill: 0xffffff, fontFamily: "sans-serif", fontWeight: "bold" }),
      });
      more.anchor.set(0.5);
      more.x = pos.width - 15;
      more.y = 9;
      container.addChild(more);
    }

    const hoverOverlay = new Graphics();
    hoverOverlay.rect(0, 0, pos.width, pos.height);
    hoverOverlay.fill({ color: 0x6366f1, alpha: 0 });
    container.addChild(hoverOverlay);

    container.on("pointerover", () => {
      hoverOverlay.clear();
      hoverOverlay.rect(0, 0, pos.width, pos.height);
      hoverOverlay.fill({ color: 0x6366f1, alpha: 0.15 });
    });

    container.on("pointerout", () => {
      hoverOverlay.clear();
      hoverOverlay.rect(0, 0, pos.width, pos.height);
      hoverOverlay.fill({ color: 0x6366f1, alpha: 0 });
    });

    return container;
  }

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div ref={containerRef} className="w-full h-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center space-y-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-sm text-muted-foreground">Loading office...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function buildAvatar(name: string): Container {
  const container = new Container();
  const circle = new Graphics();
  circle.circle(0, 0, AVATAR_RADIUS);
  circle.fill({ color: 0x6366f1 });
  circle.stroke({ color: 0xffffff, width: 2 });
  container.addChild(circle);

  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const text = new Text({
    text: initials,
    style: new TextStyle({ fontSize: 10, fill: 0xffffff, fontFamily: "sans-serif", fontWeight: "bold" }),
  });
  text.anchor.set(0.5);
  container.addChild(text);

  const label = new Text({
    text: name.split(" ")[0],
    style: new TextStyle({ fontSize: 8, fill: 0xffffff, fontFamily: "sans-serif" }),
  });
  label.anchor.set(0.5);
  label.y = AVATAR_RADIUS + 8;
  container.addChild(label);

  return container;
}

function buildSmallAvatar(name: string, isActive: boolean): Container {
  const container = new Container();
  const r = 11;
  const circle = new Graphics();
  circle.circle(0, 0, r);
  circle.fill({ color: isActive ? 0x22c55e : 0x6b7280 });
  circle.stroke({ color: 0xffffff, width: 1.5 });
  container.addChild(circle);

  const initials = name.split(/[\s@]/).filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const text = new Text({
    text: initials,
    style: new TextStyle({ fontSize: 8, fill: 0xffffff, fontFamily: "sans-serif", fontWeight: "bold" }),
  });
  text.anchor.set(0.5);
  container.addChild(text);

  const firstName = name.split(/[\s@]/)[0];
  const label = new Text({
    text: firstName.length > 8 ? firstName.slice(0, 7) + ".." : firstName,
    style: new TextStyle({ fontSize: 7, fill: 0xffffff, fontFamily: "sans-serif", dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.8 } }),
  });
  label.anchor.set(0.5);
  label.y = r + 7;
  container.addChild(label);

  return container;
}
