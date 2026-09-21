begin;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;

create index courses_created_by_idx
  on public.courses (created_by)
  where created_by is not null;
create index user_roles_created_by_idx
  on public.user_roles (created_by)
  where created_by is not null;
create index course_memberships_created_by_idx
  on public.course_memberships (created_by)
  where created_by is not null;
create index course_documents_created_by_idx
  on public.course_documents (created_by)
  where created_by is not null;

drop policy user_roles_select_own on public.user_roles;
drop policy user_roles_select_admin on public.user_roles;

create policy user_roles_select_authorized
on public.user_roles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or (select private.current_user_is_administrator())
);

drop policy memberships_select_own on public.course_memberships;
drop policy memberships_select_admin on public.course_memberships;

create policy memberships_select_authorized
on public.course_memberships
for select
to authenticated
using (
  ((select auth.uid()) = user_id and active)
  or (select private.current_user_is_administrator())
);

commit;
