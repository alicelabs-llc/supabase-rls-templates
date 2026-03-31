# supabase-rls-templates

**Production-ready Row Level Security policies for Supabase**

[![License: MIT](https://img.shields.io/badge/License-MIT-238636?style=flat-square)](LICENSE)
[![Language](https://img.shields.io/badge/Language-PLpgSQL-336791?style=flat-square)](/)
[![Supabase](https://img.shields.io/badge/Supabase-Compatible-3ECF8E?style=flat-square)](https://supabase.com)

Copy-paste RLS policies for the most common multi-tenant and role-based access patterns — battle-tested, annotated, and ready for production.

---

## Why this exists

Writing Supabase RLS policies from scratch is error-prone. A single misconfigured policy can expose all rows to authenticated users. These templates give you a secure starting point with clear annotations explaining *why* each expression works the way it does.

---

## Included templates

| Template | Pattern | Use case |
|----------|---------|----------|
| `rbac.sql` | Role-Based Access Control | Users have roles (`admin`, `editor`, `viewer`) per resource |
| `multi-tenant.sql` | Multi-tenant isolation | Each row belongs to an `organization_id` |
| `user-isolation.sql` | User-owned rows | Each user can only see their own rows |
| `team-access.sql` | Team membership | Rows accessible to all members of a team |
| `public-read.sql` | Public read, authenticated write | Blog posts, public listings |
| `service-role-bypass.sql` | Service role admin bypass | Background jobs that need full access |

---

## Quick start

### User isolation (most common pattern)

```sql
-- Enable RLS on your table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rows
CREATE POLICY "user_isolation_select"
ON posts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert rows they own
CREATE POLICY "user_isolation_insert"
ON posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own rows
CREATE POLICY "user_isolation_update"
ON posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own rows
CREATE POLICY "user_isolation_delete"
ON posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### Multi-tenant (organization isolation)

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users can only access rows in their organization
CREATE POLICY "org_isolation"
ON documents FOR ALL
TO authenticated
USING (
  organization_id = (
    SELECT organization_id
    FROM profiles
    WHERE id = auth.uid()
  )
);
```

### RBAC (role-based access)

```sql
-- Admins can do everything; editors can read/write; viewers read-only
CREATE POLICY "rbac_select"
ON resources FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'editor', 'viewer')
  )
);

CREATE POLICY "rbac_write"
ON resources FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'editor')
  )
);
```

---

## Important notes

**Always test with `auth.uid() = NULL`** — unauthenticated requests return `NULL` for `auth.uid()`. Make sure your policies don't accidentally expose rows when `user_id = NULL`.

**Use `USING` + `WITH CHECK` for write policies** — `USING` filters rows for SELECT/UPDATE/DELETE; `WITH CHECK` validates the new row for INSERT/UPDATE.

**Service role bypasses RLS by default** — if you're using `supabase-js` server-side with the service role key, RLS is bypassed unless you explicitly use `setAuth()`.

---

## File layout

```
policies/
  rbac.sql
  multi-tenant.sql
  user-isolation.sql
  team-access.sql
  public-read.sql
  service-role-bypass.sql
tests/
  rbac.test.sql        # pgTAP tests
  multi-tenant.test.sql
```

---

## Contributing

Additional patterns welcome: invite-based access, time-limited rows, geographic restrictions, etc.

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — free to use in commercial projects.

---

**Built by [AliceLabs LLC](https://alicelabs.site)**  
[contacto@alicelabs.site](mailto:contacto@alicelabs.site)
