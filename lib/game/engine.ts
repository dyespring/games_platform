import { customAlphabet } from "nanoid";
import { GameError } from "./errors";
import { AVATARS } from "./avatars";
import {
  ClientGameView,
  ClientPlayer,
  ClientRoom,
  GameType,
  Player,
  Room,
} from "./types";
import * as twoTruths from "./games/twoTruths";
import * as mostLikely from "./games/mostLikely";
import * as captionThis from "./games/captionThis";

export { GameError };

const idGen = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

function findPlayer(room: Room, playerId: string): Player | undefined {
  return room.players.find((p) => p.id === playerId);
}

function requireHost(room: Room, playerId: string): void {
  const player = findPlayer(room, playerId);
  if (!player?.isHost) throw new GameError("Only the host can do that.");
}

function ensureHostExists(room: Room): void {
  if (room.players.some((p) => p.isHost && p.connected)) return;
  const next = room.players.find((p) => p.connected) ?? room.players[0];
  room.players.forEach((p) => (p.isHost = p === next));
}

/** Route to the active game's module based on the room's game type. */
function game(room: Room) {
  switch (room.gameType) {
    case "two-truths":
      return twoTruths;
    case "most-likely":
      return mostLikely;
    case "caption-this":
      return captionThis;
    default:
      throw new GameError("No game selected yet.");
  }
}

// ---- Membership (game-agnostic) ----

export function addPlayer(room: Room, name: string): Player {
  if (room.phase !== "lobby") {
    throw new GameError("This game has already started.");
  }
  const trimmed = name.trim();
  if (!trimmed) throw new GameError("Please enter a name.");
  if (trimmed.length > 20) throw new GameError("Name is too long (max 20).");
  if (room.players.length >= 12) throw new GameError("This room is full (max 12).");

  const player: Player = {
    id: idGen(),
    name: trimmed,
    isHost: room.players.length === 0,
    connected: true,
    score: 0,
    avatar: pickAvatar(room),
  };
  room.players.push(player);
  return player;
}

/** Pick an avatar not already used in the room; fall back to random if exhausted. */
function pickAvatar(room: Room): number {
  const used = new Set(room.players.map((p) => p.avatar));
  const free = AVATARS.map((_, i) => i).filter((i) => !used.has(i));
  const pool = free.length > 0 ? free : AVATARS.map((_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function reconnect(room: Room, playerId: string): Player {
  const player = findPlayer(room, playerId);
  if (!player) throw new GameError("Could not find your spot in this room.");
  player.connected = true;
  ensureHostExists(room);
  return player;
}

export function disconnect(room: Room, playerId: string): void {
  const player = findPlayer(room, playerId);
  if (!player) return;
  player.connected = false;
  // In the lobby a disconnect is a true "leave"; drop them entirely.
  if (room.phase === "lobby") {
    room.players = room.players.filter((p) => p.id !== playerId);
  }
  ensureHostExists(room);
}

// ---- Lobby + lifecycle ----

export function selectGame(room: Room, playerId: string, gameType: GameType): void {
  requireHost(room, playerId);
  if (room.phase !== "lobby") throw new GameError("Can only pick a game in the lobby.");
  room.gameType = gameType;
}

export function startGame(
  room: Room,
  playerId: string,
  options?: { customPrompts?: string[]; customImages?: string[] }
): void {
  requireHost(room, playerId);
  if (room.phase !== "lobby") throw new GameError("The game is already running.");
  if (!room.gameType) throw new GameError("Pick a game first.");

  switch (room.gameType) {
    case "most-likely":
      mostLikely.start(room, options?.customPrompts ?? []);
      break;
    case "caption-this":
      captionThis.start(room, options?.customImages ?? []);
      break;
    default:
      twoTruths.start(room);
  }
}

/** Return everyone to the lobby with scores reset; host may pick a new game. */
export function playAgain(room: Room, playerId: string): void {
  requireHost(room, playerId);
  if (room.phase !== "results") throw new GameError("Can only restart after results.");
  room.players.forEach((p) => (p.score = 0));
  room.game = null;
  room.phase = "lobby";
}

// ---- Gameplay (routed) ----

export function submitStatements(
  room: Room,
  playerId: string,
  statements: string[],
  lieIndex: number
): void {
  if (room.gameType !== "two-truths") throw new GameError("Not available in this game.");
  twoTruths.submit(room, playerId, statements, lieIndex);
}

export function submitCaption(room: Room, playerId: string, text: string): void {
  if (room.gameType !== "caption-this") throw new GameError("Not available in this game.");
  captionThis.submitCaption(room, playerId, text);
}

export function castVote(room: Room, voterId: string, value: string): void {
  game(room).vote(room, voterId, value);
}

export function advance(room: Room, playerId: string): void {
  requireHost(room, playerId);
  game(room).advance(room);
}

// ---- Sanitization ----

export function sanitizeForClient(room: Room, viewerId: string): ClientRoom {
  const mod = room.gameType ? game(room) : null;

  const players: ClientPlayer[] = room.players.map((p) => {
    const flags =
      mod && room.game ? mod.playerFlags(room, p.id) : { submitted: false, hasVoted: false };
    return {
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      connected: p.connected,
      score: p.score,
      avatar: p.avatar,
      submitted: flags.submitted,
      hasVoted: flags.hasVoted,
    };
  });

  const me = findPlayer(room, viewerId);
  const gameView: ClientGameView | null =
    mod && room.game ? mod.sanitize(room, viewerId) : null;

  return {
    code: room.code,
    gameType: room.gameType,
    phase: room.phase,
    players,
    game: gameView,
    you: {
      id: viewerId,
      isHost: me?.isHost ?? false,
    },
  };
}
