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
      {/* bronze glow behind the card */}
      <div className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-bronze-500)_45%,transparent),transparent)] blur-2xl" />

      <div className="space-y-3 rounded-[28px] bg-umber-900/80 p-5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] ring-1 ring-bronze-300/15 backdrop-blur sm:p-6">
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
                  ? "rounded-bl-md bg-umber-800 text-umber-100"
                  : "bg-bronze-metal rounded-br-md font-medium text-umber-950",
              )}
            >
              {line.text}
            </p>
          </div>
        ))}
      </div>

      <div
        className="hero-bubble absolute -bottom-6 left-1/2 flex w-max -translate-x-1/2 items-center gap-2.5 rounded-full bg-umber-950 py-2 pr-4 pl-2.5 text-sm text-umber-100 shadow-lg ring-1 ring-bronze-400/30 sm:left-auto sm:-right-4 sm:translate-x-0"
        style={{ animationDelay: `${300 + lines.length * 550 + 250}ms` }}
      >
        <CircleCheck className="size-5 text-emerald-400" />
        New response saved to your dashboard
      </div>
    </div>
  );
}
