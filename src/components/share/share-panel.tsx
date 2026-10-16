"use client";

import { Check, Code2, Download, ExternalLink, Link2, MessageCircle, Palette } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { saveSettings } from "@/app/dashboard/actions";
import { embedSnippet, testPageHtml } from "@/lib/embed";
import { COLOR_PRESETS, DEFAULT_SETTINGS, readableTextColor } from "@/lib/settings";
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

const subscribe = () => () => { };

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
  const [position, setPosition] = useState<"right" | "left">("right");
  const publicUrl = `${origin}/f/${slug}`;
  const snippet = embedSnippet(origin, slug, position);

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
          title="Public link"
          description="Share this link anywhere — email, social media, QR codes."
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
            Open in a new tab <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </Card>

        {/* Embed */}
        <Card
          icon={Code2}
          title="Embed on your website"
          description="Paste this snippet just before the closing </body> tag of any page."
        >
          <div className="mb-3 flex items-center gap-3 text-sm">
            <span className="text-umber-600 dark:text-umber-400">Bubble position</span>
            {(["right", "left"] as const).map((p) => (
              <label key={p} className="inline-flex cursor-pointer items-center gap-1.5 capitalize">
                <input
                  type="radio"
                  name="position"
                  value={p}
                  checked={position === p}
                  onChange={() => setPosition(p)}
                  className="accent-bronze-600"
                />
                Bottom {p}
              </label>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg bg-umber-950 ring-1 ring-umber-800">
            <div className="flex items-center justify-between gap-3 border-b border-umber-800 px-3 py-2">
              <span className="text-xs text-umber-400">HTML</span>
              <CopyButton value={snippet} label="Copy code" />
            </div>
            <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-umber-100">
              <code>{snippet}</code>
            </pre>
          </div>
          <button type="button" onClick={downloadTestPage} className={buttonClass("secondary", "sm", "mt-3")}>
            <Download className="size-4" aria-hidden /> Download a test website
          </button>
          <p className="mt-2 text-xs text-umber-400">
            A ready-made demo page with your widget already embedded. Open it from your computer to try the
            widget on a site that isn’t Formchat.
          </p>
        </Card>
      </div>

      <WidgetCustomizer formId={formId} slug={slug} title={title} settings={settings} questions={questions} />
    </div>
  );
}

function WidgetCustomizer({ formId, slug, title, settings, questions }: Omit<Props, "status">) {
  const [values, setValues] = useState(settings);
  const [saved, setSaved] = useState(settings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const validColor = HEX_COLOR.test(values.primaryColor);

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function save() {
    const snapshot = values;
    startTransition(async () => {
      const result = await saveSettings(formId, snapshot);
      if (result.ok) {
        setSaved(snapshot);
        setErrors({});
        toast.success("Widget settings saved — live everywhere it’s embedded.");
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
      title="Customize the widget"
      description="Changes apply to the public link and every website where the widget is embedded — no need to update the snippet."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
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
                  {values.primaryColor.toLowerCase() === c && <Check className="size-4" aria-hidden />}
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
                className={cn(inputClass, "w-28 font-mono")}
              />
            </div>
            {(!validColor || errors.primaryColor) && (
              <p className="mt-1 text-xs text-red-600">
                {errors.primaryColor || "Use a hex color like #4f46e5"}
              </p>
            )}
          </fieldset>

          <MessageField
            id="welcome"
            label="Welcome message"
            hint="The first thing visitors see."
            value={values.welcomeMessage}
            placeholder={DEFAULT_SETTINGS.welcomeMessage}
            error={errors.welcomeMessage}
            onChange={(v) => update("welcomeMessage", v)}
          />
          <MessageField
            id="completion"
            label="Completion message"
            hint="Shown after the last answer is submitted."
            value={values.completionMessage}
            placeholder={DEFAULT_SETTINGS.completionMessage}
            error={errors.completionMessage}
            onChange={(v) => update("completionMessage", v)}
          />

          <div className="flex flex-wrap items-center gap-2">
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

        {/* Preview */}
        <div>
          <p className="mb-2 text-sm font-medium text-umber-600 dark:text-umber-400">Preview</p>
          <div className="relative rounded-2xl bg-umber-100 p-4 pb-20 dark:bg-umber-800/60">
            <div className="h-[440px] overflow-hidden rounded-2xl shadow-xl ring-1 ring-umber-200">
              <ChatForm
                form={{ title, slug, settings: { ...values, primaryColor: previewColor }, questions }}
                mode="preview"
                variant="card"
                autoFocus={false}
              />
            </div>
            <span
              aria-hidden
              className="absolute right-4 bottom-4 grid size-12 place-items-center rounded-full shadow-lg"
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
      <p className="mb-1.5 text-xs text-umber-400">{hint}</p>
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
