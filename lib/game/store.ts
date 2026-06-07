import { customAlphabet } from "nanoid";
import type { Room } from "./types";

/** Unambiguous uppercase alphabet (no I/O/0/1) for easy verbal sharing. */
const codeGen = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 4);

const rooms = new Map<string, Room>();

/** How long an empty room lingers before being reaped (ms). */
const EMPTY_ROOM_TTL = 1000 * 60 * 30;

export function createRoom(): Room {
  let code = codeGen();
  while (rooms.has(code)) code = codeGen();

  const room: Room = {
    code,
    gameType: null,
    phase: "lobby",
    players: [],
    game: null,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function deleteRoom(code: string): void {
  rooms.delete(code.toUpperCase());
}

/** Remove rooms that have been empty (no connected players) past the TTL. */
export function reapStaleRooms(): void {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const anyConnected = room.players.some((p) => p.connected);
    if (!anyConnected && now - room.createdAt > EMPTY_ROOM_TTL) {
      rooms.delete(code);
    }
  }
}
