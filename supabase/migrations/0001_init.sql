-- Formchat: initial schema
-- Run this in the Supabase dashboard → SQL Editor (or `supabase db push` with the CLI).

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table public.forms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 500),
  slug        text not null unique,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  -- { primaryColor, welcomeMessage, completionMessage }
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.questions (
  id        uuid primary key default gen_random_uuid(),
  form_id   uuid not null references public.forms (id) on delete cascade,
  type      text not null check (type in ('text', 'email', 'multiple_choice', 'yes_no')),
  label     text not null check (char_length(label) between 1 and 300),
  required  boolean not null default false,
  options   jsonb,             -- ["Option A", "Option B"] for multiple_choice, null otherwise
  position  integer not null,
  unique (form_id, position) deferrable initially deferred
);

create table public.responses (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.forms (id) on delete cascade,
  -- Snapshot of each question at submit time, so edits to the form never break old responses:
  -- [{ "questionId": "...", "label": "...", "type": "...", "value": "..." }]
  answers      jsonb not null,
  source       text not null default 'link' check (source in ('link', 'embed')),
  submitted_at timestamptz not null default now()
);

create index forms_owner_idx          on public.forms (owner_id, updated_at desc);
create index questions_form_idx       on public.questions (form_id, position);
create index responses_form_time_idx  on public.responses (form_id, submitted_at desc);

-- Keep forms.updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger forms_set_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Data API grants
-- Since May 2026, Supabase no longer exposes new tables to the Data API
-- automatically. Grants decide WHICH operations a role may attempt;
-- the RLS policies below decide WHICH ROWS it can touch.
-- Least privilege: visitors (anon) can only read forms/questions and submit responses.
-- ─────────────────────────────────────────────────────────────

grant select                         on public.forms     to anon;
grant select                         on public.questions to anon;
grant insert                         on public.responses to anon;

grant select, insert, update, delete on public.forms     to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, delete         on public.responses  to authenticated;

grant select, insert, update, delete on public.forms, public.questions, public.responses to service_role;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- Owners can do everything with their own forms. Visitors (anon) can only
-- read *published* forms and submit responses to them.
-- ─────────────────────────────────────────────────────────────

alter table public.forms     enable row level security;
alter table public.questions enable row level security;
alter table public.responses enable row level security;

-- forms
create policy "Owners manage their forms"
  on public.forms for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Anyone can read published forms"
  on public.forms for select
  to anon, authenticated
  using (status = 'published');

-- questions
create policy "Owners manage questions of their forms"
  on public.questions for all
  to authenticated
  using (exists (
    select 1 from public.forms f
    where f.id = questions.form_id and f.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.forms f
    where f.id = questions.form_id and f.owner_id = (select auth.uid())
  ));

create policy "Anyone can read questions of published forms"
  on public.questions for select
  to anon, authenticated
  using (exists (
    select 1 from public.forms f
    where f.id = questions.form_id and f.status = 'published'
  ));

-- responses
create policy "Anyone can respond to published forms"
  on public.responses for insert
  to anon, authenticated
  with check (exists (
    select 1 from public.forms f
    where f.id = responses.form_id and f.status = 'published'
  ));

create policy "Owners read responses to their forms"
  on public.responses for select
  to authenticated
  using (exists (
    select 1 from public.forms f
    where f.id = responses.form_id and f.owner_id = (select auth.uid())
  ));

create policy "Owners delete responses to their forms"
  on public.responses for delete
  to authenticated
  using (exists (
    select 1 from public.forms f
    where f.id = responses.form_id and f.owner_id = (select auth.uid())
  ));
