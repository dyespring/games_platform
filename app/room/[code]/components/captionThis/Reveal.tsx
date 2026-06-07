"use client";

import type { ClientCaptionThis, ClientRoom } from "@/lib/game/types";
import CaptionImage from "./CaptionImage";
import Avatar from "../Avatar";

interface Props {
  room: ClientRoom;
  game: ClientCaptionThis;
  onNext: () => void;
}

export default function CaptionReveal({ room, game, onNext }: Props) {
  const isLast = game.roundIndex + 1 >= game.roundCount;
  const nameOf = (id: string | null) =>
    room.players.find((p) => p.id === id)?.name ?? "?";

  const ranked = [...game.captions].sort((a, b) => b.votes - a.votes);
  const maxVotes = Math.max(0, ...ranked.map((c) => c.votes));
  const avatarOf = (id: string | null) =>
    room.players.find((p) => p.id === id)?.avatar ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="animate-pop-in">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Round {game.roundIndex + 1} of {game.roundCount} — results
        </p>
        <h2 className="text-2xl font-black">The votes are in</h2>
      </header>

      <CaptionImage src={game.image} />

      <div className="flex flex-col gap-3">
        {ranked.map((c) => {
          const isWinner = c.votes > 0 && c.votes === maxVotes;
          return (
            <div
              key={c.id}
              className={`card !py-4 ring-2 ${
                isWinner ? "ring-brand bg-brand/10" : "ring-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p>
                  {isWinner && "👑 "}
                  &ldquo;{c.text}&rdquo;
                </p>
                <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold tabular-nums">
                  {c.votes} {c.votes === 1 ? "vote" : "votes"}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                <Avatar avatar={avatarOf(c.authorId)} size={20} />
                by {nameOf(c.authorId)}
                {c.authorId === room.you.id && " (you)"}
                {c.votes > 0 && (
                  <span className="ml-1 font-semibold text-emerald-300">
                    +{game.lastRoundPoints[c.authorId ?? ""] ?? c.votes * 100}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      {room.you.isHost ? (
        <button onClick={onNext} className="btn-primary">
          {isLast ? "See final results" : "Next round"}
        </button>
      ) : (
        <p className="text-center text-slate-400">Waiting for the host to continue...</p>
      )}
    </div>
  );
}
