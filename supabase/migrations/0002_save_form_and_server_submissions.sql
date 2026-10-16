-- Formchat: migration 0002
-- 1. Responses can only be inserted by the server (after validation), never directly by browsers.
-- 2. save_form(): saves a form's title, description and questions in ONE transaction.
--
-- Run this in the Supabase dashboard → SQL Editor after 0001_init.sql.

-- ─────────────────────────────────────────────────────────────
-- 1. Server-only response submissions
-- Before: anyone with the public (publishable) key could POST rows straight to
-- the Data API and skip our validation. Now only the server's secret key
-- (service_role) can insert; /api/forms/[slug]/responses validates first.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "Anyone can respond to published forms" on public.responses;
revoke insert on public.responses from anon, authenticated;

alter table public.responses
  add constraint responses_answers_is_array check (jsonb_typeof(answers) = 'array');

-- ─────────────────────────────────────────────────────────────
-- 2. Atomic form save
-- SECURITY INVOKER: runs with the caller's permissions, so RLS still guarantees
-- that users can only save their own forms.
-- Existing question ids are kept, so answer snapshots keep pointing at them.
-- ─────────────────────────────────────────────────────────────

create or replace function public.save_form(
  p_form_id     uuid,
  p_title       text,
  p_description text,
  p_questions   jsonb   -- [{ id, type, label, required, options }] in display order
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
  insert into public.questions (id, form_id, type, label, required, options, position)
  select coalesce((q ->> 'id')::uuid, gen_random_uuid()),
         p_form_id,
         q ->> 'type',
         q ->> 'label',
         coalesce((q ->> 'required')::boolean, false),
         case when q ->> 'type' = 'multiple_choice' then q -> 'options' else null end,
         (ord - 1)::int
    from jsonb_array_elements(p_questions) with ordinality as t(q, ord)
  on conflict (id) do update
     set type     = excluded.type,
         label    = excluded.label,
         required = excluded.required,
         options  = excluded.options,
         position = excluded.position
   where public.questions.form_id = p_form_id;  -- never touch another form's question
end;
$$;

revoke execute on function public.save_form(uuid, text, text, jsonb) from public, anon;
grant  execute on function public.save_form(uuid, text, text, jsonb) to authenticated;
