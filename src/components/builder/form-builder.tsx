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
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Calendar,
  ChevronDown,
  Eye,
  FileText,
  Laptop,
  ListChecks,
  Mail,
  Paperclip,
  Pencil,
  Smartphone,
  Star,
  Tablet,
  ToggleLeft,
  Type,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveForm } from "@/app/dashboard/actions";
import { FORM_TEMPLATES, type TemplateDefinition } from "@/lib/templates";
import type {
  ChatFormData,
  FormSettings,
  FormStatus,
  QuestionDraft,
  QuestionType,
} from "@/lib/types";
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
  { type: "dropdown", icon: ChevronDown },
  { type: "rating", icon: Star },
  { type: "date", icon: Calendar },
  { type: "file", icon: Paperclip },
  { type: "yes_no", icon: ToggleLeft },
];

export function FormBuilder({ formId, slug, status, settings, initial }: Props) {
  const [state, dispatch] = useReducer(builderReducer, {
    ...initial,
    focusId: null,
  } satisfies BuilderState);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshot({ ...initial, focusId: null }),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<BuilderState | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = snapshot(state) !== savedSnapshot;
  const draft = useMemo(
    () => ({ title: state.title, description: state.description, questions: state.questions }),
    [state.title, state.description, state.questions],
  );

  // 1. Check for autosaved local draft on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const storageKey = `formchat_draft_${formId}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as BuilderState;
          if (parsed && snapshot(parsed) !== savedSnapshot) {
            setRecoveredDraft(parsed);
          }
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [formId, savedSnapshot]);

  // 2. Autosave to localStorage when dirty
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        const storageKey = `formchat_draft_${formId}`;
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [dirty, state, formId]);

  function restoreLocalDraft() {
    if (!recoveredDraft) return;
    dispatch({ type: "reset", state: recoveredDraft });
    setRecoveredDraft(null);
    toast.success("Local draft restored.");
  }

  function discardLocalDraft() {
    try {
      localStorage.removeItem(`formchat_draft_${formId}`);
    } catch {
      // ignore
    }
    setRecoveredDraft(null);
  }

  // Re-validated on every change; errors are only shown after first save attempt
  const validation = useMemo(() => formDraftSchema.safeParse(draft), [draft]);
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
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(),
      );
      return;
    }
    const snap = snapshot(state);
    startTransition(async () => {
      const result = await saveForm(formId, draft);
      if (result.ok) {
        setSavedSnapshot(snap);
        try {
          localStorage.removeItem(`formchat_draft_${formId}`);
        } catch {
          // ignore
        }
        toast.success(status === "published" ? "Saved — your live form is updated." : "Saved");
      } else {
        toast.error(result.error);
      }
    });
  }, [validation, state, formId, status, draft]);

  // Ctrl/Cmd + S saves
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

  // Tell header about unsaved changes
  const unsaved = useUnsavedChanges();
  const setDirty = unsaved?.setDirty;
  useEffect(() => {
    setDirty?.(dirty);
  }, [dirty, setDirty]);
  useEffect(() => () => setDirty?.(false), [setDirty]);

  // Warn before closing tab with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = LEAVE_MESSAGE;
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

  function applyTemplate(tpl: TemplateDefinition) {
    const questions = tpl.buildQuestions();
    dispatch({ type: "load_questions", questions });
    if (!state.title || state.title === "Untitled form") {
      dispatch({ type: "set_title", value: tpl.name });
    }
    if (!state.description) {
      dispatch({ type: "set_description", value: tpl.description });
    }
    setShowTemplatesModal(false);
    toast.success(`Loaded "${tpl.name}" template with ${questions.length} questions.`);
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
      {/* Draft Recovery Alert */}
      {recoveredDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-xs dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          <div>
            <p className="font-semibold">Unsaved local changes detected</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              You have an autosaved local draft for this form that hasn’t been saved to the server yet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreLocalDraft}
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800"
            >
              Restore local draft
            </button>
            <button
              type="button"
              onClick={discardLocalDraft}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium transition hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
            >
              Discard
            </button>
          </div>
        </div>
      )}

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
                  ? "bg-bronze-metal text-umber-950 font-semibold"
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

        <button
          type="button"
          onClick={() => setShowTemplatesModal(true)}
          className={buttonClass("secondary", "sm")}
        >
          <FileText className="size-3.5" /> Reusable templates
        </button>

        <p className="hidden text-sm text-umber-400 sm:block" aria-live="polite">
          {pending
            ? "Saving…"
            : showErrors && errorCount
              ? `${errorCount} field${errorCount === 1 ? "" : "s"} need attention`
              : dirty
                ? "Unsaved changes (autosaving locally)"
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
          This form is live. Saved changes appear immediately for new visitors.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
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
                Description{" "}
                <span className="font-normal text-umber-400">(optional, internal note)</span>
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
                Pick a question type below or choose a template to get started instantly.
              </p>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(true)}
                className={buttonClass("secondary", "sm", "mt-4")}
              >
                Choose from templates
              </button>
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
                      priorQuestions={state.questions.slice(0, i)}
                      errors={showErrors ? (questionErrors[q.id] ?? {}) : {}}
                      autoFocus={state.focusId === q.id}
                      dispatch={dispatch}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          {/* Add Question Toolbar */}
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

        {/* Live Preview Sidebar */}
        <aside
          aria-label="Live preview"
          className={cn("lg:sticky lg:top-36 lg:self-start", mobileView === "edit" && "hidden lg:block")}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-medium text-umber-600 dark:text-umber-400">
              <Eye className="size-4" aria-hidden /> Live preview
            </p>
            {/* Viewport switchers */}
            <div className="flex items-center rounded-lg border border-umber-200 bg-white p-0.5 dark:border-umber-700 dark:bg-umber-900">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                title="Desktop viewport"
                className={cn(
                  "p-1.5 rounded",
                  previewDevice === "desktop"
                    ? "bg-umber-100 text-umber-900 dark:bg-umber-800 dark:text-umber-100"
                    : "text-umber-400 hover:text-umber-700",
                )}
              >
                <Laptop className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("tablet")}
                title="Tablet viewport"
                className={cn(
                  "p-1.5 rounded",
                  previewDevice === "tablet"
                    ? "bg-umber-100 text-umber-900 dark:bg-umber-800 dark:text-umber-100"
                    : "text-umber-400 hover:text-umber-700",
                )}
              >
                <Tablet className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                title="Mobile viewport"
                className={cn(
                  "p-1.5 rounded",
                  previewDevice === "mobile"
                    ? "bg-umber-100 text-umber-900 dark:bg-umber-800 dark:text-umber-100"
                    : "text-umber-400 hover:text-umber-700",
                )}
              >
                <Smartphone className="size-3.5" />
              </button>
            </div>
          </div>

          <div
            className={cn(
              "mx-auto h-[min(620px,calc(100dvh-13rem))] min-h-[440px] overflow-hidden rounded-2xl border border-umber-200 shadow-lg transition-all dark:border-umber-800",
              previewDevice === "mobile" && "max-w-[340px] ring-8 ring-umber-900/10 dark:ring-white/10",
              previewDevice === "tablet" && "max-w-[390px]",
              previewDevice === "desktop" && "w-full",
            )}
          >
            <ChatForm form={previewForm} mode="preview" variant="card" autoFocus={false} />
          </div>
          <p className="mt-2 text-center text-xs text-umber-400">
            Interactive preview: test conditional branches and ratings live.
          </p>
        </aside>
      </div>

      {/* Reusable Templates Modal */}
      {showTemplatesModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose a form template"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-umber-200 bg-white p-6 shadow-2xl dark:border-umber-800 dark:bg-umber-900">
            <div className="flex items-center justify-between border-b border-umber-100 pb-3 dark:border-umber-800">
              <div>
                <h2 className="text-lg font-semibold">Reusable Form Templates</h2>
                <p className="text-xs text-umber-500">
                  Select a pre-built template to import into this form.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="grid size-8 place-items-center rounded-lg hover:bg-umber-100 dark:hover:bg-umber-800"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {FORM_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-umber-200 p-4 transition hover:border-bronze-400 hover:bg-umber-50/50 dark:border-umber-800 dark:hover:bg-umber-950/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-bronze-100 px-2 py-0.5 text-[10px] font-semibold text-bronze-800 dark:bg-bronze-950 dark:text-bronze-300">
                        {tpl.category}
                      </span>
                      <h3 className="text-sm font-semibold">{tpl.name}</h3>
                    </div>
                    <p className="text-xs text-umber-600 dark:text-umber-400">{tpl.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className={buttonClass("primary", "sm", "shrink-0")}
                  >
                    Use template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
