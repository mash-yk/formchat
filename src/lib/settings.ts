import type { FormSettings } from "./types";

export type ResolvedSettings = {
  primaryColor: string;
  welcomeMessage: string;
  completionMessage: string;
  redirectUrl: string;
  avatarType: "bot" | "sparkles" | "agent" | "smile" | "custom";
  avatarUrl: string;
  botName: string;
  position: "right" | "left";
  theme: "light" | "dark" | "auto";
  notifyEmail: string;
  notifyEnabled: boolean;
  webhookUrl: string;
  webhookSecret: string;
  webhookEnabled: boolean;
  questionMeta: NonNullable<FormSettings["questionMeta"]>;
};

export const DEFAULT_SETTINGS: ResolvedSettings = {
  primaryColor: "#a96325",
  welcomeMessage: "Hi there! 👋 This will only take a minute.",
  completionMessage: "Thanks! Your response has been recorded. 🎉",
  redirectUrl: "",
  avatarType: "bot",
  avatarUrl: "",
  botName: "Assistant",
  position: "right",
  theme: "light",
  notifyEmail: "",
  notifyEnabled: false,
  webhookUrl: "",
  webhookSecret: "",
  webhookEnabled: false,
  questionMeta: {},
};

export const COLOR_PRESETS = [
  "#a96325", // bronze (default)
  "#6c3e20", // espresso
  "#d97706", // amber
  "#059669", // emerald
  "#0891b2", // cyan
  "#2563eb", // blue
  "#4f46e5", // indigo
  "#7c3aed", // violet
  "#e11d48", // rose
  "#18181b", // charcoal
];

export type DesignPreset = {
  name: string;
  primaryColor: string;
  avatarType: "bot" | "sparkles" | "agent" | "smile" | "custom";
  botName: string;
  theme: "light" | "dark" | "auto";
};

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    name: "Classic Bronze",
    primaryColor: "#a96325",
    avatarType: "bot",
    botName: "Formchat",
    theme: "light",
  },
  {
    name: "Modern Indigo",
    primaryColor: "#4f46e5",
    avatarType: "sparkles",
    botName: "AI Assistant",
    theme: "light",
  },
  {
    name: "Emerald Forest",
    primaryColor: "#059669",
    avatarType: "agent",
    botName: "Support Team",
    theme: "light",
  },
  {
    name: "Amber Sunset",
    primaryColor: "#d97706",
    avatarType: "smile",
    botName: "Concierge",
    theme: "light",
  },
  {
    name: "Rose Boutique",
    primaryColor: "#e11d48",
    avatarType: "sparkles",
    botName: "Care Bot",
    theme: "light",
  },
  {
    name: "Sleek Midnight",
    primaryColor: "#18181b",
    avatarType: "bot",
    botName: "Automator",
    theme: "dark",
  },
];

/** Fills in defaults for any setting the owner hasn't customized. */
export function resolveSettings(settings?: FormSettings | null): ResolvedSettings {
  return {
    primaryColor: settings?.primaryColor || DEFAULT_SETTINGS.primaryColor,
    welcomeMessage: settings?.welcomeMessage || DEFAULT_SETTINGS.welcomeMessage,
    completionMessage: settings?.completionMessage || DEFAULT_SETTINGS.completionMessage,
    redirectUrl: settings?.redirectUrl || DEFAULT_SETTINGS.redirectUrl,
    avatarType: settings?.avatarType || DEFAULT_SETTINGS.avatarType,
    avatarUrl: settings?.avatarUrl || DEFAULT_SETTINGS.avatarUrl,
    botName: settings?.botName || DEFAULT_SETTINGS.botName,
    position: settings?.position || DEFAULT_SETTINGS.position,
    theme: settings?.theme || DEFAULT_SETTINGS.theme,
    notifyEmail: settings?.notifyEmail || DEFAULT_SETTINGS.notifyEmail,
    notifyEnabled: Boolean(settings?.notifyEnabled),
    webhookUrl: settings?.webhookUrl || DEFAULT_SETTINGS.webhookUrl,
    webhookSecret: settings?.webhookSecret || DEFAULT_SETTINGS.webhookSecret,
    webhookEnabled: Boolean(settings?.webhookEnabled),
    questionMeta: settings?.questionMeta || DEFAULT_SETTINGS.questionMeta,
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
