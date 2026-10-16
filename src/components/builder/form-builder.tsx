"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Eye, ListChecks, Mail, Pencil, ToggleLeft, Type } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveForm } from "@/app/dashboard/actions";
import type { ChatFormData, FormSettings, FormStatus, QuestionDraft, QuestionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formDraftSchema, issuesByPath, LIMITS, QUESTION_TYPE_LABELS } from "@/lib/validation";
import { ChatForm } from "../chat/chat-form";
import { LEAVE_MESSAGE, useUnsavedChanges } from "../dashboard/unsaved-changes";
import { buttonClass, inputClass } from "../ui/button";
import { builderReducer, snapshot, type BuilderState } from "./builder-state";
import { QuestionCard } from "./question-card";

type Props = {
  formId: string;
  slug: string;
  status: FormStatus;
  settings: FormSettings;
  initial: { title: string; description: string; questions: QuestionDraft[] };
};

const ADD_BUTTONS: { type: QuestionType; icon: typeof Type }[] = [
  { type: "text", icon: Type },
  { type: "email", icon: Mail },
  { type: "multiple_choice", icon: ListChecks },
  { type: "yes_no", icon: ToggleLeft },
];

export function FormBuilder({ formId, slug, status, settings, initial }: Props) {
  const [state, dispatch] = useReducer(builderReducer, { ...initial, focusId: null } satisfies BuilderState);
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot({ ...initial, focusId: null }));
  const [showErrors, setShowErrors] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [pending, startTransition] = useTransition();

  const dirty = snapshot(state) !== savedSnapshot;
  const draft = { title: state.title, description: state.description, questions: state.questions };

  // Re-validated on every change; errors are only *shown* after the first save attempt.
  const validation = useMemo(() => formDraftSchema.safeParse(draft), [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const { formErrors, questionErrors } = useMemo(
    () => splitErrors(validation.success ? {} : issuesByPath(validation.error), state.questions),
    [validation, state.questions],
  );
  const visibleFormErrors = showErrors ? formErrors : {};
  const errorCount = Object.keys(formErrors).length + Object.keys(questionErrors).length;

  const save = useCallback(() => {
    setShowErrors(true);
    if (!validation.success) {
      toast.error("Please fix the highlighted fields before saving.");
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    const snap = snapshot(state);
    startTransition(async () => {
      const result = await saveForm(formId, draft);
      if (result.ok) {
        setSavedSnapshot(snap);
        toast.success(status === "published" ? "Saved — your live form is updated." : "Saved");
      } else {
        toast.error(result.error);
      }
    });
  }, [validation, state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!pending) save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, pending]);

  // Tell the header (publish button, tabs) about unsaved changes.
  const unsaved = useUnsavedChanges();
  const setDirty = unsaved?.setDirty;
  useEffect(() => {
    setDirty?.(dirty);
  }, [dirty, setDirty]);
  useEffect(() => () => setDirty?.(false), [setDirty]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = LEAVE_MESSAGE; // older browsers show a generic message anyway
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      dispatch({ type: "reorder", activeId: String(active.id), overId: String(over.id) });
    }
  }

  const previewForm: ChatFormData = {
    title: state.title.trim() || "Untitled form",
    slug,
    settings,
    questions: state.questions.map((q) => ({
      ...q,
      label: q.label.trim() || "Untitled question",
      options: q.options?.filter((o) => o.trim()) ?? null,
    })),
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="sticky top-16 z-20 -mx-4 flex items-center gap-3 border-b border-umber-200 bg-umber-50/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 dark:border-umber-800 dark:bg-umber-950/90">
        <div className="flex rounded-lg border border-umber-200 bg-white p-0.5 lg:hidden dark:border-umber-800 dark:bg-umber-900">
          {(["edit", "preview"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setMobileView(v)}
              aria-pressed={mobileView === v}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize",
                mobileView === v
                  ? "bg-bronze-metal text-umber-950"
                  : "text-umber-600 hover:text-umber-900 dark:text-umber-400 dark:hover:text-umber-100",
              )}
            >
              {v === "edit" ? (
                <Pencil className="size-3.5" aria-hidden />
              ) : (
                <Eye className="size-3.5" aria-hidden />
              )}
              {v}
            </button>
          ))}
        </div>

        <p className="hidden text-sm text-umber-400 sm:block" aria-live="polite">
          {pending
            ? "Saving…"
            : showErrors && errorCount
              ? `${errorCount} field${errorCount === 1 ? "" : "s"} need attention`
              : dirty
                ? "Unsaved changes"
                : "All changes saved"}
        </p>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-umber-400 md:inline">Ctrl + S</span>
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className={buttonClass("primary")}
          >
            {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      {status === "published" && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          This form is live. Saved changes appear immediately for new visitors — existing responses keep the
          questions they were answered with.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Editor */}
        <div className={cn("space-y-4", mobileView === "preview" && "hidden lg:block")}>
          <section className="space-y-3 rounded-xl border border-umber-200 bg-white p-4 shadow-xs sm:p-5 dark:border-umber-800 dark:bg-umber-900">
            <div>
              <label htmlFor="form-title" className="mb-1.5 block text-sm font-medium">
                Form title
              </label>
              <input
                id="form-title"
                value={state.title}
                maxLength={LIMITS.title}
                onChange={(e) => dispatch({ type: "set_title", value: e.target.value })}
                placeholder="e.g. Customer feedback"
                aria-invalid={Boolean(visibleFormErrors.title)}
                className={cn(inputClass, "text-lg font-semibold")}
              />
              {visibleFormErrors.title && (
                <p className="mt-1 text-xs text-red-600">{visibleFormErrors.title}</p>
              )}
            </div>
            <div>
              <label htmlFor="form-description" className="mb-1.5 block text-sm font-medium">
                Description <span className="font-normal text-umber-400">(optional, only you see it)</span>
              </label>
              <textarea
                id="form-description"
                value={state.description}
                maxLength={LIMITS.description}
                rows={2}
                onChange={(e) => dispatch({ type: "set_description", value: e.target.value })}
                placeholder="What is this form for?"
                aria-invalid={Boolean(visibleFormErrors.description)}
                className={inputClass}
              />
            </div>
          </section>

          {state.questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-umber-300 bg-white px-6 py-10 text-center dark:border-umber-700 dark:bg-umber-900">
              <p className="font-medium">No questions yet</p>
              <p className="mt-1 text-sm text-umber-600 dark:text-umber-400">
                Pick a question type below to add your first question.
              </p>
            </div>
          ) : (
            <DndContext
              id="builder-dnd"
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={state.questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <ol className="space-y-3" aria-label="Questions">
                  {state.questions.map((q, i) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={i}
                      count={state.questions.length}
                      errors={showErrors ? (questionErrors[q.id] ?? {}) : {}}
                      autoFocus={state.focusId === q.id}
                      dispatch={dispatch}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          <section
            aria-label="Add a question"
            className="rounded-xl border border-umber-200 bg-white p-4 dark:border-umber-800 dark:bg-umber-900"
          >
            <p className="mb-3 text-sm font-medium">
              Add a question{" "}
              <span className="font-normal text-umber-400">
                ({state.questions.length}/{LIMITS.questions})
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ADD_BUTTONS.map(({ type, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => dispatch({ type: "add", questionType: type })}
                  disabled={state.questions.length >= LIMITS.questions}
                  className="flex items-center gap-2 rounded-lg border border-umber-200 px-3 py-2.5 text-left text-sm font-medium transition hover:border-bronze-300 hover:bg-bronze-50 disabled:opacity-50 dark:border-umber-700 dark:hover:border-bronze-700 dark:hover:bg-bronze-950/30"
                >
                  <Icon className="size-4 shrink-0 text-bronze-600 dark:text-bronze-400" aria-hidden />
                  {QUESTION_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Live preview */}
        <aside
          aria-label="Live preview"
          className={cn("lg:sticky lg:top-36 lg:self-start", mobileView === "edit" && "hidden lg:block")}
        >
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-umber-600 dark:text-umber-400">
            <Eye className="size-4" aria-hidden /> Live preview
          </p>
          <div className="h-[min(600px,calc(100dvh-14rem))] min-h-[420px] overflow-hidden rounded-2xl border border-umber-200 shadow-lg dark:border-umber-800">
            <ChatForm form={previewForm} mode="preview" variant="card" autoFocus={false} />
          </div>
          <p className="mt-2 text-xs text-umber-400">
            Colors and messages can be customized on the Share &amp; embed tab.
          </p>
        </aside>
      </div>
    </div>
  );
}

/** "questions.2.label" → questionErrors[questionId]["label"]; everything else → formErrors. */
function splitErrors(issues: Record<string, string>, questions: QuestionDraft[]) {
  const formErrors: Record<string, string> = {};
  const questionErrors: Record<string, Record<string, string>> = {};
  for (const [path, message] of Object.entries(issues)) {
    const match = path.match(/^questions\.(\d+)\.(.+)$/);
    const q = match ? questions[Number(match[1])] : undefined;
    if (match && q) {
      questionErrors[q.id] ??= {};
      questionErrors[q.id][match[2]] = message;
    } else {
      formErrors[path] = message;
    }
  }
  return { formErrors, questionErrors };
}
