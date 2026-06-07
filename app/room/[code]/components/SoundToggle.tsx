"use client";

import { useEffect, useState } from "react";
import { armAudio, getMuted, setMuted } from "@/lib/sound";

export default function SoundToggle() {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(getMuted());
    armAudio();
  }, []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
      title={muted ? "Unmute" : "Mute"}
      className="fixed right-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-lg ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
