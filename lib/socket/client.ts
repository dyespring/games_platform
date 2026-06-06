"use client";

import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../game/types";

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ClientSocket | null = null;

/** Lazily create a single shared socket connection for the browser tab. */
export function getSocket(): ClientSocket {
  if (!socket) {
    socket = io({
      path: "/api/socket",
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

// ---- Identity persistence (per room) so a refresh rejoins seamlessly ----

function key(code: string): string {
  return `ttol:player:${code.toUpperCase()}`;
}

export function rememberIdentity(code: string, playerId: string): void {
  try {
    sessionStorage.setItem(key(code), playerId);
  } catch {
    // sessionStorage may be unavailable (private mode); reconnect simply won't persist.
  }
}

export function recallIdentity(code: string): string | null {
  try {
    return sessionStorage.getItem(key(code));
  } catch {
    return null;
  }
}

export function forgetIdentity(code: string): void {
  try {
    sessionStorage.removeItem(key(code));
  } catch {
    // no-op
  }
}
