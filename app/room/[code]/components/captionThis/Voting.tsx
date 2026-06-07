"use client";

import type { ClientCaptionThis, ClientRoom } from "@/lib/game/types";
import CaptionImage from "./CaptionImage";

interface Props {
  room: ClientRoom;
  game: ClientCaptionThis;
  onVote: (value: string) => void;
}

export default function CaptionVoting({ room, game, onVote }: Props) {
  const progress = `${game.roundIndex + 1} of ${game.roundCount}`;
  const voters = room.players.filter((p) => p.connected);
  const votedCount = voters.filter((p) => p.hasVoted).length;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="animate-pop-in">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Round {progress}
        </p>
        <h2 className="text-2xl font-black">Vote for the funniest</h2>
      </header>

      <CaptionImage src={game.image} />

      <div className="flex flex-col gap-3">
        {game.captions.map((c) => {
          const picked = game.you.votedFor === c.id;
          const disabled = c.isMine || game.you.hasVoted;
          return (
            <button
              key={c.id}
              disabled={disabled}
              onClick={() => onVote(c.id)}
              className={`card !py-4 text-left transition hover:ring-brand/50 disabled:hover:ring-white/10 ${
                picked ? "ring-2 ring-brand bg-brand/15" : ""
              } ${c.isMine ? "opacity-60" : ""} ${
                game.you.hasVoted && !picked ? "opacity-50" : ""
              }`}
            >
              &ldquo;{c.text}&rdquo;
              {c.isMine && (
                <span className="ml-2 text-xs font-semibold text-slate-400">(yours)</span>
              )}
            </button>
          );
        })}
      </div>

      {game.you.hasVoted ? (
        <div className="card text-center">
          <p className="font-semibold">Vote locked in!</p>
          <p className="mt-1 text-sm text-slate-400">
            Waiting for others... {votedCount}/{voters.length}
          </p>
        </div>
      ) : (
        <p className="text-center text-sm text-slate-400">
          Tap your favourite caption. (You can&apos;t vote for your own.)
        </p>
      )}
    </div>
  );
}
