import assert from "node:assert";
import { describe, it } from "node:test";
import { checkRateLimit, isSpamSubmission } from "../src/lib/rate-limit";

describe("Rate Limiting and Anti-Spam Protection", () => {
  it("allows requests within rate limits", () => {
    const ip = "test-client-" + Math.random();
    const res1 = checkRateLimit(ip, 5, 1000);
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.remaining, 4);

    const res2 = checkRateLimit(ip, 5, 1000);
    assert.strictEqual(res2.allowed, true);
    assert.strictEqual(res2.remaining, 3);
  });

  it("blocks requests that exceed rate limits", () => {
    const ip = "test-blocked-" + Math.random();
    for (let i = 0; i < 3; i++) {
      checkRateLimit(ip, 3, 5000);
    }
    const blocked = checkRateLimit(ip, 3, 5000);
    assert.strictEqual(blocked.allowed, false);
    assert.strictEqual(blocked.remaining, 0);
    assert.ok(blocked.resetSeconds > 0);
  });

  it("identifies honeypot bot submissions", () => {
    assert.strictEqual(isSpamSubmission("http://spam-site.com"), true);
    assert.strictEqual(isSpamSubmission("some-bot-text"), true);
    assert.strictEqual(isSpamSubmission(""), false);
    assert.strictEqual(isSpamSubmission(undefined), false);
  });

  it("identifies submissions completed unrealistically fast (<1200ms)", () => {
    const now = Date.now();
    // Submitted 500ms after starting
    assert.strictEqual(isSpamSubmission("", now - 500), true);
    // Submitted 5 seconds after starting (human pace)
    assert.strictEqual(isSpamSubmission("", now - 5000), false);
  });
});
