"use client";

import {
  Bot,
  Check,
  Code2,
  Download,
  ExternalLink,
  Link2,
  MessageCircle,
  Palette,
  Smile,
  Sparkles,
  User,
} from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { saveSettings } from "@/app/dashboard/actions";
import { embedSnippet, testPageHtml } from "@/lib/embed";
import {
  COLOR_PRESETS,
  DEFAULT_SETTINGS,
  DESIGN_PRESETS,
  readableTextColor,
  type DesignPreset,
} from "@/lib/settings";
import type { ChatQuestion, FormSettings, FormStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HEX_COLOR, LIMITS } from "@/lib/validation";
import { ChatForm } from "../chat/chat-form";
import { PublishButton } from "../dashboard/publish-button";
import { buttonClass, inputClass } from "../ui/button";
import { CopyButton } from "../ui/copy-button";

type Props = {
  formId: string;
  slug: string;
  title: string;
  status: FormStatus;
  settings: Required<FormSettings>;
  questions: ChatQuestion[];
};

const subscribe = () => () => {};

/** The app's own origin — where the widget script and public links live. */
function useOrigin() {
  return useSyncExternalStore(
    subscribe,
    () => process.env.NEXT_PUBLIC_SITE_URL || window.location.origin,
    () => process.env.NEXT_PUBLIC_SITE_URL ?? "",
  );
}

export function SharePanel({ formId, slug, title, status, settings, questions }: Props) {
  const origin = useOrigin();
  const [position, setPosition] = useState<"right" | "left">(settings.position || "right");
  const [embedMode, setEmbedMode] = useState<"floating" | "inline">("floating");

  const publicUrl = `${origin}/f/${slug}`;
  const floatingSnippet = embedSnippet(origin, slug, position);
  const inlineSnippet = `<iframe src="${origin}/embed/${slug}?mode=inline" width="100%" height="600" frameborder="0" style="border: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);" allow="clipboard-write"></iframe>`;

  const activeSnippet = embedMode === "floating" ? floatingSnippet : inlineSnippet;

  function downloadTestPage() {
    const blob = new Blob([testPageHtml(origin, slug, title, position)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formchat-test-${slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Test page downloaded — open it from your Downloads folder.");
  }

  return (
    <div className="space-y-6">
      {status !== "published" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <p>
            <strong>This form is a draft.</strong> The link and widget only work after you publish it.
          </p>
          <PublishButton formId={formId} status={status} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Public link */}
        <Card
          icon={Link2}
          title="Direct link"
          description="Share this link directly with respondents across email, social, or chat."
        >
          <div className="flex gap-2">
            <input
              readOnly
              value={publicUrl}
              aria-label="Public link"
              className={cn(inputClass, "font-mono text-xs")}
              onFocus={(e) => e.target.select()}
            />
            <CopyButton value={publicUrl} />
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-bronze-600 hover:underline dark:text-bronze-400"
          >
            Open live form <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </Card>

        {/* Embed code (Floating & Inline) */}
        <Card
          icon={Code2}
          title="Embed on your website"
          description="Choose a floating launcher bubble or an inline embed inside your page flow."
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Embed mode switch */}
            <div className="inline-flex rounded-lg border border-umber-200 bg-umber-50 p-0.5 dark:border-umber-800 dark:bg-umber-950">
              <button
                type="button"
                onClick={() => setEmbedMode("floating")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition",
                  embedMode === "floating"
                    ? "bg-white text-umber-900 shadow-xs dark:bg-umber-900 dark:text-umber-100"
                    : "text-umber-600 hover:text-umber-900 dark:text-umber-400",
                )}
              >
                Floating bubble
              </button>
              <button
                type="button"
                onClick={() => setEmbedMode("inline")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition",
                  embedMode === "inline"
                    ? "bg-white text-umber-900 shadow-xs dark:bg-umber-900 dark:text-umber-100"
                    : "text-umber-600 hover:text-umber-900 dark:text-umber-400",
                )}
              >
                Inline frame
              </button>
            </div>

            {embedMode === "floating" && (
              <div className="flex items-center gap-2">
                <span className="text-umber-500">Position:</span>
                {(["right", "left"] as const).map((p) => (
                  <label key={p} className="inline-flex cursor-pointer items-center gap-1 capitalize">
                    <input
                      type="radio"
                      name="position"
                      value={p}
                      checked={position === p}
                      onChange={() => setPosition(p)}
                      className="accent-bronze-600"
                    />
                    {p}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg bg-umber-950 ring-1 ring-umber-800">
            <div className="flex items-center justify-between gap-3 border-b border-umber-800 px-3 py-2">
              <span className="text-xs text-umber-400">
                {embedMode === "floating" ? "HTML (before </body>)" : "HTML (in your layout container)"}
              </span>
              <CopyButton value={activeSnippet} label="Copy code" />
            </div>
            <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-umber-100 font-mono">
              <code>{activeSnippet}</code>
            </pre>
          </div>

          <button
            type="button"
            onClick={downloadTestPage}
            className={buttonClass("secondary", "sm", "mt-3")}
          >
            <Download className="size-4" aria-hidden /> Download a test website
          </button>
        </Card>
      </div>

      <WidgetCustomizer
        formId={formId}
        slug={slug}
        title={title}
        settings={settings}
        questions={questions}
      />
    </div>
  );
}

function WidgetCustomizer({
  formId,
  slug,
  title,
  settings,
  questions,
}: Omit<Props, "status">) {
  const [values, setValues] = useState<Required<FormSettings>>({
    primaryColor: settings.primaryColor || DEFAULT_SETTINGS.primaryColor,
    welcomeMessage: settings.welcomeMessage || DEFAULT_SETTINGS.welcomeMessage,
    completionMessage: settings.completionMessage || DEFAULT_SETTINGS.completionMessage,
    redirectUrl: settings.redirectUrl || DEFAULT_SETTINGS.redirectUrl,
    avatarType: settings.avatarType || DEFAULT_SETTINGS.avatarType,
    avatarUrl: settings.avatarUrl || DEFAULT_SETTINGS.avatarUrl,
    botName: settings.botName || DEFAULT_SETTINGS.botName,
    position: settings.position || DEFAULT_SETTINGS.position,
    theme: settings.theme || DEFAULT_SETTINGS.theme,
    notifyEmail: settings.notifyEmail || DEFAULT_SETTINGS.notifyEmail,
    notifyEnabled: settings.notifyEnabled ?? DEFAULT_SETTINGS.notifyEnabled,
    webhookUrl: settings.webhookUrl || DEFAULT_SETTINGS.webhookUrl,
    webhookSecret: settings.webhookSecret || DEFAULT_SETTINGS.webhookSecret,
    webhookEnabled: settings.webhookEnabled ?? DEFAULT_SETTINGS.webhookEnabled,
    questionMeta: settings.questionMeta || DEFAULT_SETTINGS.questionMeta,
  });

  const [saved, setSaved] = useState(values);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const validColor = HEX_COLOR.test(values.primaryColor);

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function applyPreset(preset: DesignPreset) {
    setValues((v) => ({
      ...v,
      primaryColor: preset.primaryColor,
      avatarType: preset.avatarType,
      botName: preset.botName,
      theme: preset.theme,
    }));
    toast.success(`Applied "${preset.name}" preset.`);
  }

  function save() {
    const snapshot = values;
    startTransition(async () => {
      const result = await saveSettings(formId, snapshot);
      if (result.ok) {
        setSaved(snapshot);
        setErrors({});
        toast.success("Widget settings saved — applied everywhere it’s embedded.");
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
      }
    });
  }

  const previewColor = validColor ? values.primaryColor : saved.primaryColor;

  return (
    <Card
      icon={Palette}
      title="Customize the chatbot widget"
      description="Tailor brand colors, avatar, bot persona, welcome greetings, and completion actions."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {/* 1. Design Presets */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-umber-500">
              1-Click Design Presets
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DESIGN_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-2 rounded-lg border border-umber-200 p-2 text-left text-xs transition hover:border-bronze-400 hover:bg-umber-50 dark:border-umber-800 dark:hover:bg-umber-950"
                >
                  <span
                    className="size-4 shrink-0 rounded-full shadow-xs"
                    style={{ background: preset.primaryColor }}
                  />
                  <span className="truncate font-medium">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Color Selection */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Brand color</legend>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update("primaryColor", c)}
                  aria-label={`Use color ${c}`}
                  aria-pressed={values.primaryColor.toLowerCase() === c}
                  className="grid size-8 place-items-center rounded-full outline-1 -outline-offset-1 outline-white/20 ring-offset-2 transition hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-umber-900 dark:ring-offset-umber-900 dark:aria-pressed:ring-bronze-300"
                  style={{ background: c, color: readableTextColor(c) }}
                >
                  {values.primaryColor.toLowerCase() === c && (
                    <Check className="size-4" aria-hidden />
                  )}
                </button>
              ))}
              <label className="ml-1 inline-flex items-center gap-2">
                <span className="sr-only">Custom color</span>
                <input
                  type="color"
                  value={validColor ? values.primaryColor : "#000000"}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="size-8 cursor-pointer rounded-full border border-umber-300 bg-transparent p-0.5 dark:border-umber-700"
                />
              </label>
              <input
                value={values.primaryColor}
                onChange={(e) => update("primaryColor", e.target.value.trim())}
                aria-label="Hex color"
                aria-invalid={!validColor}
                maxLength={7}
                className={cn(inputClass, "w-28 font-mono text-xs")}
              />
            </div>
          </fieldset>

          {/* 3. Persona & Avatar */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bot-name" className="block text-sm font-medium">
                Bot Persona Name
              </label>
              <input
                id="bot-name"
                value={values.botName}
                maxLength={LIMITS.botName}
                onChange={(e) => update("botName", e.target.value)}
                placeholder="e.g. Support Assistant"
                className={cn(inputClass, "mt-1 text-sm")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Avatar Icon</label>
              <div className="mt-1 flex items-center gap-2">
                {[
                  { type: "bot" as const, icon: Bot },
                  { type: "sparkles" as const, icon: Sparkles },
                  { type: "agent" as const, icon: User },
                  { type: "smile" as const, icon: Smile },
                ].map(({ type, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update("avatarType", type)}
                    className={cn(
                      "grid size-9 place-items-center rounded-lg border transition",
                      values.avatarType === type
                        ? "border-(--fc-primary) bg-(--fc-primary)/10 text-(--fc-primary) ring-1 ring-(--fc-primary)"
                        : "border-umber-200 text-umber-600 hover:bg-umber-100 dark:border-umber-700 dark:text-umber-300",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Theme & Position */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Theme Mode</label>
              <select
                value={values.theme}
                onChange={(e) => update("theme", e.target.value as "light" | "dark" | "auto")}
                className={cn(inputClass, "mt-1 text-sm")}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">System Auto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Launcher Position</label>
              <select
                value={values.position}
                onChange={(e) => update("position", e.target.value as "right" | "left")}
                className={cn(inputClass, "mt-1 text-sm")}
              >
                <option value="right">Bottom Right</option>
                <option value="left">Bottom Left</option>
              </select>
            </div>
          </div>

          {/* 5. Messages */}
          <MessageField
            id="welcome"
            label="Welcome greeting"
            hint="The opening message respondents see."
            value={values.welcomeMessage}
            placeholder={DEFAULT_SETTINGS.welcomeMessage}
            error={errors.welcomeMessage}
            onChange={(v) => update("welcomeMessage", v)}
          />

          <MessageField
            id="completion"
            label="Completion message"
            hint="Displayed after the final answer is submitted."
            value={values.completionMessage}
            placeholder={DEFAULT_SETTINGS.completionMessage}
            error={errors.completionMessage}
            onChange={(v) => update("completionMessage", v)}
          />

          <div>
            <label htmlFor="redirect-url" className="block text-sm font-medium">
              Redirect URL <span className="font-normal text-umber-400">(optional)</span>
            </label>
            <p className="mb-1 text-xs text-umber-400">
              Redirect respondents to a custom thank you page or booking link after submission.
            </p>
            <input
              id="redirect-url"
              type="url"
              value={values.redirectUrl}
              placeholder="https://yourdomain.com/thank-you"
              onChange={(e) => update("redirectUrl", e.target.value)}
              className={cn(inputClass, "text-sm font-mono")}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || !validColor || pending}
              className={buttonClass("primary")}
            >
              {pending ? "Saving…" : dirty ? "Save widget settings" : "Saved"}
            </button>
            <button
              type="button"
              onClick={() => setValues(DEFAULT_SETTINGS)}
              disabled={pending || JSON.stringify(values) === JSON.stringify(DEFAULT_SETTINGS)}
              className={buttonClass("ghost")}
            >
              Reset to defaults
            </button>
          </div>
        </div>

        {/* Live Preview Column */}
        <div>
          <p className="mb-2 text-sm font-medium text-umber-600 dark:text-umber-400">Preview</p>
          <div className="relative rounded-2xl bg-umber-100 p-4 pb-20 dark:bg-umber-800/60">
            <div className="h-[460px] overflow-hidden rounded-2xl shadow-xl ring-1 ring-umber-200 dark:ring-umber-700">
              <ChatForm
                form={{
                  title: values.botName || title,
                  slug,
                  settings: { ...values, primaryColor: previewColor },
                  questions,
                }}
                mode="preview"
                variant="card"
                autoFocus={false}
              />
            </div>
            <span
              aria-hidden
              className={cn(
                "absolute bottom-4 grid size-12 place-items-center rounded-full shadow-lg",
                values.position === "left" ? "left-4" : "right-4",
              )}
              style={{ background: previewColor, color: readableTextColor(previewColor) }}
            >
              <MessageCircle className="size-6" />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MessageField({
  id,
  label,
  hint,
  value,
  placeholder,
  error,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <p className="mb-1 text-xs text-umber-400">{hint}</p>
      <textarea
        id={id}
        rows={2}
        value={value}
        maxLength={LIMITS.message}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Link2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-umber-200 bg-white p-5 shadow-xs dark:border-umber-800 dark:bg-umber-900">
      <div className="mb-4 flex gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bronze-50 text-bronze-600 dark:bg-bronze-950/50 dark:text-bronze-400">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-umber-600 dark:text-umber-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
