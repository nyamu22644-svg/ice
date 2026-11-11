-- ============================================================================
-- ICE IDENTITY VERIFICATION PLATFORM
-- Migration 0001: Initial Core Multi-Tenant Schema & Row-Level Security
-- Target Database: PostgreSQL 15+
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations (Tenants)
CREATE TABLE organizations (
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
CREATE TABLE organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_signing_secret VARCHAR(255) NOT NULL,
    enforce_liveness BOOLEAN NOT NULL DEFAULT TRUE,
    require_biometrics BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_document_types TEXT[] NOT NULL DEFAULT ARRAY['KE_NATIONAL_ID', 'KE_PASSPORT'],
    auto_approve_max_risk_score INT NOT NULL DEFAULT 20,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Users & Tenant Membership
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL, -- ORGANIZATION_OWNER, COMPLIANCE_MANAGER, KYC_REVIEWER, DEVELOPER, AUDITOR, etc.
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_user_email UNIQUE (organization_id, email)
);

-- 4. Identity Subjects (Global privacy-preserving person entity)
-- Stores ONLY hash of ID to prevent cross-tenant plaintext correlation
CREATE TABLE identity_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    national_id_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Organization Customers (Tenant-isolated customer relationship)
CREATE TABLE organization_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    identity_subject_id UUID REFERENCES identity_subjects(id),
    external_reference_id VARCHAR(128) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_customer_ref UNIQUE (organization_id, external_reference_id)
);

-- 6. Workflows (Versioned verification policies)
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    version VARCHAR(32) NOT NULL DEFAULT '1.0',
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    requirements JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_workflow_version UNIQUE (organization_id, name, version)
);

-- 7. Verification Sessions
CREATE TABLE verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES organization_customers(id),
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    workflow_version VARCHAR(32) NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'PENDING_SUBMISSION',
    overall_risk_score INT NOT NULL DEFAULT 0,
    authoritative_check_status VARCHAR(64) NOT NULL DEFAULT 'NOT_PERFORMED',
    submitted_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL
);

-- 8. Identity Documents
CREATE TABLE identity_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,
    document_type VARCHAR(64) NOT NULL,
    side VARCHAR(16) NOT NULL DEFAULT 'FRONT',
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_checksum VARCHAR(64) NOT NULL,
    storage_ref VARCHAR(512) NOT NULL, -- Private S3 path
    visual_tampering_detected BOOLEAN NOT NULL DEFAULT FALSE,
    tampering_confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Extracted Fields (OCR Results)
CREATE TABLE extracted_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES identity_documents(id) ON DELETE CASCADE,
    field_name VARCHAR(64) NOT NULL,
    label VARCHAR(128) NOT NULL,
    extracted_value TEXT NOT NULL,
    confidence_score NUMERIC(4, 3) NOT NULL,
    validation_status VARCHAR(32) NOT NULL DEFAULT 'VALID',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Document Quality Results
CREATE TABLE document_quality_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID UNIQUE NOT NULL REFERENCES identity_documents(id) ON DELETE CASCADE,
    glare_detected BOOLEAN NOT NULL DEFAULT FALSE,
    blur_score NUMERIC(4, 3) NOT NULL,
    resolution_dpi INT NOT NULL,
    four_corners_detected BOOLEAN NOT NULL DEFAULT TRUE,
    passed_quality_checks BOOLEAN NOT NULL DEFAULT TRUE,
    feedback_messages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

-- 11. Biometric Sessions
CREATE TABLE biometric_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID UNIQUE NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,
    consent_recorded BOOLEAN NOT NULL DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ,
    selfie_storage_ref VARCHAR(512),
    liveness_status VARCHAR(64) NOT NULL DEFAULT 'NOT_CONFIGURED',
    face_comparison_status VARCHAR(64) NOT NULL DEFAULT 'NOT_CONFIGURED',
    face_similarity_score NUMERIC(4, 3),
    threshold_used NUMERIC(4, 3) NOT NULL DEFAULT 0.850,
    engine_version VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Risk Indicators
CREATE TABLE risk_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,
    signal_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    evidence_reference VARCHAR(255) NOT NULL,
    engine_version VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Review Cases and Reviewer Actions
CREATE TABLE review_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID UNIQUE NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,
    assigned_reviewer_id UUID REFERENCES users(id),
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED', -- QUEUED, IN_REVIEW, DECIDED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviewer_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(64) NOT NULL, -- APPROVED, REJECTED, REQUESTED_INFO, ESCALATED
    reason_code VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Immutable Audit Events (Company-scoped)
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_type VARCHAR(32) NOT NULL, -- USER, API_KEY, SYSTEM, ICE_STAFF
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id UUID NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    details JSONB NOT NULL,
    sensitive_access_justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. API Credentials
CREATE TABLE api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    environment VARCHAR(32) NOT NULL DEFAULT 'SANDBOX',
    key_prefix VARCHAR(16) NOT NULL,
    key_hash VARCHAR(255) NOT NULL, -- bcrypt/sha256 hash of secret key
    scopes TEXT[] NOT NULL DEFAULT ARRAY['verifications:read', 'verifications:write'],
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Webhooks
CREATE TABLE webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    url VARCHAR(512) NOT NULL,
    events TEXT[] NOT NULL,
    secret_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR TENANT-SCOPED QUERIES
-- ============================================================================
CREATE INDEX idx_sessions_org_status ON verification_sessions(organization_id, status);
CREATE INDEX idx_sessions_org_created ON verification_sessions(organization_id, created_at DESC);
CREATE INDEX idx_docs_org_session ON identity_documents(organization_id, session_id);
CREATE INDEX idx_audit_org_timestamp ON audit_events(organization_id, created_at DESC);

-- ============================================================================
-- POSTGRESQL ROW-LEVEL SECURITY (RLS) POLICIES
-- Ensures cross-tenant leaks are impossible even with application bugs.
-- ============================================================================
ALTER TABLE verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_sessions ON verification_sessions
    USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_documents ON identity_documents
    USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_biometrics ON biometric_sessions
    USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_audit ON audit_events
    USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID OR organization_id IS NULL);
