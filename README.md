<div align="center">

# supabase-rls-templates

**Copy-paste Row Level Security policies for common Supabase patterns**

[![License: MIT](https://img.shields.io/badge/License-MIT-238636?style=flat-square)](LICENSE)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)

Built by [AliceLabs LLC](https://alicelabs.site)

</div>

---

## Why

Every Supabase project needs RLS policies, and most devs either leave them wide open (`using (true)`) or spend hours debugging policy logic. These are production-tested templates for the most common access patterns.

## Policies

| Pattern | File | Description |
|---------|------|-------------|
| **User owns row** | [`user-owns-row.sql`](policies/user-owns-row.sql) | Users can only CRUD their own data |
| **Organization members** | [`org-members.sql`](policies/org-members.sql) | Team-based access via membership table |
| **Public read, auth write** | [`public-read-auth-write.sql`](policies/public-read-auth-write.sql) | Anyone reads, only logged-in users write |
| **Role-based (RBAC)** | [`role-based.sql`](policies/role-based.sql) | Admin/editor/viewer permission levels |
| **Service role bypass** | [`service-role-bypass.sql`](policies/service-role-bypass.sql) | Server-side operations skip RLS |
| **Multi-tenant** | [`multi-tenant.sql`](policies/multi-tenant.sql) | Tenant isolation via org_id |

## Quick start

```sql
-- 1. Enable RLS on your table
alter table your_table enable row level security;

-- 2. Copy the policy that matches your access pattern
-- (see individual files for complete SQL)

-- 3. Test! Always verify with different user roles
```

## Usage tips

- **Always enable RLS** before adding policies — without RLS enabled, policies are ignored
- **Test with `anon` and `authenticated` roles** — use Supabase's SQL editor to test both
- **Use `auth.uid()`** to get the current user's ID in policies
- **Use `auth.jwt() ->> 'role'`** to check custom claims for RBAC
- **Combine policies** — multiple policies on the same table use OR logic for SELECT, AND for INSERT/UPDATE/DELETE

## Common mistakes

| Mistake | Fix |
|---------|-----|
| `using (true)` on all tables | Use specific policies per table |
| Forgetting `with check` on INSERT | Add `with check` to validate new rows |
| Not testing with anon key | Always test unauthenticated access |
| Mixing `auth.uid()` with service role | Service role bypasses RLS entirely |

## License

MIT — [AliceLabs LLC](https://alicelabs.site)
