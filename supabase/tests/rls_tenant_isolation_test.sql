-- ============================================================================
-- ICE IDENTITY PLATFORM — SUPABASE POSTGRESQL RLS TEST SUITE
-- File: supabase/tests/rls_tenant_isolation_test.sql
-- Run with: psql $DATABASE_URL -f supabase/tests/rls_tenant_isolation_test.sql
-- OR with Supabase CLI: supabase test db
-- ============================================================================

BEGIN;

-- 1. Setup Test Fixtures: Two Distinct Organizations
INSERT INTO public.organizations (id, slug, name, tier, environment)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'org-a', 'Apex Finance Ltd (Org A)', 'ENTERPRISE', 'PRODUCTION'),
  ('22222222-2222-2222-2222-222222222222', 'org-b', 'Safari Payments PLC (Org B)', 'GROWTH', 'SANDBOX')
ON CONFLICT (id) DO NOTHING;

-- 2. Setup Test Fixtures: Users in auth.users and public.users
-- User A belongs to Org A
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user.a@apexfinance.co.ke')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, organization_id, email, name, role, is_active)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'user.a@apexfinance.co.ke', 'User A (Org A Compliance)', 'COMPLIANCE_MANAGER', TRUE)
ON CONFLICT (organization_id, email) DO NOTHING;

-- User B belongs to Org B
INSERT INTO auth.users (id, email)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user.b@safaripay.co.ke')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, organization_id, email, name, role, is_active)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'user.b@safaripay.co.ke', 'User B (Org B Reviewer)', 'KYC_REVIEWER', TRUE)
ON CONFLICT (organization_id, email) DO NOTHING;

-- 3. Seed Sensitive Verification & Document belonging to Org A
INSERT INTO public.organization_customers (id, organization_id, external_reference_id, full_name, email, phone_number)
VALUES ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'REF-A-01', 'John Doe Org A', 'john.a@example.com', '+254711111111')
ON CONFLICT DO NOTHING;

INSERT INTO public.workflows (id, organization_id, name, version, requirements)
VALUES ('waaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Standard KYC', '1.0', '{"requireDocument": true}')
ON CONFLICT DO NOTHING;

INSERT INTO public.verification_sessions (id, organization_id, customer_id, workflow_id, workflow_version, status, submitted_data, expires_at)
VALUES (
  'saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'waaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '1.0',
  'NEEDS_REVIEW',
  '{"fullName": "John Doe Org A", "nationalIdNumber": "28471920"}',
  NOW() + INTERVAL '7 days'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.identity_documents (id, organization_id, session_id, document_type, file_name, mime_type, file_size_bytes, sha256_checksum, storage_ref)
VALUES (
  'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'KE_NATIONAL_ID',
  'confidential_id_front.jpg',
  'image/jpeg',
  400000,
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  '11111111-1111-1111-1111-111111111111/sessions/saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/documents/id.jpg'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEST RUNNER EXECUTION
-- ============================================================================

-- Switch session role to 'authenticated' as User B (Org B)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SET LOCAL "request.jwt.claims" TO '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "app_metadata": {"organization_id": "22222222-2222-2222-2222-222222222222"}}';

DO $$
DECLARE
  v_count INT;
BEGIN
  RAISE NOTICE 'Executing Test 1: User B SELECT verification_sessions from Org A...';
  SELECT COUNT(*) INTO v_count FROM public.verification_sessions WHERE id = 'saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF v_count = 0 THEN
    RAISE NOTICE '✓ [PASS] Test 1: User B cannot see Org A verification session (0 rows returned)';
  ELSE
    RAISE EXCEPTION '✗ [FAIL] Test 1: User B was able to view Org A verification session!';
  END IF;

  RAISE NOTICE 'Executing Test 2: User B SELECT identity_documents from Org A...';
  SELECT COUNT(*) INTO v_count FROM public.identity_documents WHERE id = 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF v_count = 0 THEN
    RAISE NOTICE '✓ [PASS] Test 2: User B cannot see Org A identity documents (0 rows returned)';
  ELSE
    RAISE EXCEPTION '✗ [FAIL] Test 2: User B was able to view Org A identity document!';
  END IF;

  RAISE NOTICE 'Executing Test 3: User B UPDATE verification_sessions of Org A...';
  UPDATE public.verification_sessions SET status = 'REJECTED' WHERE id = 'saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE NOTICE '✓ [PASS] Test 3: User B cannot update Org A verification status (0 rows affected)';
  ELSE
    RAISE EXCEPTION '✗ [FAIL] Test 3: User B was able to update Org A record!';
  END IF;

  RAISE NOTICE 'Executing Test 4: User B DELETE verification_sessions of Org A...';
  DELETE FROM public.verification_sessions WHERE id = 'saaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE NOTICE '✓ [PASS] Test 4: User B cannot delete Org A record (0 rows affected)';
  ELSE
    RAISE EXCEPTION '✗ [FAIL] Test 4: User B was able to delete Org A record!';
  END IF;
END $$;

-- Switch back to service role to test User Revocation
RESET ROLE;

-- Revoke User A membership (set is_active = FALSE)
UPDATE public.users SET is_active = FALSE WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Switch session role to 'authenticated' as Deactivated User A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SET LOCAL "request.jwt.claims" TO '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

DO $$
DECLARE
  v_count INT;
BEGIN
  RAISE NOTICE 'Executing Test 5: Revoked User A SELECT verification_sessions...';
  SELECT COUNT(*) INTO v_count FROM public.verification_sessions;
  IF v_count = 0 THEN
    RAISE NOTICE '✓ [PASS] Test 5: Deactivated user access is immediately revoked by RLS policy (0 rows returned)';
  ELSE
    RAISE EXCEPTION '✗ [FAIL] Test 5: Deactivated user retained access!';
  END IF;
END $$;

-- Roll back test transaction to leave database clean
ROLLBACK;
