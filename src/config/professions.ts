export const PROFESSION_KEYS = [
  "frontend",
  "backend",
  "mobile",
  "uiux",
  "data",
  "ai",
  "qa",
  "devops",
  "security",
  "gamedev",
  "pm",
  "cloud",
] as const;

export type ProfessionKey = (typeof PROFESSION_KEYS)[number];

export interface ProfessionMeta {
  key: ProfessionKey;
  /** Orbit ring index (0 = inner, 2 = outer). */
  ring: 0 | 1 | 2;
  /** Hue 0-360 for the label dot and glow. */
  hue: number;
  months: number;
}

export const PROFESSIONS: readonly ProfessionMeta[] = [
  { key: "frontend", ring: 0, hue: 210, months: 6 },
  { key: "backend", ring: 0, hue: 265, months: 7 },
  { key: "mobile", ring: 0, hue: 330, months: 7 },
  { key: "uiux", ring: 0, hue: 18, months: 5 },
  { key: "data", ring: 1, hue: 150, months: 8 },
  { key: "ai", ring: 1, hue: 285, months: 9 },
  { key: "qa", ring: 1, hue: 45, months: 4 },
  { key: "devops", ring: 1, hue: 190, months: 6 },
  { key: "security", ring: 2, hue: 0, months: 8 },
  { key: "gamedev", ring: 2, hue: 310, months: 9 },
  { key: "pm", ring: 2, hue: 100, months: 4 },
  { key: "cloud", ring: 2, hue: 225, months: 6 },
];

export function isProfessionKey(value: string): value is ProfessionKey {
  return (PROFESSION_KEYS as readonly string[]).includes(value);
}
