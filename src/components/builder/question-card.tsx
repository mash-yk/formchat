"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { QUESTION_TYPES, type QuestionDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LIMITS, QUESTION_TYPE_LABELS } from "@/lib/validation";
import { inputClass } from "../ui/button";
import type { BuilderAction } from "./builder-state";

type Props = {
  question: QuestionDraft;
  index: number;
  count: number;
  errors: Record<string, string>; // keys like "label", "options", "options.1"
  autoFocus: boolean;
  dispatch: React.Dispatch<BuilderAction>;
};

const iconButton =
  "grid size-8 place-items-center rounded-lg text-umber-400 transition hover:bg-umber-100 hover:text-umber-900 " +
  "disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-umber-800 dark:hover:text-umber-100";

export function QuestionCard({ question: q, index, count, errors, autoFocus, dispatch }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: q.id });
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) labelRef.current?.focus();
  }, [autoFocus]);

  const labelError = errors.label;
  const optionsError = errors.options;
  const n = index + 1;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-xl border bg-white shadow-xs dark:bg-umber-900",
        isDragging
          ? "relative z-10 border-bronze-400 shadow-lg ring-2 ring-bronze-500/20"
          : "border-umber-200 dark:border-umber-800",
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-umber-100 px-2 py-1.5 dark:border-umber-800">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder question ${n}`}
          className={cn(iconButton, "cursor-grab touch-none active:cursor-grabbing")}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="mr-1 text-xs font-semibold text-umber-400">Q{n}</span>

        <label className="sr-only" htmlFor={`type-${q.id}`}>
          Question type
        </label>
        <select
          id={`type-${q.id}`}
          value={q.type}
          onChange={(e) =>
            dispatch({ type: "change_type", id: q.id, questionType: e.target.value as QuestionDraft["type"] })
          }
          className="h-8 rounded-lg border border-umber-200 bg-white px-2 text-xs font-medium text-umber-700 dark:border-umber-700 dark:bg-umber-950 dark:text-umber-200"
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <label className="ml-2 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-umber-600 select-none dark:text-umber-400">
          <input
            type="checkbox"
            checked={q.required}
            onChange={(e) => dispatch({ type: "update", id: q.id, patch: { required: e.target.checked } })}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-5 w-9 rounded-full bg-umber-300 transition peer-checked:bg-bronze-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bronze-600 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4 dark:bg-umber-700"
          />
          Required
        </label>

        <div className="ml-auto flex items-center">
          <button
            type="button"
            className={iconButton}
            onClick={() => dispatch({ type: "move", id: q.id, offset: -1 })}
            disabled={index === 0}
            aria-label={`Move question ${n} up`}
            title="Move up"
          >
            <ArrowUp className="size-4" />
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={() => dispatch({ type: "move", id: q.id, offset: 1 })}
            disabled={index === count - 1}
            aria-label={`Move question ${n} down`}
            title="Move down"
          >
            <ArrowDown className="size-4" />
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={() => dispatch({ type: "duplicate", id: q.id })}
            aria-label={`Duplicate question ${n}`}
            title="Duplicate"
          >
            <Copy className="size-4" />
          </button>
          <button
            type="button"
            className={cn(iconButton, "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40")}
            onClick={() => dispatch({ type: "remove", id: q.id })}
            aria-label={`Delete question ${n}`}
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        <div>
          <label htmlFor={`label-${q.id}`} className="sr-only">
            Question {n}
          </label>
          <input
            ref={labelRef}
            id={`label-${q.id}`}
            value={q.label}
            maxLength={LIMITS.label}
            onChange={(e) => dispatch({ type: "update", id: q.id, patch: { label: e.target.value } })}
            placeholder={placeholderFor(q.type)}
            aria-invalid={Boolean(labelError)}
            aria-describedby={labelError ? `label-error-${q.id}` : undefined}
            className={cn(inputClass, "text-base font-medium")}
          />
          {labelError && (
            <p id={`label-error-${q.id}`} className="mt-1 text-xs text-red-600">
              {labelError}
            </p>
          )}
        </div>

        {q.type === "multiple_choice" && (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-xs font-medium text-umber-400">Options</legend>
            {(q.options ?? []).map((option, i) => {
              const err = errors[`options.${i}`];
              return (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-4 shrink-0 rounded-full border-2 border-umber-300 dark:border-umber-600"
                    />
                    <input
                      value={option}
                      maxLength={LIMITS.option}
                      onChange={(e) =>
                        dispatch({ type: "option_update", id: q.id, index: i, value: e.target.value })
                      }
                      aria-label={`Option ${i + 1}`}
                      aria-invalid={Boolean(err)}
                      className={cn(inputClass, "py-1.5")}
                    />
                    <button
                      type="button"
                      className={iconButton}
                      onClick={() => dispatch({ type: "option_remove", id: q.id, index: i })}
                      aria-label={`Remove option ${i + 1}`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  {err && <p className="mt-1 ml-6 text-xs text-red-600">{err}</p>}
                </div>
              );
            })}
            {optionsError && <p className="text-xs text-red-600">{optionsError}</p>}
            {(q.options?.length ?? 0) < LIMITS.options && (
              <button
                type="button"
                onClick={() => dispatch({ type: "option_add", id: q.id })}
                className="ml-6 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-bronze-600 hover:bg-bronze-50 dark:text-bronze-400 dark:hover:bg-bronze-950/40"
              >
                <Plus className="size-4" aria-hidden /> Add option
              </button>
            )}
          </fieldset>
        )}

        {q.type === "yes_no" && (
          <div className="flex gap-2" aria-hidden>
            {["Yes", "No"].map((l) => (
              <span
                key={l}
                className="rounded-full border border-umber-300 px-3 py-1 text-xs text-umber-400 dark:border-umber-700"
              >
                {l}
              </span>
            ))}
          </div>
        )}

        {(q.type === "text" || q.type === "email") && (
          <p className="text-xs text-umber-400">
            {q.type === "email"
              ? "Respondents type an email address — it’s checked for a valid format."
              : "Respondents type a free-text answer."}
          </p>
        )}
      </div>
    </li>
  );
}

function placeholderFor(type: QuestionDraft["type"]) {
  switch (type) {
    case "email":
      return "e.g. What’s your email address?";
    case "multiple_choice":
      return "e.g. How did you hear about us?";
    case "yes_no":
      return "e.g. Would you recommend us to a friend?";
    default:
      return "e.g. What’s your name?";
  }
}
