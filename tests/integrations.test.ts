import assert from "node:assert";
import { describe, it } from "node:test";
import { computeHmacSignature } from "../src/lib/integrations";

describe("Integrations & Webhooks", () => {
  it("computes valid HMAC SHA-256 signature", () => {
    const payload = JSON.stringify({ event: "form.response.created", formId: "123" });
    const secret = "whsec_test_secret_key_123456";

    const signature = computeHmacSignature(payload, secret);
    assert.ok(signature.startsWith("sha256="));
    assert.strictEqual(signature.length, 7 + 64);

    // Identical payload and secret produces identical signature
    const signature2 = computeHmacSignature(payload, secret);
    assert.strictEqual(signature, signature2);

    // Altered payload produces different signature
    const signatureDiff = computeHmacSignature(payload + "x", secret);
    assert.notStrictEqual(signature, signatureDiff);
  });
});
