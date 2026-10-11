# Supabase RLS Templates

Three reviewed examples for implementing row access rules, with executable isolation tests. Use them as a starting point for an application-specific integration, not as a blanket production security guarantee.

## Included patterns

| File | Access rule |
| --- | --- |
| [user-owns-row.sql](policies/user-owns-row.sql) | Authenticated users can read, insert, update and delete their own rows; ownership changes to another user are rejected |
| [multi-tenant.sql](policies/multi-tenant.sql) | Organization members can read; members/admins/owners can insert and update; only admins/owners can delete; viewers are read-only |
| [role-based.sql](policies/role-based.sql) | Global viewer/editor/admin permissions from server-controlled `app_metadata.app_role`; missing and unknown roles receive no access |

The examples target `public.your_table`. They are **alternative patterns**, not a migration set to run together. PostgreSQL permissive policies combine with OR: adding policies to an existing table can broaden access.

## Verify locally

Node.js 22:

```sh
npm ci --ignore-scripts
npm test
```

By default tests run in ephemeral PGlite databases. CI runs the same assertions against PostgreSQL 16. The test harness creates mock `auth.uid()` and `auth.jwt()` functions and switches database roles. It tests row access rules; it does not test Supabase login, JWT verification, PostgREST or a deployed project.

To use your own **disposable test database**:

```sh
DATABASE_URL=postgres://... ALLOW_TEST_SCHEMA_RESET=1 npm test
```

Tests recreate `public` and `auth` schemas. Never point this command at a database containing application data. No hosted database is modified by the default local test command.

## Adapt to an application

1. Choose one pattern and define who may perform each operation.
2. Replace `public.your_table` with your table and add the required keys. User isolation requires `user_id`; organization isolation requires `org_id`, `public.organizations` and `auth.users`.
3. Inspect existing policies and table/column grants before adding the template. These examples enable RLS; they do not grant access to the target application table.
4. Provision membership or role claims through a trusted server workflow. The tenant example grants authenticated users only SELECT on their own memberships, with no client membership writes.
5. Add application fixtures and run negative cases using authenticated and anonymous roles. Verify in a Supabase staging project before deployment.
6. Review views, functions, background jobs and service-role code as separate access paths.

For an existing `org_members` table, write a reviewed migration rather than executing the CREATE TABLE example. Existing data, grants, policies and helper functions require an inventory first. Older copies of this template created `get_user_org_ids()`; this version does not use a security-definer helper. Inspect its consumers before removing or restricting an existing function.

## Important boundaries

- Table owners, superusers and roles with BYPASSRLS are not representative of application users. Keep privileged service credentials out of clients; tests switch to restricted roles before assertions.
- Global RBAC is intentionally not tenant isolation. Do not use it to separate customer organizations.
- JWT metadata may remain stale until token renewal. Use a database-backed authorization design if immediate revocation is required. Do not accept `user_metadata` as an administrative role source.
- The tenant example permits moving a row between two organizations only when the caller can write to both. Add a separate immutable-organization rule if any move must be forbidden.
- These examples do not enforce subscriptions, quotas, billing, invitation acceptance, audit retention or authorization on every other table.

## AliceLabs integration service

The commercial offer is a scoped integration service: access matrix, adapted migrations, isolation tests and a handover report. The templates remain MIT licensed. There is no paid license activation or checkout in this repository.

Use [the integration brief](docs/INTEGRATION-BRIEF.md) to define the application, roles, tenants and acceptance criteria. Request a proposal through [contacto@alicelabs.site](mailto:contacto@alicelabs.site); scope, price and delivery terms must be agreed before work starts.

[Contributing](CONTRIBUTING.md) · [License](LICENSE)
