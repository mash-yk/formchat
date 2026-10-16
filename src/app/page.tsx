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

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-paper text-ink">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-16 px-4 pt-12 pb-24 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20 lg:pb-32">
          <div>
            <h1 className="font-display text-[clamp(2.75rem,6.5vw,4.75rem)] leading-[0.98] font-bold tracking-[-0.035em]">
              Forms that feel like a conversation.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-slate-ink">
              Formchat asks your questions one at a time, like a chat. Build a form in minutes, add it to any
              website with a single line of code and read every answer in your dashboard.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-indigo-600 px-6 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.7)] transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Create a free form
              </Link>
              <a
                href="#demo"
                className="rounded-full px-6 py-3 text-[15px] font-semibold text-ink ring-1 ring-ink/15 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Try the live demo
              </a>
            </div>
          </div>
          <HeroConversation />
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-ink/10 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 className="max-w-xl font-display text-4xl leading-tight font-bold tracking-[-0.025em] sm:text-5xl">
              From the first question to the last answer
            </h2>
            <dl className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="border-t-2 border-ink pt-5">
                  <dt className="flex items-center gap-2.5 text-lg font-semibold">
                    <Icon className="size-5 text-indigo-600" aria-hidden />
                    {title}
                  </dt>
                  <dd className="mt-2 leading-relaxed text-slate-ink">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <h2 className="max-w-xl font-display text-4xl leading-tight font-bold tracking-[-0.025em] sm:text-5xl">
              Live on your website in four steps
            </h2>
            <ol className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {steps.map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="grid size-11 place-items-center rounded-full bg-indigo-600 font-display text-lg font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-ink">{step.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-14 overflow-hidden rounded-2xl bg-ink text-sm text-white">
              <p className="border-b border-white/10 px-5 py-3 text-white/60">
                Step 3 — the only code you add to your site
              </p>
              <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-relaxed sm:text-sm">
                <code>
                  <span className="text-white/50">&lt;</span>
                  <span className="text-pink-300">script</span> <span className="text-sky-300">src</span>=
                  <span className="text-amber-200">&quot;https://your-app.vercel.app/widget.js&quot;</span>{" "}
                  <span className="text-sky-300">data-form</span>=
                  <span className="text-amber-200">&quot;k3x9qa7m2p&quot;</span>{" "}
                  <span className="text-sky-300">async</span>
                  <span className="text-white/50">&gt;&lt;/</span>
                  <span className="text-pink-300">script</span>
                  <span className="text-white/50">&gt;</span>
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* Live demo */}
        <section id="demo" className="scroll-mt-16 bg-ink text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.25fr] lg:py-28">
            <div>
              <h2 className="font-display text-4xl leading-tight font-bold tracking-[-0.025em] sm:text-5xl">
                Try it yourself
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-white/75">
                This is the widget the way visitors see it on a website. Answer the questions, try skipping a
                required one or typing a broken email address. It’s a preview, so nothing is saved.
              </p>
              {liveDemoSlug && (
                <p className="mt-4 max-w-md leading-relaxed text-white/75">
                  The chat bubble in the bottom corner of this page is the real embedded widget. Answers sent
                  through it are saved like any other response.
                </p>
              )}
              <Link
                href="/signup"
                className="mt-8 inline-block rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-ink transition hover:bg-lilac focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
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
    <header className="sticky top-0 z-30 border-b border-ink/5 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Formchat home">
          <Logo />
        </Link>
        <nav
          aria-label="Main"
          className="hidden items-center gap-7 text-sm font-medium text-slate-ink md:flex"
        >
          <a href="#features" className="hover:text-ink">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-ink">
            How it works
          </a>
          <a href="#demo" className="hover:text-ink">
            Demo
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-white">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
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
    <div className="overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ring-1 ring-white/10">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-100 px-4 py-3">
        <span className="size-3 rounded-full bg-zinc-300" />
        <span className="size-3 rounded-full bg-zinc-300" />
        <span className="size-3 rounded-full bg-zinc-300" />
        <span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-zinc-500">
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
        <div className="h-[520px] sm:absolute sm:right-5 sm:bottom-5 sm:h-[480px] sm:w-[340px] sm:overflow-hidden sm:rounded-2xl sm:shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
          <ChatForm form={demoForm} mode="preview" variant="card" autoFocus={false} />
        </div>
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-ink">{site.description}</p>
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
      <p className="border-t border-ink/10 px-4 py-6 text-center text-xs text-slate-ink">
        Formchat is an open-source project built with Next.js, Supabase and Tailwind CSS.
      </p>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-ink">
        {links.map((l) => (
          <li key={l.href}>
            {l.href.startsWith("/") ? (
              <Link href={l.href} className="hover:text-ink hover:underline">
                {l.label}
              </Link>
            ) : (
              <a href={l.href} className="hover:text-ink hover:underline">
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
