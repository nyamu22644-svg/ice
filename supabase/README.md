# ICE Platform — Supabase Architecture & Migration Plan

## 1. Architectural Overview

ICE uses **Supabase** as the managed PostgreSQL and Storage foundation:
- **Relational Data**: Managed PostgreSQL 15+ cluster with UUID v4 primary keys and composite tenant foreign keys.
- **Tenant Isolation**: PostgreSQL **Row-Level Security (RLS)** policies enabled across all tenant tables, preventing cross-tenant leakage at the database engine level.
- **Identity Evidence Storage**: Private Supabase Storage buckets (`identity-evidence`, `biometric-vault`, `audit-archives`) with folder-prefix RLS policies matching `public.current_tenant_id()`.
- **Decoupled Engine Pipeline**: Document intelligence (OCR, 300 DPI checks, blur/glare) and biometric verification remain specialist modules; Supabase provides data and storage persistence.

---

## 2. Directory Layout

```
/supabase
├── migrations/
│   ├── 20261108000001_ice_core_schema.sql         # Core DDL, public.users, RLS policies
│   └── 20261108000002_storage_buckets_and_policies.sql # Private buckets & storage RLS
├── tests/
│   └── rls_tenant_isolation_test.sql              # Automated PostgreSQL RLS cross-tenant test
└── README.md                                      # Architecture documentation & guide
```

---

## 3. Migration Plan & Execution

### Phase 1: Local / CI Verification (Active)
- The applet runs in **Synthetic In-Memory Mode** with zero fake claims.
- The `IdentityRepository` interface (`lib/repository/identity-repository.ts`) decouples UI and API routes from the storage backend.
- When Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are present, the applet automatically switches to `SupabaseIdentityRepository`.

### Phase 2: Supabase Project Setup
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Retrieve the project URL and API keys from **Project Settings → API**.
3. Apply migration files using the Supabase CLI:
   ```bash
   supabase db push
   # OR direct SQL execution via psql:
   psql $DATABASE_URL -f supabase/migrations/20261108000001_ice_core_schema.sql
   psql $DATABASE_URL -f supabase/migrations/20261108000002_storage_buckets_and_policies.sql
   ```
4. Verify tenant isolation using the test suite:
   ```bash
   psql $DATABASE_URL -f supabase/tests/rls_tenant_isolation_test.sql
   ```

---

## 4. Key Security Controls

1. **Deny-by-Default RLS**:
   All tables (`verification_sessions`, `identity_documents`, `extracted_fields`, `biometric_sessions`, `risk_indicators`, `audit_events`, `api_credentials`) have RLS enabled.
2. **Helper Function `current_tenant_id()`**:
   Evaluates the active organization via authenticated `auth.uid()` lookup in `public.users` or verified JWT claim `app_metadata.organization_id`.
3. **Tamper-Evident Audit Logs**:
   `public.audit_events` allows `SELECT` and `INSERT` for authenticated tenant members, but explicitly denies `UPDATE` and `DELETE` via RLS policy.
4. **Private Storage Buckets**:
   No permanent public URLs. Storage objects are strictly prefixed by tenant ID (`{organization_id}/sessions/{session_id}/...`). Non-members receive `403 Forbidden`.
5. **No Service-Role Key in Browser**:
   `SUPABASE_SERVICE_ROLE_KEY` is strictly server-only and guarded against browser execution.
