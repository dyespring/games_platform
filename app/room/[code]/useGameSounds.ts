"use client";

import { useEffect, useRef } from "react";
import type { ClientRoom } from "@/lib/game/types";
import { play, playDelayed } from "@/lib/sound";

/** Plays sound effects by diffing the previous room snapshot against the new one. */
export function useGameSounds(room: ClientRoom | null): void {
  const prev = useRef<ClientRoom | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = room;
    if (!room || !before) return; // skip the first snapshot

    const me = room.you.id;
    const meBefore = before.players.find((p) => p.id === me);
    const meAfter = room.players.find((p) => p.id === me);

    // Game started (leaving the lobby).
    if (before.phase === "lobby" && room.phase !== "lobby") {
      play("start");
    }

    // Phase reveal.
    if (room.phase === "reveal" && before.phase !== "reveal") {
      play("reveal");
    }

    // Final results.
    if (room.phase === "results" && before.phase !== "results") {
      play("win");
    }

    // I earned points this round (works across all games).
    if (meAfter && meBefore && meAfter.score > meBefore.score) {
      playDelayed("points", 280);
    }

    // Someone new joined.
    if (room.players.length > before.players.length) {
      play("join");
    }

    // My own submit / vote got locked in.
    if (meAfter?.submitted && !meBefore?.submitted) play("click");
    if (meAfter?.hasVoted && !meBefore?.hasVoted) play("click");
  }, [room]);
}
