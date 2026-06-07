/**
 * Lightweight player avatars: a curated set of emoji "characters". Each player
 * is assigned an index on join; the UI renders the emoji over a colour derived
 * from the index. There are more avatars than the max room size (12), so players
 * in a room never collide.
 */
export const AVATARS: string[] = [
  "🦊", "🐼", "🐸", "🐵", "🐶", "🐱",
  "🦁", "🐯", "🐨", "🐰", "🐻", "🐷",
  "🐔", "🐧", "🦉", "🐙", "🦄", "🐢",
  "🐝", "🦋", "🐳", "🦖", "🦦", "🦔",
];

export function avatarEmoji(index: number): string {
  return AVATARS[((index % AVATARS.length) + AVATARS.length) % AVATARS.length];
}

/** Deterministic, distinct gradient colours per avatar index (CSS, no Tailwind). */
export function avatarGradient(index: number): string {
  const hue = (index * 47) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))`;
}
