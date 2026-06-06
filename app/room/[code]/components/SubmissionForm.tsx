"use client";

import { useState } from "react";
import type { ClientRoom } from "@/lib/game/types";
import { STATEMENTS_PER_PLAYER } from "@/lib/game/types";
import PlayerList from "./PlayerList";

interface Props {
  room: ClientRoom;
  onSubmit: (statements: string[], lieIndex: number) => void;
}

export default function SubmissionForm({ room, onSubmit }: Props) {
  const [statements, setStatements] = useState<string[]>(
    Array.from({ length: STATEMENTS_PER_PLAYER }, () => "")
  );
  const [lieIndex, setLieIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (room.you.submitted) {
    const readyCount = room.players.filter((p) => p.submitted).length;
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="card text-center animate-pop-in">
          <h2 className="text-xl font-bold">You&apos;re locked in</h2>
          <p className="mt-2 text-slate-400">
            Waiting for everyone else to submit their statements.
          </p>
          <p className="mt-4 text-3xl font-black tabular-nums text-brand">
            {readyCount}/{room.players.length}
          </p>
        </div>
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Player status
          </h3>
          <PlayerList
            players={room.players}
            highlightId={room.you.id}
            badge={(p) => (p.submitted ? "Ready" : null)}
          />
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    setError(null);
    const cleaned = statements.map((s) => s.trim());
    if (cleaned.some((s) => !s)) {
      setError("Fill in all three statements.");
      return;
    }
    if (lieIndex === null) {
      setError("Tap the toggle to mark which one is your lie.");
      return;
    }
    onSubmit(cleaned, lieIndex);
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="animate-pop-in">
        <h2 className="text-2xl font-black">Write your statements</h2>
        <p className="mt-1 text-slate-400">
          Two should be true, one should be a lie. Mark the lie with the toggle.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {statements.map((value, i) => {
          const isLie = lieIndex === i;
          return (
            <div
              key={i}
              className={`card !p-4 transition ${
                isLie ? "ring-2 ring-rose-400/60" : ""
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Statement {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setLieIndex(i)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    isLie
                      ? "bg-rose-500 text-white"
                      : "bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10"
                  }`}
                >
                  {isLie ? "This is my lie" : "Mark as lie"}
                </button>
              </div>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder={
                  i === 0
                    ? "I once met a celebrity in an elevator"
                    : "Something about you..."
                }
                maxLength={140}
                value={value}
                onChange={(e) => {
                  const next = [...statements];
                  next[i] = e.target.value;
                  setStatements(next);
                }}
              />
            </div>
          );
        })}
      </div>

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/20">
          {error}
        </p>
      )}

      <button onClick={handleSubmit} className="btn-primary">
        Lock in my statements
      </button>
    </div>
  );
}
