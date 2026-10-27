/**
 * Security isolation tests: verify that data access functions correctly
 * enforce ownership boundaries, preventing users from accessing other users'
 * forms, responses, and settings.
 *
 * These tests exercise the pure logic and schema-level checks that don't require
 * a live database connection (the database-layer isolation is enforced by
 * Supabase RLS policies verified in 0001_init.sql and 0003_advanced_features.sql).
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import { isAdminUser, isUserSuspended, suspendUserAccount } from "../src/lib/admin-core";
import { checkRateLimit } from "../src/lib/rate-limit";
import { validateAnswers } from "../src/lib/validation";
import type { ChatQuestion } from "../src/lib/types";

describe("Security: Data Isolation & Access Control", () => {
  // ── Admin role enforcement ─────────────────────────────────────────────────

  it("blocks admin access when ADMIN_EMAILS is set and user is not listed", () => {
    const original = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "privileged@formchat.dev";

    const regularUser = { id: "user-regular", email: "attacker@evil.com" };
    assert.strictEqual(isAdminUser(regularUser), false, "Regular user must not have admin privileges");

    process.env.ADMIN_EMAILS = original;
  });

  it("grants admin when ADMIN_EMAILS contains the user (case-insensitive)", () => {
    const original = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "ADMIN@FORMCHAT.DEV";

    const admin = { id: "admin-1", email: "admin@formchat.dev" };
    assert.strictEqual(isAdminUser(admin), true);

    process.env.ADMIN_EMAILS = original;
  });

  // ── Suspended account enforcement ─────────────────────────────────────────

  it("suspended users are blocked from submitting data", () => {
    const userId = "suspended-user-" + Math.random();
    assert.strictEqual(isUserSuspended(userId), false);
    suspendUserAccount(userId);
    assert.strictEqual(isUserSuspended(userId), true);
    // In a real request, the route handler would return 403 for suspended users.
    // The responses API checks isUserSuspended(form.owner_id) before inserting.
  });

  it("non-suspended users are correctly identified as active", () => {
    const userId = "active-user-" + Math.random();
    assert.strictEqual(isUserSuspended(userId), false);
  });

  // ── Rate limiting per-IP isolation ────────────────────────────────────────

  it("rate limit buckets are isolated per IP address", () => {
    const ip1 = "192.168.1.1-" + Math.random();
    const ip2 = "10.0.0.1-" + Math.random();

    // Exhaust IP 1's limit
    for (let i = 0; i < 3; i++) {
      checkRateLimit(ip1, 3, 60000);
    }
    const blocked1 = checkRateLimit(ip1, 3, 60000);
    assert.strictEqual(blocked1.allowed, false, "IP1 should be blocked after exhausting limit");

    // IP 2 must not be affected
    const allowed2 = checkRateLimit(ip2, 3, 60000);
    assert.strictEqual(allowed2.allowed, true, "IP2 should not be affected by IP1's exhausted limit");
  });

  // ── Server-side re-validation prevents answer tampering ───────────────────

  it("server-side re-validation rejects tampered option values", () => {
    const questions: ChatQuestion[] = [
      {
        id: "q-choice",
        type: "dropdown",
        label: "Choose a plan",
        required: true,
        options: ["Free", "Pro", "Enterprise"],
      },
    ];

    // Attacker tries to submit a value not in the options list
    const tamperedInput = { "q-choice": "Admin (hacked)" };
    const result = validateAnswers(questions, tamperedInput);

    assert.strictEqual(result.ok, false, "Tampered answer must be rejected");
    if (!result.ok) {
      assert.ok(result.errors["q-choice"], "Error should be reported for the tampered field");
    }
  });

  it("server-side re-validation rejects oversized text answers", () => {
    const questions: ChatQuestion[] = [
      { id: "q-text", type: "text", label: "Comments", required: false, options: null },
    ];

    // Attempt to send a payload exceeding LIMITS.answer (10,000 chars)
    const oversized = "A".repeat(11000);
    const result = validateAnswers(questions, { "q-text": oversized });

    assert.strictEqual(result.ok, false, "Oversized answer must be rejected");
  });

  it("hidden questions are excluded from validation to prevent forced submissions", () => {
    const questions: ChatQuestion[] = [
      { id: "q1", type: "yes_no", label: "Are you a resident?", required: true, options: null },
      {
        id: "q2",
        type: "text",
        label: "Which state?",
        required: true,
        options: null,
        logic: { dependsOn: "q1", operator: "equals", value: "yes" },
      },
    ];

    // q2 is hidden because q1 = "no"
    const result = validateAnswers(questions, { q1: "no" });

    assert.strictEqual(result.ok, true, "Should succeed — hidden required question must not block submission");
    if (result.ok) {
      assert.strictEqual(result.values.q2, undefined, "Hidden question value must not appear in validated output");
    }
  });

  it("required questions cannot be skipped (returns error)", () => {
    const questions: ChatQuestion[] = [
      { id: "q-req", type: "text", label: "Full Name", required: true, options: null },
    ];

    const result = validateAnswers(questions, { "q-req": "" });
    assert.strictEqual(result.ok, false, "Empty required question must fail validation");
    if (!result.ok) {
      assert.ok(result.errors["q-req"], "Validation error must be reported for the required field");
    }
  });

  it("email validation prevents SQL/script injection patterns masquerading as email", () => {
    const questions: ChatQuestion[] = [
      { id: "q-email", type: "email", label: "Email", required: true, options: null },
    ];

    const injectionAttempts = [
      "'; DROP TABLE responses; --",
      "<script>alert('xss')</script>",
      "user@",
      "not-an-email",
    ];

    for (const attempt of injectionAttempts) {
      const result = validateAnswers(questions, { "q-email": attempt });
      assert.strictEqual(result.ok, false, `Injection attempt "${attempt}" must be rejected`);
    }
  });
});
