"use client";

import { useState } from "react";
import type { ClientRoom, GameType } from "@/lib/game/types";
import { GAME_LIST, GAMES } from "@/lib/game/registry";
import PlayerList from "./PlayerList";

interface Props {
  room: ClientRoom;
  onSelectGame: (gameType: GameType) => void;
  onStart: (options?: { customPrompts?: string[]; customImages?: string[] }) => void;
}

export default function Lobby({ room, onSelectGame, onStart }: Props) {
  const [copied, setCopied] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [imageText, setImageText] = useState("");

  const selected = room.gameType;
  const meta = selected ? GAMES[selected] : null;
  const enoughPlayers = meta ? room.players.length >= meta.minPlayers : false;
  const canStart = room.you.isHost && !!selected && enoughPlayers;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; the code is on screen regardless.
    }
  };

  const splitLines = (text: string) =>
    text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  const handleStart = () => {
    if (selected === "most-likely") {
      const customPrompts = splitLines(promptText);
      onStart(customPrompts.length ? { customPrompts } : undefined);
    } else if (selected === "caption-this") {
      const customImages = splitLines(imageText);
      onStart(customImages.length ? { customImages } : undefined);
    } else {
      onStart();
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

      <div className="card">
        <h2 className="mb-3 text-lg font-bold">Choose a game</h2>
        <div className="flex flex-col gap-3">
          {GAME_LIST.map((g) => {
            const isSelected = selected === g.id;
            const disabled = !room.you.isHost;
            return (
              <button
                key={g.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectGame(g.id)}
                className={`flex items-start gap-3 rounded-xl p-4 text-left ring-1 transition disabled:cursor-not-allowed ${
                  isSelected
                    ? "bg-brand/15 ring-brand/50"
                    : "bg-white/5 ring-white/10 hover:bg-white/10"
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {g.emoji}
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-bold">
                    {g.name}
                    {isSelected && (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Selected
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-400">{g.tagline}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {g.minPlayers}+ players
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {!room.you.isHost && (
          <p className="mt-3 text-center text-sm text-slate-400">
            The host picks the game.
          </p>
        )}

        {room.you.isHost && selected === "most-likely" && (
          <div className="mt-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-300">
                Add your own prompts (optional, one per line)
              </span>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder={"most likely to...\nmost likely to..."}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
            </label>
            <p className="mt-1 text-xs text-slate-500">
              We&apos;ll mix these with our built-in prompts.
            </p>
          </div>
        )}

        {room.you.isHost && selected === "caption-this" && (
          <div className="mt-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-300">
                Add your own image URLs (optional, one per line)
              </span>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder={"https://example.com/funny.jpg\nhttps://..."}
                value={imageText}
                onChange={(e) => setImageText(e.target.value)}
              />
            </label>
            <p className="mt-1 text-xs text-slate-500">
              We&apos;ll mix these with our built-in images. Paste a team photo for laughs!
            </p>
          </div>
        )}
      </div>

      {room.you.isHost ? (
        <button onClick={handleStart} className="btn-primary" disabled={!canStart}>
          {!selected
            ? "Pick a game to start"
            : !enoughPlayers
            ? `Need ${meta?.minPlayers}+ players...`
            : "Start game"}
        </button>
      ) : (
        <p className="text-center text-slate-400">
          Waiting for the host to start
          {meta ? ` ${meta.name}` : ""}...
        </p>
      )}
    </div>
  );
}
