# Formchat

Build interactive forms, publish them with a public link, embed them on any website as a chat-style widget, and manage every submission from a dashboard.

**Live demo:** _add your Vercel URL here_ · **Test website:** _add your test-site URL here_

## What it does

| Area             | Features                                                                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Landing page** | Hero, features, how it works, live chatbot demo, footer with navigation and contact links                                                                                                                         |
| **Dashboard**    | Total forms / published / responses, create, edit, delete, publish and unpublish forms, status badges                                                                                                             |
| **Form builder** | Text, email, multiple-choice and yes/no questions · edit, duplicate, delete · reorder by drag-and-drop or arrow buttons · required toggle · live chat preview · validation · unsaved-changes guard · Ctrl+S       |
| **Chat widget**  | One question at a time · text input, answer buttons, Skip for optional questions · inline validation · welcome and completion messages · custom brand color · works on desktop and mobile (full screen on phones) |
| **Publishing**   | Unique public URL per form (`/f/{slug}`) · one-line embed snippet · “Download a test website” button · publish / unpublish                                                                                        |
| **Responses**    | Saved in Postgres · list with submission timestamps (in the viewer’s time zone) and source (public link or website widget) · pagination · delete · CSV export                                                     |

### Completion flow (how to verify it)

1. Sign up → **New form** → add questions → **Save**.
2. **Publish**.
3. **Share & embed** → **Download a test website** (or copy the snippet into `examples/test-site/index.html`) → open it in your browser. It runs on a different origin from the app.
4. Click the chat bubble and answer the questions.
5. Dashboard → **Responses**: the submission appears with its timestamp and the source “Website widget”.

## Tech stack

- **Next.js 16** (App Router, Server Components, Server Actions, Route Handlers, Cache Components) · **React 19** · **TypeScript**
- **Tailwind CSS v4**
- **Supabase**: Postgres + Auth, secured with Row Level Security
- **Zod** for validation shared by the browser and the server
- **dnd-kit** (drag-and-drop), **sonner** (toasts), **lucide-react** (icons)

## Architecture

```
┌──────────────────────── Formchat (Next.js on Vercel) ────────────────────────┐
│ /                         landing page + live demo                            │
│ /login, /signup           Supabase Auth (Server Actions)                      │
│ /dashboard/...            forms, builder, responses, share   ← login required │
│ /f/[slug]                 public form page        ┐                           │
│ /embed/[slug]             chat for the iframe     ├─ same <ChatForm> component│
│ POST /api/forms/[slug]/responses   validate → save┘                           │
│ GET  /api/forms/[slug]/config      launcher color/title for widget.js         │
│ /widget.js                plain-JS loader (no framework)                      │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ iframe → /embed/[slug]
┌──────────── any website ─────────────┴───────────┐
│ <script src=".../widget.js" data-form="SLUG"     │
│         async></script>                          │
└──────────────────────────────────────────────────┘
```

Key decisions:

- **One chat component everywhere.** The builder preview, the public link, the embedded widget, the share-page preview and the landing demo all render `src/components/chat/chat-form.tsx`. The transcript is derived from state, so the builder preview updates while you type.
- **The widget is an iframe.** `widget.js` injects a launcher button and lazily creates an iframe to `/embed/[slug]`. The host site's CSS can't break the chat and the chat can't break the host site. Submissions are same-origin, so no CORS setup is needed. Only `/embed/*` may be framed by other sites (`next.config.ts` headers); every other page sends `X-Frame-Options: SAMEORIGIN`.
- **Responses store a snapshot.** Each answer saves the question's label and type at submit time, so editing or deleting questions later never breaks old responses.
- **Atomic saves.** The builder saves title, description and all questions through one Postgres function (`save_form`) in a single transaction. Existing question ids are kept.

## Security model

- **Row Level Security** on every table. Owners can only read and change their own forms, questions and responses. Visitors can only read _published_ forms.
- **Server-only submissions.** Browsers cannot insert responses directly. The submit API reloads the form, re-validates every answer with the same Zod rules the chat uses, and only then inserts with the server-only secret key (`src/lib/supabase/admin.ts`, guarded by `server-only`).
- **Explicit owner filters.** Because published forms are publicly readable, dashboard queries also filter by `owner_id`. RLS alone would show other users' published forms.
- **Auth checks everywhere.** `proxy.ts` (Next.js 16's middleware) redirects signed-out users, and every protected page, Server Action and Route Handler also calls `requireUser()`.
- **Spam and abuse basics.** A hidden honeypot field, JSON-only submissions, a body size limit, a 2,000-character answer cap, CSV formula-injection protection and unguessable 10-character slugs.

## Getting started

### Prerequisites

- Node.js 20.9+
- A free [Supabase](https://supabase.com) project

### 1. Install

```bash
git clone https://github.com/<your-username>/formchat.git
cd formchat
npm install
```

### 2. Set up the database

In the Supabase dashboard → **SQL Editor**, run these files **in order**:

1. `supabase/migrations/0001_init.sql`: tables, indexes, grants, RLS policies
2. `supabase/migrations/0002_save_form_and_server_submissions.sql`: `save_form()` and server-only submissions

Each should end with “Success. No rows returned”.

### 3. Configure auth

**Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** add `http://localhost:3000/**`

Optional for development: turn off **Confirm email** under **Authentication → Sign In / Providers → Email**, so test accounts don't need an email click. Supabase's built-in email sender only allows a few emails per hour.

### 4. Environment variables

```bash
cp .env.example .env.local
```

| Variable                               | Where to find it                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | **Connect** button → Project URL                                                             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Connect** button → publishable key (`sb_publishable_…`)                                    |
| `SUPABASE_SECRET_KEY`                  | Project Settings → API Keys → **Secret keys** (`sb_secret_…`). Server only, never commit it. |
| `NEXT_PUBLIC_SITE_URL`                 | `http://localhost:3000` locally, your Vercel URL in production                               |
| `NEXT_PUBLIC_DEMO_FORM_SLUG`           | Optional: a published form's slug, so the landing page shows the real widget                 |

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Deploying to Vercel

1. Push the repository to GitHub.
2. On [vercel.com](https://vercel.com), choose **Add New → Project** and import the repo. The framework is detected automatically.
3. Add the environment variables from the table above. Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL, e.g. `https://formchat-yourname.vercel.app`.
4. Click **Deploy**.
5. In Supabase → **Authentication → URL Configuration**, set **Site URL** to the Vercel URL and add `https://formchat-yourname.vercel.app/**` to **Redirect URLs**.
6. Optional: publish a demo form, set `NEXT_PUBLIC_DEMO_FORM_SLUG` in Vercel and redeploy.

### Hosting the test website

Download the test page from **Share & embed**, rename it to `index.html`, then either drag its folder onto [Netlify Drop](https://app.netlify.com/drop) or push it to a GitHub Pages repository. Link the result at the top of this README.

## Project structure

```
src/
  app/
    page.tsx                         landing page
    (auth)/                          login, signup, auth Server Actions
    auth/confirm/route.ts            email confirmation link
    dashboard/
      page.tsx                       stats + forms list
      actions.ts                     all dashboard Server Actions
      forms/[id]/                    builder, responses (+ CSV export), share & embed
    f/[slug]/page.tsx                public form link
    embed/[slug]/page.tsx            iframe target for widget.js
    api/forms/[slug]/responses/      submit API (validates, then saves)
    api/forms/[slug]/config/         launcher config for widget.js
  components/
    chat/chat-form.tsx               the chat engine used everywhere
    builder/                         builder state (reducer), question card, builder UI
    dashboard/, share/, landing/, ui/
  lib/
    validation.ts                    Zod schemas + answer validation (shared)
    forms.ts                         data access (owner-filtered)
    supabase/                        browser, server, proxy, public and admin clients
  proxy.ts                           session refresh + redirects (Next.js 16 middleware)
public/widget.js                     embed loader script
supabase/migrations/                 SQL schema, RLS, functions
examples/test-site/                  sample external website for embedding
```

## Scripts

| Command             | Description                |
| ------------------- | -------------------------- |
| `npm run dev`       | Development server         |
| `npm run build`     | Production build           |
| `npm run start`     | Serve the production build |
| `npm run lint`      | ESLint                     |
| `npm run typecheck` | TypeScript, no emit        |
| `npm run format`    | Prettier                   |

## Testing done

- **Database:** both migrations run on Postgres with Supabase-like roles. Checked: RLS isolation between users, anonymous access, `save_form` (insert, reorder, delete, id preservation, rollback on invalid input, no cross-form hijacking) and server-only submissions.
- **End to end (Playwright):** landing demo, signup/login/logout, form CRUD, builder validation, drag-and-drop, save, publish, customization, public-link submission, **widget on a separate origin** (desktop and mobile), responses, CSV export, deletion, unpublish behavior, API hardening (422/404/415, honeypot) and access to another user's form.

## Known limitations / next steps

- No rate limiting on the submit API (would add Upstash/Vercel KV or a Postgres-based limiter).
- No conditional logic or extra question types (number, date, rating).
- No email notifications for new responses.
- Responses are listed newest first without search or filtering.
