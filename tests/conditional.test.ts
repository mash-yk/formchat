import assert from "node:assert";
import { describe, it } from "node:test";
import { getVisibleQuestions, isQuestionConditionMet } from "../src/lib/conditional";
import type { ChatQuestion } from "../src/lib/types";
import { validateAnswers } from "../src/lib/validation";

describe("Conditional Logic Engine", () => {
  it("shows question unconditionally when logic is not set", () => {
    assert.strictEqual(isQuestionConditionMet(null, {}), true);
    assert.strictEqual(isQuestionConditionMet(undefined, { q1: "test" }), true);
  });

  it("evaluates 'equals' operator accurately", () => {
    const logic = { dependsOn: "q1", operator: "equals" as const, value: "VIP" };

    assert.strictEqual(isQuestionConditionMet(logic, {}), false);
    assert.strictEqual(isQuestionConditionMet(logic, { q1: "Regular" }), false);
    assert.strictEqual(isQuestionConditionMet(logic, { q1: "VIP" }), true);
    assert.strictEqual(isQuestionConditionMet(logic, { q1: "vip" }), true); // case-insensitive
  });

  it("evaluates 'not_equals' operator accurately", () => {
    const logic = { dependsOn: "q1", operator: "not_equals" as const, value: "Remote" };

    assert.strictEqual(isQuestionConditionMet(logic, {}), false); // not answered yet
    assert.strictEqual(isQuestionConditionMet(logic, { q1: "Remote" }), false);
    assert.strictEqual(isQuestionConditionMet(logic, { q1: "In-Person" }), true);
  });

  it("evaluates 'contains' operator accurately", () => {
    const logic = { dependsOn: "q1", operator: "contains" as const, value: "urgent" };

    assert.strictEqual(isQuestionConditionMet(logic, { q1: "General question" }), false);
    assert.strictEqual(isQuestionConditionMet(logic, { q1: "This is URGENT please help" }), true);
  });

  it("evaluates 'is_answered' operator accurately", () => {
    const logic = { dependsOn: "q1", operator: "is_answered" as const };

    assert.strictEqual(isQuestionConditionMet(logic, {}), false);
    assert.strictEqual(isQuestionConditionMet(logic, { q1: "   " }), false);
    assert.strictEqual(isQuestionConditionMet(logic, { q1: "some answer" }), true);
  });

  it("filters visible questions in order", () => {
    const questions: ChatQuestion[] = [
      { id: "q1", type: "multiple_choice", label: "Type", required: true, options: ["A", "B"] },
      {
        id: "q2",
        type: "text",
        label: "Feedback for A",
        required: true,
        options: null,
        logic: { dependsOn: "q1", operator: "equals", value: "A" },
      },
      {
        id: "q3",
        type: "text",
        label: "Feedback for B",
        required: true,
        options: null,
        logic: { dependsOn: "q1", operator: "equals", value: "B" },
      },
      { id: "q4", type: "email", label: "Email", required: false, options: null },
    ];

    const visibleWithA = getVisibleQuestions(questions, { q1: "A" });
    assert.deepStrictEqual(visibleWithA.map((q) => q.id), ["q1", "q2", "q4"]);

    const visibleWithB = getVisibleQuestions(questions, { q1: "B" });
    assert.deepStrictEqual(visibleWithB.map((q) => q.id), ["q1", "q3", "q4"]);
  });

  it("omits validation errors for conditionally hidden questions", () => {
    const questions: ChatQuestion[] = [
      { id: "q1", type: "yes_no", label: "Attend in person?", required: true, options: null },
      {
        id: "q2",
        type: "dropdown",
        label: "Meal choice",
        required: true,
        options: ["Vegan", "Chicken"],
        logic: { dependsOn: "q1", operator: "equals", value: "yes" },
      },
    ];

    // Respondent answered "no" to Q1, so Q2 was hidden and shouldn't trigger required validation error
    const result = validateAnswers(questions, { q1: "no" });
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.values.q1, "no");
      assert.strictEqual(result.values.q2, undefined);
    }
  });
});
