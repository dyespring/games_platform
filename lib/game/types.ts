export type GameType = "two-truths" | "most-likely" | "caption-this";

/**
 * Shared phase machine across games:
 * - lobby: players join; host picks a game and starts
 * - submission: players enter content (Two Truths only)
 * - voting: players cast votes for the current round
 * - reveal: the round result is shown; host advances
 * - results: final leaderboard; host can return to the lobby
 */
export type Phase = "lobby" | "submission" | "voting" | "reveal" | "results";

export const STATEMENTS_PER_PLAYER = 3;
export const POINTS_FOR_SPOTTING = 100;
export const POINTS_PER_FOOLED = 50;
export const MOST_LIKELY_DEFAULT_ROUNDS = 7;
export const CAPTION_DEFAULT_ROUNDS = 4;
export const CAPTION_POINTS_PER_VOTE = 100;

// ---- Shared server-side state ----

/** Game-agnostic player record. `score` is the running tally for the active game. */
export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  score: number;
  /** Index into the AVATARS list, assigned on join. */
  avatar: number;
}

/** Two Truths, One Lie game state. */
export interface TwoTruthsState {
  type: "two-truths";
  /** playerId -> their submission. */
  submissions: Record<string, { statements: string[]; lieIndex: number }>;
  /** Order in which players are spotlighted. */
  spotlightOrder: string[];
  spotlightIndex: number;
  /** voterId -> guessed statement index for the current spotlight player. */
  votes: Record<string, number>;
  /** playerId -> points earned in the most recent reveal. */
  lastRoundPoints: Record<string, number>;
}

/** Most Likely To game state. */
export interface MostLikelyState {
  type: "most-likely";
  prompts: string[];
  promptIndex: number;
  /** voterId -> the playerId they voted for, for the current prompt. */
  votes: Record<string, string>;
  /** playerId -> votes received in the most recent reveal. */
  lastRoundCounts: Record<string, number>;
}

/** A single submitted caption with its (hidden) author and tally. */
export interface CaptionEntry {
  id: string;
  authorId: string;
  text: string;
  votes: number;
}

/** Caption This game state. */
export interface CaptionThisState {
  type: "caption-this";
  /** One image URL per round. */
  images: string[];
  roundIndex: number;
  /** playerId -> submitted caption text for the current round. */
  captions: Record<string, string>;
  /** Shuffled, anonymized caption entries, built when voting begins. */
  entries: CaptionEntry[];
  /** voterId -> the caption entry id they voted for. */
  votes: Record<string, string>;
  /** playerId -> points earned in the most recent reveal. */
  lastRoundPoints: Record<string, number>;
}

export type GameState = TwoTruthsState | MostLikelyState | CaptionThisState;

/** Authoritative server-side room state. */
export interface Room {
  code: string;
  /** Selected in the lobby; null until the host picks. */
  gameType: GameType | null;
  phase: Phase;
  players: Player[];
  /** Active game state, present once the game starts. */
  game: GameState | null;
  createdAt: number;
}

// ---- Per-client sanitized views ----

export interface ClientPlayer {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  score: number;
  avatar: number;
  /** Has finished the submission step (Two Truths). */
  submitted: boolean;
  /** Has voted in the current round. */
  hasVoted: boolean;
}

export interface ClientTwoTruths {
  type: "two-truths";
  spotlightIndex: number;
  spotlightCount: number;
  spotlightPlayerId: string | null;
  spotlightStatements: string[] | null;
  /** Only present during reveal. */
  spotlightLieIndex: number | null;
  /** During reveal: voterId -> guessed index. */
  votes: Record<string, number>;
  /** During reveal: playerId -> points earned. */
  lastRoundPoints: Record<string, number>;
  you: {
    statements: string[];
    lieIndex: number | null;
    submitted: boolean;
    hasVoted: boolean;
    isSpotlight: boolean;
  };
}

export interface ClientMostLikely {
  type: "most-likely";
  prompt: string | null;
  promptIndex: number;
  promptCount: number;
  /** During reveal: playerId -> votes received this prompt. */
  counts: Record<string, number>;
  /** During reveal: voterId -> the playerId they voted for. */
  votes: Record<string, string>;
  you: {
    hasVoted: boolean;
    votedFor: string | null;
  };
}

export interface ClientCaption {
  id: string;
  text: string;
  /** The viewer's own caption. */
  isMine: boolean;
  /** Author revealed only during reveal. */
  authorId: string | null;
  /** Vote count revealed only during reveal. */
  votes: number;
}

export interface ClientCaptionThis {
  type: "caption-this";
  image: string | null;
  roundIndex: number;
  roundCount: number;
  /** Anonymized & shuffled during voting; with author + votes during reveal. */
  captions: ClientCaption[];
  /** During reveal: playerId -> points earned. */
  lastRoundPoints: Record<string, number>;
  you: {
    submitted: boolean;
    caption: string;
    hasVoted: boolean;
    /** The caption id the viewer voted for. */
    votedFor: string | null;
  };
}

export type ClientGameView = ClientTwoTruths | ClientMostLikely | ClientCaptionThis;

/** Per-client sanitized snapshot, tailored to one viewer. */
export interface ClientRoom {
  code: string;
  gameType: GameType | null;
  phase: Phase;
  players: ClientPlayer[];
  game: ClientGameView | null;
  you: {
    id: string;
    isHost: boolean;
  };
}

// ---- Socket event payloads ----

export interface ServerToClientEvents {
  "room:update": (snapshot: ClientRoom) => void;
  "room:joined": (data: { code: string; playerId: string }) => void;
  "room:error": (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  "room:create": (data: { name: string }) => void;
  "room:join": (data: { code: string; name: string }) => void;
  "player:identify": (data: { code: string; playerId: string }) => void;
  "game:select": (data: { gameType: GameType }) => void;
  "game:start": (data?: { customPrompts?: string[]; customImages?: string[] }) => void;
  "statements:submit": (data: { statements: string[]; lieIndex: number }) => void;
  "caption:submit": (data: { text: string }) => void;
  /** Generalized vote: Two Truths sends the statement index as a string;
   *  Most Likely sends the voted-for playerId. */
  "vote:cast": (data: { value: string }) => void;
  "game:advance": () => void;
  "game:playAgain": () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId?: string;
  code?: string;
}
