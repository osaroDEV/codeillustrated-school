-- A lesson is now an ordered list of blocks: any number of text sections,
-- videos and files, in any order. lessons.type only says whether the lesson is
-- taught live, which progress and the player still need.
--
-- lessons.content, video_url and file_path are copied into blocks here and no
-- longer read. They stay in place so the code running before this deploys
-- keeps working; a later migration can drop them.

create table if not exists public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position integer not null,
  kind text not null check (kind in ('text', 'video', 'file')),
  title text,
  content text,
  video_url text,
  file_path text,
  created_at timestamptz not null default now(),
  unique (lesson_id, position),
  check (
    (kind = 'text' and content is not null)
    or (kind = 'video' and video_url is not null)
    or (kind = 'file' and file_path is not null)
  )
);

-- No client policies: lesson material is only read by server code, after the
-- learner's access has been checked.
alter table public.lesson_blocks enable row level security;

-- Carry over existing lessons, in the order the player showed them.
insert into public.lesson_blocks (lesson_id, position, kind, video_url, file_path, content)
select lesson_id, row_number() over (partition by lesson_id order by ord), kind, video_url, file_path, content
from (
  select id as lesson_id, 1 as ord, 'video' as kind, video_url, null::text as file_path, null::text as content
  from public.lessons where nullif(trim(video_url), '') is not null
  union all
  select id, 2, 'file', null, file_path, null
  from public.lessons where nullif(trim(file_path), '') is not null
  union all
  select id, 3, 'text', null, null, content
  from public.lessons where nullif(trim(content), '') is not null
) existing
where not exists (select 1 from public.lesson_blocks b where b.lesson_id = existing.lesson_id);

-- Swap a lesson's blocks for a new ordered list in one transaction. Returns
-- the stored files the lesson no longer uses, for the caller to delete.
create or replace function public.replace_lesson_blocks(p_lesson_id uuid, p_blocks jsonb)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text[];
  v_unused text[];
begin
  perform 1 from public.lessons where id = p_lesson_id for update;
  if not found then
    raise exception 'Unknown lesson' using errcode = 'CI004';
  end if;

  select coalesce(array_agg(file_path), '{}') into v_old
  from public.lesson_blocks
  where lesson_id = p_lesson_id and file_path is not null;

  delete from public.lesson_blocks where lesson_id = p_lesson_id;

  insert into public.lesson_blocks (lesson_id, position, kind, title, content, video_url, file_path)
  select p_lesson_id, ord::integer, b->>'kind', nullif(b->>'title', ''), b->>'content', b->>'video_url', b->>'file_path'
  from jsonb_array_elements(p_blocks) with ordinality as t(b, ord);

  select coalesce(array_agg(f), '{}') into v_unused
  from unnest(v_old) as f
  where not exists (
    select 1 from public.lesson_blocks b where b.lesson_id = p_lesson_id and b.file_path = f
  );
  return v_unused;
end;
$$;

revoke all on function public.replace_lesson_blocks(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_lesson_blocks(uuid, jsonb) to service_role;
