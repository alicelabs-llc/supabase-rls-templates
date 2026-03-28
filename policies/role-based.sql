-- ============================================================
-- Pattern: Role-Based Access Control (RBAC)
-- Admin / Editor / Viewer permission levels
-- Requires: custom claim 'app_role' set via Supabase Auth hooks
-- ============================================================

-- Helper: extract role from JWT custom claims
create or replace function get_user_role()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'app_role',
    'viewer'  -- default role
  )
$$;

-- Enable RLS
alter table your_table enable row level security;

-- SELECT: all authenticated users can read
create policy "RBAC: all authenticated can read"
  on your_table for select
  using (auth.uid() is not null);

-- INSERT: editors and admins can create
create policy "RBAC: editors can insert"
  on your_table for insert
  with check (get_user_role() in ('admin', 'editor'));

-- UPDATE: editors can update, admins can update anything
create policy "RBAC: editors can update"
  on your_table for update
  using (get_user_role() in ('admin', 'editor'))
  with check (get_user_role() in ('admin', 'editor'));

-- DELETE: only admins can delete
create policy "RBAC: only admins can delete"
  on your_table for delete
  using (get_user_role() = 'admin');
