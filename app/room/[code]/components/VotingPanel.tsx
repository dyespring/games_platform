"use client";

import type { ClientRoom } from "@/lib/game/types";

interface Props {
  room: ClientRoom;
  onVote: (guessIndex: number) => void;
}

export default function VotingPanel({ room, onVote }: Props) {
  const subject = room.players.find((p) => p.id === room.spotlightPlayerId);
  const statements = room.spotlightStatements ?? [];
  const progress = `${room.spotlightIndex + 1} of ${room.spotlightCount}`;

  const voters = room.players.filter(
    (p) => p.id !== room.spotlightPlayerId && p.connected
  );
  const votedCount = voters.filter((p) => p.hasVoted).length;

  const header = (
    <header className="animate-pop-in">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        Spotlight {progress}
      </p>
      <h2 className="text-2xl font-black">
        {room.you.isSpotlight ? (
          "You're in the spotlight"
        ) : (
          <>
            Which is <span className="text-brand">{subject?.name}</span>&apos;s lie?
          </>
        )}
      </h2>
    </header>
  );

  if (room.you.isSpotlight) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        {header}
        <div className="card text-center">
          <p className="text-slate-300">
            The others are guessing which of your statements is the lie.
          </p>
          <p className="mt-4 text-3xl font-black tabular-nums text-brand">
            {votedCount}/{voters.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">votes in</p>
        </div>
        <div className="flex flex-col gap-3 opacity-70">
          {statements.map((s, i) => (
            <div key={i} className="card !py-4">
              {s}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {header}

      <div className="flex flex-col gap-3">
        {statements.map((s, i) => (
          <button
            key={i}
            disabled={room.you.hasVoted}
            onClick={() => onVote(i)}
            className="card !py-4 text-left transition hover:ring-brand/50 disabled:opacity-60 disabled:hover:ring-white/10"
          >
            <span className="mr-2 font-bold text-brand">{i + 1}.</span>
            {s}
          </button>
        ))}
      </div>

      {room.you.hasVoted ? (
        <div className="card text-center">
          <p className="font-semibold">Vote locked in!</p>
          <p className="mt-1 text-sm text-slate-400">
            Waiting for others... {votedCount}/{voters.length}
          </p>
        </div>
      ) : (
        <p className="text-center text-sm text-slate-400">
          Tap the statement you think is the lie.
        </p>
      )}
    </div>
  );
}
