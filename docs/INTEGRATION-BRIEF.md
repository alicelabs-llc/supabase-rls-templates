# RLS integration brief

## Inputs for a scoped proposal

- Application owner and technical contact:
- Tables and relationships in scope:
- Organizations/tenants and how membership is granted or revoked:
- User roles and allowed SELECT / INSERT / UPDATE / DELETE operations:
- Whether owner or organization keys may change:
- Public/anonymous access requirements:
- Views, RPC functions, background jobs and privileged access paths:
- Staging environment and representative synthetic fixtures:
- Existing policies and migrations requiring compatibility:

Do not include service keys, production credentials or customer records in the brief.

## Deliverables to agree

1. A written role/operation matrix and assumptions.
2. Application-specific migration with rollback approach.
3. Positive and negative tests for ownership, tenant boundaries, role escalation and revocation requirements.
4. Evidence from the selected staging environment and a handover guide.

Price, schedule, supported tables, revisions and ongoing maintenance are defined in a separate proposal. A passing sample test does not certify an entire application. Production rollout requires application-owner review of the migration and staging evidence.
