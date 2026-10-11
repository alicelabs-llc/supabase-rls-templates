-- ============================================================
-- Pattern: User Owns Row
-- Each user can only access their own data
-- Requires: user_id column referencing auth.users(id)
-- ============================================================

-- Enable RLS
alter table public.your_table enable row level security;

-- SELECT: users can only read their own rows
create policy "Users can view own data"
  on public.your_table for select to authenticated
  using (auth.uid() = user_id);

-- INSERT: users can only insert rows they own
create policy "Users can insert own data"
  on public.your_table for insert to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: users can only update their own rows
create policy "Users can update own data"
  on public.your_table for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: users can only delete their own rows
create policy "Users can delete own data"
  on public.your_table for delete to authenticated
  using (auth.uid() = user_id);
