import assert from "node:assert";
import { describe, it } from "node:test";
import { buildCsvFilename, buildResponsesCsv, toCsvCell, UTF8_BOM } from "../src/lib/export";
import type { FormResponse, Question } from "../src/lib/types";

const mockQuestion = (id: string, label: string): Pick<Question, "id" | "label"> => ({ id, label });

const mockResponse = (overrides: Partial<FormResponse> = {}): Pick<FormResponse, "id" | "answers" | "source" | "submitted_at"> => ({
  id: "resp-1",
  answers: [],
  source: "link",
  submitted_at: "2026-10-01T12:00:00.000Z",
  ...overrides,
});

describe("CSV Export Utilities", () => {
  it("toCsvCell wraps values with commas in double-quotes", () => {
    assert.strictEqual(toCsvCell("hello, world"), '"hello, world"');
  });

  it("toCsvCell escapes embedded double quotes by doubling them", () => {
    assert.strictEqual(toCsvCell('say "hello"'), '"say ""hello"""');
  });

  it("toCsvCell prevents formula injection for dangerous prefixes", () => {
    assert.strictEqual(toCsvCell("=HYPERLINK()"), "'=HYPERLINK()");
    assert.strictEqual(toCsvCell("+SUM(A1)"), "'+SUM(A1)");
    assert.strictEqual(toCsvCell("-1+2"), "'-1+2");
    assert.strictEqual(toCsvCell("@user"), "'@user");
  });

  it("toCsvCell returns plain values without quoting when not necessary", () => {
    assert.strictEqual(toCsvCell("hello world"), "hello world");
    assert.strictEqual(toCsvCell("2026-10-01"), "2026-10-01");
  });

  it("buildCsvFilename generates a clean kebab-case filename", () => {
    assert.strictEqual(buildCsvFilename("Customer Satisfaction Survey"), "customer-satisfaction-survey-responses.csv");
    assert.strictEqual(buildCsvFilename("Bug Report & Technical Support!!!"), "bug-report-technical-support-responses.csv");
  });

  it("buildCsvFilename falls back to 'form' when title is empty or all-special", () => {
    assert.strictEqual(buildCsvFilename(""), "form-responses.csv");
    assert.strictEqual(buildCsvFilename("!!!@@@###"), "form-responses.csv");
  });

  it("buildResponsesCsv produces correct header row", () => {
    const questions = [mockQuestion("q1", "What is your name?"), mockQuestion("q2", "Email address")];
    const csv = buildResponsesCsv(questions, []);
    const firstLine = csv.replace(UTF8_BOM, "").split("\r\n")[0];
    assert.strictEqual(firstLine, "Submitted at (UTC),Response ID,Source,What is your name?,Email address");
  });

  it("buildResponsesCsv includes UTF-8 BOM for Excel compatibility", () => {
    const csv = buildResponsesCsv([], []);
    assert.ok(csv.startsWith(UTF8_BOM), "CSV should start with UTF-8 BOM");
  });

  it("buildResponsesCsv correctly maps response answers to their columns", () => {
    const questions = [mockQuestion("q1", "Name"), mockQuestion("q2", "City")];
    const responses = [
      mockResponse({
        id: "r-1",
        submitted_at: "2026-10-01T10:00:00.000Z",
        source: "link",
        answers: [
          { questionId: "q1", label: "Name", type: "text", value: "Alice" },
          { questionId: "q2", label: "City", type: "text", value: "London" },
        ],
      }),
    ];

    const csv = buildResponsesCsv(questions, responses);
    const lines = csv.replace(UTF8_BOM, "").split("\r\n");
    assert.strictEqual(lines.length, 2); // header + 1 data row
    assert.ok(lines[1].includes("Alice"), "Row should contain answer value 'Alice'");
    assert.ok(lines[1].includes("London"), "Row should contain answer value 'London'");
    assert.ok(lines[1].includes("Public link"), "Link source should be labeled 'Public link'");
  });

  it("buildResponsesCsv labels embed source as 'Website widget'", () => {
    const responses = [mockResponse({ source: "embed" })];
    const csv = buildResponsesCsv([], responses);
    assert.ok(csv.includes("Website widget"), "Embed source should be labeled 'Website widget'");
  });

  it("buildResponsesCsv adds deleted question columns from answer snapshots", () => {
    // Question was deleted from form, but its answer still exists in the snapshot
    const questions: Pick<Question, "id" | "label">[] = []; // no current questions
    const responses = [
      mockResponse({
        answers: [{ questionId: "old-q", label: "Deleted Question", type: "text", value: "some answer" }],
      }),
    ];

    const csv = buildResponsesCsv(questions, responses);
    // Should still include the deleted question's column from the snapshot
    assert.ok(csv.includes("Deleted Question"), "Deleted question should appear as a column from the snapshot");
    assert.ok(csv.includes("some answer"), "Answer value should appear in the data row");
  });

  it("buildResponsesCsv produces empty cells for unanswered questions", () => {
    const questions = [mockQuestion("q1", "Name"), mockQuestion("q2", "Optional Email")];
    const responses = [
      mockResponse({
        answers: [{ questionId: "q1", label: "Name", type: "text", value: "Bob" }],
        // q2 not answered
      }),
    ];

    const csv = buildResponsesCsv(questions, responses);
    const lines = csv.replace(UTF8_BOM, "").split("\r\n");
    const row = lines[1].split(",");
    // Header: Submitted at, ID, Source, Name, Optional Email
    assert.strictEqual(row[3], "Bob");
    assert.strictEqual(row[4], ""); // unanswered optional question
  });
});
