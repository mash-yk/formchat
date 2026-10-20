"use client";

import {
  Bot,
  ChevronDown,
  Paperclip,
  RotateCcw,
  SendHorizontal,
  Smile,
  Sparkles,
  Star,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
          "border-t border-umber-200 bg-white p-3 dark:border-umber-800 dark:bg-umber-900",
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
  const [selectedDropdown, setSelectedDropdown] = useState("");
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const choices =
      question.type === "yes_no"
        ? [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]
        : (question.options ?? []).map((o) => ({ value: o, label: o }));

    return (
      <div>
        {errorText}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={question.label}>
          {choices.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onAnswer(c.value)}
              className="rounded-full border border-(--fc-primary) px-4 py-2 text-sm font-medium text-(--fc-primary) transition hover:bg-(--fc-primary) hover:text-(--fc-on-primary) focus-visible:bg-(--fc-primary) focus-visible:text-(--fc-on-primary) focus-visible:outline-none"
            >
              {c.label}
            </button>
          ))}
          {skip}
        </div>
      </div>
    );
  }

  // 2. Dropdown
  if (question.type === "dropdown") {
    const options = question.options ?? [];
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (selectedDropdown) onAnswer(selectedDropdown);
        }}
      >
        {errorText}
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <select
              value={selectedDropdown}
              onChange={(e) => setSelectedDropdown(e.target.value)}
              aria-label={question.label}
              className="w-full appearance-none rounded-xl border border-umber-300 bg-white px-3.5 py-2.5 pr-9 text-base text-umber-900 outline-none transition focus:border-(--fc-primary) focus:ring-2 focus:ring-(--fc-primary)/20 sm:text-sm dark:border-umber-700 dark:bg-umber-950 dark:text-umber-100"
            >
              <option value="">Select an option…</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-umber-500" />
          </div>
          {skip}
          <button
            type="submit"
            disabled={!selectedDropdown}
            aria-label="Send"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-(--fc-primary) text-(--fc-on-primary) transition hover:opacity-90 disabled:opacity-40"
          >
            <SendHorizontal className="size-5" />
          </button>
        </div>
      </form>
    );
  }

  // 3. Rating (1 to 5 or 10 stars/buttons)
  if (question.type === "rating") {
    const minRating = question.validation?.minRating ?? 1;
    const maxRating = question.validation?.maxRating ?? 5;
    const count = maxRating - minRating + 1;
    const ratings = Array.from({ length: count }, (_, i) => minRating + i);

    return (
      <div>
        {errorText}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={question.label}>
          {ratings.map((n) => {
            const isHovered = hoverRating !== null && n <= hoverRating;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => onAnswer(String(n))}
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl border transition sm:size-11",
                  isHovered
                    ? "border-(--fc-primary) bg-(--fc-primary) text-(--fc-on-primary) scale-110 shadow-sm"
                    : "border-umber-300 bg-white text-umber-700 hover:border-(--fc-primary) dark:border-umber-700 dark:bg-umber-950 dark:text-umber-200",
                )}
                aria-label={`Rating ${n} of ${maxRating}`}
              >
                <Star
                  className={cn("size-5", isHovered ? "fill-current" : "text-amber-500 fill-amber-400")}
                />
              </button>
            );
          })}
          {skip}
        </div>
      </div>
    );
  }

  // 4. Date Picker
  if (question.type === "date") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft) onAnswer(draft);
        }}
      >
        {errorText}
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              type="date"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={question.label}
              className="w-full rounded-xl border border-umber-300 bg-white px-3.5 py-2.5 text-base text-umber-900 outline-none transition focus:border-(--fc-primary) focus:ring-2 focus:ring-(--fc-primary)/20 sm:text-sm dark:border-umber-700 dark:bg-umber-950 dark:text-umber-100"
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
    );
  }

  // 5. File Upload
  if (question.type === "file") {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

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

    return (
      <div>
        {errorText}
        <input
          ref={fileInputRef}
          type="file"
          accept={question.validation?.acceptedTypes}
          onChange={handleFileChange}
          className="hidden"
        />
        {uploadedFile ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-umber-300 bg-umber-50 p-2.5 dark:border-umber-700 dark:bg-umber-950">
            <div className="flex min-w-0 items-center gap-2">
              <Paperclip className="size-4 shrink-0 text-bronze-600 dark:text-bronze-400" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-umber-900 dark:text-umber-100">
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
                className="grid size-7 place-items-center rounded-lg text-umber-500 hover:bg-umber-200/50"
              >
                <X className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onAnswer(JSON.stringify(uploadedFile))}
                className="inline-flex items-center gap-1 rounded-lg bg-(--fc-primary) px-3 py-1.5 text-xs font-semibold text-(--fc-on-primary)"
              >
                Submit file <SendHorizontal className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-umber-300 bg-umber-50/50 px-4 py-2.5 text-sm font-medium text-umber-700 transition hover:bg-umber-100 hover:border-(--fc-primary) dark:border-umber-700 dark:bg-umber-950 dark:text-umber-300"
            >
              <Paperclip className="size-4" />
              Choose file to upload
            </button>
            {skip}
          </div>
        )}
      </div>
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
