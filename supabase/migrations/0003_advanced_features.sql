-- Formchat: migration 0003 - Advanced Form Builder, Chatbot, Analytics, Integrations, and Admin
-- Run this in the Supabase dashboard → SQL Editor after 0002_save_form_and_server_submissions.sql

-- ─────────────────────────────────────────────────────────────
-- 1. Extend question types to include 'dropdown', 'rating', 'date', 'file'
-- ─────────────────────────────────────────────────────────────

alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions add constraint questions_type_check
  check (type in ('text', 'email', 'multiple_choice', 'yes_no', 'dropdown', 'rating', 'date', 'file'));

-- ─────────────────────────────────────────────────────────────
-- 2. Add conditional logic and validation fields to questions
-- ─────────────────────────────────────────────────────────────

alter table public.questions add column if not exists logic jsonb;
alter table public.questions add column if not exists validation jsonb;

-- ─────────────────────────────────────────────────────────────
-- 3. Atomic form save: updated to persist options, logic, and validation
-- ─────────────────────────────────────────────────────────────

create or replace function public.save_form(
  p_form_id     uuid,
  p_title       text,
  p_description text,
  p_questions   jsonb   -- [{ id, type, label, required, options, logic, validation }] in display order
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(p_questions) <> 'array' then
    raise exception 'p_questions must be a JSON array' using errcode = '22023';
  end if;

  update public.forms
     set title = p_title, description = nullif(trim(p_description), '')
   where id = p_form_id;

  if not found then
    raise exception 'Form not found' using errcode = 'P0002';
  end if;

  -- Remove questions that are no longer in the list.
  delete from public.questions
   where form_id = p_form_id
     and id not in (
       select (q ->> 'id')::uuid
         from jsonb_array_elements(p_questions) as q
        where q ->> 'id' is not null
     );

  -- Insert new questions and update existing ones (including their new position).
  insert into public.questions (id, form_id, type, label, required, options, logic, validation, position)
  select coalesce((q ->> 'id')::uuid, gen_random_uuid()),
         p_form_id,
         q ->> 'type',
         q ->> 'label',
         coalesce((q ->> 'required')::boolean, false),
         case
           when q ->> 'type' in ('multiple_choice', 'dropdown', 'rating') then q -> 'options'
           else null
         end,
         q -> 'logic',
         q -> 'validation',
         (ord - 1)::int
    from jsonb_array_elements(p_questions) with ordinality as t(q, ord)
  on conflict (id) do update
     set type       = excluded.type,
         label      = excluded.label,
         required   = excluded.required,
         options    = excluded.options,
         logic      = excluded.logic,
         validation = excluded.validation,
         position   = excluded.position
   where public.questions.form_id = p_form_id;
end;
$$;

revoke execute on function public.save_form(uuid, text, text, jsonb) from public, anon;
grant  execute on function public.save_form(uuid, text, text, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Analytics: form_events (views and starts)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.form_events (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references public.forms (id) on delete cascade,
  event_type  text not null check (event_type in ('view', 'start')),
  created_at  timestamptz not null default now()
);

create index if not exists form_events_form_time_idx on public.form_events (form_id, created_at desc);

alter table public.form_events enable row level security;

grant insert on public.form_events to anon, authenticated;
grant select on public.form_events to authenticated;
grant select, insert, delete on public.form_events to service_role;

create policy "Anyone can insert events for published forms"
  on public.form_events for insert
  to anon, authenticated
  with check (exists (
    select 1 from public.forms f
    where f.id = form_events.form_id and f.status = 'published'
  ));

create policy "Owners read events of their forms"
  on public.form_events for select
  to authenticated
  using (exists (
    select 1 from public.forms f
    where f.id = form_events.form_id and f.owner_id = (select auth.uid())
  ));

-- ─────────────────────────────────────────────────────────────
-- 5. Webhook delivery logs
-- ─────────────────────────────────────────────────────────────

create table if not exists public.webhook_logs (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.forms (id) on delete cascade,
  response_id  uuid references public.responses (id) on delete set null,
  url          text not null,
  status_code  integer not null,
  success      boolean not null default false,
  error        text,
  created_at   timestamptz not null default now()
);

create index if not exists webhook_logs_form_idx on public.webhook_logs (form_id, created_at desc);

alter table public.webhook_logs enable row level security;

grant select, insert on public.webhook_logs to authenticated, service_role;

create policy "Owners read webhook logs of their forms"
  on public.webhook_logs for select
  to authenticated
  using (exists (
    select 1 from public.forms f
    where f.id = webhook_logs.form_id and f.owner_id = (select auth.uid())
  ));
