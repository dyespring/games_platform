import { GameError } from "../errors";
import {
  ClientTwoTruths,
  POINTS_FOR_SPOTTING,
  POINTS_PER_FOOLED,
  Player,
  Room,
  STATEMENTS_PER_PLAYER,
  TwoTruthsState,
} from "../types";

function state(room: Room): TwoTruthsState {
  if (room.game?.type !== "two-truths") {
    throw new GameError("Wrong game in progress.");
  }
  return room.game;
}

function findPlayer(room: Room, id: string): Player | undefined {
  return room.players.find((p) => p.id === id);
}

export const MIN_PLAYERS = 2;

/** Initialise game state and move the room into the submission phase. */
export function start(room: Room): void {
  if (room.players.length < MIN_PLAYERS) {
    throw new GameError(`Need at least ${MIN_PLAYERS} players to start.`);
  }
  room.game = {
    type: "two-truths",
    submissions: {},
    spotlightOrder: [],
    spotlightIndex: 0,
    votes: {},
    lastRoundPoints: {},
  };
  room.phase = "submission";
}

export function submit(
  room: Room,
  playerId: string,
  statements: string[],
  lieIndex: number
): void {
  if (room.phase !== "submission") {
    throw new GameError("It's not time to submit statements.");
  }
  const s = state(room);
  if (!findPlayer(room, playerId)) throw new GameError("You're not in this room.");

  const cleaned = statements.map((x) => x.trim());
  if (cleaned.length !== STATEMENTS_PER_PLAYER || cleaned.some((x) => !x)) {
    throw new GameError(`Please fill in all ${STATEMENTS_PER_PLAYER} statements.`);
  }
  if (lieIndex < 0 || lieIndex >= STATEMENTS_PER_PLAYER) {
    throw new GameError("Please mark which statement is the lie.");
  }

  s.submissions[playerId] = { statements: cleaned, lieIndex };

  const everyoneSubmitted = room.players
    .filter((p) => p.connected)
    .every((p) => s.submissions[p.id] !== undefined);
  if (everyoneSubmitted) beginVoting(room);
}

function beginVoting(room: Room): void {
  const s = state(room);
  // Only players who actually submitted can be spotlighted.
  s.spotlightOrder = room.players
    .filter((p) => s.submissions[p.id] !== undefined)
    .map((p) => p.id);
  s.spotlightIndex = 0;
  s.votes = {};
  s.lastRoundPoints = {};
  room.phase = "voting";
}

function currentSubjectId(s: TwoTruthsState): string | undefined {
  return s.spotlightOrder[s.spotlightIndex];
}

export function vote(room: Room, voterId: string, value: string): void {
  if (room.phase !== "voting") throw new GameError("It's not voting time.");
  const s = state(room);
  const subjectId = currentSubjectId(s);
  if (!subjectId) throw new GameError("No one is in the spotlight.");
  if (voterId === subjectId) {
    throw new GameError("You can't vote on your own statements.");
  }
  if (!findPlayer(room, voterId)) throw new GameError("You're not in this room.");

  const guessIndex = Number(value);
  if (!Number.isInteger(guessIndex) || guessIndex < 0 || guessIndex >= STATEMENTS_PER_PLAYER) {
    throw new GameError("Invalid choice.");
  }

  s.votes[voterId] = guessIndex;

  const eligible = room.players.filter((p) => p.connected && p.id !== subjectId);
  const allVoted = eligible.every((p) => s.votes[p.id] !== undefined);
  if (allVoted) {
    score(room);
    room.phase = "reveal";
  }
}

function score(room: Room): void {
  const s = state(room);
  const subjectId = currentSubjectId(s);
  if (!subjectId) return;
  const subject = findPlayer(room, subjectId);
  const submission = s.submissions[subjectId];
  if (!subject || !submission) return;

  const points: Record<string, number> = {};
  for (const [voterId, guess] of Object.entries(s.votes)) {
    const voter = findPlayer(room, voterId);
    if (!voter) continue;
    if (guess === submission.lieIndex) {
      voter.score += POINTS_FOR_SPOTTING;
      points[voterId] = (points[voterId] ?? 0) + POINTS_FOR_SPOTTING;
    } else {
      subject.score += POINTS_PER_FOOLED;
      points[subjectId] = (points[subjectId] ?? 0) + POINTS_PER_FOOLED;
    }
  }
  s.lastRoundPoints = points;
}

/** Host advances from a reveal to the next spotlight or to results. */
export function advance(room: Room): void {
  if (room.phase !== "reveal") throw new GameError("Nothing to advance from yet.");
  const s = state(room);
  const next = s.spotlightIndex + 1;
  if (next >= s.spotlightOrder.length) {
    room.phase = "results";
    return;
  }
  s.spotlightIndex = next;
  s.votes = {};
  s.lastRoundPoints = {};
  room.phase = "voting";
}

export function sanitize(room: Room, viewerId: string): ClientTwoTruths {
  const s = state(room);
  const revealing = room.phase === "reveal";
  const active = room.phase === "voting" || room.phase === "reveal";
  const subjectId = active ? currentSubjectId(s) : undefined;
  const subjectSubmission = subjectId ? s.submissions[subjectId] : undefined;
  const mine = s.submissions[viewerId];

  return {
    type: "two-truths",
    spotlightIndex: s.spotlightIndex,
    spotlightCount: s.spotlightOrder.length,
    spotlightPlayerId: subjectId ?? null,
    spotlightStatements: subjectSubmission ? subjectSubmission.statements : null,
    spotlightLieIndex: revealing && subjectSubmission ? subjectSubmission.lieIndex : null,
    votes: revealing ? { ...s.votes } : {},
    lastRoundPoints: revealing ? { ...s.lastRoundPoints } : {},
    you: {
      statements: mine?.statements ?? [],
      lieIndex: mine?.lieIndex ?? null,
      submitted: mine !== undefined,
      hasVoted: s.votes[viewerId] !== undefined,
      isSpotlight: subjectId === viewerId,
    },
  };
}

/** Per-player flags for the shared player list. */
export function playerFlags(
  room: Room,
  playerId: string
): { submitted: boolean; hasVoted: boolean } {
  const s = state(room);
  return {
    submitted: s.submissions[playerId] !== undefined,
    hasVoted: s.votes[playerId] !== undefined,
  };
}
