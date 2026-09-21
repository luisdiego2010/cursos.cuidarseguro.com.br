begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.app_role as enum ('administrator', 'instructor');

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

comment on table public.user_roles is 'Application role assigned to each authorized portal user.';

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{3,64}$'),
  title text not null check (char_length(title) between 3 and 240),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

comment on table public.courses is 'Courses whose private instructor materials are managed by the portal.';

create table public.course_memberships (
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  primary key (course_id, user_id)
);

comment on table public.course_memberships is 'Course-level access granted to instructor users.';

create table public.course_documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 240),
  category text not null default 'other' check (
    category in (
      'facilitator_guide',
      'scenario',
      'checklist',
      'assessment',
      'answer_key',
      'slides',
      'reference',
      'other'
    )
  ),
  version_label text,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint course_documents_storage_path_check
    check (storage_path ~ ('^' || course_id::text || '/[^/].*'))
);

comment on table public.course_documents is 'Metadata for private objects stored in the course-materials bucket.';

create index course_memberships_user_active_idx
  on public.course_memberships (user_id, active, course_id);
create index course_documents_course_published_idx
  on public.course_documents (course_id, published, display_order, title);
create index user_roles_role_active_idx
  on public.user_roles (role, active, user_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger courses_set_updated_at
before update on public.courses
for each row execute function private.set_updated_at();

create trigger course_documents_set_updated_at
before update on public.course_documents
for each row execute function private.set_updated_at();

create or replace function private.current_user_is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'administrator'::public.app_role
      and ur.active
  );
$$;

create or replace function private.current_user_can_access_course(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.current_user_is_administrator())
    or exists (
      select 1
      from public.courses c
      join public.course_memberships cm on cm.course_id = c.id
      join public.user_roles ur on ur.user_id = cm.user_id
      where c.id = target_course_id
        and c.status = 'active'
        and cm.user_id = (select auth.uid())
        and cm.active
        and ur.active
        and ur.role = 'instructor'::public.app_role
    );
$$;

create or replace function private.storage_path_has_valid_course(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.course_documents d
    where d.storage_path = object_name
      and d.course_id::text = split_part(object_name, '/', 1)
  );
$$;

create or replace function private.prevent_last_active_administrator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_administrators bigint;
begin
  if (
    tg_op = 'DELETE'
    and old.role = 'administrator'::public.app_role
    and old.active
  ) or (
    tg_op = 'UPDATE'
    and old.role = 'administrator'::public.app_role
    and old.active
    and (
      new.role is distinct from old.role
      or new.active is distinct from old.active
    )
  ) then
    select count(*)
      into remaining_administrators
    from public.user_roles ur
    where ur.user_id <> old.user_id
      and ur.role = 'administrator'::public.app_role
      and ur.active;

    if remaining_administrators = 0 then
      raise exception 'cannot remove or deactivate the last active administrator';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.current_user_is_administrator() from public, anon;
revoke all on function private.current_user_can_access_course(uuid) from public, anon;
revoke all on function private.storage_path_has_valid_course(text) from public, anon;
revoke all on function private.prevent_last_active_administrator() from public, anon, authenticated;
grant execute on function private.current_user_is_administrator() to authenticated;
grant execute on function private.current_user_can_access_course(uuid) to authenticated;
grant execute on function private.storage_path_has_valid_course(text) to authenticated;

create trigger user_roles_prevent_last_admin
before update or delete on public.user_roles
for each row execute function private.prevent_last_active_administrator();

alter table public.user_roles enable row level security;
alter table public.courses enable row level security;
alter table public.course_memberships enable row level security;
alter table public.course_documents enable row level security;

revoke all on table public.user_roles,
  public.courses,
  public.course_memberships,
  public.course_documents
from public, anon, authenticated;

grant select, insert, update, delete on table public.user_roles to authenticated;
grant select, insert, update, delete on table public.courses to authenticated;
grant select, insert, update, delete on table public.course_memberships to authenticated;
grant select, insert, update, delete on table public.course_documents to authenticated;

create policy user_roles_select_own
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy user_roles_select_admin
on public.user_roles
for select
to authenticated
using ((select private.current_user_is_administrator()));

create policy user_roles_insert_admin
on public.user_roles
for insert
to authenticated
with check ((select private.current_user_is_administrator()));

create policy user_roles_update_admin
on public.user_roles
for update
to authenticated
using ((select private.current_user_is_administrator()))
with check ((select private.current_user_is_administrator()));

create policy user_roles_delete_admin
on public.user_roles
for delete
to authenticated
using ((select private.current_user_is_administrator()));

create policy courses_select_authorized
on public.courses
for select
to authenticated
using ((select private.current_user_can_access_course(id)));

create policy courses_insert_admin
on public.courses
for insert
to authenticated
with check ((select private.current_user_is_administrator()));

create policy courses_update_admin
on public.courses
for update
to authenticated
using ((select private.current_user_is_administrator()))
with check ((select private.current_user_is_administrator()));

create policy courses_delete_admin
on public.courses
for delete
to authenticated
using ((select private.current_user_is_administrator()));

create policy memberships_select_own
on public.course_memberships
for select
to authenticated
using ((select auth.uid()) = user_id and active);

create policy memberships_select_admin
on public.course_memberships
for select
to authenticated
using ((select private.current_user_is_administrator()));

create policy memberships_insert_admin
on public.course_memberships
for insert
to authenticated
with check ((select private.current_user_is_administrator()));

create policy memberships_update_admin
on public.course_memberships
for update
to authenticated
using ((select private.current_user_is_administrator()))
with check ((select private.current_user_is_administrator()));

create policy memberships_delete_admin
on public.course_memberships
for delete
to authenticated
using ((select private.current_user_is_administrator()));

create policy documents_select_authorized
on public.course_documents
for select
to authenticated
using (
  (select private.current_user_is_administrator())
  or (
    published
    and (select private.current_user_can_access_course(course_id))
  )
);

create policy documents_insert_admin
on public.course_documents
for insert
to authenticated
with check ((select private.current_user_is_administrator()));

create policy documents_update_admin
on public.course_documents
for update
to authenticated
using ((select private.current_user_is_administrator()))
with check ((select private.current_user_is_administrator()));

create policy documents_delete_admin
on public.course_documents
for delete
to authenticated
using ((select private.current_user_is_administrator()));

insert into public.courses (code, title, status)
values (
  'SP-ANEST-001',
  'Segurança do Paciente: princípios, sistemas e barreiras aplicados à anestesiologia',
  'active'
)
on conflict (code) do update
set title = excluded.title,
    status = excluded.status,
    updated_at = now();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'course-materials',
  'course-materials',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/markdown',
    'text/plain',
    'image/png',
    'image/jpeg'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy course_materials_select_authorized
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-materials'
  and (
    (select private.current_user_is_administrator())
    or exists (
      select 1
      from public.course_documents d
      where d.storage_path = name
        and d.published
        and (select private.current_user_can_access_course(d.course_id))
    )
  )
);

create policy course_materials_insert_admin
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'course-materials'
  and (select private.current_user_is_administrator())
  and (select private.storage_path_has_valid_course(name))
);

create policy course_materials_update_admin
on storage.objects
for update
to authenticated
using (
  bucket_id = 'course-materials'
  and (select private.current_user_is_administrator())
)
with check (
  bucket_id = 'course-materials'
  and (select private.current_user_is_administrator())
  and (select private.storage_path_has_valid_course(name))
);

create policy course_materials_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'course-materials'
  and (select private.current_user_is_administrator())
);

commit;
