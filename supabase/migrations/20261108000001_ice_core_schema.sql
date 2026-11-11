-- ============================================================================
-- ICE IDENTITY VERIFICATION PLATFORM — SUPABASE POSTGRESQL CORE MIGRATION
-- Migration Version: 20261108000001
-- Target: Supabase PostgreSQL 15+ with pg_crypto and auth schema integration
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations (Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(32) NOT NULL DEFAULT 'STARTER', -- STARTER, GROWTH, ENTERPRISE
    environment VARCHAR(32) NOT NULL DEFAULT 'SANDBOX', -- SANDBOX, PRODUCTION
    data_retention_days INT NOT NULL DEFAULT 365,
    authoritative_source_connected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Organization Settings
CREATE TABLE IF NOT EXISTS public.organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    webhook_signing_secret VARCHAR(255) NOT NULL,
    enforce_liveness BOOLEAN NOT NULL DEFAULT TRUE,
    require_biometrics BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_document_types TEXT[] NOT NULL DEFAULT ARRAY['KE_NATIONAL_ID', 'KE_PASSPORT'],
    auto_approve_max_risk_score INT NOT NULL DEFAULT 20,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Users & Tenant Membership (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL DEFAULT 'KYC_REVIEWER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_user_email UNIQUE (organization_id, email)
);

-- 4. Identity Subjects (Global privacy-preserving entity; stores SHA-256 hash only)
CREATE TABLE IF NOT EXISTS public.identity_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    national_id_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. People (Core Record Type A: Ongoing Organization-Scoped Identity Record)
CREATE TABLE IF NOT EXISTS public.people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    identity_subject_id UUID REFERENCES public.identity_subjects(id),
    external_reference_id VARCHAR(128) NOT NULL,
    primary_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    national_id_masked VARCHAR(64) NOT NULL,
    national_id_hash VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(64) NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'UNVERIFIED', -- VERIFIED, NEEDS_ATTENTION, UNVERIFIED, SUSPECTED_FRAUD
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_verification_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_attempt_count INT NOT NULL DEFAULT 1,
    resolution_policy VARCHAR(128) NOT NULL DEFAULT 'EXACT_HASH_MATCH_WITH_ORG_SCOPED_ID',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_person_ref UNIQUE (organization_id, external_reference_id)
);

-- Backward-compatible organization_customers view
CREATE OR REPLACE VIEW public.organization_customers AS 
    SELECT id, organization_id, identity_subject_id, external_reference_id, primary_name as full_name, email, phone_number, created_at 
    FROM public.people;

-- 6. Workflows (Configurable, Versioned verification policies)
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    version VARCHAR(32) NOT NULL DEFAULT '1.0',
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED', -- DRAFT, TESTING, PUBLISHED, ARCHIVED
    description TEXT,
    purpose VARCHAR(128) NOT NULL DEFAULT 'CUSTOMER_ONBOARDING',
    country_scope TEXT[] NOT NULL DEFAULT ARRAY['KE'],
    allowed_document_types TEXT[] NOT NULL DEFAULT ARRAY['KE_NATIONAL_ID'],
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    steps JSONB NOT NULL DEFAULT '[]'::JSONB,
    rules JSONB NOT NULL DEFAULT '[]'::JSONB,
    requirements JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    CONSTRAINT uq_tenant_workflow_version UNIQUE (organization_id, name, version)
);

-- 7. Verification Sessions (Core Record Type B: Specific Verification Attempt)
CREATE TABLE IF NOT EXISTS public.verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.people(id), -- Backward compatibility
    external_reference_id VARCHAR(128),
    verification_purpose VARCHAR(128) NOT NULL DEFAULT 'TIER_1_KYC_ACCOUNT_OPENING',
    workflow_id UUID NOT NULL REFERENCES public.workflows(id),
    workflow_version VARCHAR(32) NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'PENDING_SUBMISSION',
    overall_risk_score INT NOT NULL DEFAULT 0,
    authoritative_check_status VARCHAR(64) NOT NULL DEFAULT 'NOT_PERFORMED',
    authoritative_check_source VARCHAR(255),
    submitted_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL
);

-- 8. Identity Documents
CREATE TABLE IF NOT EXISTS public.identity_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    document_type VARCHAR(64) NOT NULL,
    side VARCHAR(16) NOT NULL DEFAULT 'FRONT',
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_checksum VARCHAR(64) NOT NULL,
    storage_ref VARCHAR(512) NOT NULL,
    visual_tampering_detected BOOLEAN NOT NULL DEFAULT FALSE,
    tampering_confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Extracted OCR Fields
CREATE TABLE IF NOT EXISTS public.extracted_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.identity_documents(id) ON DELETE CASCADE,
    field_name VARCHAR(64) NOT NULL,
    label VARCHAR(128) NOT NULL,
    extracted_value TEXT NOT NULL,
    confidence_score NUMERIC(4, 3) NOT NULL,
    validation_status VARCHAR(32) NOT NULL DEFAULT 'VALID',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Document Quality Results
CREATE TABLE IF NOT EXISTS public.document_quality_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_id UUID UNIQUE NOT NULL REFERENCES public.identity_documents(id) ON DELETE CASCADE,
    glare_detected BOOLEAN NOT NULL DEFAULT FALSE,
    blur_score NUMERIC(4, 3) NOT NULL,
    resolution_dpi INT NOT NULL,
    four_corners_detected BOOLEAN NOT NULL DEFAULT TRUE,
    passed_quality_checks BOOLEAN NOT NULL DEFAULT TRUE,
    feedback_messages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

-- 11. Biometric Sessions
CREATE TABLE IF NOT EXISTS public.biometric_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_id UUID UNIQUE NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    consent_recorded BOOLEAN NOT NULL DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ,
    selfie_storage_ref VARCHAR(512),
    liveness_status VARCHAR(64) NOT NULL DEFAULT 'NOT_CONFIGURED',
    face_comparison_status VARCHAR(64) NOT NULL DEFAULT 'NOT_CONFIGURED',
    face_similarity_score NUMERIC(4, 3),
    threshold_used NUMERIC(4, 3) NOT NULL DEFAULT 0.850,
    engine_version VARCHAR(128) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Risk Indicators
CREATE TABLE IF NOT EXISTS public.risk_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    signal_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    evidence_reference VARCHAR(255) NOT NULL,
    engine_version VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Investigation Cases (Core Record Type C: Formal human investigation)
CREATE TABLE IF NOT EXISTS public.investigation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    case_number VARCHAR(64) UNIQUE NOT NULL,
    verification_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    case_type VARCHAR(64) NOT NULL, -- DOCUMENT_TAMPERING_INVESTIGATION, BIOMETRIC_SPOOF_INSPECTION, etc.
    reason_for_opening TEXT NOT NULL,
    opened_by VARCHAR(64) NOT NULL DEFAULT 'AUTOMATED_WORKFLOW_RULE',
    priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    assigned_reviewer_id UUID REFERENCES public.users(id),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_INVESTIGATION, WAITING_FOR_EVIDENCE, RESOLVED, CLOSED
    sla_target_minutes INT, -- Configured only by explicit policy
    notes JSONB NOT NULL DEFAULT '[]'::JSONB,
    evidence_references JSONB NOT NULL DEFAULT '[]'::JSONB,
    action_history JSONB NOT NULL DEFAULT '[]'::JSONB,
    resolution JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward-compatible review_cases view
CREATE OR REPLACE VIEW public.review_cases AS
    SELECT id, organization_id, verification_id as session_id, assigned_reviewer_id, status, created_at, updated_at
    FROM public.investigation_cases;

CREATE TABLE IF NOT EXISTS public.reviewer_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id),
    action VARCHAR(64) NOT NULL,
    reason_code VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Workflow Execution Records (Immutable Step Traces)
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    verification_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    workflow_version VARCHAR(32) NOT NULL,
    step_id VARCHAR(64) NOT NULL,
    step_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PASSED', -- PASSED, FAILED, FLAGGED, SKIPPED, SIMULATED
    output_reference TEXT,
    failure_reason TEXT,
    action_taken TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Immutable Audit Events (Append-Only)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_type VARCHAR(32) NOT NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    details JSONB NOT NULL,
    sensitive_access_justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. API Credentials
CREATE TABLE IF NOT EXISTS public.api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    environment VARCHAR(32) NOT NULL DEFAULT 'SANDBOX',
    key_prefix VARCHAR(16) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['verifications:read', 'verifications:write'],
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Webhooks
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    url VARCHAR(512) NOT NULL,
    events TEXT[] NOT NULL,
    secret_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- HELPER FUNCTIONS FOR TENANT CONTEXT IN ROW-LEVEL SECURITY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
BEGIN
  -- 1. Check custom session variable if explicitly set by server service role
  IF NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL THEN
    RETURN current_setting('app.current_tenant_id', true)::UUID;
  END IF;

  -- 2. Check JWT app_metadata claim
  IF (auth.jwt() -> 'app_metadata' ->> 'organization_id') IS NOT NULL THEN
    RETURN (auth.jwt() -> 'app_metadata' ->> 'organization_id')::UUID;
  END IF;

  -- 3. Resolve active tenant from public.users table matching authenticated auth.uid()
  RETURN (
    SELECT u.organization_id 
    FROM public.users u 
    WHERE u.id = auth.uid() AND u.is_active = TRUE
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_quality_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviewer_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Organization visibility: Users can only see their own organization
CREATE POLICY org_tenant_isolation ON public.organizations
    FOR ALL USING (id = public.current_tenant_id());

-- Customers visibility
CREATE POLICY customer_tenant_isolation ON public.organization_customers
    FOR ALL USING (organization_id = public.current_tenant_id());

-- Workflows visibility
CREATE POLICY workflow_tenant_isolation ON public.workflows
    FOR ALL USING (organization_id = public.current_tenant_id());

-- Verification Sessions isolation
CREATE POLICY session_tenant_isolation ON public.verification_sessions
    FOR ALL USING (organization_id = public.current_tenant_id());

-- Documents isolation
CREATE POLICY doc_tenant_isolation ON public.identity_documents
    FOR ALL USING (organization_id = public.current_tenant_id());

-- Extracted Fields isolation
CREATE POLICY fields_tenant_isolation ON public.extracted_fields
    FOR ALL USING (organization_id = public.current_tenant_id());

-- Biometric Sessions isolation
CREATE POLICY biometric_tenant_isolation ON public.biometric_sessions
    FOR ALL USING (organization_id = public.current_tenant_id());

-- Risk Indicators isolation
CREATE POLICY risk_tenant_isolation ON public.risk_indicators
    FOR ALL USING (organization_id = public.current_tenant_id());

-- Immutable Audit Log: Read and Insert permitted for tenant; UPDATE & DELETE FORBIDDEN
CREATE POLICY audit_tenant_select ON public.audit_events
    FOR SELECT USING (organization_id = public.current_tenant_id() OR organization_id IS NULL);

CREATE POLICY audit_tenant_insert ON public.audit_events
    FOR INSERT WITH CHECK (organization_id = public.current_tenant_id());

-- Deny UPDATE and DELETE on audit_events to guarantee tamper-evidence
CREATE POLICY audit_deny_update ON public.audit_events
    FOR UPDATE USING (FALSE);

CREATE POLICY audit_deny_delete ON public.audit_events
    FOR DELETE USING (FALSE);
