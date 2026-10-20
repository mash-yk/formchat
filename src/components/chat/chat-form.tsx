"use client";

import {
  Bot,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Paperclip,
  RotateCcw,
  Search,
  SendHorizontal,
  Smile,
  Sparkles,
  Star,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { isQuestionConditionMet } from "@/lib/conditional";
import { readableTextColor, resolveSettings } from "@/lib/settings";
import type { ChatFormData, ChatQuestion, ResponseSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatAnswer, LIMITS, validateAnswer } from "@/lib/validation";

type Props = {
  form: ChatFormData;
  /** "preview" never saves anything — used by the builder, share page and landing demo. */
  mode: "live" | "preview";
  source?: ResponseSource;
  /** "embed" adds a close button that tells the host page (widget.js) to close the iframe. */
  variant?: "page" | "embed" | "card";
  /** Focus the input automatically. Off for the landing demo so the page doesn't jump. */
  autoFocus?: boolean;
};

type Phase = "chatting" | "submitting" | "done" | "failed";
type Message = { key: string; from: "bot" | "user"; text: string; note?: string; tone?: "error" };

const TYPING_MS = 600;

export function ChatForm({
  form,
  mode,
  source = "link",
  variant = "page",
  autoFocus = true,
}: Props) {
  const settings = resolveSettings(form.settings);
  const allQuestions = form.questions;

  const [run, setRun] = useState(0); // bump to restart
  const [introShown, setIntroShown] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [shownIndex, setShownIndex] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("chatting");
  const [failure, setFailure] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef<number>(0);
  const hasFiredStart = useRef(false);
  const interacted = useRef(false);

  useEffect(() => {
    if (!startedAt.current) {
      startedAt.current = Date.now();
    }
  }, []);

  // Dynamically compute which questions are active based on previous answers
  const activeQuestions = useMemo(() => {
    return allQuestions.filter((q) => isQuestionConditionMet(q.logic, answers));
  }, [allQuestions, answers]);

  const total = activeQuestions.length;
  const current: ChatQuestion | undefined = activeQuestions[stepIndex];
  const questionVisible =
    phase === "chatting" && introShown && !!current && shownIndex >= stepIndex;
  const typing =
    !introShown ||
    phase === "submitting" ||
    (phase === "chatting" && !!current && shownIndex < stepIndex);

  // Track form view impression in live mode
  useEffect(() => {
    if (mode !== "live") return;
    void fetch(`/api/forms/${form.slug}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "view" }),
    }).catch(() => {});
  }, [form.slug, mode]);

  // 1) Welcome message after a short "typing" pause
  useEffect(() => {
    const t = setTimeout(() => setIntroShown(true), TYPING_MS);
    return () => clearTimeout(t);
  }, [run]);

  // 2) Reveal current question after typing pause
  useEffect(() => {
    if (!introShown || phase !== "chatting" || shownIndex >= stepIndex || stepIndex >= total)
      return;
    const t = setTimeout(() => setShownIndex(stepIndex), TYPING_MS);
    return () => clearTimeout(t);
  }, [introShown, phase, shownIndex, stepIndex, total]);

  // Keep newest message in view
  const messageCount = stepIndex + (introShown ? 1 : 0) + (questionVisible ? 1 : 0);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messageCount, typing, phase, inputError]);

  // Esc closes the embedded widget
  useEffect(() => {
    if (variant !== "embed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.parent?.postMessage({ type: "formchat:close" }, "*");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  // Auto focus input when question appears
  useEffect(() => {
    if (questionVisible && (autoFocus || interacted.current)) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [questionVisible, stepIndex, autoFocus]);

  // Handle optional redirect on completion
  useEffect(() => {
    if (
      phase !== "done" ||
      !settings.redirectUrl ||
      mode === "preview" ||
      redirectCountdown === null
    ) {
      return;
    }
    if (redirectCountdown <= 0) {
      window.location.href = settings.redirectUrl;
      return;
    }
    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, settings.redirectUrl, mode, redirectCountdown]);

  function answer(value: string) {
    if (!current || !questionVisible) return;
    interacted.current = true;

    // Fire start event on first answer in live mode
    if (mode === "live" && !hasFiredStart.current) {
      hasFiredStart.current = true;
      void fetch(`/api/forms/${form.slug}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "start" }),
      }).catch(() => {});
    }

    const result = validateAnswer(current, value);
    if (!result.ok) {
      setInputError(result.error);
      inputRef.current?.focus({ preventScroll: true });
      return;
    }

    const nextAnswers = { ...answers, [current.id]: result.value };
    setAnswers(nextAnswers);
    setDraft("");
    setInputError(null);

    // Compute updated active questions with new answer
    const nextActive = allQuestions.filter((q) => isQuestionConditionMet(q.logic, nextAnswers));
    const nextStep = stepIndex + 1;

    setStepIndex(nextStep);
    if (nextStep >= nextActive.length) {
      void submit(nextAnswers);
    }
  }

  async function submit(all: Record<string, string>) {
    setPhase("submitting");
    setFailure(null);

    if (mode === "preview") {
      await new Promise((r) => setTimeout(r, TYPING_MS));
      setPhase("done");
      return;
    }

    try {
      const res = await fetch(`/api/forms/${form.slug}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: all,
          source,
          website: honeypotRef.current?.value ?? "",
          startedAt: startedAt.current || Date.now(),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Something went wrong. Please try again.");
      }

      setPhase("done");
      if (settings.redirectUrl) {
        setRedirectCountdown(3);
      }
      window.parent?.postMessage({ type: "formchat:submitted", form: form.slug }, "*");
    } catch (err) {
      setFailure(
        err instanceof TypeError
          ? "You seem to be offline. Check your connection and try again."
          : (err as Error).message,
      );
      setPhase("failed");
    }
  }

  function restart() {
    setRun((r) => r + 1);
    setIntroShown(false);
    setStepIndex(0);
    setShownIndex(-1);
    setAnswers({});
    setPhase("chatting");
    setFailure(null);
    setInputError(null);
    setDraft("");
    setRedirectCountdown(null);
    startedAt.current = Date.now();
  }

  // ── Transcript ──────────────────────────────────────────────────────────
  const messages: Message[] = [];
  if (introShown) messages.push({ key: "welcome", from: "bot", text: settings.welcomeMessage });
  if (introShown && total === 0) {
    messages.push({ key: "empty", from: "bot", text: "This form doesn’t have any active questions." });
  }

  activeQuestions.forEach((q, i) => {
    const answered = i < stepIndex;
    if (answered || (i === stepIndex && questionVisible)) {
      messages.push({
        key: `q-${q.id}`,
        from: "bot",
        text: q.label,
        note: q.required ? undefined : "Optional",
      });
    }
    if (answered) {
      const value = answers[q.id] ?? "";
      messages.push({
        key: `a-${q.id}`,
        from: "user",
        text: value ? formatAnswer(q.type, value) : "Skipped",
      });
    }
  });

  if (phase === "done") {
    messages.push({ key: "done", from: "bot", text: settings.completionMessage });
  }
  if (phase === "failed" && failure) {
    messages.push({ key: "failed", from: "bot", text: failure, tone: "error" });
  }

  const style = {
    colorScheme: settings.theme === "dark" ? "dark" : "light",
    "--fc-primary": settings.primaryColor,
    "--fc-on-primary": readableTextColor(settings.primaryColor),
  } as React.CSSProperties;

  const progressPct =
    phase === "done"
      ? 100
      : total > 0
        ? Math.min(100, Math.round((stepIndex / total) * 100))
        : 0;

  const progressText =
    phase === "chatting" && current
      ? `Question ${stepIndex + 1} of ${total}`
      : phase === "done"
        ? "Completed"
        : "Online";

  return (
    <div
      style={style}
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden bg-white text-umber-900 transition-colors",
        settings.theme === "dark" && "bg-umber-950 text-umber-100",
        variant === "embed" && "h-dvh",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 bg-(--fc-primary) px-4 py-3 text-(--fc-on-primary) shadow-xs">
        <AvatarIcon type={settings.avatarType} url={settings.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{settings.botName || form.title}</p>
          <p className="text-xs opacity-85" aria-live="polite">
            {progressText}
          </p>
        </div>
        <button
          type="button"
          aria-label="Restart chat"
          title="Restart"
          onClick={restart}
          className="grid size-8 place-items-center rounded-full transition hover:bg-white/20"
        >
          <RotateCcw className="size-4" />
        </button>
        {variant === "embed" && (
          <button
            type="button"
            aria-label="Close chat"
            onClick={() => window.parent?.postMessage({ type: "formchat:close" }, "*")}
            className="grid size-8 place-items-center rounded-full transition hover:bg-white/20"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Progress Bar Indicator */}
      <div
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Form completion progress"
        className="h-1 w-full bg-black/10 dark:bg-white/10"
      >
        <div
          className="h-full bg-(--fc-primary) transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {mode === "preview" && (
        <p className="bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          Preview mode — answers aren’t saved
        </p>
      )}

      {/* Transcript */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className={cn(
          "flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4",
          settings.theme === "dark" ? "bg-umber-950" : "bg-umber-50/70",
        )}
      >
        {messages.map((m) => (
          <Bubble key={m.key} message={m} theme={settings.theme} />
        ))}
        {typing && <TypingIndicator theme={settings.theme} />}
      </div>

      {/* Input area */}
      <div
        className={cn(
          "relative border-t border-umber-200 bg-white p-3 dark:border-umber-800 dark:bg-umber-900",
        )}
      >
        <input
          ref={honeypotRef}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="pointer-events-none absolute -left-[9999px] size-px opacity-0"
        />

        {questionVisible && current ? (
          <AnswerInput
            key={current.id}
            question={current}
            draft={draft}
            setDraft={(v) => {
              setDraft(v);
              if (inputError) setInputError(null);
            }}
            error={inputError}
            inputRef={inputRef}
            onAnswer={answer}
          />
        ) : phase === "done" ? (
          <div className="space-y-2">
            {settings.redirectUrl && (
              <div className="rounded-xl bg-amber-50 p-2.5 text-center text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                Redirecting in {redirectCountdown ?? 3}s…{" "}
                <a
                  href={settings.redirectUrl}
                  className="font-medium underline hover:text-amber-700"
                >
                  Click here if not redirected
                </a>
              </div>
            )}
            <button
              type="button"
              onClick={restart}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-umber-200 px-4 py-2.5 text-sm font-medium text-umber-700 transition hover:bg-umber-50 dark:border-umber-700 dark:text-umber-200 dark:hover:bg-umber-800"
            >
              <RotateCcw className="size-4" aria-hidden />
              {mode === "preview" ? "Restart preview" : "Submit another response"}
            </button>
          </div>
        ) : phase === "failed" ? (
          <button
            type="button"
            onClick={() => submit(answers)}
            className="w-full rounded-xl bg-(--fc-primary) px-4 py-2.5 text-sm font-medium text-(--fc-on-primary) transition hover:opacity-90"
          >
            Try again
          </button>
        ) : (
          <div aria-hidden className="flex items-end gap-2">
            <div className="h-11 flex-1 rounded-xl border border-umber-200 bg-umber-50 px-3.5 py-2.5 text-sm text-umber-400 dark:border-umber-800 dark:bg-umber-950">
              {total === 0 && introShown ? "Nothing to answer yet" : "Type your answer…"}
            </div>
            <div className="size-11 shrink-0 rounded-xl bg-(--fc-primary) opacity-40" />
          </div>
        )}
      </div>
    </div>
  );
}

function AvatarIcon({
  type,
  url,
}: {
  type?: "bot" | "sparkles" | "agent" | "smile" | "custom";
  url?: string;
}) {
  if (type === "custom" && url) {
    return (
      <img
        src={url}
        alt="Avatar"
        className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white/20"
      />
    );
  }

  const Icon =
    type === "sparkles"
      ? Sparkles
      : type === "agent"
        ? User
        : type === "smile"
          ? Smile
          : Bot;

  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20">
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

function Bubble({ message, theme }: { message: Message; theme?: string }) {
  const fromBot = message.from === "bot";
  return (
    <div
      className={cn(
        "flex animate-[fc-in_.25s_ease-out]",
        fromBot ? "justify-start" : "justify-end",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-xs",
          fromBot
            ? theme === "dark"
              ? "rounded-bl-md bg-umber-900 text-umber-100 ring-1 ring-umber-800"
              : "rounded-bl-md bg-white text-umber-900 ring-1 ring-umber-200"
            : "rounded-br-md bg-(--fc-primary) text-(--fc-on-primary)",
          message.tone === "error" && "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/60 dark:text-red-200",
        )}
      >
        {message.text}
        {message.note && (
          <span className="ml-1.5 text-xs text-umber-500 opacity-80">({message.note})</span>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ theme }: { theme?: string }) {
  return (
    <div className="flex justify-start" aria-label="Typing">
      <div
        className={cn(
          "flex gap-1 rounded-2xl rounded-bl-md px-4 py-3 shadow-xs ring-1 ring-umber-200 dark:ring-umber-800",
          theme === "dark" ? "bg-umber-900" : "bg-white",
        )}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-umber-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

const RATING_SENTIMENTS: Record<number, string> = {
  1: "Poor 😞",
  2: "Fair 😐",
  3: "Good 🙂",
  4: "Very Good 😊",
  5: "Excellent! 🌟",
};

function InteractiveChoices({
  question,
  onAnswer,
  skip,
  errorText,
}: {
  question: ChatQuestion;
  onAnswer: (value: string) => void;
  skip?: React.ReactNode;
  errorText?: React.ReactNode;
}) {
  if (question.type === "yes_no") {
    return (
      <div className="w-full">
        {errorText}
        <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label={question.label}>
          <button
            type="button"
            onClick={() => onAnswer("yes")}
            className="group flex flex-1 min-w-[100px] items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/70 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-all hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-md active:scale-95 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-600 dark:hover:text-white"
          >
            <Check className="size-4 transition-transform group-hover:scale-110" />
            <span>Yes</span>
          </button>
          <button
            type="button"
            onClick={() => onAnswer("no")}
            className="group flex flex-1 min-w-[100px] items-center justify-center gap-2 rounded-xl border border-umber-300 bg-umber-50/70 px-4 py-2.5 text-sm font-semibold text-umber-800 transition-all hover:bg-umber-600 hover:text-white hover:border-umber-600 hover:shadow-md active:scale-95 dark:border-umber-700 dark:bg-umber-900/40 dark:text-umber-200 dark:hover:bg-umber-600 dark:hover:text-white"
          >
            <X className="size-4 transition-transform group-hover:scale-110" />
            <span>No</span>
          </button>
          {skip}
        </div>
      </div>
    );
  }

  // Multiple Choice with A, B, C letter badges
  const options = question.options ?? [];
  return (
    <div className="w-full">
      {errorText}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={question.label}>
        {options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + (idx % 26));
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onAnswer(opt)}
              className="group flex items-center gap-2.5 rounded-xl border border-umber-300 bg-white px-3.5 py-2 text-sm font-medium text-umber-800 transition-all hover:border-(--fc-primary) hover:bg-(--fc-primary)/5 hover:text-(--fc-primary) hover:shadow-xs active:scale-[0.98] dark:border-umber-700 dark:bg-umber-950 dark:text-umber-200 dark:hover:bg-(--fc-primary)/10"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-umber-100 text-[11px] font-mono font-bold text-umber-600 transition-colors group-hover:bg-(--fc-primary) group-hover:text-(--fc-on-primary) dark:bg-umber-800 dark:text-umber-300">
                {letter}
              </span>
              <span>{opt}</span>
              <ChevronRight className="size-3.5 text-umber-400 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-(--fc-primary)" />
            </button>
          );
        })}
        {skip}
      </div>
    </div>
  );
}

function InteractiveDropdown({
  question,
  onAnswer,
  skip,
  errorText,
}: {
  question: ChatQuestion;
  onAnswer: (value: string) => void;
  skip?: React.ReactNode;
  errorText?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const rawOptions = question.options ?? [];
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return rawOptions;
    const q = searchQuery.toLowerCase();
    return rawOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [rawOptions, searchQuery]);

  // Click outside to dismiss
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Auto-focus search input when popover opens if long list
  useEffect(() => {
    if (isOpen && rawOptions.length >= 4) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, rawOptions.length]);

  const handleSelect = (option: string) => {
    setSelected(option);
    setIsOpen(false);
    setSearchQuery("");
    onAnswer(option);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length),
      );
    } else if (e.key === "Enter" && filteredOptions.length > 0) {
      e.preventDefault();
      const choice = filteredOptions[highlightedIndex] ?? filteredOptions[0];
      if (choice) handleSelect(choice);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {errorText}

      {/* Upward floating popover menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={question.label}
          className="absolute bottom-full mb-2 left-0 right-0 z-50 flex max-h-64 flex-col overflow-hidden rounded-2xl border border-umber-200/90 bg-white/95 p-1.5 shadow-2xl shadow-umber-950/20 backdrop-blur-md transition-all duration-150 animate-in fade-in-0 zoom-in-95 dark:border-umber-700/80 dark:bg-umber-950/95 dark:shadow-black/60"
        >
          {rawOptions.length >= 4 && (
            <div className="relative mb-1 border-b border-umber-100 pb-1.5 dark:border-umber-800">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-umber-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type to filter..."
                className="w-full rounded-lg bg-umber-50/80 py-1.5 pr-3 pl-8 text-xs text-umber-900 placeholder:text-umber-400 outline-none focus:ring-1 focus:ring-(--fc-primary) dark:bg-umber-900/60 dark:text-umber-100 dark:placeholder:text-umber-500"
              />
            </div>
          )}

          <div className="max-h-48 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5">
            {filteredOptions.length === 0 ? (
              <p className="py-4 text-center text-xs text-umber-400 dark:text-umber-500">
                No matching options found
              </p>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isCurrent = opt === selected;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs sm:text-sm font-medium transition-colors",
                      isCurrent || isHighlighted
                        ? "bg-(--fc-primary)/10 text-(--fc-primary) dark:bg-(--fc-primary)/20"
                        : "text-umber-800 hover:bg-umber-100/70 dark:text-umber-200 dark:hover:bg-umber-900/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-mono font-semibold transition-colors",
                        isCurrent || isHighlighted
                          ? "bg-(--fc-primary) text-(--fc-on-primary)"
                          : "bg-umber-100 text-umber-600 dark:bg-umber-800 dark:text-umber-300",
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{opt}</span>
                    <Check
                      className={cn(
                        "size-4 shrink-0 transition-opacity",
                        isCurrent ? "opacity-100 text-(--fc-primary)" : "opacity-0 group-hover:opacity-40",
                      )}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Trigger Row with Send Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={question.label}
          className={cn(
            "group flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm transition outline-none dark:bg-umber-950",
            isOpen
              ? "border-(--fc-primary) ring-2 ring-(--fc-primary)/20"
              : "border-umber-300 hover:border-umber-400 dark:border-umber-700 dark:hover:border-umber-600",
          )}
        >
          <span
            className={cn(
              "truncate",
              selected
                ? "font-medium text-umber-900 dark:text-umber-100"
                : "text-umber-400 dark:text-umber-500",
            )}
          >
            {selected || "Select an option…"}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-umber-500 transition-transform duration-200",
              isOpen && "rotate-180 text-(--fc-primary)",
            )}
          />
        </button>
        {skip}
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (selected) onAnswer(selected);
          }}
          aria-label="Send"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-(--fc-primary) text-(--fc-on-primary) transition hover:opacity-90 disabled:opacity-40"
        >
          <SendHorizontal className="size-5" />
        </button>
      </div>
    </div>
  );
}

function InteractiveRating({
  question,
  onAnswer,
  skip,
  errorText,
}: {
  question: ChatQuestion;
  onAnswer: (value: string) => void;
  skip?: React.ReactNode;
  errorText?: React.ReactNode;
}) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const minRating = question.validation?.minRating ?? 1;
  const maxRating = question.validation?.maxRating ?? 5;
  const count = maxRating - minRating + 1;
  const ratings = Array.from({ length: count }, (_, i) => minRating + i);
  const isFiveStar = count === 5 && minRating === 1;

  return (
    <div className="w-full space-y-2">
      {errorText}

      {/* Dynamic Sentiment Indicator */}
      <div className="flex h-5 items-center justify-between px-1 text-xs font-medium">
        {isFiveStar ? (
          <span className="text-amber-700 transition-all duration-150 dark:text-amber-300">
            {hoverRating ? RATING_SENTIMENTS[hoverRating] ?? "" : "Hover to preview rating"}
          </span>
        ) : (
          <>
            <span className="text-umber-500">1: Not likely</span>
            {hoverRating !== null && (
              <span className="font-semibold text-(--fc-primary)">Score: {hoverRating}</span>
            )}
            <span className="text-umber-500">10: Extremely likely</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2" role="group" aria-label={question.label}>
        {ratings.map((n) => {
          const isHovered = hoverRating !== null && n <= hoverRating;
          if (isFiveStar) {
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => onAnswer(String(n))}
                className={cn(
                  "group relative flex size-10 sm:size-11 items-center justify-center rounded-xl border transition-all duration-150 active:scale-95",
                  isHovered
                    ? "border-amber-400 bg-amber-50 shadow-sm scale-110 dark:border-amber-500 dark:bg-amber-950/40"
                    : "border-umber-200 bg-white hover:border-amber-300 dark:border-umber-800 dark:bg-umber-950",
                )}
                aria-label={`Rating ${n} of 5`}
              >
                <Star
                  className={cn(
                    "size-5 transition-transform duration-150",
                    isHovered
                      ? "fill-amber-400 text-amber-500 scale-110"
                      : "fill-amber-100 text-amber-300 dark:fill-amber-950 dark:text-amber-700",
                  )}
                />
              </button>
            );
          }

          // NPS 10-point scale
          const isSelectedOrHovered = hoverRating !== null && n <= hoverRating;
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(null)}
              onClick={() => onAnswer(String(n))}
              className={cn(
                "flex size-8 sm:size-9 items-center justify-center rounded-lg border text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95",
                isSelectedOrHovered
                  ? "border-(--fc-primary) bg-(--fc-primary) text-(--fc-on-primary) shadow-sm scale-105"
                  : "border-umber-200 bg-white text-umber-700 hover:border-(--fc-primary) dark:border-umber-700 dark:bg-umber-950 dark:text-umber-200",
              )}
              aria-label={`Rating ${n} of ${maxRating}`}
            >
              {n}
            </button>
          );
        })}
        {skip}
      </div>
    </div>
  );
}

function InteractiveDatePicker({
  question,
  draft,
  setDraft,
  onAnswer,
  inputRef,
  skip,
  errorText,
}: {
  question: ChatQuestion;
  draft: string;
  setDraft: (v: string) => void;
  onAnswer: (value: string) => void;
  inputRef: React.RefObject<(HTMLInputElement & HTMLTextAreaElement) | null>;
  skip?: React.ReactNode;
  errorText?: React.ReactNode;
}) {
  const handleQuickPick = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    setDraft(dateStr);
    onAnswer(dateStr);
  };

  return (
    <div className="w-full space-y-2">
      {errorText}

      {/* Quick Select Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
        <span className="mr-0.5 text-[11px] font-medium text-umber-400 dark:text-umber-500">
          Quick pick:
        </span>
        <button
          type="button"
          onClick={() => handleQuickPick(0)}
          className="rounded-lg border border-umber-200 bg-umber-50/80 px-2.5 py-1 font-medium text-umber-700 transition hover:border-umber-300 hover:bg-umber-100 dark:border-umber-800 dark:bg-umber-900/60 dark:text-umber-300"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => handleQuickPick(1)}
          className="rounded-lg border border-umber-200 bg-umber-50/80 px-2.5 py-1 font-medium text-umber-700 transition hover:border-umber-300 hover:bg-umber-100 dark:border-umber-800 dark:bg-umber-900/60 dark:text-umber-300"
        >
          Tomorrow
        </button>
        <button
          type="button"
          onClick={() => handleQuickPick(7)}
          className="rounded-lg border border-umber-200 bg-umber-50/80 px-2.5 py-1 font-medium text-umber-700 transition hover:border-umber-300 hover:bg-umber-100 dark:border-umber-800 dark:bg-umber-900/60 dark:text-umber-300"
        >
          Next week
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft) onAnswer(draft);
        }}
      >
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Calendar className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-umber-500" />
            <input
              ref={inputRef}
              type="date"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={question.label}
              className="w-full rounded-xl border border-umber-300 bg-white py-2.5 pr-3.5 pl-10 text-base text-umber-900 outline-none transition focus:border-(--fc-primary) focus:ring-2 focus:ring-(--fc-primary)/20 sm:text-sm dark:border-umber-700 dark:bg-umber-950 dark:text-umber-100"
            />
          </div>
          {skip}
          <button
            type="submit"
            disabled={!draft}
            aria-label="Send"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-(--fc-primary) text-(--fc-on-primary) transition hover:opacity-90 disabled:opacity-40"
          >
            <SendHorizontal className="size-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function InteractiveFileUpload({
  question,
  onAnswer,
  skip,
  errorText,
}: {
  question: ChatQuestion;
  onAnswer: (value: string) => void;
  skip?: React.ReactNode;
  errorText?: React.ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const maxSizeBytes = (question.validation?.maxFileSizeMB ?? 10) * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`File is too large (max ${question.validation?.maxFileSizeMB ?? 10}MB)`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: typeof reader.result === "string" ? reader.result : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const acceptedTypes = question.validation?.acceptedTypes || ".pdf, image/*, .docx";
  const isImage = uploadedFile?.type.startsWith("image/") && uploadedFile.dataUrl;

  return (
    <div className="w-full space-y-2">
      {errorText}
      <input
        ref={fileInputRef}
        type="file"
        accept={question.validation?.acceptedTypes}
        onChange={handleFileChange}
        className="hidden"
      />

      {uploadedFile ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-umber-300 bg-amber-50/50 p-3 dark:border-umber-700 dark:bg-umber-950">
          <div className="flex min-w-0 items-center gap-2.5">
            {isImage ? (
              <img
                src={uploadedFile.dataUrl}
                alt="File preview"
                className="size-10 rounded-lg object-cover ring-1 ring-black/10"
              />
            ) : (
              <div className="grid size-10 place-items-center rounded-lg bg-bronze-100 dark:bg-bronze-900/50 text-bronze-700 dark:text-bronze-300">
                <Paperclip className="size-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-umber-900 dark:text-umber-100">
                {uploadedFile.name}
              </p>
              <p className="text-[10px] text-umber-500">
                {Math.round(uploadedFile.size / 1024)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setUploadedFile(null)}
              aria-label="Remove file"
              className="grid size-8 place-items-center rounded-lg text-umber-500 hover:bg-umber-200/50 dark:hover:bg-umber-800"
            >
              <X className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onAnswer(JSON.stringify(uploadedFile))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-(--fc-primary) px-3.5 py-2 text-xs font-semibold text-(--fc-on-primary) transition hover:opacity-90 shadow-xs"
            >
              <span>Send</span>
              <SendHorizontal className="size-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed p-4 text-center transition-all",
            isDragging
              ? "border-(--fc-primary) bg-(--fc-primary)/5 scale-[1.01]"
              : "border-umber-300 bg-umber-50/40 hover:border-(--fc-primary) hover:bg-umber-50 dark:border-umber-700 dark:bg-umber-950/40 dark:hover:border-(--fc-primary)",
          )}
        >
          <div className="grid size-9 place-items-center rounded-full bg-umber-100 text-umber-600 transition group-hover:bg-(--fc-primary)/10 group-hover:text-(--fc-primary) dark:bg-umber-800 dark:text-umber-300">
            <UploadCloud className="size-5 transition-transform group-hover:-translate-y-0.5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-umber-900 dark:text-umber-100">
              Click to upload or drag & drop
            </p>
            <p className="text-[11px] text-umber-500 dark:text-umber-400">
              {acceptedTypes} (max {question.validation?.maxFileSizeMB ?? 10}MB)
            </p>
          </div>
        </div>
      )}

      {!uploadedFile && skip && <div className="flex justify-end">{skip}</div>}
    </div>
  );
}

function AnswerInput({
  question,
  draft,
  setDraft,
  error,
  inputRef,
  onAnswer,
}: {
  question: ChatQuestion;
  draft: string;
  setDraft: (v: string) => void;
  error: string | null;
  inputRef: React.RefObject<(HTMLInputElement & HTMLTextAreaElement) | null>;
  onAnswer: (value: string) => void;
}) {
  const errorId = `fc-error-${question.id}`;
  const skip = !question.required && (
    <button
      type="button"
      onClick={() => onAnswer("")}
      className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-umber-500 transition hover:bg-umber-100 hover:text-umber-800 dark:hover:bg-umber-800 dark:hover:text-umber-200"
    >
      Skip
    </button>
  );

  const errorText = error && (
    <p id={errorId} role="alert" className="mb-2 px-1 text-xs font-medium text-red-600">
      {error}
    </p>
  );

  // 1. Multiple Choice / Yes-No
  if (question.type === "multiple_choice" || question.type === "yes_no") {
    return (
      <InteractiveChoices
        question={question}
        onAnswer={onAnswer}
        skip={skip}
        errorText={errorText}
      />
    );
  }

  // 2. Dropdown
  if (question.type === "dropdown") {
    return (
      <InteractiveDropdown
        question={question}
        onAnswer={onAnswer}
        skip={skip}
        errorText={errorText}
      />
    );
  }

  // 3. Rating (1 to 5 stars or NPS 1 to 10)
  if (question.type === "rating") {
    return (
      <InteractiveRating
        question={question}
        onAnswer={onAnswer}
        skip={skip}
        errorText={errorText}
      />
    );
  }

  // 4. Date Picker
  if (question.type === "date") {
    return (
      <InteractiveDatePicker
        question={question}
        draft={draft}
        setDraft={setDraft}
        onAnswer={onAnswer}
        inputRef={inputRef}
        skip={skip}
        errorText={errorText}
      />
    );
  }

  // 5. File Upload
  if (question.type === "file") {
    return (
      <InteractiveFileUpload
        question={question}
        onAnswer={onAnswer}
        skip={skip}
        errorText={errorText}
      />
    );
  }

  // 6. Text & Email
  const isEmail = question.type === "email";
  const shared = {
    value: draft,
    "aria-label": question.label,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
    placeholder: isEmail ? "name@example.com" : "Type your answer…",
    className:
      "min-w-0 flex-1 resize-none rounded-xl border border-umber-300 bg-white px-3.5 py-2.5 text-base text-umber-900 outline-none transition placeholder:text-umber-400 focus:border-(--fc-primary) focus:ring-2 focus:ring-(--fc-primary)/20 aria-invalid:border-red-500 sm:text-sm dark:border-umber-700 dark:bg-umber-950 dark:text-umber-100",
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onAnswer(draft);
      }}
    >
      {errorText}
      <div className="flex items-end gap-2">
        {isEmail ? (
          <input
            ref={inputRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="send"
            maxLength={254}
            onChange={(e) => setDraft(e.target.value)}
            {...shared}
          />
        ) : (
          <textarea
            ref={inputRef}
            rows={1}
            maxLength={LIMITS.answer}
            enterKeyHint="send"
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onAnswer(draft);
              }
            }}
            {...shared}
          />
        )}
        {skip}
        <button
          type="submit"
          aria-label="Send"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-(--fc-primary) text-(--fc-on-primary) transition hover:opacity-90 disabled:opacity-50"
        >
          <SendHorizontal className="size-5" />
        </button>
      </div>
    </form>
  );
}
