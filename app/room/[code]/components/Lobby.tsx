"use client";

import { useState } from "react";
import type { ClientRoom } from "@/lib/game/types";
import PlayerList from "./PlayerList";

interface Props {
  room: ClientRoom;
  onStart: () => void;
}

export default function Lobby({ room, onStart }: Props) {
  const [copied, setCopied] = useState(false);
  const canStart = room.you.isHost && room.players.length >= 2;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; the code is on screen regardless.
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="card text-center animate-pop-in">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Room code
        </p>
        <button
          onClick={copyCode}
          className="mt-1 text-5xl font-black tracking-[0.3em] text-brand"
          title="Tap to copy"
        >
          {room.code}
        </button>
        <p className="mt-2 text-xs text-slate-500">
          {copied ? "Copied!" : "Tap the code to copy and share it"}
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-bold">
          Players <span className="text-slate-400">({room.players.length})</span>
        </h2>
        <PlayerList players={room.players} highlightId={room.you.id} />
      </div>

      {room.you.isHost ? (
        <button onClick={onStart} className="btn-primary" disabled={!canStart}>
          {canStart ? "Start game" : "Waiting for 2+ players..."}
        </button>
      ) : (
        <p className="text-center text-slate-400">
          Waiting for the host to start the game...
        </p>
      )}
    </div>
  );
}
