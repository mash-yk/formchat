import { CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const lines: { from: "bot" | "user"; text: string }[] = [
  { from: "bot", text: "Hi! 👋 Planning an event with us?" },
  { from: "user", text: "Yes, a birthday party in June" },
  { from: "bot", text: "Lovely. What’s the best email to reach you?" },
  { from: "user", text: "maya@example.com" },
  { from: "bot", text: "Thanks, Maya! We’ll reply today." },
];

/**
 * The hero's one orchestrated moment: a short exchange that types itself in on
 * page load, ending with the response arriving in the owner's dashboard.
 */
export function HeroConversation() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md">
      <div className="space-y-3 rounded-[28px] bg-white p-5 shadow-[0_30px_60px_-30px_rgba(26,24,56,0.35)] ring-1 ring-ink/5 sm:p-6">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn("hero-bubble flex", line.from === "bot" ? "justify-start" : "justify-end")}
            style={{ animationDelay: `${300 + i * 550}ms` }}
          >
            <p
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug",
                line.from === "bot"
                  ? "rounded-bl-md bg-lilac text-ink"
                  : "rounded-br-md bg-indigo-600 text-white",
              )}
            >
              {line.text}
            </p>
          </div>
        ))}
      </div>

      <div
        className="hero-bubble absolute -bottom-6 left-1/2 flex w-max -translate-x-1/2 items-center gap-2.5 rounded-full bg-ink py-2 pr-4 pl-2.5 text-sm text-white shadow-lg sm:left-auto sm:-right-4 sm:translate-x-0"
        style={{ animationDelay: `${300 + lines.length * 550 + 250}ms` }}
      >
        <CircleCheck className="size-5 text-emerald-400" />
        New response saved to your dashboard
      </div>
    </div>
  );
}
