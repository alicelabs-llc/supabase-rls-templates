-- Global (not tenant-scoped) RBAC. Requires server-controlled app_metadata.app_role.
-- Never derive privileges from user_metadata. Missing/unknown roles fail closed.
-- JWT changes take effect when a new token is issued; use database-backed roles
-- if immediate revocation is required. Do not combine with the other examples.
create or replace function public.get_user_role()
returns text language sql stable security invoker set search_path = ''
as $$ select auth.jwt() -> 'app_metadata' ->> 'app_role' $$;
revoke all on function public.get_user_role() from public;
grant execute on function public.get_user_role() to authenticated;
alter table public.your_table enable row level security;
create policy "RBAC read" on public.your_table for select to authenticated
using ((select auth.uid()) is not null and (select public.get_user_role()) in ('admin','editor','viewer'));
create policy "RBAC insert" on public.your_table for insert to authenticated
with check ((select auth.uid()) is not null and (select public.get_user_role()) in ('admin','editor'));
create policy "RBAC update" on public.your_table for update to authenticated
using ((select auth.uid()) is not null and (select public.get_user_role()) in ('admin','editor'))
with check ((select auth.uid()) is not null and (select public.get_user_role()) in ('admin','editor'));
create policy "RBAC delete" on public.your_table for delete to authenticated
using ((select auth.uid()) is not null and (select public.get_user_role()) = 'admin');
