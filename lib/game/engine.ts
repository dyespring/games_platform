import { customAlphabet } from "nanoid";
import {
  ClientPlayer,
  ClientRoom,
  Player,
  Room,
  POINTS_FOR_SPOTTING,
  POINTS_PER_FOOLED,
  STATEMENTS_PER_PLAYER,
} from "./types";

const idGen = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

/** Thrown for expected, user-facing rule violations. */
export class GameError extends Error {}

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

// ---- Membership ----

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
    statements: [],
    lieIndex: null,
    submitted: false,
  };
  room.players.push(player);
  return player;
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

// ---- Phase transitions ----

export function startGame(room: Room, playerId: string): void {
  requireHost(room, playerId);
  if (room.phase !== "lobby") throw new GameError("The game is already running.");
  if (room.players.length < 2) {
    throw new GameError("Need at least 2 players to start.");
  }
  resetForNewRound(room);
}

export function playAgain(room: Room, playerId: string): void {
  requireHost(room, playerId);
  if (room.phase !== "results") throw new GameError("Can only restart after results.");
  room.players.forEach((p) => (p.score = 0));
  resetForNewRound(room);
}

function resetForNewRound(room: Room): void {
  room.players.forEach((p) => {
    p.statements = [];
    p.lieIndex = null;
    p.submitted = false;
  });
  room.votes = {};
  room.lastRoundPoints = {};
  room.spotlightIndex = 0;
  room.phase = "submission";
}

export function submitStatements(
  room: Room,
  playerId: string,
  statements: string[],
  lieIndex: number
): void {
  if (room.phase !== "submission") {
    throw new GameError("It's not time to submit statements.");
  }
  const player = findPlayer(room, playerId);
  if (!player) throw new GameError("You're not in this room.");

  const cleaned = statements.map((s) => s.trim());
  if (cleaned.length !== STATEMENTS_PER_PLAYER || cleaned.some((s) => !s)) {
    throw new GameError(`Please fill in all ${STATEMENTS_PER_PLAYER} statements.`);
  }
  if (lieIndex < 0 || lieIndex >= STATEMENTS_PER_PLAYER) {
    throw new GameError("Please mark which statement is the lie.");
  }

  player.statements = cleaned;
  player.lieIndex = lieIndex;
  player.submitted = true;

  const everyoneSubmitted = room.players
    .filter((p) => p.connected)
    .every((p) => p.submitted);
  if (everyoneSubmitted) {
    beginVoting(room);
  }
}

function beginVoting(room: Room): void {
  room.phase = "voting";
  room.spotlightIndex = 0;
  room.votes = {};
  room.lastRoundPoints = {};
}

export function castVote(room: Room, voterId: string, guessIndex: number): void {
  if (room.phase !== "voting") throw new GameError("It's not voting time.");
  const subject = room.players[room.spotlightIndex];
  if (!subject) throw new GameError("No one is in the spotlight.");
  if (voterId === subject.id) throw new GameError("You can't vote on your own statements.");

  const voter = findPlayer(room, voterId);
  if (!voter) throw new GameError("You're not in this room.");
  if (guessIndex < 0 || guessIndex >= STATEMENTS_PER_PLAYER) {
    throw new GameError("Invalid choice.");
  }

  room.votes[voterId] = guessIndex;

  // Once every connected, non-spotlight player has voted, reveal automatically.
  const eligible = room.players.filter((p) => p.connected && p.id !== subject.id);
  const allVoted = eligible.every((p) => room.votes[p.id] !== undefined);
  if (allVoted) {
    scoreSpotlight(room);
    room.phase = "reveal";
  }
}

function scoreSpotlight(room: Room): void {
  const subject = room.players[room.spotlightIndex];
  if (!subject) return;
  const points: Record<string, number> = {};
  for (const [voterId, guess] of Object.entries(room.votes)) {
    const voter = findPlayer(room, voterId);
    if (!voter) continue;
    if (guess === subject.lieIndex) {
      voter.score += POINTS_FOR_SPOTTING;
      points[voterId] = (points[voterId] ?? 0) + POINTS_FOR_SPOTTING;
    } else {
      subject.score += POINTS_PER_FOOLED;
      points[subject.id] = (points[subject.id] ?? 0) + POINTS_PER_FOOLED;
    }
  }
  room.lastRoundPoints = points;
}

export function nextSpotlight(room: Room, playerId: string): void {
  requireHost(room, playerId);
  if (room.phase !== "reveal") throw new GameError("Nothing to advance from yet.");

  const next = room.spotlightIndex + 1;
  if (next >= room.players.length) {
    room.phase = "results";
    return;
  }
  room.spotlightIndex = next;
  room.votes = {};
  room.lastRoundPoints = {};
  room.phase = "voting";
}

// ---- Sanitization ----

export function sanitizeForClient(room: Room, viewerId: string): ClientRoom {
  const revealing = room.phase === "reveal";
  const subject =
    room.phase === "voting" || room.phase === "reveal"
      ? room.players[room.spotlightIndex]
      : undefined;

  const players: ClientPlayer[] = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    connected: p.connected,
    score: p.score,
    submitted: p.submitted,
    hasVoted: room.votes[p.id] !== undefined,
  }));

  const me = findPlayer(room, viewerId);

  return {
    code: room.code,
    phase: room.phase,
    players,
    spotlightIndex: room.spotlightIndex,
    spotlightCount: room.players.length,
    spotlightPlayerId: subject?.id ?? null,
    spotlightStatements: subject ? subject.statements : null,
    spotlightLieIndex: revealing && subject ? subject.lieIndex : null,
    votes: revealing ? { ...room.votes } : {},
    lastRoundPoints: revealing ? { ...room.lastRoundPoints } : {},
    you: {
      id: viewerId,
      isHost: me?.isHost ?? false,
      statements: me?.statements ?? [],
      lieIndex: me?.lieIndex ?? null,
      submitted: me?.submitted ?? false,
      hasVoted: room.votes[viewerId] !== undefined,
      isSpotlight: subject?.id === viewerId,
    },
  };
}
