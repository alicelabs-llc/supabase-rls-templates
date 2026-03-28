-- ============================================================
-- Pattern: Multi-Tenant Isolation
-- Users can only access data within their organization
-- Requires: org_id column + org_members junction table
-- ============================================================

-- Junction table for org membership
create table if not exists org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz default now(),
  unique(org_id, user_id)
);

-- Helper function: get user's org IDs
create or replace function get_user_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select org_id from org_members where user_id = auth.uid()
$$;

-- Enable RLS
alter table your_table enable row level security;

-- SELECT: users can read data from their orgs
create policy "Tenant isolation: read"
  on your_table for select
  using (org_id in (select get_user_org_ids()));

-- INSERT: users can insert into their orgs
create policy "Tenant isolation: insert"
  on your_table for insert
  with check (org_id in (select get_user_org_ids()));

-- UPDATE: users can update within their orgs
create policy "Tenant isolation: update"
  on your_table for update
  using (org_id in (select get_user_org_ids()))
  with check (org_id in (select get_user_org_ids()));

-- DELETE: only org admins/owners can delete
create policy "Tenant isolation: delete (admin only)"
  on your_table for delete
  using (
    org_id in (
      select org_id from org_members
      where user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );
