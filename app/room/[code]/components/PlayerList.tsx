"use client";

import type { ClientPlayer } from "@/lib/game/types";

interface Props {
  players: ClientPlayer[];
  /** Optional status badge per player (e.g. "Ready", "Voted"). */
  badge?: (p: ClientPlayer) => string | null;
  highlightId?: string | null;
  showScores?: boolean;
}

export default function PlayerList({ players, badge, highlightId, showScores }: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {players.map((p) => {
        const status = badge?.(p) ?? null;
        return (
          <li
            key={p.id}
            className={`flex items-center justify-between rounded-xl px-4 py-3 ring-1 transition ${
              p.id === highlightId
                ? "bg-brand/15 ring-brand/40"
                : "bg-white/5 ring-white/10"
            } ${p.connected ? "" : "opacity-50"}`}
          >
            <span className="flex items-center gap-2 font-medium">
              <span
                className={`h-2 w-2 rounded-full ${
                  p.connected ? "bg-emerald-400" : "bg-slate-500"
                }`}
                aria-hidden
              />
              {p.name}
              {p.isHost && (
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                  Host
                </span>
              )}
            </span>
            <span className="flex items-center gap-3 text-sm">
              {showScores && (
                <span className="font-bold tabular-nums text-slate-200">{p.score}</span>
              )}
              {status && (
                <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  {status}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
