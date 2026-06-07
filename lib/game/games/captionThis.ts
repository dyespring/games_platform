import { customAlphabet } from "nanoid";
import { GameError } from "../errors";
import {
  CAPTION_DEFAULT_ROUNDS,
  CAPTION_POINTS_PER_VOTE,
  CaptionThisState,
  ClientCaptionThis,
  Player,
  Room,
} from "../types";
import { CAPTION_IMAGES } from "./captionImages";

export const MIN_PLAYERS = 3;
const MAX_ROUNDS = 10;
const MAX_CAPTION_LEN = 100;
const MAX_IMAGE_URL_LEN = 500;

const entryId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

function state(room: Room): CaptionThisState {
  if (room.game?.type !== "caption-this") {
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

function isHttpUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s);
}

function buildImages(customImages: string[] = []): string[] {
  const seen = new Set<string>();
  const custom: string[] = [];
  for (const raw of customImages) {
    const cleaned = raw.trim().slice(0, MAX_IMAGE_URL_LEN);
    if (cleaned && isHttpUrl(cleaned) && !seen.has(cleaned)) {
      seen.add(cleaned);
      custom.push(cleaned);
      if (custom.length >= MAX_ROUNDS) break;
    }
  }

  const target = Math.min(
    Math.max(custom.length, CAPTION_DEFAULT_ROUNDS),
    MAX_ROUNDS
  );
  const needed = Math.max(0, target - custom.length);
  const fill = shuffle(CAPTION_IMAGES.filter((u) => !seen.has(u))).slice(0, needed);
  return shuffle([...custom, ...fill]);
}

/** Initialise game state and move into the first caption submission. */
export function start(room: Room, customImages: string[] = []): void {
  if (room.players.length < MIN_PLAYERS) {
    throw new GameError(`Need at least ${MIN_PLAYERS} players to start.`);
  }
  const images = buildImages(customImages);
  if (images.length === 0) throw new GameError("No images available.");

  room.game = {
    type: "caption-this",
    images,
    roundIndex: 0,
    captions: {},
    entries: [],
    votes: {},
    lastRoundPoints: {},
  };
  room.phase = "submission";
}

export function submitCaption(room: Room, playerId: string, text: string): void {
  if (room.phase !== "submission") {
    throw new GameError("It's not time to write a caption.");
  }
  const s = state(room);
  if (!findPlayer(room, playerId)) throw new GameError("You're not in this room.");

  const cleaned = text.trim().slice(0, MAX_CAPTION_LEN);
  if (!cleaned) throw new GameError("Please write a caption.");

  s.captions[playerId] = cleaned;

  const everyone = room.players
    .filter((p) => p.connected)
    .every((p) => s.captions[p.id] !== undefined);
  if (everyone) beginVoting(room);
}

function beginVoting(room: Room): void {
  const s = state(room);
  s.entries = shuffle(
    Object.entries(s.captions).map(([authorId, text]) => ({
      id: entryId(),
      authorId,
      text,
      votes: 0,
    }))
  );
  s.votes = {};
  room.phase = "voting";
}

export function vote(room: Room, voterId: string, captionId: string): void {
  if (room.phase !== "voting") throw new GameError("It's not voting time.");
  const s = state(room);
  if (!findPlayer(room, voterId)) throw new GameError("You're not in this room.");

  const entry = s.entries.find((e) => e.id === captionId);
  if (!entry) throw new GameError("That caption isn't available.");
  if (entry.authorId === voterId) {
    throw new GameError("You can't vote for your own caption.");
  }

  s.votes[voterId] = captionId;

  const eligible = room.players.filter((p) => p.connected);
  const allVoted = eligible.every((p) => s.votes[p.id] !== undefined);
  if (allVoted) {
    tally(room);
    room.phase = "reveal";
  }
}

function tally(room: Room): void {
  const s = state(room);
  for (const e of s.entries) e.votes = 0;
  for (const captionId of Object.values(s.votes)) {
    const entry = s.entries.find((e) => e.id === captionId);
    if (entry) entry.votes += 1;
  }
  const points: Record<string, number> = {};
  for (const e of s.entries) {
    if (e.votes > 0) {
      const earned = e.votes * CAPTION_POINTS_PER_VOTE;
      const author = findPlayer(room, e.authorId);
      if (author) author.score += earned;
      points[e.authorId] = (points[e.authorId] ?? 0) + earned;
    }
  }
  s.lastRoundPoints = points;
}

/** Host advances from a reveal to the next round or to results. */
export function advance(room: Room): void {
  if (room.phase !== "reveal") throw new GameError("Nothing to advance from yet.");
  const s = state(room);
  const next = s.roundIndex + 1;
  if (next >= s.images.length) {
    room.phase = "results";
    return;
  }
  s.roundIndex = next;
  s.captions = {};
  s.entries = [];
  s.votes = {};
  s.lastRoundPoints = {};
  room.phase = "submission";
}

export function sanitize(room: Room, viewerId: string): ClientCaptionThis {
  const s = state(room);
  const revealing = room.phase === "reveal";
  const voting = room.phase === "voting";
  const active = room.phase === "submission" || voting || revealing;

  const captions = voting || revealing
    ? s.entries.map((e) => ({
        id: e.id,
        text: e.text,
        isMine: e.authorId === viewerId,
        authorId: revealing ? e.authorId : null,
        votes: revealing ? e.votes : 0,
      }))
    : [];

  return {
    type: "caption-this",
    image: active ? s.images[s.roundIndex] ?? null : null,
    roundIndex: s.roundIndex,
    roundCount: s.images.length,
    captions,
    lastRoundPoints: revealing ? { ...s.lastRoundPoints } : {},
    you: {
      submitted: s.captions[viewerId] !== undefined,
      caption: s.captions[viewerId] ?? "",
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
  return {
    submitted: s.captions[playerId] !== undefined,
    hasVoted: s.votes[playerId] !== undefined,
  };
}
