const AVATAR_COLORS = [
  "oklch(0.62 0.2 25)",
  "oklch(0.6 0.15 250)",
  "oklch(0.55 0.22 280)",
  "oklch(0.75 0.15 80)",
  "oklch(0.65 0.16 145)",
  "oklch(0.7 0.17 50)",
  "oklch(0.7 0.12 200)",
  "oklch(0.65 0.18 350)",
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
