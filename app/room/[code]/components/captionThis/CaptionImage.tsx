"use client";

import { useState } from "react";

interface Props {
  src: string | null;
}

/** Displays the round image with a graceful fallback if the URL fails. */
export default function CaptionImage({ src }: Props) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-white/5 text-sm text-slate-500 ring-1 ring-white/10">
        {src ? "Image failed to load" : "No image"}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Caption this"
        className="mx-auto max-h-[50vh] w-full object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}
