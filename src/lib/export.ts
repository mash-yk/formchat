/**
 * CSV export utilities — pure functions with no server/runtime dependencies.
 * Safe to import in tests and in both server and client modules.
 */

import type { FormResponse, Question } from "./types";
import { formatAnswer } from "./validation";

// Byte-order mark: makes Excel open the file as UTF-8 (emoji, accents, etc.).
export const UTF8_BOM = "\uFEFF";

/**
 * Escapes a single cell value for RFC 4180-compliant CSV output.
 * Also prevents spreadsheet formula injection attacks.
 */
export function toCsvCell(value: string): string {
  // Prevent spreadsheet formula injection (e.g. "=HYPERLINK(...)").
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Builds a sanitized filename for a CSV download from a form title.
 */
export function buildCsvFilename(formTitle: string): string {
  return (
    formTitle
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "form"
  ) + "-responses.csv";
}

/**
 * Converts a list of responses into a complete RFC 4180 CSV string.
 * Columns are derived from the current question list plus any deleted questions
 * that are still referenced in the answer snapshots.
 */
export function buildResponsesCsv(
  questions: Pick<Question, "id" | "label">[],
  responses: Pick<FormResponse, "id" | "answers" | "source" | "submitted_at">[],
): string {
  // Columns: current questions first, then questions that were deleted since
  // (recovered from snapshots so old exports never lose data).
  const columns = new Map<string, string>(questions.map((q) => [q.id, q.label]));
  for (const r of responses) {
    for (const a of r.answers) {
      if (!columns.has(a.questionId)) {
        columns.set(a.questionId, a.label);
      }
    }
  }

  const header = ["Submitted at (UTC)", "Response ID", "Source", ...columns.values()];
  const dataRows = responses.map((r) => {
    const byId = new Map(r.answers.map((a) => [a.questionId, a]));
    return [
      r.submitted_at,
      r.id,
      r.source === "embed" ? "Website widget" : "Public link",
      ...[...columns.keys()].map((qid) => {
        const a = byId.get(qid);
        return a && a.value ? formatAnswer(a.type, a.value) : "";
      }),
    ];
  });

  const rows = [header, ...dataRows];
  return UTF8_BOM + rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n");
}
