"use client";

import { MessageCircle, RotateCcw, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

const TYPING_MS = 650;

/**
 * Chat-style form runner: welcome → one question at a time → submit → completion.
 * The transcript is DERIVED from (step, answers, phase), so editing the form in
 * the builder updates the live preview instantly without restarting it.
 */
export function ChatForm({ form, mode, source = "link", variant = "page", autoFocus = true }: Props) {
  const settings = resolveSettings(form.settings);
  const questions = form.questions;
  const total = questions.length;

  const [run, setRun] = useState(0); // bump to restart
  const [introShown, setIntroShown] = useState(false);
  const [step, setStep] = useState(0);
  const [shownStep, setShownStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("chatting");
  const [failure, setFailure] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const interacted = useRef(false);

  const current: ChatQuestion | undefined = questions[step];
  const questionVisible = phase === "chatting" && introShown && !!current && shownStep >= step;
  const typing =
    !introShown || phase === "submitting" || (phase === "chatting" && !!current && shownStep < step);

  // 1) Welcome message after a short "typing" pause.
  useEffect(() => {
    const t = setTimeout(() => setIntroShown(true), TYPING_MS);
    return () => clearTimeout(t);
  }, [run]);

  // 2) Reveal the next question after another pause.
  useEffect(() => {
    if (!introShown || phase !== "chatting" || shownStep >= step || step >= total) return;
    const t = setTimeout(() => setShownStep(step), TYPING_MS);
    return () => clearTimeout(t);
  }, [introShown, phase, shownStep, step, total]);

  // Keep the newest message in view (scrolls the chat only, never the host page).
  const messageCount = step + (introShown ? 1 : 0) + (questionVisible ? 1 : 0);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messageCount, typing, phase, inputError]);

  // Esc closes the embedded widget (widget.js listens for this message).
  useEffect(() => {
    if (variant !== "embed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.parent?.postMessage({ type: "formchat:close" }, "*");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  // Focus the input when a text/email question appears.
  useEffect(() => {
    if (questionVisible && (autoFocus || interacted.current)) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [questionVisible, step, autoFocus]);

  function answer(value: string) {
    if (!current || !questionVisible) return;
    interacted.current = true;
    const result = validateAnswer(current, value);
    if (!result.ok) {
      setInputError(result.error);
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    const next = { ...answers, [current.id]: result.value };
    setAnswers(next);
    setDraft("");
    setInputError(null);
    setStep(step + 1);
    if (step + 1 >= total) void submit(next);
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
        body: JSON.stringify({ answers: all, source, website: honeypotRef.current?.value ?? "" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Something went wrong. Please try again.");
      }
      setPhase("done");
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
    setStep(0);
    setShownStep(-1);
    setAnswers({});
    setPhase("chatting");
    setFailure(null);
    setInputError(null);
    setDraft("");
  }

  // ── Transcript ──────────────────────────────────────────────────────────
  const messages: Message[] = [];
  if (introShown) messages.push({ key: "welcome", from: "bot", text: settings.welcomeMessage });
  if (introShown && total === 0) {
    messages.push({ key: "empty", from: "bot", text: "This form doesn’t have any questions yet." });
  }
  questions.forEach((q, i) => {
    const answered = i < step;
    if (answered || (i === step && questionVisible)) {
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
  if (phase === "done") messages.push({ key: "done", from: "bot", text: settings.completionMessage });
  if (phase === "failed" && failure)
    messages.push({ key: "failed", from: "bot", text: failure, tone: "error" });

  const style = {
    "--fc-primary": settings.primaryColor,
    "--fc-on-primary": readableTextColor(settings.primaryColor),
  } as React.CSSProperties;

  const progress = phase === "chatting" && current ? `Question ${step + 1} of ${total}` : null;

  return (
    <div
      style={style}
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden bg-white text-zinc-900",
        variant === "embed" && "h-dvh",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 bg-(--fc-primary) px-4 py-3 text-(--fc-on-primary)">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20">
          <MessageCircle className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{form.title}</p>
          <p className="text-xs opacity-80" aria-live="polite">
            {progress ?? (phase === "done" ? "Completed" : "Online")}
          </p>
        </div>
        {variant === "embed" && (
          <button
            type="button"
            aria-label="Close chat"
            onClick={() => window.parent?.postMessage({ type: "formchat:close" }, "*")}
            className="grid size-9 place-items-center rounded-full transition hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {mode === "preview" && (
        <p className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800">
          Preview — answers aren’t saved
        </p>
      )}

      {/* Transcript */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-zinc-50 px-4 py-4"
      >
        {messages.map((m) => (
          <Bubble key={m.key} message={m} />
        ))}
        {typing && <TypingIndicator />}
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-200 bg-white p-3">
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
          <button
            type="button"
            onClick={restart}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <RotateCcw className="size-4" aria-hidden />
            {mode === "preview" ? "Restart preview" : "Submit another response"}
          </button>
        ) : phase === "failed" ? (
          <button
            type="button"
            onClick={() => submit(answers)}
            className="w-full rounded-xl bg-(--fc-primary) px-4 py-2.5 text-sm font-medium text-(--fc-on-primary) transition hover:opacity-90"
          >
            Try again
          </button>
        ) : (
          // Placeholder while the bot is "typing": shows where answers go, without being usable yet.
          <div aria-hidden className="flex items-end gap-2">
            <div className="h-11 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-400">
              {total === 0 && introShown ? "Nothing to answer yet" : "Type your answer…"}
            </div>
            <div className="size-11 shrink-0 rounded-xl bg-(--fc-primary) opacity-40" />
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const fromBot = message.from === "bot";
  return (
    <div className={cn("flex animate-[fc-in_.25s_ease-out]", fromBot ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-xs",
          fromBot
            ? "rounded-bl-md bg-white text-zinc-800 ring-1 ring-zinc-200"
            : "rounded-br-md bg-(--fc-primary) text-(--fc-on-primary)",
          message.tone === "error" && "bg-red-50 text-red-800 ring-red-200",
        )}
      >
        {message.text}
        {message.note && <span className="ml-1.5 text-xs text-zinc-400">({message.note})</span>}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-label="Typing">
      <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-xs ring-1 ring-zinc-200">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-zinc-400"
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
  const errorId = `fc-error-${question.id}`;
  const skip = !question.required && (
    <button
      type="button"
      onClick={() => onAnswer("")}
      className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
    >
      Skip
    </button>
  );
  const errorText = error && (
    <p id={errorId} role="alert" className="mb-2 px-1 text-xs font-medium text-red-600">
      {error}
    </p>
  );

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

  const isEmail = question.type === "email";
  const shared = {
    value: draft,
    "aria-label": question.label,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
    placeholder: isEmail ? "name@example.com" : "Type your answer…",
    className:
      "min-w-0 flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-(--fc-primary) focus:ring-2 focus:ring-(--fc-primary)/20 aria-invalid:border-red-500 sm:text-sm",
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
