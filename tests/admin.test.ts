import assert from "node:assert";
import { describe, it } from "node:test";
import {
  isAdminUser,
  isUserSuspended,
  reactivateUserAccount,
  suspendUserAccount,
} from "../src/lib/admin-core";

describe("Admin & Role-Based Access Control", () => {
  it("allows admin check when ADMIN_EMAILS includes user email", () => {
    const original = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "admin@formchat.dev, super@company.com";

    assert.strictEqual(
      isAdminUser({ id: "user-1", email: "admin@formchat.dev" }),
      true,
    );
    assert.strictEqual(
      isAdminUser({ id: "user-2", email: "SUPER@company.com" }),
      true,
    );
    assert.strictEqual(
      isAdminUser({ id: "user-3", email: "regular@gmail.com" }),
      false,
    );

    process.env.ADMIN_EMAILS = original;
  });

  it("suspends and reactivates user accounts", () => {
    const userId = "test-user-" + Math.random();

    assert.strictEqual(isUserSuspended(userId), false);

    suspendUserAccount(userId);
    assert.strictEqual(isUserSuspended(userId), true);

    reactivateUserAccount(userId);
    assert.strictEqual(isUserSuspended(userId), false);
  });
});
