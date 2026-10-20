import assert from "node:assert";
import { describe, it } from "node:test";
import { formatAnswer, validateAnswer } from "../src/lib/validation";
import type { ChatQuestion } from "../src/lib/types";

describe("Question and Answer Validation", () => {
  it("validates text question", () => {
    const q: ChatQuestion = {
      id: "q-1",
      type: "text",
      label: "Name",
      required: true,
      options: null,
    };

    assert.strictEqual(validateAnswer(q, "").ok, false);
    assert.strictEqual(validateAnswer(q, "   ").ok, false);
    const valid = validateAnswer(q, "John Doe");
    assert.strictEqual(valid.ok, true);
    if (valid.ok) assert.strictEqual(valid.value, "John Doe");
  });

  it("validates text with min and max length constraints", () => {
    const q: ChatQuestion = {
      id: "q-text-limit",
      type: "text",
      label: "Bio",
      required: true,
      options: null,
      validation: { minLength: 5, maxLength: 20 },
    };

    assert.strictEqual(validateAnswer(q, "Hey").ok, false);
    assert.strictEqual(validateAnswer(q, "This bio is way too long to be accepted by the validator").ok, false);
    assert.strictEqual(validateAnswer(q, "Valid bio text").ok, true);
  });

  it("validates email question format", () => {
    const q: ChatQuestion = {
      id: "q-2",
      type: "email",
      label: "Email",
      required: true,
      options: null,
    };

    assert.strictEqual(validateAnswer(q, "not-an-email").ok, false);
    assert.strictEqual(validateAnswer(q, "user@").ok, false);
    assert.strictEqual(validateAnswer(q, "test@example.com").ok, true);
  });

  it("validates yes_no question", () => {
    const q: ChatQuestion = {
      id: "q-3",
      type: "yes_no",
      label: "Agree?",
      required: true,
      options: null,
    };

    assert.strictEqual(validateAnswer(q, "maybe").ok, false);
    assert.strictEqual(validateAnswer(q, "yes").ok, true);
    assert.strictEqual(validateAnswer(q, "no").ok, true);
  });

  it("validates multiple_choice and dropdown question against options", () => {
    const qDropdown: ChatQuestion = {
      id: "q-4",
      type: "dropdown",
      label: "Role",
      required: true,
      options: ["Designer", "Engineer", "Manager"],
    };

    assert.strictEqual(validateAnswer(qDropdown, "Janitor").ok, false);
    const okRes = validateAnswer(qDropdown, "Engineer");
    assert.strictEqual(okRes.ok, true);
    if (okRes.ok) assert.strictEqual(okRes.value, "Engineer");
  });

  it("validates rating question within range", () => {
    const qRating: ChatQuestion = {
      id: "q-5",
      type: "rating",
      label: "Score",
      required: true,
      options: null,
      validation: { minRating: 1, maxRating: 5 },
    };

    assert.strictEqual(validateAnswer(qRating, "0").ok, false);
    assert.strictEqual(validateAnswer(qRating, "6").ok, false);
    assert.strictEqual(validateAnswer(qRating, "abc").ok, false);
    assert.strictEqual(validateAnswer(qRating, "5").ok, true);
    assert.strictEqual(validateAnswer(qRating, "1").ok, true);
  });

  it("validates date question format and constraints", () => {
    const qDate: ChatQuestion = {
      id: "q-6",
      type: "date",
      label: "Appointment Date",
      required: true,
      options: null,
      validation: { allowPast: false },
    };

    assert.strictEqual(validateAnswer(qDate, "2026/10/20").ok, false);
    assert.strictEqual(validateAnswer(qDate, "invalid-date").ok, false);
    assert.strictEqual(validateAnswer(qDate, "1999-01-01").ok, false); // past date rejected
    assert.strictEqual(validateAnswer(qDate, "2099-12-31").ok, true);
  });

  it("validates file upload size limit", () => {
    const qFile: ChatQuestion = {
      id: "q-7",
      type: "file",
      label: "Resume",
      required: true,
      options: null,
      validation: { maxFileSizeMB: 2 },
    };

    const smallFile = JSON.stringify({ name: "resume.pdf", size: 1024 * 1024 }); // 1MB
    const largeFile = JSON.stringify({ name: "video.mp4", size: 5 * 1024 * 1024 }); // 5MB

    assert.strictEqual(validateAnswer(qFile, smallFile).ok, true);
    assert.strictEqual(validateAnswer(qFile, largeFile).ok, false);
  });

  it("correctly formats answers for display and export", () => {
    assert.strictEqual(formatAnswer("yes_no", "yes"), "Yes");
    assert.strictEqual(formatAnswer("yes_no", "no"), "No");
    assert.strictEqual(formatAnswer("rating", "4"), "★★★★ (4)");
    assert.strictEqual(
      formatAnswer("file", JSON.stringify({ name: "doc.pdf", size: 2048 })),
      "📎 doc.pdf (2 KB)",
    );
    assert.strictEqual(formatAnswer("text", "hello world"), "hello world");
    assert.strictEqual(formatAnswer("text", ""), "—");
  });
});
