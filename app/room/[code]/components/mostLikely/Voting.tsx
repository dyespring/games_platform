"use client";

import type { ClientMostLikely, ClientRoom } from "@/lib/game/types";
import Avatar from "../Avatar";

interface Props {
  room: ClientRoom;
  game: ClientMostLikely;
  onVote: (value: string) => void;
}

export default function MostLikelyVoting({ room, game, onVote }: Props) {
  const progress = `${game.promptIndex + 1} of ${game.promptCount}`;
  const candidates = room.players.filter((p) => p.id !== room.you.id);
  const voters = room.players.filter((p) => p.connected);
  const votedCount = voters.filter((p) => p.hasVoted).length;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="animate-pop-in">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Prompt {progress}
        </p>
        <h2 className="mt-1 text-2xl font-black leading-tight">
          Most likely to <span className="text-brand">{game.prompt}</span>
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {candidates.map((p) => {
          const picked = game.you.votedFor === p.id;
          return (
            <button
              key={p.id}
              disabled={game.you.hasVoted}
              onClick={() => onVote(p.id)}
              className={`card flex items-center gap-2.5 !p-4 text-left font-semibold transition hover:ring-brand/50 disabled:hover:ring-white/10 ${
                picked ? "ring-2 ring-brand bg-brand/15" : ""
              } ${game.you.hasVoted && !picked ? "opacity-50" : ""}`}
            >
              <Avatar avatar={p.avatar} size={32} />
              <span>
                {p.name}
                {!p.connected && (
                  <span className="ml-1 text-xs text-slate-500">(away)</span>
                )}
              </span>
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
          Tap the person who&apos;s most likely. (You can&apos;t pick yourself.)
        </p>
      )}
    </div>
  );
}
