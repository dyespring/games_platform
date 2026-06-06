export type Phase = "lobby" | "submission" | "voting" | "reveal" | "results";

export const STATEMENTS_PER_PLAYER = 3;
export const POINTS_FOR_SPOTTING = 100;
export const POINTS_PER_FOOLED = 50;

/** Server-side player record. Holds secrets (statements, lieIndex). */
export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  score: number;
  /** Set during the submission phase. */
  statements: string[];
  lieIndex: number | null;
  submitted: boolean;
}

/** Authoritative server-side room state. */
export interface Room {
  code: string;
  phase: Phase;
  players: Player[];
  /** Index into players[] of the player currently under the spotlight. */
  spotlightIndex: number;
  /** voterId -> guessed statement index, for the current spotlight player. */
  votes: Record<string, number>;
  /** Points awarded during the most recent reveal: playerId -> points. */
  lastRoundPoints: Record<string, number>;
  createdAt: number;
}

/** Per-client sanitized view of a player (no secrets leaked early). */
export interface ClientPlayer {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  score: number;
  submitted: boolean;
  /** Whether this player has voted on the current spotlight player. */
  hasVoted: boolean;
}

/** Per-client sanitized snapshot of the room, tailored to one viewer. */
export interface ClientRoom {
  code: string;
  phase: Phase;
  players: ClientPlayer[];
  spotlightIndex: number;
  /** Total number of players who will be spotlighted this round. */
  spotlightCount: number;
  /** The current spotlight player's id, or null in lobby/results. */
  spotlightPlayerId: string | null;
  /** The current spotlight player's statements (revealed to everyone during voting). */
  spotlightStatements: string[] | null;
  /** The real lie index, only present during reveal. */
  spotlightLieIndex: number | null;
  /** During reveal: voterId -> guessed index. */
  votes: Record<string, number>;
  /** During reveal: playerId -> points earned this round. */
  lastRoundPoints: Record<string, number>;
  /** Viewer-specific data. */
  you: {
    id: string;
    isHost: boolean;
    statements: string[];
    lieIndex: number | null;
    submitted: boolean;
    /** Whether the viewer has voted on the current spotlight player. */
    hasVoted: boolean;
    /** Whether the viewer is the current spotlight player. */
    isSpotlight: boolean;
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
  "game:start": () => void;
  "statements:submit": (data: { statements: string[]; lieIndex: number }) => void;
  "vote:cast": (data: { guessIndex: number }) => void;
  "spotlight:next": () => void;
  "game:playAgain": () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId?: string;
  code?: string;
}
