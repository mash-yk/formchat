import type { ChatQuestion, ConditionalLogic, QuestionDraft } from "./types";

/**
 * Checks whether a single question's conditional logic rule is satisfied.
 * If the question has no conditional logic, it is always shown.
 */
export function isQuestionConditionMet(
  logic: ConditionalLogic | null | undefined,
  answers: Record<string, string>,
): boolean {
  if (!logic || !logic.dependsOn) return true;

  const parentValue = (answers[logic.dependsOn] ?? "").trim();

  switch (logic.operator) {
    case "is_answered":
      return parentValue.length > 0;
    case "equals":
      return parentValue.toLowerCase() === (logic.value ?? "").trim().toLowerCase();
    case "not_equals":
      return (
        parentValue.length > 0 &&
        parentValue.toLowerCase() !== (logic.value ?? "").trim().toLowerCase()
      );
    case "contains":
      return (
        parentValue.length > 0 &&
        parentValue.toLowerCase().includes((logic.value ?? "").trim().toLowerCase())
      );
    default:
      return true;
  }
}

/**
 * Given all questions in display order and current user answers, returns
 * only the questions whose conditional logic rules evaluate to true.
 */
export function getVisibleQuestions<T extends QuestionDraft | ChatQuestion>(
  questions: T[],
  answers: Record<string, string>,
): T[] {
  return questions.filter((q) => isQuestionConditionMet(q.logic, answers));
}
