"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

type Style = "datetime" | "date" | "relative";

/**
 * Shows a timestamp in the VIEWER's time zone (e.g. Dhaka), not the server's
 * (Vercel runs in UTC). The server renders a UTC fallback; the browser swaps in
 * local time right after hydration without a hydration mismatch.
 */
export function LocalTime({ iso, style = "datetime" }: { iso: string; style?: Style }) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const date = new Date(iso);
  return (
    <time dateTime={iso} title={isClient ? date.toLocaleString() : iso}>
      {format(date, style, isClient ? undefined : "UTC")}
    </time>
  );
}

function format(date: Date, style: Style, timeZone?: string) {
  if (style === "date") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone });
  }
  if (style === "relative" && !timeZone) {
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ["year", 31536000],
      ["month", 2592000],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
    ];
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    for (const [unit, secs] of units) {
      if (Math.abs(seconds) >= secs) return rtf.format(Math.round(seconds / secs), unit);
    }
    return "just now";
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}
