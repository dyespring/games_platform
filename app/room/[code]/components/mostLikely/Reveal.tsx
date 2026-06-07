"use client";

import type { ClientMostLikely, ClientRoom } from "@/lib/game/types";

interface Props {
  room: ClientRoom;
  game: ClientMostLikely;
  onNext: () => void;
}

export default function MostLikelyReveal({ room, game, onNext }: Props) {
  const isLast = game.promptIndex + 1 >= game.promptCount;
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? "?";

  const totalVotes = Object.values(game.counts).reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(0, ...Object.values(game.counts));

  // Rank players who received at least one vote this prompt.
  const ranked = Object.entries(game.counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="animate-pop-in">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Prompt {game.promptIndex + 1} of {game.promptCount}
        </p>
        <h2 className="mt-1 text-2xl font-black leading-tight">
          Most likely to <span className="text-brand">{game.prompt}</span>
        </h2>
      </header>

      <div className="card animate-pop-in">
        {ranked.length === 0 ? (
          <p className="text-center text-slate-400">No votes were cast.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ranked.map(([id, count]) => {
              const isWinner = count === maxVotes;
              const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
              return (
                <li key={id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className={`font-semibold ${isWinner ? "text-brand" : ""}`}>
                      {isWinner && "👑 "}
                      {nameOf(id)}
                    </span>
                    <span className="tabular-nums text-slate-400">
                      {count} {count === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${
                        isWinner ? "bg-brand" : "bg-slate-500"
                      }`}
                      style={{ width: `${Math.max(6, pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {room.you.isHost ? (
        <button onClick={onNext} className="btn-primary">
          {isLast ? "See final results" : "Next prompt"}
        </button>
      ) : (
        <p className="text-center text-slate-400">Waiting for the host to continue...</p>
      )}
    </div>
  );
}
