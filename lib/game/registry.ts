import type { GameType } from "./types";

export interface GameMeta {
  id: GameType;
  name: string;
  tagline: string;
  emoji: string;
  minPlayers: number;
}

/** Client-safe metadata for each game (no server-only logic or data). */
export const GAMES: Record<GameType, GameMeta> = {
  "two-truths": {
    id: "two-truths",
    name: "Two Truths, One Lie",
    tagline: "Submit two truths and one lie. Can the team spot the fib?",
    emoji: "🤥",
    minPlayers: 2,
  },
  "most-likely": {
    id: "most-likely",
    name: "Most Likely To",
    tagline: "Vote on who's most likely to... See who the team picks.",
    emoji: "🎯",
    minPlayers: 3,
  },
  "caption-this": {
    id: "caption-this",
    name: "Caption This",
    tagline: "Caption a funny image, then vote for the funniest.",
    emoji: "💬",
    minPlayers: 3,
  },
};

export const GAME_LIST: GameMeta[] = Object.values(GAMES);
