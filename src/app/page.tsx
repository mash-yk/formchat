import {
  BarChart3,
  Code2,
  ListChecks,
  MessagesSquare,
  Palette,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ChatForm } from "@/components/chat/chat-form";
import { demoForm } from "@/components/landing/demo-form";
import { HeroConversation } from "@/components/landing/hero-conversation";
import { Logo } from "@/components/logo";
import { site } from "@/lib/site";

// Optional: the slug of one of YOUR published forms. When set, the real widget
// (public/widget.js) is embedded on this page and answers are actually saved.
const liveDemoSlug = process.env.NEXT_PUBLIC_DEMO_FORM_SLUG;

const features: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ListChecks,
    title: "Build without code",
    text: "Add text, email, multiple-choice and yes/no questions, mark the ones that are required and drag them into order.",
  },
  {
    icon: MessagesSquare,
    title: "One question at a time",
    text: "Visitors answer in a chat, so a ten-question form feels like a short conversation instead of a wall of fields.",
  },
  {
    icon: Code2,
    title: "Embed on any website",
    text: "Paste one script tag. The chat bubble works on desktop and mobile and never clashes with your site’s styles.",
  },
  {
    icon: ShieldCheck,
    title: "Answers are checked",
    text: "Required questions can’t be skipped and email addresses are validated — in the chat and again on the server.",
  },
  {
    icon: BarChart3,
    title: "Every response in one place",
    text: "Each submission is saved with its time and where it came from. Read them in the dashboard or export a CSV.",
  },
  {
    icon: Palette,
    title: "Your colors, your words",
    text: "Choose a brand color and write your own welcome and thank-you messages. Changes reach every embed instantly.",
  },
];

const steps = [
  {
    title: "Build your form",
    text: "Add questions in the builder and watch the chat preview update as you type.",
  },
  { title: "Publish it", text: "Publishing gives the form a public link you can share straight away." },
  { title: "Embed it", text: "Copy one line into your website and a chat bubble appears in the corner." },
  {
    title: "Read the answers",
    text: "Every response lands in your dashboard with the time it was submitted.",
  },
];

const primaryCta =
  "bg-bronze-metal rounded-full px-6 py-3 text-[15px] font-semibold text-umber-950 shadow-[0_10px_30px_-10px_var(--color-bronze-400)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-300";
const secondaryCta =
  "rounded-full px-6 py-3 text-[15px] font-semibold text-umber-100 ring-1 ring-umber-700 transition hover:bg-umber-900 hover:ring-bronze-400/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-300";
const sectionTitle =
  "font-display text-4xl leading-tight font-bold tracking-[-0.025em] text-umber-50 sm:text-5xl";

export default function Home() {
  return (
    <div className="grain flex flex-1 flex-col bg-umber-950 text-umber-50">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[640px] bg-[radial-gradient(50%_60%_at_70%_30%,color-mix(in_oklab,var(--color-bronze-600)_35%,transparent),transparent)]"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pt-14 pb-28 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24 lg:pb-36">
            <div>
              <h1 className="text-bronze-metal font-display text-[clamp(2.75rem,6.5vw,4.75rem)] leading-[0.98] font-bold tracking-[-0.035em] pb-1">
                Forms that feel like a conversation.
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-umber-300">
                Formchat asks your questions one at a time, like a chat. Build a form in minutes, add it to
                any website with a single line of code and read every answer in your dashboard.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/signup" className={primaryCta}>
                  Create a free form
                </Link>
                <a href="#demo" className={secondaryCta}>
                  Try the live demo
                </a>
              </div>
            </div>
            <HeroConversation />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-y border-umber-800/80 bg-umber-900/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 className={`max-w-xl ${sectionTitle}`}>From the first question to the last answer</h2>
            <dl className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="border-t border-bronze-400/40 pt-5">
                  <dt className="flex items-center gap-2.5 text-lg font-semibold text-umber-50">
                    <Icon className="size-5 text-bronze-400" aria-hidden />
                    {title}
                  </dt>
                  <dd className="mt-2 leading-relaxed text-umber-300">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 className={`max-w-xl ${sectionTitle}`}>Live on your website in four steps</h2>
            <ol className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {steps.map((step, i) => (
                <li key={step.title} className="relative">
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-[22px] left-14 hidden h-px w-[calc(100%-3.5rem)] bg-gradient-to-r from-bronze-400/60 to-transparent lg:block"
                    />
                  )}
                  <span className="bg-bronze-metal grid size-11 place-items-center rounded-full font-display text-lg font-bold text-umber-950 shadow-[0_6px_20px_-8px_var(--color-bronze-400)]">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-umber-50">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-umber-300">{step.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-14 overflow-hidden rounded-2xl bg-umber-900 text-sm ring-1 ring-umber-800">
              <p className="border-b border-umber-800 px-5 py-3 text-umber-400">
                Step 3 — the only code you add to your site
              </p>
              <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-relaxed sm:text-sm">
                <code>
                  <span className="text-umber-500">&lt;</span>
                  <span className="text-bronze-300">script</span> <span className="text-umber-300">src</span>=
                  <span className="text-amber-200">&quot;https://your-app.vercel.app/widget.js&quot;</span>{" "}
                  <span className="text-umber-300">data-form</span>=
                  <span className="text-amber-200">&quot;k3x9qa7m2p&quot;</span>{" "}
                  <span className="text-umber-300">async</span>
                  <span className="text-umber-500">&gt;&lt;/</span>
                  <span className="text-bronze-300">script</span>
                  <span className="text-umber-500">&gt;</span>
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* Live demo */}
        <section
          id="demo"
          className="relative scroll-mt-16 overflow-hidden border-t border-umber-800/80 bg-umber-900"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_60%_at_80%_50%,color-mix(in_oklab,var(--color-bronze-600)_30%,transparent),transparent)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.25fr] lg:py-28">
            <div>
              <h2 className={sectionTitle}>Try it yourself</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-umber-300">
                This is the widget the way visitors see it on a website. Answer the questions, try skipping a
                required one or typing a broken email address. It’s a preview, so nothing is saved.
              </p>
              {liveDemoSlug && (
                <p className="mt-4 max-w-md leading-relaxed text-umber-300">
                  The chat bubble in the bottom corner of this page is the real embedded widget. Answers sent
                  through it are saved like any other response.
                </p>
              )}
              <Link href="/signup" className={`mt-8 inline-block ${primaryCta}`}>
                Build your own
              </Link>
            </div>
            <BrowserMock />
          </div>
        </section>
      </main>

      <SiteFooter />
      {liveDemoSlug && <script src="/widget.js" data-form={liveDemoSlug} async />}
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-umber-800/60 bg-umber-950/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Formchat home">
          <Logo />
        </Link>
        <nav
          aria-label="Main"
          className="hidden items-center gap-7 text-sm font-medium text-umber-300 md:flex"
        >
          <a href="#features" className="transition hover:text-bronze-200">
            Features
          </a>
          <a href="#how-it-works" className="transition hover:text-bronze-200">
            How it works
          </a>
          <a href="#demo" className="transition hover:text-bronze-200">
            Demo
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-umber-200 transition hover:bg-umber-900"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-bronze-metal rounded-full px-4 py-2 text-sm font-semibold text-umber-950 transition hover:brightness-110"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}

function BrowserMock() {
  return (
    <div className="overflow-hidden rounded-2xl bg-umber-950 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)] ring-1 ring-bronze-300/15">
      <div className="flex items-center gap-2 border-b border-umber-800 bg-umber-900 px-4 py-3">
        <span className="size-3 rounded-full bg-umber-700" />
        <span className="size-3 rounded-full bg-umber-700" />
        <span className="size-3 rounded-full bg-umber-700" />
        <span className="ml-3 flex-1 truncate rounded-md bg-umber-950 px-3 py-1 text-xs text-umber-400">
          sunnysidebakery.com
        </span>
      </div>
      <div className="relative bg-[#fff8ef] sm:h-[580px]">
        {/* The pretend website behind the widget */}
        <div aria-hidden className="hidden p-8 sm:block">
          <p className="font-serif text-2xl font-bold text-[#3b2f2f]">🥐 Sunny Side Bakery</p>
          <div className="mt-8 h-4 w-3/5 rounded bg-[#f1dfc4]" />
          <div className="mt-3 h-4 w-2/5 rounded bg-[#f1dfc4]" />
          <div className="mt-8 grid w-1/2 grid-cols-2 gap-3">
            <div className="h-24 rounded-xl bg-[#f4d9b0]" />
            <div className="h-24 rounded-xl bg-[#f4d9b0]" />
          </div>
        </div>
        {/* The widget, opened */}
        <div className="h-[520px] sm:absolute sm:right-5 sm:bottom-5 sm:h-[480px] sm:w-[340px] sm:overflow-hidden sm:rounded-2xl sm:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
          <ChatForm form={demoForm} mode="preview" variant="card" autoFocus={false} />
        </div>
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-umber-800/80 bg-umber-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-umber-400">{site.description}</p>
        </div>
        <FooterColumn
          title="Product"
          links={[
            { href: "#features", label: "Features" },
            { href: "#how-it-works", label: "How it works" },
            { href: "#demo", label: "Live demo" },
          ]}
        />
        <FooterColumn
          title="Account"
          links={[
            { href: "/signup", label: "Sign up" },
            { href: "/login", label: "Log in" },
            { href: "/dashboard", label: "Dashboard" },
          ]}
        />
        <FooterColumn
          title="Contact"
          links={[
            { href: `mailto:${site.contactEmail}`, label: site.contactEmail },
            { href: site.githubUrl, label: "Source on GitHub" },
          ]}
        />
      </div>
      <p className="border-t border-umber-800/80 px-4 py-6 text-center text-xs text-umber-400">
        Formchat is an open-source project built with Next.js, Supabase and Tailwind CSS.
      </p>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-umber-100">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-umber-400">
        {links.map((l) => (
          <li key={l.href}>
            {l.href.startsWith("/") ? (
              <Link href={l.href} className="transition hover:text-bronze-300">
                {l.label}
              </Link>
            ) : (
              <a href={l.href} className="transition hover:text-bronze-300">
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
