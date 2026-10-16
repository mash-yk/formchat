import { arrayMove } from "@dnd-kit/sortable";
import type { QuestionDraft, QuestionType } from "@/lib/types";
import { uuid } from "@/lib/utils";
import { LIMITS } from "@/lib/validation";

export type BuilderState = {
  title: string;
  description: string;
  questions: QuestionDraft[];
  /** id of a question whose label input should receive focus (after add/duplicate). */
  focusId: string | null;
};

export type BuilderAction =
  | { type: "set_title"; value: string }
  | { type: "set_description"; value: string }
  | { type: "add"; questionType: QuestionType }
  | { type: "update"; id: string; patch: Partial<Pick<QuestionDraft, "label" | "required">> }
  | { type: "change_type"; id: string; questionType: QuestionType }
  | { type: "remove"; id: string }
  | { type: "duplicate"; id: string }
  | { type: "move"; id: string; offset: -1 | 1 }
  | { type: "reorder"; activeId: string; overId: string }
  | { type: "option_add"; id: string }
  | { type: "option_update"; id: string; index: number; value: string }
  | { type: "option_remove"; id: string; index: number }
  | { type: "reset"; state: BuilderState };

const DEFAULT_OPTIONS = ["Option 1", "Option 2"];

export function newQuestion(type: QuestionType): QuestionDraft {
  return {
    id: uuid(),
    type,
    label: "",
    required: true,
    options: type === "multiple_choice" ? [...DEFAULT_OPTIONS] : null,
  };
}

function mapQuestion(state: BuilderState, id: string, fn: (q: QuestionDraft) => QuestionDraft) {
  return { ...state, questions: state.questions.map((q) => (q.id === id ? fn(q) : q)) };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "set_title":
      return { ...state, title: action.value };
    case "set_description":
      return { ...state, description: action.value };
    case "add": {
      if (state.questions.length >= LIMITS.questions) return state;
      const q = newQuestion(action.questionType);
      return { ...state, questions: [...state.questions, q], focusId: q.id };
    }
    case "update":
      return mapQuestion(state, action.id, (q) => ({ ...q, ...action.patch }));
    case "change_type":
      return mapQuestion(state, action.id, (q) => ({
        ...q,
        type: action.questionType,
        options:
          action.questionType === "multiple_choice"
            ? q.options?.length
              ? q.options
              : [...DEFAULT_OPTIONS]
            : null,
      }));
    case "remove":
      return { ...state, questions: state.questions.filter((q) => q.id !== action.id) };
    case "duplicate": {
      const index = state.questions.findIndex((q) => q.id === action.id);
      if (index === -1 || state.questions.length >= LIMITS.questions) return state;
      const copy = {
        ...state.questions[index],
        id: uuid(),
        options: state.questions[index].options?.slice() ?? null,
      };
      const questions = [...state.questions];
      questions.splice(index + 1, 0, copy);
      return { ...state, questions, focusId: copy.id };
    }
    case "move": {
      const from = state.questions.findIndex((q) => q.id === action.id);
      const to = from + action.offset;
      if (from === -1 || to < 0 || to >= state.questions.length) return state;
      return { ...state, questions: arrayMove(state.questions, from, to) };
    }
    case "reorder": {
      const from = state.questions.findIndex((q) => q.id === action.activeId);
      const to = state.questions.findIndex((q) => q.id === action.overId);
      if (from === -1 || to === -1 || from === to) return state;
      return { ...state, questions: arrayMove(state.questions, from, to) };
    }
    case "option_add":
      return mapQuestion(state, action.id, (q) =>
        (q.options?.length ?? 0) >= LIMITS.options
          ? q
          : { ...q, options: [...(q.options ?? []), `Option ${(q.options?.length ?? 0) + 1}`] },
      );
    case "option_update":
      return mapQuestion(state, action.id, (q) => ({
        ...q,
        options: (q.options ?? []).map((o, i) => (i === action.index ? action.value : o)),
      }));
    case "option_remove":
      return mapQuestion(state, action.id, (q) => ({
        ...q,
        options: (q.options ?? []).filter((_, i) => i !== action.index),
      }));
    case "reset":
      return action.state;
  }
}

/** The part of the state that gets saved — used to detect unsaved changes. */
export function snapshot(state: BuilderState) {
  return JSON.stringify({ t: state.title, d: state.description, q: state.questions });
}
