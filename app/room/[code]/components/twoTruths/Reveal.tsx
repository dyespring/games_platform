"use client";

import type { ClientRoom, ClientTwoTruths } from "@/lib/game/types";

interface Props {
  room: ClientRoom;
  game: ClientTwoTruths;
  onNext: () => void;
}

export default function TwoTruthsReveal({ room, game, onNext }: Props) {
  const subject = room.players.find((p) => p.id === game.spotlightPlayerId);
  const statements = game.spotlightStatements ?? [];
  const lieIndex = game.spotlightLieIndex;
  const isLast = game.spotlightIndex + 1 >= game.spotlightCount;

  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? "?";

  const guessesByStatement: Record<number, string[]> = {};
  for (const [voterId, idx] of Object.entries(game.votes)) {
    (guessesByStatement[idx] ??= []).push(nameOf(voterId));
  }

  const subjectPoints = subject ? game.lastRoundPoints[subject.id] ?? 0 : 0;
  const fooledCount = subjectPoints / 50;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="animate-pop-in">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Spotlight {game.spotlightIndex + 1} of {game.spotlightCount}
        </p>
        <h2 className="text-2xl font-black">
          <span className="text-brand">{subject?.name}</span>&apos;s reveal
        </h2>
      </header>

      <div className="flex flex-col gap-3">
        {statements.map((s, i) => {
          const isLie = i === lieIndex;
          const guessers = guessesByStatement[i] ?? [];
          return (
            <div
              key={i}
              className={`card !py-4 ring-2 ${
                isLie ? "ring-rose-400/70 bg-rose-500/10" : "ring-emerald-400/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p>
                  <span className="mr-2 font-bold text-slate-400">{i + 1}.</span>
                  {s}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isLie ? "bg-rose-500 text-white" : "bg-emerald-400/20 text-emerald-300"
                  }`}
                >
                  {isLie ? "LIE" : "TRUE"}
                </span>
              </div>
              {guessers.length > 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  Guessed by: {guessers.join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="card animate-pop-in">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
          Points this round
        </h3>
        <ul className="flex flex-col gap-1.5 text-sm">
          {Object.keys(game.lastRoundPoints).length === 0 && (
            <li className="text-slate-400">No points awarded.</li>
          )}
          {Object.entries(game.lastRoundPoints)
            .sort((a, b) => b[1] - a[1])
            .map(([id, pts]) => (
              <li key={id} className="flex justify-between">
                <span>
                  {nameOf(id)}
                  {id === subject?.id && (
                    <span className="ml-2 text-xs text-slate-400">
                      (fooled {fooledCount} {fooledCount === 1 ? "player" : "players"})
                    </span>
                  )}
                </span>
                <span className="font-bold text-emerald-300">+{pts}</span>
              </li>
            ))}
        </ul>
      </div>

      {room.you.isHost ? (
        <button onClick={onNext} className="btn-primary">
          {isLast ? "See final results" : "Next player"}
        </button>
      ) : (
        <p className="text-center text-slate-400">Waiting for the host to continue...</p>
      )}
    </div>
  );
}
