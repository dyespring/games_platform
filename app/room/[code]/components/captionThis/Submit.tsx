"use client";

import { useState } from "react";
import type { ClientCaptionThis, ClientRoom } from "@/lib/game/types";
import PlayerList from "../PlayerList";
import CaptionImage from "./CaptionImage";

interface Props {
  room: ClientRoom;
  game: ClientCaptionThis;
  onSubmit: (text: string) => void;
}

export default function CaptionSubmit({ room, game, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const progress = `${game.roundIndex + 1} of ${game.roundCount}`;

  if (game.you.submitted) {
    const readyCount = room.players.filter((p) => p.submitted).length;
    return (
      <div className="flex flex-1 flex-col gap-6">
        <header className="animate-pop-in">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Round {progress}
          </p>
          <h2 className="text-xl font-bold">Caption submitted!</h2>
        </header>
        <CaptionImage src={game.image} />
        <div className="card text-center">
          <p className="text-slate-300">Your caption:</p>
          <p className="mt-1 font-semibold text-brand">&ldquo;{game.you.caption}&rdquo;</p>
          <p className="mt-4 text-3xl font-black tabular-nums text-brand">
            {readyCount}/{room.players.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">captions in</p>
        </div>
        <div className="card">
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
    if (!text.trim()) {
      setError("Write a caption first.");
      return;
    }
    onSubmit(text.trim());
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="animate-pop-in">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Round {progress}
        </p>
        <h2 className="text-2xl font-black">Caption this!</h2>
      </header>

      <CaptionImage src={game.image} />

      <textarea
        className="input resize-none"
        rows={3}
        placeholder="Write the funniest caption you can..."
        maxLength={100}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/20">
          {error}
        </p>
      )}

      <button onClick={handleSubmit} className="btn-primary">
        Submit caption
      </button>
    </div>
  );
}
