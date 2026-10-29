-- A learner can be enrolled in a course at most once.
--
-- Existing duplicates are collapsed first. Per (user, course) the row with the
-- most progress is kept (earliest enrollment breaks ties); instructor notes
-- from the removed rows are appended to the kept row so nothing is lost.

with ranked as (
  select
    id, user_id, course_id, notes,
    row_number() over (
      partition by user_id, course_id
      order by progress desc, enrolled_at asc, id
    ) as rn
  from public.enrollments
),
merged as (
  select
    user_id, course_id,
    string_agg(notes, E'\n\n' order by rn) filter (where notes is not null) as notes
  from ranked
  group by user_id, course_id
  having count(*) > 1
)
update public.enrollments e
set notes = m.notes
from ranked r
join merged m on m.user_id = r.user_id and m.course_id = r.course_id
where e.id = r.id and r.rn = 1;

delete from public.enrollments e
using (
  select
    id,
    row_number() over (
      partition by user_id, course_id
      order by progress desc, enrolled_at asc, id
    ) as rn
  from public.enrollments
) d
where e.id = d.id and d.rn > 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'enrollments_user_course_key'
  ) then
    alter table public.enrollments
      add constraint enrollments_user_course_key unique (user_id, course_id);
  end if;
end $$;
