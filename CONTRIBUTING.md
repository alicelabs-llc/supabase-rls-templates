# Contributing to supabase-rls-templates

## Adding a new policy template

1. Create `policies/YOUR_PATTERN.sql`
2. Add clear comments explaining every `USING` and `WITH CHECK` expression
3. Add a pgTAP test in `tests/YOUR_PATTERN.test.sql` if possible
4. Add a row to the table in `README.md`
5. Open a PR

## Policy quality checklist

- [ ] RLS is enabled on the table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] Both `USING` and `WITH CHECK` are set for UPDATE policies
- [ ] Behavior is documented for unauthenticated (`auth.uid() = NULL`) requests
- [ ] No performance anti-patterns (avoid `SELECT *` in USING expressions)
- [ ] Comment explains the business rule being enforced

## Commit conventions

- `feat: add time-limited access policy`
- `fix: correct WITH CHECK for multi-tenant update`
- `docs: add note about service role bypass`

---

Questions? → [contacto@alicelabs.site](mailto:contacto@alicelabs.site)
