import assert from "node:assert";
import { describe, it } from "node:test";
import { FORM_TEMPLATES, getTemplateById } from "../src/lib/templates";

describe("Reusable Form Templates", () => {
  it("contains at least 5 curated templates across categories", () => {
    assert.ok(FORM_TEMPLATES.length >= 5);
  });

  it("instantiates unique question IDs and valid question structures", () => {
    for (const tpl of FORM_TEMPLATES) {
      assert.ok(tpl.id);
      assert.ok(tpl.name);
      assert.ok(tpl.description);

      const questions = tpl.buildQuestions();
      assert.ok(questions.length > 0, `Template ${tpl.id} has no questions`);

      const ids = questions.map((q) => q.id);
      assert.strictEqual(
        new Set(ids).size,
        ids.length,
        `Template ${tpl.id} has duplicate question IDs`,
      );

      for (const q of questions) {
        assert.ok(q.label, `Question in template ${tpl.id} missing label`);
        assert.ok(
          [
            "text",
            "email",
            "multiple_choice",
            "yes_no",
            "dropdown",
            "rating",
            "date",
            "file",
          ].includes(q.type),
          `Unknown question type: ${q.type}`,
        );

        if (q.type === "multiple_choice" || q.type === "dropdown") {
          assert.ok(
            q.options && q.options.length >= 2,
            `Options missing for ${q.type} in template ${tpl.id}`,
          );
        }
      }
    }
  });

  it("finds templates by id", () => {
    const csat = getTemplateById("csat-feedback");
    assert.ok(csat);
    assert.strictEqual(csat.category, "Feedback");
  });
});
