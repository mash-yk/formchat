import type { FormSettings } from "./types";

export const DEFAULT_SETTINGS: Required<FormSettings> = {
  primaryColor: "#a96325",
  welcomeMessage: "Hi there! 👋 This will only take a minute.",
  completionMessage: "Thanks! Your response has been recorded. 🎉",
};

export const COLOR_PRESETS = [
  "#a96325", // bronze (default)
  "#6c3e20", // espresso
  "#d97706", // amber
  "#059669", // emerald
  "#0891b2", // cyan
  "#2563eb", // blue
  "#e11d48", // rose
  "#18181b", // charcoal
];

/** Fills in defaults for any setting the owner hasn't customized. */
export function resolveSettings(settings?: FormSettings | null): Required<FormSettings> {
  return {
    primaryColor: settings?.primaryColor || DEFAULT_SETTINGS.primaryColor,
    welcomeMessage: settings?.welcomeMessage || DEFAULT_SETTINGS.welcomeMessage,
    completionMessage: settings?.completionMessage || DEFAULT_SETTINGS.completionMessage,
  };
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white — whichever reads better on the given background color. */
export function readableTextColor(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "#ffffff";
  const l = luminance(hex);
  const contrastWithWhite = 1.05 / (l + 0.05);
  const contrastWithBlack = (l + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? "#ffffff" : "#18181b";
}
