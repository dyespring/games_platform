"use client";

import { avatarEmoji, avatarGradient } from "@/lib/game/avatars";

interface Props {
  avatar: number;
  /** Pixel diameter. */
  size?: number;
  className?: string;
}

/** A small circular player logo: an emoji character over a colour derived from
 *  the avatar index. */
export default function Avatar({ avatar, size = 36, className = "" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-1 ring-white/15 ${className}`}
      style={{
        width: size,
        height: size,
        background: avatarGradient(avatar),
        fontSize: Math.round(size * 0.55),
        lineHeight: 1,
      }}
      aria-hidden
    >
      {avatarEmoji(avatar)}
    </span>
  );
}
