import crypto from "node:crypto";
import type { AnswerSnapshot, ResponseSource, WebhookLog } from "./types";
import { formatAnswer } from "./validation";

// In-memory store for webhook logs so they persist across requests and work without DB table
const inMemoryWebhookLogs = new Map<string, WebhookLog[]>();

export function getWebhookLogs(formId: string): WebhookLog[] {
  return inMemoryWebhookLogs.get(formId) ?? [];
}

export function recordWebhookLog(log: WebhookLog) {
  const existing = inMemoryWebhookLogs.get(log.form_id) ?? [];
  inMemoryWebhookLogs.set(log.form_id, [log, ...existing].slice(0, 50));
}

export function computeHmacSignature(payload: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload, "utf-8").digest("hex");
}

export type WebhookPayload = {
  event: "form.response.created" | "test.ping";
  timestamp: string;
  form: {
    id: string;
    title: string;
    slug: string;
  };
  response?: {
    id: string;
    source: ResponseSource;
    submittedAt: string;
    answers: AnswerSnapshot[];
  };
};

/**
 * Dispatches a webhook to the configured destination URL with HMAC signature.
 */
export async function triggerWebhook({
  formId,
  formTitle,
  slug,
  url,
  secret,
  response,
}: {
  formId: string;
  formTitle: string;
  slug: string;
  url: string;
  secret?: string;
  response?: {
    id: string;
    source: ResponseSource;
    submittedAt: string;
    answers: AnswerSnapshot[];
  };
}): Promise<{ ok: boolean; status: number; error?: string }> {
  if (!url || !/^https?:\/\/.+/i.test(url)) {
    return { ok: false, status: 0, error: "Invalid webhook URL" };
  }

  const payload: WebhookPayload = {
    event: response ? "form.response.created" : "test.ping",
    timestamp: new Date().toISOString(),
    form: {
      id: formId,
      title: formTitle,
      slug,
    },
    response,
  };

  const bodyString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Formchat-Webhook/1.0",
  };

  if (secret && secret.trim()) {
    headers["X-Formchat-Signature"] = computeHmacSignature(bodyString, secret.trim());
  }

  const logId = crypto.randomUUID();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: bodyString,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const log: WebhookLog = {
      id: logId,
      form_id: formId,
      response_id: response?.id,
      url,
      status_code: res.status,
      success: res.ok,
      error: res.ok ? undefined : `HTTP ${res.status} ${res.statusText}`,
      created_at: new Date().toISOString(),
    };
    recordWebhookLog(log);

    return { ok: res.ok, status: res.status, error: res.ok ? undefined : res.statusText };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network failure";
    const log: WebhookLog = {
      id: logId,
      form_id: formId,
      response_id: response?.id,
      url,
      status_code: 0,
      success: false,
      error: errorMsg,
      created_at: new Date().toISOString(),
    };
    recordWebhookLog(log);

    return { ok: false, status: 0, error: errorMsg };
  }
}

/**
 * Sends an email notification when a new response is submitted.
 */
export async function sendNotificationEmail({
  recipientEmail,
  formTitle,
  formSlug,
  answers,
  source,
  submittedAt,
}: {
  recipientEmail: string;
  formTitle: string;
  formSlug: string;
  answers: AnswerSnapshot[];
  source: ResponseSource;
  submittedAt: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!recipientEmail || !recipientEmail.includes("@")) {
    return { ok: false, error: "Invalid recipient email" };
  }

  const answersFormatted = answers
    .map((a) => `• ${a.label}\n  -> ${formatAnswer(a.type, a.value) || "(blank)"}`)
    .join("\n\n");

  const messageText = `
New response submitted for: ${formTitle}
Slug: ${formSlug}
Source: ${source === "embed" ? "Website Widget" : "Direct Link"}
Submitted At: ${submittedAt}

Answers:
----------------------------------------
${answersFormatted}
----------------------------------------

View all responses on your Formchat Dashboard.
  `.trim();

  // If a provider like Resend or SendGrid is configured via environment variable:
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Formchat <notifications@resend.dev>",
          to: recipientEmail,
          subject: `[Formchat] New response for "${formTitle}"`,
          text: messageText,
        }),
      });
      return { ok: res.ok };
    } catch (e: unknown) {
      console.error("Failed to send email via Resend:", e);
    }
  }

  // Graceful fallback: log to console
  console.log(`[Formchat Email Notification to ${recipientEmail}]:\n${messageText}`);
  return { ok: true };
}
