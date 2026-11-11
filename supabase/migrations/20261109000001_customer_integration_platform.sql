-- ============================================================================
-- ICE IDENTITY VERIFICATION PLATFORM — CUSTOMER ONBOARDING & INTEGRATION DDL
-- Migration Version: 20261109000001
-- Target: Supabase PostgreSQL 15+
-- Defines: Integration Projects, Onboarding Applications, Approval Audit History,
--          Multi-Origin Domain Validation, and Webhook Signing Infrastructure.
-- ============================================================================

-- 1. Organization Onboarding Applications
CREATE TABLE IF NOT EXISTS public.organization_onboarding_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    legal_business_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    country VARCHAR(64) NOT NULL DEFAULT 'Kenya',
    business_type VARCHAR(64) NOT NULL, -- LIMITED_COMPANY, PARTNERSHIP, SOLE_PROPRIETORSHIP, FINANCIAL_INSTITUTION, NGO
    industry VARCHAR(128) NOT NULL, -- Digital Lending, FinTech, Banking, Marketplace, etc.
    registration_number VARCHAR(128) NOT NULL,
    website VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(64) NOT NULL,
    intended_use_case TEXT NOT NULL,
    expected_monthly_volume VARCHAR(64) NOT NULL DEFAULT 'LESS_THAN_1000',
    status VARCHAR(64) NOT NULL DEFAULT 'EMAIL_VERIFICATION_REQUIRED',
    -- Status check constraint
    CONSTRAINT chk_onboarding_status CHECK (status IN (
        'DRAFT',
        'EMAIL_VERIFICATION_REQUIRED',
        'SANDBOX_ACTIVE',
        'PRODUCTION_APPLICATION_SUBMITTED',
        'UNDER_REVIEW',
        'ADDITIONAL_INFORMATION_REQUIRED',
        'PRODUCTION_APPROVED',
        'PRODUCTION_REJECTED',
        'SUSPENDED'
    )),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewer_id UUID,
    reviewer_name VARCHAR(255),
    review_notes TEXT,
    rejection_reason TEXT,
    additional_info_requested TEXT,
    compliance_documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for tenant onboarding queries
CREATE INDEX IF NOT EXISTS idx_onboarding_org_id ON public.organization_onboarding_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON public.organization_onboarding_applications(status);

-- 2. Organization Approval & Status Change Audit History
CREATE TABLE IF NOT EXISTS public.organization_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    previous_status VARCHAR(64) NOT NULL,
    new_status VARCHAR(64) NOT NULL,
    changed_by VARCHAR(128) NOT NULL, -- ICE Staff ID or 'SYSTEM'
    changed_by_name VARCHAR(255) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason_notes TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_history_org_id ON public.organization_approval_history(organization_id);

-- 3. Integration Projects
CREATE TABLE IF NOT EXISTS public.integration_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL,
    description TEXT,
    allowed_origins TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- e.g. ARRAY['https://lending.example.com']
    country VARCHAR(32) NOT NULL DEFAULT 'KE',
    intended_use_case VARCHAR(255) NOT NULL,
    default_workflow_id VARCHAR(64) NOT NULL,
    sandbox_workflow_id VARCHAR(64) NOT NULL,
    production_workflow_id VARCHAR(64),
    integration_method VARCHAR(64) NOT NULL DEFAULT 'EMBEDDED_WEB_SDK',
    CONSTRAINT chk_integration_method CHECK (integration_method IN (
        'HOSTED_VERIFICATION',
        'EMBEDDED_WEB_SDK',
        'REST_API',
        'NATIVE_MOBILE_SDK'
    )),
    sdk_version VARCHAR(32) DEFAULT 'v1.0.0',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    environment VARCHAR(32) NOT NULL DEFAULT 'SANDBOX',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_project_slug UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.integration_projects(organization_id);

-- 4. Extend API Credentials table with Project and Environment separation
ALTER TABLE public.api_credentials 
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.integration_projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS secret_masked VARCHAR(64),
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 5. Extend Webhook Endpoints table
ALTER TABLE public.webhook_endpoints 
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.integration_projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS environment VARCHAR(32) NOT NULL DEFAULT 'SANDBOX',
    ADD COLUMN IF NOT EXISTS signing_secret VARCHAR(255),
    ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_delivery_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_delivery_status VARCHAR(32);

-- 6. Extend Webhook Deliveries table
ALTER TABLE public.webhook_deliveries 
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.integration_projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS signature VARCHAR(255),
    ADD COLUMN IF NOT EXISTS error TEXT;

-- 7. Extend Verification Sessions table
ALTER TABLE public.verification_sessions 
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.integration_projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS environment VARCHAR(32) NOT NULL DEFAULT 'SANDBOX',
    ADD COLUMN IF NOT EXISTS return_url TEXT,
    ADD COLUMN IF NOT EXISTS cancel_url TEXT,
    ADD COLUMN IF NOT EXISTS session_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS integration_method VARCHAR(64);

-- 8. Row Level Security Policies for Integration Entities
ALTER TABLE public.organization_onboarding_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_projects ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy for Integration Projects
CREATE POLICY tenant_isolation_integration_projects ON public.integration_projects
    FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- Tenant isolation policy for Onboarding Applications
CREATE POLICY tenant_isolation_onboarding_apps ON public.organization_onboarding_applications
    FOR ALL
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- ICE Internal Staff Read/Write Policy for Onboarding Reviews
CREATE POLICY staff_manage_onboarding_apps ON public.organization_onboarding_applications
    FOR ALL
    USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'PLATFORM_SUPER_ADMIN');
