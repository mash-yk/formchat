"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  Send,
  Webhook,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSettings, testWebhookAction } from "@/app/dashboard/actions";
import type { FormSettings, WebhookLog } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buttonClass, inputClass } from "../ui/button";

type Props = {
  formId: string;
  slug?: string;
  settings: FormSettings;
  initialLogs: WebhookLog[];
};

export function IntegrationsPanel({ formId, slug: _slug, settings, initialLogs }: Props) {
  const [notifyEnabled, setNotifyEnabled] = useState(Boolean(settings.notifyEnabled));
  const [notifyEmail, setNotifyEmail] = useState(settings.notifyEmail ?? "");
  const [webhookEnabled, setWebhookEnabled] = useState(Boolean(settings.webhookEnabled));
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl ?? "");
  const [webhookSecret, setWebhookSecret] = useState(settings.webhookSecret ?? "");
  const [showSecret, setShowSecret] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>(initialLogs);

  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();

  const dirty =
    notifyEnabled !== Boolean(settings.notifyEnabled) ||
    notifyEmail !== (settings.notifyEmail ?? "") ||
    webhookEnabled !== Boolean(settings.webhookEnabled) ||
    webhookUrl !== (settings.webhookUrl ?? "") ||
    webhookSecret !== (settings.webhookSecret ?? "");

  function handleSave() {
    startSave(async () => {
      const result = await saveSettings(formId, {
        notifyEnabled,
        notifyEmail: notifyEmail.trim(),
        webhookEnabled,
        webhookUrl: webhookUrl.trim(),
        webhookSecret: webhookSecret.trim(),
      });
      if (result.ok) {
        toast.success("Integration settings saved.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleTestWebhook() {
    if (!webhookUrl || !/^https?:\/\/.+/i.test(webhookUrl)) {
      toast.error("Please enter a valid webhook URL first (https://...).");
      return;
    }

    startTest(async () => {
      toast.info("Sending test webhook ping…");
      const res = await testWebhookAction(formId, webhookUrl, webhookSecret);
      if (res.ok) {
        toast.success(`Webhook delivered successfully (HTTP ${res.status})!`);
      } else {
        toast.error(`Webhook test failed: ${res.error || `HTTP ${res.status}`}`);
      }
      // Refresh local logs
      setLogs((prev) => [
        {
          id: crypto.randomUUID(),
          form_id: formId,
          url: webhookUrl,
          status_code: res.status,
          success: res.ok,
          error: res.error,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    });
  }

  function generateSecret() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_";
    let str = "whsec_";
    for (let i = 0; i < 24; i++) str += chars[Math.floor(Math.random() * chars.length)];
    setWebhookSecret(str);
    toast.success("Generated random HMAC secret key.");
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <section className="rounded-xl border border-umber-200 bg-white p-5 shadow-xs dark:border-umber-800 dark:bg-umber-900">
        <div className="flex items-start justify-between gap-4 border-b border-umber-100 pb-4 dark:border-umber-800">
          <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Mail className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">Email Notifications</h2>
              <p className="text-xs text-umber-500">
                Receive an email alert each time a respondent completes this form.
              </p>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium select-none">
            <input
              type="checkbox"
              checked={notifyEnabled}
              onChange={(e) => setNotifyEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-6 w-11 rounded-full bg-umber-300 transition peer-checked:bg-bronze-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bronze-600 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5 dark:bg-umber-700"
            />
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="notify-email" className="block text-xs font-medium">
              Recipient Email Address
            </label>
            <input
              id="notify-email"
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="e.g. alerts@company.com"
              disabled={!notifyEnabled}
              className={cn(inputClass, "mt-1 text-sm disabled:opacity-50")}
            />
            <p className="mt-1 text-[11px] text-umber-400">
              New submissions will be formatted and delivered directly to this inbox.
            </p>
          </div>
        </div>
      </section>

      {/* Webhooks */}
      <section className="rounded-xl border border-umber-200 bg-white p-5 shadow-xs dark:border-umber-800 dark:bg-umber-900">
        <div className="flex items-start justify-between gap-4 border-b border-umber-100 pb-4 dark:border-umber-800">
          <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Webhook className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">Webhook Integrations</h2>
              <p className="text-xs text-umber-500">
                Send realtime JSON payloads to external services (Zapier, Make, Slack, or your API).
              </p>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium select-none">
            <input
              type="checkbox"
              checked={webhookEnabled}
              onChange={(e) => setWebhookEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-6 w-11 rounded-full bg-umber-300 transition peer-checked:bg-bronze-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bronze-600 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5 dark:bg-umber-700"
            />
          </label>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="webhook-url" className="block text-xs font-medium">
              Endpoint URL
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="webhook-url"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.yourdomain.com/webhooks/formchat"
                disabled={!webhookEnabled}
                className={cn(inputClass, "font-mono text-xs disabled:opacity-50")}
              />
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={!webhookEnabled || !webhookUrl || testing}
                className={buttonClass("secondary", "sm")}
              >
                {testing ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Send test
              </button>
            </div>
            <p className="mt-1 text-[11px] text-umber-400">
              Formchat sends a POST request with JSON payload including response answers snapshot.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="webhook-secret" className="block text-xs font-medium">
                Signing Secret (HMAC SHA-256)
              </label>
              <button
                type="button"
                onClick={generateSecret}
                disabled={!webhookEnabled}
                className="text-[11px] text-bronze-600 hover:underline dark:text-bronze-400 disabled:opacity-50"
              >
                Generate random secret
              </button>
            </div>
            <div className="mt-1 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  id="webhook-secret"
                  type={showSecret ? "text" : "password"}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxx"
                  disabled={!webhookEnabled}
                  className={cn(inputClass, "font-mono text-xs pr-9 disabled:opacity-50")}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  disabled={!webhookEnabled}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-umber-400 hover:text-umber-700"
                >
                  {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-umber-400">
              Signed in the <code className="font-mono">X-Formchat-Signature</code> header so your backend can verify authenticity.
            </p>
          </div>
        </div>

        {/* Recent Webhook Delivery Logs */}
        <div className="mt-6 border-t border-umber-100 pt-4 dark:border-umber-800">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-umber-500">
            Recent Delivery Logs
          </h3>
          {logs.length === 0 ? (
            <p className="text-xs text-umber-400 italic">No webhook deliveries recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-umber-100 text-umber-400 dark:border-umber-800">
                    <th className="py-1.5 font-medium">Timestamp</th>
                    <th className="py-1.5 font-medium">Status</th>
                    <th className="py-1.5 font-medium">Target URL</th>
                    <th className="py-1.5 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-umber-100 dark:divide-umber-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="text-umber-700 dark:text-umber-300">
                      <td className="py-2 whitespace-nowrap text-umber-400 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            log.success
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
                          )}
                        >
                          {log.success ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                          HTTP {log.status_code || "ERR"}
                        </span>
                      </td>
                      <td className="py-2 font-mono text-[11px] max-w-[200px] truncate">{log.url}</td>
                      <td className="py-2 text-[11px] text-umber-500">
                        {log.success ? "Delivered" : log.error || "Failed"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Save Settings Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className={buttonClass("primary")}
        >
          {saving ? "Saving…" : dirty ? "Save integrations" : "Saved"}
        </button>
      </div>
    </div>
  );
}
