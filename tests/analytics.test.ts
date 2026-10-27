import assert from "node:assert";
import { describe, it } from "node:test";
import { calculateFormAnalytics, recordFormEvent } from "../src/lib/analytics";
import type { FormResponse, Question } from "../src/lib/types";

const mockQuestion = (id: string, type: Question["type"] = "text"): Question => ({
  id,
  form_id: "form-1",
  type,
  label: `Question ${id}`,
  required: false,
  options: type === "multiple_choice" || type === "dropdown" ? ["A", "B", "C"] : null,
  position: 0,
});

const mockResponse = (
  questionId: string,
  value: string,
  type: Question["type"] = "text",
  daysAgo = 0,
): FormResponse => ({
  id: `response-${Math.random()}`,
  form_id: "form-1",
  answers: [{ questionId, label: `Question ${questionId}`, type, value }],
  source: "link",
  submitted_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
});

describe("Analytics Computation Engine", () => {
  it("returns zero stats for a form with no events or responses", () => {
    const result = calculateFormAnalytics({
      formId: "form-no-data-" + Math.random(),
      questions: [],
      responses: [],
      daysFilter: 30,
    });

    assert.strictEqual(result.completions, 0);
    assert.strictEqual(result.completionRate, 0);
    // When completionRate is 0 (no starts), abandonmentRate = 100 - 0 = 100
    assert.strictEqual(result.abandonmentRate, 100);
    assert.strictEqual(result.views, 0);
    assert.strictEqual(result.starts, 0);
  });

  it("counts completions equal to the number of responses in the window", () => {
    const formId = "form-completions-" + Math.random();
    const responses: FormResponse[] = [
      mockResponse("q1", "answer 1", "text", 0),
      mockResponse("q1", "answer 2", "text", 1),
      mockResponse("q1", "answer 3", "text", 40), // outside 30-day window
    ];

    const result = calculateFormAnalytics({
      formId,
      questions: [mockQuestion("q1")],
      responses,
      daysFilter: 30,
    });

    assert.strictEqual(result.completions, 2); // only 2 within 30 days
  });

  it("calculates completion rate correctly from views and completions", () => {
    const formId = "form-completion-rate-" + Math.random();

    // Simulate 10 views and 4 starts
    for (let i = 0; i < 10; i++) recordFormEvent(formId, "view");
    for (let i = 0; i < 4; i++) recordFormEvent(formId, "start");

    const responses: FormResponse[] = [
      mockResponse("q1", "done"),
      mockResponse("q1", "done"),
    ];

    const result = calculateFormAnalytics({
      formId,
      questions: [mockQuestion("q1")],
      responses,
      daysFilter: 30,
    });

    assert.strictEqual(result.views >= 10, true);
    assert.strictEqual(result.starts >= 4, true);
    assert.strictEqual(result.completions, 2);
    assert.ok(result.completionRate > 0 && result.completionRate <= 100);
    assert.strictEqual(result.completionRate + result.abandonmentRate, 100);
  });

  it("produces daily stats with one entry per day for the filter window", () => {
    const formId = "form-daily-" + Math.random();
    const result = calculateFormAnalytics({
      formId,
      questions: [],
      responses: [],
      daysFilter: 7,
    });

    assert.strictEqual(result.dailyStats.length, 7);
    // Each entry has a date in YYYY-MM-DD format
    for (const day of result.dailyStats) {
      assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(typeof day.views === "number");
      assert.ok(typeof day.starts === "number");
      assert.ok(typeof day.completions === "number");
    }
  });

  it("computes multiple_choice breakdown correctly", () => {
    const formId = "form-mc-" + Math.random();
    const q = mockQuestion("q-mc", "multiple_choice");
    q.options = ["A", "B", "C"];
    const responses: FormResponse[] = [
      { ...mockResponse("q-mc", "A", "multiple_choice"), id: "r1", form_id: formId },
      { ...mockResponse("q-mc", "A", "multiple_choice"), id: "r2", form_id: formId },
      { ...mockResponse("q-mc", "B", "multiple_choice"), id: "r3", form_id: formId },
    ];

    const result = calculateFormAnalytics({
      formId,
      questions: [q],
      responses,
      daysFilter: 30,
    });

    const stat = result.questionStats["q-mc"];
    assert.ok(stat, "Question stat should exist");
    assert.strictEqual(stat.breakdown?.A, 2);
    assert.strictEqual(stat.breakdown?.B, 1);
    assert.strictEqual(stat.breakdown?.C, 0);
  });

  it("computes rating average correctly", () => {
    const formId = "form-rating-" + Math.random();
    const q = mockQuestion("q-rating", "rating");
    const responses: FormResponse[] = [
      { ...mockResponse("q-rating", "4", "rating"), id: "r1", form_id: formId },
      { ...mockResponse("q-rating", "2", "rating"), id: "r2", form_id: formId },
    ];

    const result = calculateFormAnalytics({
      formId,
      questions: [q],
      responses,
      daysFilter: 30,
    });

    const stat = result.questionStats["q-rating"];
    assert.ok(stat, "Rating stat should exist");
    assert.strictEqual(stat.averageRating, 3.0);
  });

  it("all-time filter (daysFilter=0) includes all responses", () => {
    const formId = "form-alltime-" + Math.random();
    const responses: FormResponse[] = [
      mockResponse("q1", "old answer", "text", 365),
      mockResponse("q1", "older answer", "text", 730),
    ];

    const result = calculateFormAnalytics({
      formId,
      questions: [mockQuestion("q1")],
      responses,
      daysFilter: 0,
    });

    assert.strictEqual(result.completions, 2);
  });

  it("question response rate is 0 when no responses exist", () => {
    const formId = "form-empty-qstats-" + Math.random();
    const result = calculateFormAnalytics({
      formId,
      questions: [mockQuestion("q1")],
      responses: [],
      daysFilter: 30,
    });

    const stat = result.questionStats["q1"];
    assert.ok(stat, "Question stat should exist even with no responses");
    assert.strictEqual(stat.totalAnswers, 0);
    assert.strictEqual(stat.responseRate, 0);
  });
});
