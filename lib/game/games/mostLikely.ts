import { GameError } from "../errors";
import {
  ClientMostLikely,
  MOST_LIKELY_DEFAULT_ROUNDS,
  MostLikelyState,
  Player,
  Room,
} from "../types";
import { MOST_LIKELY_PROMPTS } from "./mostLikelyPrompts";

export const MIN_PLAYERS = 3;
const MAX_ROUNDS = 15;
const MAX_PROMPT_LEN = 120;

function state(room: Room): MostLikelyState {
  if (room.game?.type !== "most-likely") {
    throw new GameError("Wrong game in progress.");
  }
  return room.game;
}

function findPlayer(room: Room, id: string): Player | undefined {
  return room.players.find((p) => p.id === id);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPrompts(customPrompts: string[] = []): string[] {
  const seen = new Set<string>();
  const custom: string[] = [];
  for (const raw of customPrompts) {
    const cleaned = raw.trim().slice(0, MAX_PROMPT_LEN);
    const key = cleaned.toLowerCase();
    if (cleaned && !seen.has(key)) {
      seen.add(key);
      custom.push(cleaned);
      if (custom.length >= MAX_ROUNDS) break;
    }
  }

  const target = Math.min(
    Math.max(custom.length, MOST_LIKELY_DEFAULT_ROUNDS),
    MAX_ROUNDS
  );
  const needed = Math.max(0, target - custom.length);
  const fill = shuffle(MOST_LIKELY_PROMPTS.filter((p) => !seen.has(p.toLowerCase()))).slice(
    0,
    needed
  );
  return shuffle([...custom, ...fill]);
}

/** Initialise game state and move the room straight into voting. */
export function start(room: Room, customPrompts: string[] = []): void {
  if (room.players.length < MIN_PLAYERS) {
    throw new GameError(`Need at least ${MIN_PLAYERS} players to start.`);
  }
  const prompts = buildPrompts(customPrompts);
  if (prompts.length === 0) throw new GameError("No prompts available.");

  room.game = {
    type: "most-likely",
    prompts,
    promptIndex: 0,
    votes: {},
    lastRoundCounts: {},
  };
  room.phase = "voting";
}

export function vote(room: Room, voterId: string, targetId: string): void {
  if (room.phase !== "voting") throw new GameError("It's not voting time.");
  const s = state(room);
  if (!findPlayer(room, voterId)) throw new GameError("You're not in this room.");
  if (targetId === voterId) throw new GameError("You can't vote for yourself.");
  if (!findPlayer(room, targetId)) throw new GameError("That player isn't here.");

  s.votes[voterId] = targetId;

  const eligible = room.players.filter((p) => p.connected);
  const allVoted = eligible.every((p) => s.votes[p.id] !== undefined);
  if (allVoted) {
    tally(room);
    room.phase = "reveal";
  }
}

function tally(room: Room): void {
  const s = state(room);
  const counts: Record<string, number> = {};
  for (const targetId of Object.values(s.votes)) {
    counts[targetId] = (counts[targetId] ?? 0) + 1;
  }
  for (const [playerId, n] of Object.entries(counts)) {
    const p = findPlayer(room, playerId);
    if (p) p.score += n;
  }
  s.lastRoundCounts = counts;
}

/** Host advances from a reveal to the next prompt or to results. */
export function advance(room: Room): void {
  if (room.phase !== "reveal") throw new GameError("Nothing to advance from yet.");
  const s = state(room);
  const next = s.promptIndex + 1;
  if (next >= s.prompts.length) {
    room.phase = "results";
    return;
  }
  s.promptIndex = next;
  s.votes = {};
  s.lastRoundCounts = {};
  room.phase = "voting";
}

export function sanitize(room: Room, viewerId: string): ClientMostLikely {
  const s = state(room);
  const revealing = room.phase === "reveal";
  const active = room.phase === "voting" || room.phase === "reveal";

  return {
    type: "most-likely",
    prompt: active ? s.prompts[s.promptIndex] ?? null : null,
    promptIndex: s.promptIndex,
    promptCount: s.prompts.length,
    counts: revealing ? { ...s.lastRoundCounts } : {},
    votes: revealing ? { ...s.votes } : {},
    you: {
      hasVoted: s.votes[viewerId] !== undefined,
      votedFor: s.votes[viewerId] ?? null,
    },
  };
}

export function playerFlags(
  room: Room,
  playerId: string
): { submitted: boolean; hasVoted: boolean } {
  const s = state(room);
  return { submitted: false, hasVoted: s.votes[playerId] !== undefined };
}
