"use client";

import type { ClientRoom } from "@/lib/game/types";

interface Props {
  room: ClientRoom;
  onPlayAgain: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ room, onPlayAgain }: Props) {
  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="text-center animate-pop-in">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Final results
        </p>
        <h2 className="mt-1 text-3xl font-black">
          {winner ? (
            <>
              🎉 <span className="text-brand">{winner.name}</span> wins!
            </>
          ) : (
            "Game over"
          )}
        </h2>
      </header>

      <ol className="flex flex-col gap-2">
        {ranked.map((p, i) => (
          <li
            key={p.id}
            className={`flex items-center justify-between rounded-xl px-4 py-3 ring-1 ${
              i === 0
                ? "bg-brand/15 ring-brand/40"
                : "bg-white/5 ring-white/10"
            } ${p.id === room.you.id ? "outline outline-1 outline-brand/40" : ""}`}
          >
            <span className="flex items-center gap-3 font-semibold">
              <span className="w-6 text-center text-lg">
                {MEDALS[i] ?? <span className="text-sm text-slate-400">{i + 1}</span>}
              </span>
              {p.name}
              {p.id === room.you.id && (
                <span className="text-xs text-slate-400">(you)</span>
              )}
            </span>
            <span className="text-lg font-black tabular-nums text-emerald-300">
              {p.score}
            </span>
          </li>
        ))}
      </ol>

      {room.you.isHost ? (
        <button onClick={onPlayAgain} className="btn-primary">
          Play again
        </button>
      ) : (
        <p className="text-center text-slate-400">
          Thanks for playing! Waiting for the host to start a new round...
        </p>
      )}
    </div>
  );
}
