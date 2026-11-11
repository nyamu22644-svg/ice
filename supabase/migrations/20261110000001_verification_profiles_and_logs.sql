-- ============================================================================
-- ICE IDENTITY VERIFICATION PLATFORM — VERIFICATION PROFILES & INTEGRATION LOGS
-- Migration Version: 20261110000001
-- Target: Supabase PostgreSQL 15+
-- ============================================================================

-- 1. Verification Profiles Table
CREATE TABLE IF NOT EXISTS public.verification_profiles (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'prof_apex_loan', 'prof_full_kyc'
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL,
    description TEXT,
    verification_purpose VARCHAR(128) NOT NULL DEFAULT 'TIER_1_KYC_ACCOUNT_OPENING',
    country_scope TEXT[] NOT NULL DEFAULT ARRAY['KE'],
    supported_languages TEXT[] NOT NULL DEFAULT ARRAY['en', 'sw'],
    allowed_document_types TEXT[] NOT NULL DEFAULT ARRAY['NATIONAL_ID'],
    document_capture_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    identity_collection_mode VARCHAR(64) NOT NULL DEFAULT 'EXTRACT_FROM_DOCUMENT',
    ocr_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    document_quality_checks JSONB NOT NULL DEFAULT '{"blurThreshold": 0.70, "glareDetection": true, "fourCornersDetection": true}'::jsonb,
    document_forensic_checks JSONB NOT NULL DEFAULT '{"tamperingDetection": true, "barcodeIntegrity": true, "hologramCheck": false}'::jsonb,
    biometric_capture_mode VARCHAR(64) NOT NULL DEFAULT 'LIVENESS_AND_SELFIE',
    liveness_mode VARCHAR(64) NOT NULL DEFAULT 'PASSIVE',
    anti_spoofing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    face_match_threshold NUMERIC(4, 3) NOT NULL DEFAULT 0.850,
    authoritative_check_mode VARCHAR(64) NOT NULL DEFAULT 'OPTIONAL',
    sanctions_screening_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    adverse_media_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    associated_workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
    associated_workflow_version VARCHAR(32) DEFAULT 'v1.0',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_profile_slug UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_verification_profiles_org ON public.verification_profiles(organization_id);

-- 2. Integration Logs Table
CREATE TABLE IF NOT EXISTS public.integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.integration_projects(id) ON DELETE SET NULL,
    environment VARCHAR(32) NOT NULL DEFAULT 'SANDBOX',
    method VARCHAR(16) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    status_code INT NOT NULL,
    duration_ms INT NOT NULL,
    request_id VARCHAR(128) NOT NULL,
    client_ip VARCHAR(64),
    user_agent TEXT,
    request_body_masked JSONB,
    response_snippet TEXT,
    error_message TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_org ON public.integration_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_project ON public.integration_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_timestamp ON public.integration_logs(timestamp DESC);

-- 3. Row Level Security Policies
ALTER TABLE public.verification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_verification_profiles ON public.verification_profiles
    FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_integration_logs ON public.integration_logs
    FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));
