import type { CurrentUser } from "./auth";

// In-memory suspended accounts registry
const suspendedUserIds = new Set<string>();

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  type:
    | "form_create"
    | "form_publish"
    | "response_submit"
    | "account_suspend"
    | "account_reactivate"
    | "webhook_dispatch";
  description: string;
  userId?: string;
  formId?: string;
};

const auditLogs: AuditLogEntry[] = [];

export function recordAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">) {
  auditLogs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (auditLogs.length > 500) auditLogs.pop();
}

export function getAuditLogs(): AuditLogEntry[] {
  return auditLogs;
}

export function isUserSuspended(userId: string): boolean {
  return suspendedUserIds.has(userId);
}

export function suspendUserAccount(userId: string) {
  suspendedUserIds.add(userId);
  recordAuditLog({
    type: "account_suspend",
    description: `User account ${userId} was suspended by an administrator`,
    userId,
  });
}

export function reactivateUserAccount(userId: string) {
  suspendedUserIds.delete(userId);
  recordAuditLog({
    type: "account_reactivate",
    description: `User account ${userId} was reactivated`,
    userId,
  });
}

/**
 * Checks if a user has admin privileges.
 * Controlled by ADMIN_EMAILS env variable (comma-separated).
 * If ADMIN_EMAILS is not configured, any logged-in user is granted admin access in dev/testing!
 */
export function isAdminUser(user: CurrentUser): boolean {
  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails || adminEmails.trim() === "") {
    return true;
  }
  const allowed = adminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(user.email.toLowerCase());
}
