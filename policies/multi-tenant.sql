-- Multi-tenant example. Apply to a new reviewed schema, not blindly to production.
-- Requires public.organizations(id), auth.users(id), public.your_table(org_id).
-- Membership provisioning is a privileged server operation. Clients cannot join,
-- change roles, or move membership through these policies.
create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  unique(org_id, user_id)
);
create index org_members_user_org_idx on public.org_members(user_id, org_id);
alter table public.org_members enable row level security;
revoke all on public.org_members from anon, authenticated;
grant select on public.org_members to authenticated;
create policy "Read own memberships" on public.org_members
  for select to authenticated using (user_id = (select auth.uid()));

alter table public.your_table enable row level security;
-- Viewers can read; only members/admins/owners can write.
create policy "Tenant read" on public.your_table for select to authenticated
using (org_id in (select m.org_id from public.org_members m where m.user_id = (select auth.uid())));
create policy "Tenant insert" on public.your_table for insert to authenticated
with check (org_id in (select m.org_id from public.org_members m where m.user_id = (select auth.uid()) and m.role in ('member','admin','owner')));
create policy "Tenant update" on public.your_table for update to authenticated
using (org_id in (select m.org_id from public.org_members m where m.user_id = (select auth.uid()) and m.role in ('member','admin','owner')))
with check (org_id in (select m.org_id from public.org_members m where m.user_id = (select auth.uid()) and m.role in ('member','admin','owner')));
create policy "Tenant delete" on public.your_table for delete to authenticated
using (org_id in (select m.org_id from public.org_members m where m.user_id = (select auth.uid()) and m.role in ('admin','owner')));
-- UPDATE permits moving a row only between organizations where the caller can
-- write. Add a separate immutable-org rule if your business forbids all moves.
