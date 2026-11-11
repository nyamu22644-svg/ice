// ICE In-Memory Multi-Tenant Data Store with Strict Isolation & RBAC
// Implements clear domain separation between Person, Verification, and Investigation Case.

import { hasPermission } from '../auth/rbac';
import { assertTenantMatch, TenantIsolationError, UnauthorizedError } from '../tenant/context';
import {
  ApiCredential,
  AuditEvent,
  BiometricSession,
  IdentityDocument,
  IntegrationLog,
  IntegrationMethod,
  IntegrationProject,
  InvestigationCase,
  Organization,
  OrganizationApprovalHistory,
  OrganizationOnboardingApplication,
  OrganizationOnboardingStatus,
  OrganizationRole,
  Permission,
  Person,
  RiskIndicator,
  VerificationProfile,
  ProfileVersionHistory,
  DocumentCaptureRule,
  IdentityCollectionMode,
  VerificationSession,
  VerificationStatus,
  WebhookDelivery,
  WebhookEndpoint,
  Workflow,
  WorkflowExecutionRecord,
} from '../types';
import { WebhookEngine } from '../engines/webhook-engine';

export interface DecidedResult {
  status: 'VERIFIED' | 'REJECTED' | 'NEEDS_MORE_INFORMATION' | 'ESCALATED';
  reason: string;
  reviewerId: string;
  reviewerName: string;
}

class SyntheticDatabase {
  // Organizations
  public organizations: Organization[] = [
    {
      id: 'org_apex_fin',
      name: 'Apex Finance Ltd',
      slug: 'apex-finance',
      tier: 'ENTERPRISE',
      createdAt: '2025-01-15T08:00:00Z',
      dataRetentionDays: 365,
      environment: 'PRODUCTION',
      authoritativeSourceConnected: false, // Explicitly false
      onboardingStatus: 'PRODUCTION_APPROVED',
      productionApprovedAt: '2025-01-20T10:00:00Z',
      productionApprovedBy: 'staff_adm_01',
    },
    {
      id: 'org_safari_pay',
      name: 'Safari Payments PLC',
      slug: 'safari-pay',
      tier: 'GROWTH',
      createdAt: '2025-03-20T10:30:00Z',
      dataRetentionDays: 180,
      environment: 'SANDBOX',
      authoritativeSourceConnected: false, // Explicitly false
      onboardingStatus: 'UNDER_REVIEW',
    },
  ];

  // ---------------------------------------------------------------------------
  // INTEGRATION PROJECTS (Customer Application Integrations)
  // ---------------------------------------------------------------------------
  public projects: IntegrationProject[] = [
    {
      id: 'prj_apex_lending',
      organizationId: 'org_apex_fin',
      name: 'Apex Mobile Lending',
      slug: 'apex-mobile-lending',
      description: 'Instant micro-credit and salary advance loan application verification.',
      allowedOrigins: ['https://lending.apexfinance.co.ke', 'https://lending.example.com', 'http://localhost:3000'],
      country: 'KE',
      intendedUseCase: 'Automated CDD for instant loan disbursements',
      defaultWorkflowId: 'wf_apex_standard',
      defaultVerificationProfileId: 'prof_apex_loan',
      sandboxWorkflowId: 'wf_apex_standard',
      productionWorkflowId: 'wf_apex_standard',
      integrationMethod: 'EMBEDDED_WEB_SDK',
      sdkVersion: 'v1.0.0',
      status: 'ACTIVE',
      environment: 'PRODUCTION',
      createdAt: '2025-01-20T09:00:00Z',
      updatedAt: '2025-01-20T09:00:00Z',
    },
    {
      id: 'prj_apex_merchant',
      organizationId: 'org_apex_fin',
      name: 'Merchant POS Onboarding',
      slug: 'merchant-pos-onboarding',
      description: 'Hosted identity verification for small business point-of-sale merchants.',
      allowedOrigins: ['https://merchants.apexfinance.co.ke'],
      country: 'KE',
      intendedUseCase: 'Tier-2 merchant identity due diligence',
      defaultWorkflowId: 'wf_apex_standard',
      defaultVerificationProfileId: 'prof_apex_standard',
      sandboxWorkflowId: 'wf_apex_standard',
      productionWorkflowId: 'wf_apex_standard',
      integrationMethod: 'HOSTED_VERIFICATION',
      sdkVersion: 'v1.0.0',
      status: 'ACTIVE',
      environment: 'PRODUCTION',
      createdAt: '2025-02-15T11:00:00Z',
      updatedAt: '2025-02-15T11:00:00Z',
    },
  ];

  // ---------------------------------------------------------------------------
  // ORGANIZATION ONBOARDING APPLICATIONS & PRODUCTION APPROVAL PIPELINE
  // ---------------------------------------------------------------------------
  public onboardingApplications: OrganizationOnboardingApplication[] = [
    {
      id: 'app_apex_01',
      organizationId: 'org_apex_fin',
      legalBusinessName: 'Apex Finance Limited',
      tradingName: 'Apex Money',
      country: 'Kenya',
      businessType: 'LIMITED_COMPANY',
      industry: 'Digital Lending / Micro-finance',
      registrationNumber: 'PVT-2024-89102',
      website: 'https://apexfinance.co.ke',
      contactName: 'Edwin Nyamu',
      contactEmail: 'edwin.nyamu@apexfinance.co.ke',
      contactPhone: '+254712345678',
      intendedUseCase: 'Digital identity verification and automated KYC for mobile micro-lending app.',
      expectedMonthlyVolume: '10000_TO_50000',
      status: 'PRODUCTION_APPROVED',
      emailVerified: true,
      submittedAt: '2025-01-16T12:00:00Z',
      reviewedAt: '2025-01-20T10:00:00Z',
      reviewerId: 'staff_adm_01',
      reviewerName: 'Grace Muriithi (Lead Compliance Officer)',
      reviewNotes: 'Verified certificate of incorporation and CBK non-deposit taking microfinance license. Approved for live production integration.',
      createdAt: '2025-01-15T08:00:00Z',
      updatedAt: '2025-01-20T10:00:00Z',
    },
    {
      id: 'app_safari_01',
      organizationId: 'org_safari_pay',
      legalBusinessName: 'Safari Payments PLC',
      tradingName: 'SafariPay',
      country: 'Kenya',
      businessType: 'FINANCIAL_INSTITUTION',
      industry: 'Payment Service Provider',
      registrationNumber: 'CPR-2025-44912',
      website: 'https://safaripayments.com',
      contactName: 'Sarah Chebet',
      contactEmail: 'compliance@safaripayments.com',
      contactPhone: '+254722334455',
      intendedUseCase: 'Customer identity verification for cross-border remittances and merchant checkout.',
      expectedMonthlyVolume: '50000_PLUS',
      status: 'UNDER_REVIEW',
      emailVerified: true,
      submittedAt: '2026-11-05T14:30:00Z',
      reviewNotes: 'Application pending final sanction screening checklist review by security operations.',
      createdAt: '2025-03-20T10:30:00Z',
      updatedAt: '2026-11-05T14:30:00Z',
    },
  ];

  // ---------------------------------------------------------------------------
  // ORGANIZATION APPROVAL & STATUS HISTORY
  // ---------------------------------------------------------------------------
  public approvalHistory: OrganizationApprovalHistory[] = [
    {
      id: 'aph_apex_01',
      organizationId: 'org_apex_fin',
      previousStatus: 'EMAIL_VERIFICATION_REQUIRED',
      newStatus: 'SANDBOX_ACTIVE',
      changedBy: 'SYSTEM',
      changedByName: 'Automated Registration Gate',
      changedAt: '2025-01-15T08:05:00Z',
      reasonNotes: 'Business email confirmed via verification token. Granted instant sandbox environment access.',
    },
    {
      id: 'aph_apex_02',
      organizationId: 'org_apex_fin',
      previousStatus: 'SANDBOX_ACTIVE',
      newStatus: 'PRODUCTION_APPLICATION_SUBMITTED',
      changedBy: 'usr_owner_01',
      changedByName: 'Edwin Nyamu',
      changedAt: '2025-01-16T12:00:00Z',
      reasonNotes: 'Organization submitted corporate registration details and applied for live production access.',
    },
    {
      id: 'aph_apex_03',
      organizationId: 'org_apex_fin',
      previousStatus: 'UNDER_REVIEW',
      newStatus: 'PRODUCTION_APPROVED',
      changedBy: 'staff_adm_01',
      changedByName: 'Grace Muriithi',
      changedAt: '2025-01-20T10:00:00Z',
      reasonNotes: 'Corporate documents verified with Kenyan Registrar of Companies. Production API credentials unlocked.',
    },
  ];

  // ---------------------------------------------------------------------------
  // CORE RECORD TYPE A: Person (Organization-scoped ongoing identity record)
  // ---------------------------------------------------------------------------
  public people: Person[] = [
    {
      id: 'per_apex_01',
      organizationId: 'org_apex_fin',
      externalReferenceId: 'ACC-KE-849201',
      primaryName: 'David Mwangi Kariuki',
      dateOfBirth: '1992-04-14',
      nationalIdMasked: '2847****',
      nationalIdHash: 'subj_hash_8a2f91b7e411',
      phoneNumber: '+254712345678',
      email: 'david.m.kariuki.demo@example.com',
      status: 'VERIFIED',
      firstSeenAt: '2026-11-01T08:12:00Z',
      lastVerificationAt: '2026-11-07T14:30:00Z',
      verificationAttemptCount: 2, // 2 distinct attempts: sess_apex_101 & sess_apex_105
      resolutionPolicy: 'EXACT_HASH_MATCH_WITH_ORG_SCOPED_ID',
      createdAt: '2026-11-01T08:12:00Z',
    },
    {
      id: 'per_apex_02',
      organizationId: 'org_apex_fin',
      externalReferenceId: 'ACC-KE-849202',
      primaryName: 'Amina Fatuma Hassan',
      dateOfBirth: '1988-11-20',
      nationalIdMasked: '2491****',
      nationalIdHash: 'subj_hash_b471c2a99182',
      phoneNumber: '+254722987654',
      email: 'amina.hassan.demo@example.com',
      status: 'NEEDS_ATTENTION',
      firstSeenAt: '2026-11-02T10:15:00Z',
      lastVerificationAt: '2026-11-02T10:15:00Z',
      verificationAttemptCount: 1, // 1 attempt in review queue (low optical blur)
      resolutionPolicy: 'EXACT_HASH_MATCH_WITH_ORG_SCOPED_ID',
      createdAt: '2026-11-02T10:15:00Z',
    },
    {
      id: 'per_apex_03',
      organizationId: 'org_apex_fin',
      externalReferenceId: 'ACC-KE-849203',
      primaryName: 'Brian Kiprono Chebet',
      dateOfBirth: '1995-07-28',
      nationalIdMasked: '3109****',
      nationalIdHash: 'subj_hash_19ec0440ab81',
      phoneNumber: '+254733456789',
      email: 'brian.kiprono.demo@example.com',
      status: 'SUSPECTED_FRAUD',
      firstSeenAt: '2026-11-03T11:45:00Z',
      lastVerificationAt: '2026-11-03T11:45:00Z',
      verificationAttemptCount: 1, // 1 attempt rejected, triggered investigation case_apex_501
      resolutionPolicy: 'EXACT_HASH_MATCH_WITH_ORG_SCOPED_ID',
      createdAt: '2026-11-03T11:45:00Z',
    },
    {
      id: 'per_apex_04',
      organizationId: 'org_apex_fin',
      externalReferenceId: 'ACC-KE-849204',
      primaryName: 'Wanjiku Grace Karanja',
      dateOfBirth: '1998-03-02',
      nationalIdMasked: '3481****',
      nationalIdHash: 'subj_hash_fe39a82819c4',
      phoneNumber: '+254701234567',
      email: 'wanjiku.karanja.demo@example.com',
      status: 'UNVERIFIED',
      firstSeenAt: '2026-11-04T14:20:00Z',
      lastVerificationAt: '2026-11-04T14:20:00Z',
      verificationAttemptCount: 1, // 1 attempt processing
      resolutionPolicy: 'EXACT_HASH_MATCH_WITH_ORG_SCOPED_ID',
      createdAt: '2026-11-04T14:20:00Z',
    },
    // TENANT 2 (Safari Payments PLC) - Strictly Isolated Person Record
    {
      id: 'per_safari_01',
      organizationId: 'org_safari_pay',
      externalReferenceId: 'SAF-WALLET-9921',
      primaryName: 'David Mwangi Kariuki',
      dateOfBirth: '1992-04-14',
      nationalIdMasked: '2847****',
      nationalIdHash: 'subj_hash_8a2f91b7e411',
      phoneNumber: '+254712345678',
      email: 'david.kariuki.mobile@example.com',
      status: 'VERIFIED',
      firstSeenAt: '2026-11-05T09:30:00Z',
      lastVerificationAt: '2026-11-05T09:30:00Z',
      verificationAttemptCount: 1,
      resolutionPolicy: 'EXACT_HASH_MATCH_WITH_ORG_SCOPED_ID',
      createdAt: '2026-11-05T09:30:00Z',
    },
  ];

  // Backward-compatible accessor for existing components
  public get customers(): Person[] {
    return this.people;
  }

  // Workflows (Configurable, immutable versions)
  public workflows: Workflow[] = [
    {
      id: 'wf_apex_standard',
      organizationId: 'org_apex_fin',
      name: 'Kenya Standard Customer Due Diligence',
      version: 'v1.4',
      status: 'PUBLISHED',
      purpose: 'TIER_1_ACCOUNT_OPENING',
      countryScope: ['KE'],
      allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_PASSPORT'],
      description: 'Standard Tier 1 onboarding requiring Kenyan National ID, automated OCR consistency check, and liveness check.',
      isDefault: true,
      requirements: {
        requireDocument: true,
        allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_PASSPORT'],
        requireSelfie: true,
        requireLiveness: true,
        allowFileUploadFallback: false,
        autoApproveRiskScoreThreshold: 20,
      },
      steps: [
        { id: 'step_1', name: 'Collect Personal Information', type: 'COLLECT_INFORMATION', isRequired: true, failureBehavior: 'ABORT' },
        { id: 'step_2', name: 'Capture National ID / Passport', type: 'CAPTURE_DOCUMENT', isRequired: true, failureBehavior: 'REQUEST_RETRY' },
        { id: 'step_3', name: 'Optical Image Quality & Clarity', type: 'IMAGE_QUALITY_CHECK', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW', engineConfig: { minQualityBlur: 0.70, requireFourCorners: true } },
        { id: 'step_4', name: 'OCR Field Extraction & Regex Checks', type: 'OCR_EXTRACTION', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW' },
        { id: 'step_5', name: 'Forensic Document Substrate Analysis', type: 'CONSISTENCY_CHECK', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW' },
        { id: 'step_6', name: 'Biometric Passive & Active Liveness', type: 'LIVENESS_CHECK', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW' },
        { id: 'step_7', name: '1:1 Face Similarity Match', type: 'FACE_COMPARISON', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW', engineConfig: { minSimilarityScore: 0.85 } },
        { id: 'step_8', name: 'Authoritative IPRS Check', type: 'AUTHORITATIVE_CHECK', isRequired: false, failureBehavior: 'CONTINUE' },
      ],
      rules: [
        { id: 'rule_1', conditionName: 'Quality Blur Below 0.70', conditionExpression: 'image_quality.blur < 0.70', action: 'SEND_TO_REVIEW_QUEUE' },
        { id: 'rule_2', conditionName: 'Font or Substrate Alteration Detected', conditionExpression: 'forensics.tampering_detected == true', action: 'CREATE_INVESTIGATION_CASE', actionPayload: { priority: 'CRITICAL', caseType: 'DOCUMENT_TAMPERING_INVESTIGATION' } },
        { id: 'rule_3', conditionName: 'Liveness Spoof Detected', conditionExpression: 'biometrics.liveness_status == SPOOF_SUSPECTED', action: 'CREATE_INVESTIGATION_CASE', actionPayload: { priority: 'HIGH', caseType: 'BIOMETRIC_SPOOF_INSPECTION' } },
        { id: 'rule_4', conditionName: 'All Checks Clear & Low Risk', conditionExpression: 'overall_risk <= 20 AND checks_passed == true', action: 'COMPLETE_VERIFICATION' },
      ],
      createdAt: '2025-02-01T09:00:00Z',
      publishedAt: '2025-02-01T09:00:00Z',
    },
    {
      id: 'wf_apex_highrisk',
      organizationId: 'org_apex_fin',
      name: 'Enhanced High-Risk Merchant KYC',
      version: 'v2.1',
      status: 'PUBLISHED',
      purpose: 'MERCHANT_HIGH_VALUE_ONBOARDING',
      countryScope: ['KE'],
      allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_KRA_PIN'],
      description: 'Mandatory ID + KRA PIN certificate verification with dual-analyst manual review requirement.',
      isDefault: false,
      requirements: {
        requireDocument: true,
        allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_KRA_PIN'],
        requireSelfie: true,
        requireLiveness: true,
        allowFileUploadFallback: true,
        autoApproveRiskScoreThreshold: 0, // Never auto-approve
      },
      steps: [
        { id: 'step_hr_1', name: 'Collect Director Info', type: 'COLLECT_INFORMATION', isRequired: true, failureBehavior: 'ABORT' },
        { id: 'step_hr_2', name: 'National ID & KRA PIN Upload', type: 'CAPTURE_DOCUMENT', isRequired: true, failureBehavior: 'REQUEST_RETRY' },
        { id: 'step_hr_3', name: 'Forensic Quality & Tampering Check', type: 'IMAGE_QUALITY_CHECK', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW' },
        { id: 'step_hr_4', name: 'Biometric Face Match', type: 'FACE_COMPARISON', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW' },
      ],
      rules: [
        { id: 'rule_hr_1', conditionName: 'Mandatory Compliance Review', conditionExpression: 'always_true', action: 'SEND_TO_REVIEW_QUEUE' },
      ],
      createdAt: '2025-04-10T11:00:00Z',
      publishedAt: '2025-04-10T11:00:00Z',
    },
    {
      id: 'wf_safari_lite',
      organizationId: 'org_safari_pay',
      name: 'Fast Micro-Loan Quick ID Check',
      version: 'v1.0',
      status: 'PUBLISHED',
      purpose: 'LOW_LIMIT_TRANSACTIONS',
      countryScope: ['KE'],
      allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_ALIEN_ID'],
      description: 'Document-only verification for low-limit transactions.',
      isDefault: true,
      requirements: {
        requireDocument: true,
        allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_ALIEN_ID'],
        requireSelfie: false,
        requireLiveness: false,
        allowFileUploadFallback: true,
        autoApproveRiskScoreThreshold: 15,
      },
      steps: [
        { id: 'step_sf_1', name: 'Collect MSISDN & Name', type: 'COLLECT_INFORMATION', isRequired: true, failureBehavior: 'ABORT' },
        { id: 'step_sf_2', name: 'National ID Scan', type: 'CAPTURE_DOCUMENT', isRequired: true, failureBehavior: 'REQUEST_RETRY' },
      ],
      rules: [
        { id: 'rule_sf_1', conditionName: 'Low Risk Auto Approve', conditionExpression: 'overall_risk <= 15', action: 'COMPLETE_VERIFICATION' },
      ],
      createdAt: '2025-03-22T14:00:00Z',
      publishedAt: '2025-03-22T14:00:00Z',
    },
    {
      id: 'wf_apex_doc_only',
      organizationId: 'org_apex_fin',
      name: 'Document Verification Only Workflow',
      version: 'v1.0',
      status: 'PUBLISHED',
      purpose: 'DOCUMENT_ONLY',
      countryScope: ['KE'],
      allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_PASSPORT', 'KE_ALIEN_ID'],
      description: 'Document extraction, OCR, and optical quality verification without requiring selfie or biometric camera capture.',
      isDefault: false,
      requirements: {
        requireDocument: true,
        allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_PASSPORT', 'KE_ALIEN_ID'],
        requireSelfie: false,
        requireLiveness: false,
        allowFileUploadFallback: true,
        autoApproveRiskScoreThreshold: 20,
      },
      steps: [
        { id: 'step_do_1', name: 'Document Capture', type: 'CAPTURE_DOCUMENT', isRequired: true, failureBehavior: 'REQUEST_RETRY' },
        { id: 'step_do_2', name: 'Optical Image Quality & Clarity', type: 'IMAGE_QUALITY_CHECK', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW', engineConfig: { minQualityBlur: 0.70 } },
        { id: 'step_do_3', name: 'OCR Field Extraction & Review', type: 'OCR_EXTRACTION', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW' },
        { id: 'step_do_4', name: 'Document Forensic Checks', type: 'CONSISTENCY_CHECK', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW' },
      ],
      rules: [
        { id: 'rule_do_1', conditionName: 'Quality Blur Below 0.70', conditionExpression: 'image_quality.blur < 0.70', action: 'SEND_TO_REVIEW_QUEUE' },
        { id: 'rule_do_2', conditionName: 'Clean Document Extraction', conditionExpression: 'overall_risk <= 20', action: 'COMPLETE_VERIFICATION' },
      ],
      createdAt: '2025-02-10T10:00:00Z',
      publishedAt: '2025-02-10T10:00:00Z',
    },
    {
      id: 'wf_apex_bio_only',
      organizationId: 'org_apex_fin',
      name: 'Biometric Verification Only Workflow',
      version: 'v1.0',
      status: 'PUBLISHED',
      purpose: 'BIOMETRIC_ONLY',
      countryScope: ['KE'],
      allowedDocumentTypes: [],
      description: 'Active liveness challenge and selfie verification without document upload screens.',
      isDefault: false,
      requirements: {
        requireDocument: false,
        allowedDocumentTypes: [],
        requireSelfie: true,
        requireLiveness: true,
        allowFileUploadFallback: false,
        autoApproveRiskScoreThreshold: 15,
      },
      steps: [
        { id: 'step_bo_1', name: 'Biometric Consent & Selfie', type: 'CAPTURE_SELFIE', isRequired: true, failureBehavior: 'ABORT' },
        { id: 'step_bo_2', name: 'Active Liveness Verification', type: 'LIVENESS_CHECK', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW' },
      ],
      rules: [
        { id: 'rule_bo_1', conditionName: 'Liveness Passed', conditionExpression: 'biometrics.liveness_status == CHALLENGE_PASSED', action: 'COMPLETE_VERIFICATION' },
      ],
      createdAt: '2025-02-12T10:00:00Z',
      publishedAt: '2025-02-12T10:00:00Z',
    },
    {
      id: 'wf_apex_loan',
      organizationId: 'org_apex_fin',
      name: 'Digital Lending Instant Micro-KYC Workflow',
      version: 'v1.2',
      status: 'PUBLISHED',
      purpose: 'LOAN_APPLICANT_KYC',
      countryScope: ['KE'],
      allowedDocumentTypes: ['KE_NATIONAL_ID'],
      description: 'Fast optical OCR extraction and active selfie liveness optimized for under-2-second loan application approvals.',
      isDefault: false,
      requirements: {
        requireDocument: true,
        allowedDocumentTypes: ['KE_NATIONAL_ID'],
        requireSelfie: true,
        requireLiveness: true,
        allowFileUploadFallback: false,
        autoApproveRiskScoreThreshold: 20,
      },
      steps: [
        { id: 'step_ln_1', name: 'Kenyan National ID Scan', type: 'CAPTURE_DOCUMENT', isRequired: true, failureBehavior: 'REQUEST_RETRY' },
        { id: 'step_ln_2', name: 'Instant OCR Field Extraction', type: 'OCR_EXTRACTION', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW' },
        { id: 'step_ln_3', name: 'Active Selfie Liveness & 1:1 Match', type: 'LIVENESS_CHECK', isRequired: true, failureBehavior: 'FLAG_FOR_REVIEW' },
      ],
      rules: [
        { id: 'rule_ln_1', conditionName: 'Clean Loan Applicant Auto Approve', conditionExpression: 'overall_risk <= 20', action: 'COMPLETE_VERIFICATION' },
      ],
      createdAt: '2025-02-15T11:00:00Z',
      publishedAt: '2025-02-15T11:00:00Z',
    },
  ];

  // ---------------------------------------------------------------------------
  // VERIFICATION PROFILES (Declarative Verification Journey Configurations)
  // Defines what ICE must collect, check, and process for a company purpose.
  // ---------------------------------------------------------------------------
  public verificationProfiles: VerificationProfile[] = [
    {
      id: 'prof_apex_standard',
      organizationId: 'org_apex_fin',
      name: 'Full Customer KYC',
      slug: 'full-customer-kyc',
      description: 'Comprehensive end-to-end identity verification: front and back ID capture, OCR extraction with applicant confirmation, passive/active liveness, and 1:1 facial biometric matching.',
      verificationPurpose: 'FULL_CUSTOMER_KYC',
      countryScope: ['KE'],
      supportedLanguages: ['en', 'sw'],
      allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_PASSPORT'],
      documentCaptureRules: {
        KE_NATIONAL_ID: { documentType: 'KE_NATIONAL_ID', requiredSides: 'FRONT_AND_BACK', allowUploadFallback: false, minResolutionDpi: 300 },
        KE_PASSPORT: { documentType: 'KE_PASSPORT', requiredSides: 'PASSPORT_PAGE', allowUploadFallback: false, minResolutionDpi: 300 },
      },
      identityCollectionMode: 'EXTRACT_FROM_DOCUMENT',
      ocrEnabled: true,
      documentQualityChecks: {
        blurThreshold: 0.70,
        glareDetection: true,
        fourCornersDetection: true,
      },
      documentForensicChecks: {
        tamperingDetection: true,
        fontConsistency: true,
        layoutValidation: true,
      },
      selfieCaptureEnabled: true,
      livenessCheckEnabled: true,
      livenessMethod: 'ACTIVE_CHALLENGE',
      faceComparisonEnabled: true,
      faceMatchThreshold: 0.85,
      additionalChecks: {
        duplicateSubjectDetection: true,
        velocityCheck: true,
        sanctionsScreening: false,
        authoritativeGovCheck: false,
      },
      recaptureRules: {
        maxRecaptureAttempts: 3,
        allowManualReviewEscalation: true,
      },
      decisionPolicy: {
        autoApproveEnabled: true,
        autoApproveRiskScoreThreshold: 20,
        routeToReviewQueueOnQualityFail: true,
        routeToCaseOnTampering: true,
      },
      applicantInstructions: {
        welcomeTitle: 'Identity Verification Required',
        welcomeSubtitle: 'Please have your official Kenyan National ID or Passport ready. We will extract and verify your information securely.',
        documentCaptureHelp: 'Position the front of your document inside the frame. Ensure good lighting without glare.',
        selfieHelp: 'Hold your phone at eye level and follow the on-screen prompts.',
      },
      status: 'PUBLISHED',
      version: 'v1.4',
      workflowVersionId: 'wf_apex_standard',
      isDefault: true,
      environment: 'PRODUCTION',
      createdAt: '2025-02-01T09:00:00Z',
      publishedAt: '2025-02-01T09:00:00Z',
      changelogNotes: 'Published initial baseline Tier 1 CDD profile with 1:1 biometric matching.',
    },
    {
      id: 'prof_apex_doc_only',
      organizationId: 'org_apex_fin',
      name: 'Document Verification Only',
      slug: 'document-verification-only',
      description: 'Optical document inspection and OCR extraction without requiring selfie or biometric camera capture. Streamlined for merchant documents and low-friction onboarding.',
      verificationPurpose: 'DOCUMENT_ONLY',
      countryScope: ['KE'],
      supportedLanguages: ['en', 'sw'],
      allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_PASSPORT', 'KE_ALIEN_ID'],
      documentCaptureRules: {
        KE_NATIONAL_ID: { documentType: 'KE_NATIONAL_ID', requiredSides: 'FRONT_AND_BACK', allowUploadFallback: true },
        KE_PASSPORT: { documentType: 'KE_PASSPORT', requiredSides: 'PASSPORT_PAGE', allowUploadFallback: true },
        KE_ALIEN_ID: { documentType: 'KE_ALIEN_ID', requiredSides: 'FRONT_AND_BACK', allowUploadFallback: true },
      },
      identityCollectionMode: 'EXTRACT_FROM_DOCUMENT',
      ocrEnabled: true,
      documentQualityChecks: {
        blurThreshold: 0.70,
        glareDetection: true,
        fourCornersDetection: true,
      },
      documentForensicChecks: {
        tamperingDetection: true,
        fontConsistency: true,
        layoutValidation: true,
      },
      selfieCaptureEnabled: false,
      livenessCheckEnabled: false,
      livenessMethod: 'NONE',
      faceComparisonEnabled: false,
      faceMatchThreshold: 0.0,
      additionalChecks: {
        duplicateSubjectDetection: true,
        velocityCheck: true,
        sanctionsScreening: false,
        authoritativeGovCheck: false,
      },
      recaptureRules: {
        maxRecaptureAttempts: 3,
        allowManualReviewEscalation: true,
      },
      decisionPolicy: {
        autoApproveEnabled: true,
        autoApproveRiskScoreThreshold: 20,
        routeToReviewQueueOnQualityFail: true,
        routeToCaseOnTampering: true,
      },
      applicantInstructions: {
        welcomeTitle: 'Document Upload & Inspection',
        welcomeSubtitle: 'Upload or capture your government identity document. No selfie or biometric camera required.',
        documentCaptureHelp: 'Ensure all four corners are visible and details are readable.',
      },
      status: 'PUBLISHED',
      version: 'v1.0',
      workflowVersionId: 'wf_apex_doc_only',
      isDefault: false,
      environment: 'PRODUCTION',
      createdAt: '2025-02-10T10:00:00Z',
      publishedAt: '2025-02-10T10:00:00Z',
      changelogNotes: 'Initial production release for document-only verification.',
    },
    {
      id: 'prof_apex_bio_only',
      organizationId: 'org_apex_fin',
      name: 'Biometric Verification Only',
      slug: 'biometric-verification-only',
      description: 'Active liveness challenge and selfie verification without document upload screens. Ideal for step-up authentication and re-verification of existing customers.',
      verificationPurpose: 'BIOMETRIC_ONLY',
      countryScope: ['KE'],
      supportedLanguages: ['en', 'sw'],
      allowedDocumentTypes: [],
      documentCaptureRules: {},
      identityCollectionMode: 'MANUAL_ENTRY_FIRST',
      ocrEnabled: false,
      documentQualityChecks: {
        blurThreshold: 0,
        glareDetection: false,
        fourCornersDetection: false,
      },
      documentForensicChecks: {
        tamperingDetection: false,
        fontConsistency: false,
        layoutValidation: false,
      },
      selfieCaptureEnabled: true,
      livenessCheckEnabled: true,
      livenessMethod: 'ACTIVE_CHALLENGE',
      faceComparisonEnabled: false,
      faceMatchThreshold: 0.85,
      additionalChecks: {
        duplicateSubjectDetection: false,
        velocityCheck: true,
        sanctionsScreening: false,
        authoritativeGovCheck: false,
      },
      recaptureRules: {
        maxRecaptureAttempts: 3,
        allowManualReviewEscalation: true,
      },
      decisionPolicy: {
        autoApproveEnabled: true,
        autoApproveRiskScoreThreshold: 15,
        routeToReviewQueueOnQualityFail: false,
        routeToCaseOnTampering: false,
      },
      applicantInstructions: {
        welcomeTitle: 'Facial Liveness Verification',
        welcomeSubtitle: 'Confirm your identity using your device camera. Please follow the on-screen active challenge instructions.',
        selfieHelp: 'Ensure your face is well-lit and remove glasses or hats.',
      },
      status: 'PUBLISHED',
      version: 'v1.0',
      workflowVersionId: 'wf_apex_bio_only',
      isDefault: false,
      environment: 'PRODUCTION',
      createdAt: '2025-02-12T10:00:00Z',
      publishedAt: '2025-02-12T10:00:00Z',
      changelogNotes: 'Initial release for standalone biometric re-authentication.',
    },
    {
      id: 'prof_apex_loan',
      organizationId: 'org_apex_fin',
      name: 'Loan Applicant KYC',
      slug: 'loan-applicant-kyc',
      description: 'Streamlined, sub-2-second automated identity verification tailored for digital micro-lending and salary advance loan applications.',
      verificationPurpose: 'LOAN_APPLICANT_KYC',
      countryScope: ['KE'],
      supportedLanguages: ['en', 'sw'],
      allowedDocumentTypes: ['KE_NATIONAL_ID'],
      documentCaptureRules: {
        KE_NATIONAL_ID: { documentType: 'KE_NATIONAL_ID', requiredSides: 'FRONT_AND_BACK', allowUploadFallback: false, minResolutionDpi: 300 },
      },
      identityCollectionMode: 'EXTRACT_FROM_DOCUMENT',
      ocrEnabled: true,
      documentQualityChecks: {
        blurThreshold: 0.70,
        glareDetection: true,
        fourCornersDetection: true,
      },
      documentForensicChecks: {
        tamperingDetection: true,
        fontConsistency: true,
        layoutValidation: true,
      },
      selfieCaptureEnabled: true,
      livenessCheckEnabled: true,
      livenessMethod: 'ACTIVE_CHALLENGE',
      faceComparisonEnabled: true,
      faceMatchThreshold: 0.85,
      additionalChecks: {
        duplicateSubjectDetection: true,
        velocityCheck: true,
        sanctionsScreening: false,
        authoritativeGovCheck: false,
      },
      recaptureRules: {
        maxRecaptureAttempts: 2,
        allowManualReviewEscalation: true,
      },
      decisionPolicy: {
        autoApproveEnabled: true,
        autoApproveRiskScoreThreshold: 20,
        routeToReviewQueueOnQualityFail: true,
        routeToCaseOnTampering: true,
      },
      applicantInstructions: {
        welcomeTitle: 'Instant Loan Identity Verification',
        welcomeSubtitle: 'Verify your Kenyan National ID in seconds to complete your loan application.',
        documentCaptureHelp: 'Take clear photos of the front and back of your ID.',
        selfieHelp: 'Hold camera still and blink when prompted.',
      },
      status: 'PUBLISHED',
      version: 'v1.2',
      workflowVersionId: 'wf_apex_loan',
      isDefault: false,
      environment: 'PRODUCTION',
      createdAt: '2025-02-15T11:00:00Z',
      publishedAt: '2025-02-15T11:00:00Z',
      changelogNotes: 'Tuned automated thresholds for under-2-second straight-through loan verification.',
    },
    {
      id: 'prof_apex_draft',
      organizationId: 'org_apex_fin',
      name: 'High-Net-Worth Investor KYC (Draft)',
      slug: 'hnw-investor-kyc-draft',
      description: 'Draft configuration adding enhanced document checks and source of funds documentation. Available for preview and sandbox testing only.',
      verificationPurpose: 'ENHANCED_INVESTOR_CDD',
      countryScope: ['KE', 'UG', 'TZ'],
      supportedLanguages: ['en'],
      allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_PASSPORT'],
      documentCaptureRules: {
        KE_NATIONAL_ID: { documentType: 'KE_NATIONAL_ID', requiredSides: 'FRONT_AND_BACK', allowUploadFallback: false },
        KE_PASSPORT: { documentType: 'KE_PASSPORT', requiredSides: 'PASSPORT_PAGE', allowUploadFallback: false },
      },
      identityCollectionMode: 'EXTRACT_FROM_DOCUMENT',
      ocrEnabled: true,
      documentQualityChecks: {
        blurThreshold: 0.75,
        glareDetection: true,
        fourCornersDetection: true,
      },
      documentForensicChecks: {
        tamperingDetection: true,
        fontConsistency: true,
        layoutValidation: true,
      },
      selfieCaptureEnabled: true,
      livenessCheckEnabled: true,
      livenessMethod: 'ACTIVE_CHALLENGE',
      faceComparisonEnabled: true,
      faceMatchThreshold: 0.90,
      additionalChecks: {
        duplicateSubjectDetection: true,
        velocityCheck: true,
        sanctionsScreening: true,
        authoritativeGovCheck: false,
      },
      recaptureRules: {
        maxRecaptureAttempts: 2,
        allowManualReviewEscalation: true,
      },
      decisionPolicy: {
        autoApproveEnabled: false, // Always requires human compliance signoff
        autoApproveRiskScoreThreshold: 0,
        routeToReviewQueueOnQualityFail: true,
        routeToCaseOnTampering: true,
      },
      status: 'DRAFT',
      version: 'v2.0-draft',
      workflowVersionId: 'wf_apex_highrisk',
      isDefault: false,
      environment: 'SANDBOX',
      createdAt: '2026-11-08T14:00:00Z',
      updatedAt: '2026-11-08T14:00:00Z',
      changelogNotes: 'Draft version experimenting with 0.90 face threshold and manual review requirement.',
    },
    {
      id: 'prof_safari_standard',
      organizationId: 'org_safari_pay',
      name: 'Safari Remittance Standard KYC',
      slug: 'safari-remittance-standard',
      description: 'Fast customer identification for mobile cross-border remittance checkouts.',
      verificationPurpose: 'REMITTANCE_CDD',
      countryScope: ['KE'],
      supportedLanguages: ['en', 'sw'],
      allowedDocumentTypes: ['KE_NATIONAL_ID', 'KE_ALIEN_ID'],
      documentCaptureRules: {
        KE_NATIONAL_ID: { documentType: 'KE_NATIONAL_ID', requiredSides: 'FRONT_AND_BACK', allowUploadFallback: true },
        KE_ALIEN_ID: { documentType: 'KE_ALIEN_ID', requiredSides: 'FRONT_AND_BACK', allowUploadFallback: true },
      },
      identityCollectionMode: 'EXTRACT_FROM_DOCUMENT',
      ocrEnabled: true,
      documentQualityChecks: {
        blurThreshold: 0.70,
        glareDetection: true,
        fourCornersDetection: true,
      },
      documentForensicChecks: {
        tamperingDetection: true,
        fontConsistency: true,
        layoutValidation: true,
      },
      selfieCaptureEnabled: false,
      livenessCheckEnabled: false,
      livenessMethod: 'NONE',
      faceComparisonEnabled: false,
      faceMatchThreshold: 0,
      additionalChecks: {
        duplicateSubjectDetection: true,
        velocityCheck: true,
        sanctionsScreening: false,
        authoritativeGovCheck: false,
      },
      recaptureRules: {
        maxRecaptureAttempts: 3,
        allowManualReviewEscalation: true,
      },
      decisionPolicy: {
        autoApproveEnabled: true,
        autoApproveRiskScoreThreshold: 15,
        routeToReviewQueueOnQualityFail: true,
        routeToCaseOnTampering: true,
      },
      status: 'PUBLISHED',
      version: 'v1.0',
      workflowVersionId: 'wf_safari_lite',
      isDefault: true,
      environment: 'SANDBOX',
      createdAt: '2025-03-22T14:00:00Z',
      publishedAt: '2025-03-22T14:00:00Z',
      changelogNotes: 'Initial sandbox profile for Safari Payments.',
    },
  ];

  // Profile Version History snapshots
  public profileVersionHistory: ProfileVersionHistory[] = [
    {
      id: 'pvh_apex_std_1',
      profileId: 'prof_apex_standard',
      organizationId: 'org_apex_fin',
      version: 'v1.0',
      publishedAt: '2025-01-20T10:00:00Z',
      publishedBy: 'usr_owner_01',
      changelogNotes: 'Initial v1.0 release with manual form entry.',
      snapshot: null as any,
    },
    {
      id: 'pvh_apex_std_2',
      profileId: 'prof_apex_standard',
      organizationId: 'org_apex_fin',
      version: 'v1.4',
      publishedAt: '2025-02-01T09:00:00Z',
      publishedBy: 'usr_owner_01',
      changelogNotes: 'Updated to Extract-from-Document mode to minimize applicant typing, added active liveness.',
      snapshot: null as any,
    },
  ];

  // ---------------------------------------------------------------------------
  // CORE RECORD TYPE B: Verification Sessions (Unique verification attempts)
  // ---------------------------------------------------------------------------
  public sessions: VerificationSession[] = [
    // ATTEMPT 1 FOR DAVID MWANGI KARIUKI (Initial Tier 1 CDD)
    {
      id: 'sess_apex_101',
      organizationId: 'org_apex_fin',
      personId: 'per_apex_01',
      customerId: 'per_apex_01',
      externalReferenceId: 'ACC-KE-849201',
      verificationPurpose: 'TIER_1_KYC_ACCOUNT_OPENING',
      workflowId: 'wf_apex_standard',
      workflowVersion: 'v1.4',
      status: 'VERIFIED',
      overallRiskScore: 8,
      authoritativeCheckStatus: 'NOT_PERFORMED',
      authoritativeCheckSource: 'National Population Register (IPRS) - NOT CONNECTED',
      submittedData: {
        fullName: 'David Mwangi Kariuki',
        dob: '1992-04-14',
        nationalIdNumber: '28471920',
        nationality: 'Kenyan',
        phoneNumber: '+254712345678',
        email: 'david.m.kariuki.demo@example.com',
      },
      documents: [
        {
          id: 'doc_apex_d1',
          organizationId: 'org_apex_fin',
          sessionId: 'sess_apex_101',
          documentType: 'KE_NATIONAL_ID',
          side: 'FRONT',
          fileName: 'synthetic_ke_id_front_dmwangi.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 421000,
          sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          storageRef: 'tenants/org_apex_fin/sessions/sess_apex_101/documents/synthetic_ke_id_front.enc',
          uploadedAt: '2026-11-01T08:14:20Z',
          visualTamperingDetected: false,
          tamperingConfidence: 0.03,
          quality: {
            glareDetected: false,
            blurScore: 0.95,
            resolutionDpi: 300,
            fourCornersDetected: true,
            passedQualityChecks: true,
            feedbackMessages: ['All 4 corners detected', 'Optimal contrast', 'Text crisp'],
          },
          extractedFields: [
            { fieldName: 'document_number', label: 'ID Number', value: '28471920', confidenceScore: 0.99, validationStatus: 'VALID' },
            { fieldName: 'full_name', label: 'Full Name', value: 'DAVID MWANGI KARIUKI', confidenceScore: 0.97, validationStatus: 'VALID' },
            { fieldName: 'date_of_birth', label: 'Date of Birth', value: '1992-04-14', confidenceScore: 0.98, validationStatus: 'VALID' },
            { fieldName: 'district_of_birth', label: 'District', value: 'KIAMBU', confidenceScore: 0.92, validationStatus: 'VALID' },
            { fieldName: 'serial_number', label: 'Serial Number', value: '219485721', confidenceScore: 0.91, validationStatus: 'VALID' },
          ],
        },
        {
          id: 'doc_apex_d2',
          organizationId: 'org_apex_fin',
          sessionId: 'sess_apex_101',
          documentType: 'KE_NATIONAL_ID',
          side: 'BACK',
          fileName: 'synthetic_ke_id_back_dmwangi.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 388000,
          sha256Checksum: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
          storageRef: 'tenants/org_apex_fin/sessions/sess_apex_101/documents/synthetic_ke_id_back.enc',
          uploadedAt: '2026-11-01T08:14:45Z',
          visualTamperingDetected: false,
          tamperingConfidence: 0.02,
          quality: {
            glareDetected: false,
            blurScore: 0.93,
            resolutionDpi: 300,
            fourCornersDetected: true,
            passedQualityChecks: true,
            feedbackMessages: ['Barcode intact', 'No laminate peeling'],
          },
          extractedFields: [
            { fieldName: 'fingerprint_zone', label: 'Biometric Zone', value: 'PRESENT', confidenceScore: 0.95, validationStatus: 'VALID' },
          ],
        },
      ],
      biometrics: {
        id: 'bio_apex_101',
        organizationId: 'org_apex_fin',
        sessionId: 'sess_apex_101',
        consentRecorded: true,
        consentTimestamp: '2026-11-01T08:13:00Z',
        selfieStorageRef: 'tenants/org_apex_fin/sessions/sess_apex_101/biometrics/selfie.enc',
        livenessStatus: 'CHALLENGE_PASSED',
        livenessConfidence: 0.94,
        faceComparisonStatus: 'MATCH_CONFIRMED',
        faceSimilarityScore: 0.92,
        thresholdUsed: 0.85,
        engineVersion: 'ICE-BioNet-v1.4 (Demo Sandbox)',
        reviewerEscalated: false,
        notes: 'Simulated 1:1 face match passed threshold. Active liveness verified.',
      },
      riskIndicators: [],
      reviewerActions: [
        {
          id: 'act_1',
          reviewerId: 'usr_sarah',
          reviewerName: 'Sarah Kimani (KYC Reviewer)',
          action: 'APPROVED',
          reasonCode: 'LOW_RISK_DOCUMENT_CONSISTENT',
          notes: 'OCR matches submitted personal details. Image quality is sharp. No forensic anomalies.',
          timestamp: '2026-11-01T08:25:00Z',
        },
      ],
      finalDecision: {
        status: 'VERIFIED',
        decidedBy: 'HUMAN_REVIEWER',
        reason: 'Low risk score (8/100). Valid Kenyan ID and biometric comparison.',
        timestamp: '2026-11-01T08:25:00Z',
      },
      createdAt: '2026-11-01T08:12:00Z',
      completedAt: '2026-11-01T08:25:00Z',
      expiresAt: '2026-11-08T08:12:00Z',
      isSyntheticDemo: true,
    },

    // ATTEMPT 2 FOR DAVID MWANGI KARIUKI (Demonstrates: One Person has Multiple Verification Attempts over time)
    {
      id: 'sess_apex_105',
      organizationId: 'org_apex_fin',
      personId: 'per_apex_01',
      customerId: 'per_apex_01',
      externalReferenceId: 'ACC-KE-849201',
      verificationPurpose: 'TIER_2_LIMIT_INCREASE_REVERIFICATION',
      workflowId: 'wf_apex_standard',
      workflowVersion: 'v1.4',
      status: 'VERIFIED',
      overallRiskScore: 5,
      authoritativeCheckStatus: 'NOT_PERFORMED',
      authoritativeCheckSource: 'National Population Register (IPRS) - NOT CONNECTED',
      submittedData: {
        fullName: 'David Mwangi Kariuki',
        dob: '1992-04-14',
        nationalIdNumber: '28471920',
        nationality: 'Kenyan',
        phoneNumber: '+254712345678',
        email: 'david.m.kariuki.demo@example.com',
      },
      documents: [
        {
          id: 'doc_apex_d10',
          organizationId: 'org_apex_fin',
          sessionId: 'sess_apex_105',
          documentType: 'KE_PASSPORT',
          side: 'SINGLE',
          fileName: 'synthetic_ke_passport_dmwangi.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 480000,
          sha256Checksum: '556677889900aabbccddeeff0011223344556677889900aabbccddeeff001122',
          storageRef: 'tenants/org_apex_fin/sessions/sess_apex_105/documents/passport.enc',
          uploadedAt: '2026-11-07T14:32:00Z',
          visualTamperingDetected: false,
          tamperingConfidence: 0.01,
          quality: {
            glareDetected: false,
            blurScore: 0.97,
            resolutionDpi: 300,
            fourCornersDetected: true,
            passedQualityChecks: true,
            feedbackMessages: ['Passport MRZ checksum valid'],
          },
          extractedFields: [
            { fieldName: 'passport_number', label: 'Passport No', value: 'AK081920', confidenceScore: 0.99, validationStatus: 'VALID' },
            { fieldName: 'full_name', label: 'Full Name', value: 'DAVID MWANGI KARIUKI', confidenceScore: 0.98, validationStatus: 'VALID' },
          ],
        },
      ],
      biometrics: {
        id: 'bio_apex_105',
        organizationId: 'org_apex_fin',
        sessionId: 'sess_apex_105',
        consentRecorded: true,
        consentTimestamp: '2026-11-07T14:31:00Z',
        livenessStatus: 'CHALLENGE_PASSED',
        livenessConfidence: 0.96,
        faceComparisonStatus: 'MATCH_CONFIRMED',
        faceSimilarityScore: 0.94,
        thresholdUsed: 0.85,
        engineVersion: 'ICE-BioNet-v1.4',
        reviewerEscalated: false,
      },
      riskIndicators: [],
      reviewerActions: [],
      finalDecision: {
        status: 'VERIFIED',
        decidedBy: 'AUTOMATED_WORKFLOW',
        reason: 'Auto-approved by policy. Valid Passport and biometric match score 0.94.',
        timestamp: '2026-11-07T14:34:00Z',
      },
      createdAt: '2026-11-07T14:30:00Z',
      completedAt: '2026-11-07T14:34:00Z',
      expiresAt: '2026-11-14T14:30:00Z',
      isSyntheticDemo: true,
    },

    // ATTEMPT FOR AMINA FATUMA HASSAN (Needs review due to optical blur 0.52 < 0.70; in Review Queue, NO Case!)
    {
      id: 'sess_apex_102',
      organizationId: 'org_apex_fin',
      personId: 'per_apex_02',
      customerId: 'per_apex_02',
      externalReferenceId: 'ACC-KE-849202',
      verificationPurpose: 'TIER_1_KYC_ACCOUNT_OPENING',
      workflowId: 'wf_apex_standard',
      workflowVersion: 'v1.4',
      status: 'NEEDS_REVIEW',
      overallRiskScore: 62,
      authoritativeCheckStatus: 'NOT_PERFORMED',
      authoritativeCheckSource: 'Not Configured',
      submittedData: {
        fullName: 'Amina Fatuma Hassan',
        dob: '1988-11-20',
        nationalIdNumber: '24918204',
        nationality: 'Kenyan',
        phoneNumber: '+254722987654',
        email: 'amina.hassan.demo@example.com',
      },
      documents: [
        {
          id: 'doc_apex_d3',
          organizationId: 'org_apex_fin',
          sessionId: 'sess_apex_102',
          documentType: 'KE_NATIONAL_ID',
          side: 'FRONT',
          fileName: 'synthetic_ke_id_front_blurry.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 180000,
          sha256Checksum: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
          storageRef: 'tenants/org_apex_fin/sessions/sess_apex_102/documents/synthetic_ke_id_front_blurry.enc',
          uploadedAt: '2026-11-02T10:18:00Z',
          visualTamperingDetected: false,
          tamperingConfidence: 0.12,
          quality: {
            glareDetected: false,
            blurScore: 0.52, // Below 0.70 threshold -> Review Queue
            resolutionDpi: 180,
            fourCornersDetected: true,
            passedQualityChecks: false,
            feedbackMessages: ['Blur detected on date of birth field', 'Resolution is below 200 DPI recommendation'],
          },
          extractedFields: [
            { fieldName: 'document_number', label: 'ID Number', value: '24918204', confidenceScore: 0.88, validationStatus: 'VALID' },
            { fieldName: 'full_name', label: 'Full Name', value: 'AMINA FATUMA HASSAN', confidenceScore: 0.84, validationStatus: 'VALID' },
            { fieldName: 'date_of_birth', label: 'Date of Birth', value: '1988-11-20', confidenceScore: 0.65, validationStatus: 'SUSPICIOUS', notes: 'Low optical clarity' },
          ],
        },
      ],
      biometrics: {
        id: 'bio_apex_102',
        organizationId: 'org_apex_fin',
        sessionId: 'sess_apex_102',
        consentRecorded: true,
        consentTimestamp: '2026-11-02T10:16:00Z',
        livenessStatus: 'CHALLENGE_PASSED',
        faceComparisonStatus: 'INCONCLUSIVE',
        faceSimilarityScore: 0.76, // Below 0.85 threshold
        thresholdUsed: 0.85,
        engineVersion: 'ICE-BioNet-v1.4 (Demo Sandbox)',
        reviewerEscalated: false,
        notes: 'Document ID portrait resolution degraded. Similarity score 0.76 fell short of 0.85 threshold. Queued for standard human review.',
      },
      riskIndicators: [
        {
          id: 'risk_102_1',
          sessionId: 'sess_apex_102',
          signalType: 'LOW_IMAGE_QUALITY',
          severity: 'MEDIUM',
          title: 'Document Image Quality Degraded',
          description: 'Blur score 0.52 fell below the 0.70 quality threshold. Date of birth text has low OCR confidence.',
          evidenceReference: 'Field: date_of_birth (OCR confidence: 65%)',
          timestamp: '2026-11-02T10:19:00Z',
          engineVersion: 'ICE-DocVision-v2.4',
        },
      ],
      reviewerActions: [],
      createdAt: '2026-11-02T10:15:00Z',
      expiresAt: '2026-11-09T10:15:00Z',
      isSyntheticDemo: true,
    },

    // ATTEMPT FOR BRIAN KIPRONO CHEBET (Rejected due to digital tampering; Triggered Case CASE-2026-0041!)
    {
      id: 'sess_apex_103',
      organizationId: 'org_apex_fin',
      personId: 'per_apex_03',
      customerId: 'per_apex_03',
      externalReferenceId: 'ACC-KE-849203',
      verificationPurpose: 'TIER_1_KYC_ACCOUNT_OPENING',
      workflowId: 'wf_apex_standard',
      workflowVersion: 'v1.4',
      status: 'REJECTED',
      overallRiskScore: 88,
      authoritativeCheckStatus: 'NOT_PERFORMED',
      submittedData: {
        fullName: 'Brian Kiprono Chebet',
        dob: '1995-07-28',
        nationalIdNumber: '31094819',
        nationality: 'Kenyan',
        phoneNumber: '+254733456789',
        email: 'brian.kiprono.demo@example.com',
      },
      documents: [
        {
          id: 'doc_apex_d4',
          organizationId: 'org_apex_fin',
          sessionId: 'sess_apex_103',
          documentType: 'KE_NATIONAL_ID',
          side: 'FRONT',
          fileName: 'synthetic_ke_id_altered.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 410000,
          sha256Checksum: 'a3e8b091f82c49a1d2e947c92bfa04812394a12394c8b2e3f4a5b6c7d8e9f0a1',
          storageRef: 'tenants/org_apex_fin/sessions/sess_apex_103/documents/synthetic_altered.enc',
          uploadedAt: '2026-11-03T11:48:00Z',
          visualTamperingDetected: true,
          tamperingConfidence: 0.89,
          quality: {
            glareDetected: false,
            blurScore: 0.88,
            resolutionDpi: 300,
            fourCornersDetected: true,
            passedQualityChecks: false,
            feedbackMessages: ['Font kerning anomaly detected in date of birth zone'],
          },
          extractedFields: [
            { fieldName: 'document_number', label: 'ID Number', value: '31094819', confidenceScore: 0.91, validationStatus: 'VALID' },
            { fieldName: 'full_name', label: 'Full Name', value: 'BRIAN KIPRONO CHEBET', confidenceScore: 0.90, validationStatus: 'VALID' },
            { fieldName: 'date_of_birth', label: 'Date of Birth', value: '1990-07-28', confidenceScore: 0.82, validationStatus: 'FORMAT_MISMATCH', notes: 'Altered font face detected' },
          ],
        },
      ],
      biometrics: {
        id: 'bio_apex_103',
        organizationId: 'org_apex_fin',
        sessionId: 'sess_apex_103',
        consentRecorded: true,
        consentTimestamp: '2026-11-03T11:46:00Z',
        livenessStatus: 'SPOOF_SUSPECTED',
        faceComparisonStatus: 'NO_MATCH',
        faceSimilarityScore: 0.38,
        thresholdUsed: 0.85,
        engineVersion: 'ICE-BioNet-v1.4 (Demo Sandbox)',
        reviewerEscalated: true,
        notes: 'Presentation attack detected (screen replay detected during head rotation challenge). Facial comparison similarity 0.38.',
      },
      riskIndicators: [
        {
          id: 'risk_103_1',
          sessionId: 'sess_apex_103',
          signalType: 'SUSPECTED_FONT_TAMPERING',
          severity: 'CRITICAL',
          title: 'Document Substrate Alteration Detected',
          description: 'Digital tampering detected around date of birth field. Stated DOB (1995-07-28) conflicts with original printed raster (1990-07-28).',
          evidenceReference: 'Region: DOB coordinate box [x:140, y:280, w:110, h:32]',
          timestamp: '2026-11-03T11:49:00Z',
          engineVersion: 'ICE-DocVision-v2.4',
        },
        {
          id: 'risk_103_2',
          sessionId: 'sess_apex_103',
          signalType: 'DUPLICATE_DOCUMENT_HASH',
          severity: 'CRITICAL',
          title: 'Exact File Hash In Known Tampered Document Registry',
          description: 'Uploaded image file hash SHA-256 matched a previously flagged fraudulent artifact.',
          evidenceReference: 'SHA-256: a3e8b091f82c49a1...',
          timestamp: '2026-11-03T11:49:02Z',
          engineVersion: 'ICE-RiskEngine-v1.8',
        },
      ],
      reviewerActions: [
        {
          id: 'act_103_1',
          reviewerId: 'usr_james',
          reviewerName: 'James Kariuki (Fraud Analyst)',
          action: 'REJECTED',
          reasonCode: 'SUSPECTED_FRAUD_ALTERED_DOCUMENT',
          notes: 'Confirmed digital alteration of date of birth field. Biometric liveness challenge failed with screen replay flags.',
          timestamp: '2026-11-03T12:05:00Z',
        },
      ],
      finalDecision: {
        status: 'REJECTED',
        decidedBy: 'HUMAN_REVIEWER',
        reason: 'Severe forensic tampering detected on submitted Kenyan ID. Presentation attack confirmed.',
        timestamp: '2026-11-03T12:05:00Z',
      },
      createdAt: '2026-11-03T11:45:00Z',
      completedAt: '2026-11-03T12:05:00Z',
      expiresAt: '2026-11-10T11:45:00Z',
      isSyntheticDemo: true,
    },

    // ATTEMPT FOR WANJIKU GRACE KARANJA (In Progress)
    {
      id: 'sess_apex_104',
      organizationId: 'org_apex_fin',
      personId: 'per_apex_04',
      customerId: 'per_apex_04',
      externalReferenceId: 'ACC-KE-849204',
      verificationPurpose: 'TIER_1_KYC_ACCOUNT_OPENING',
      workflowId: 'wf_apex_standard',
      workflowVersion: 'v1.4',
      status: 'PROCESSING',
      overallRiskScore: 12,
      authoritativeCheckStatus: 'NOT_PERFORMED',
      submittedData: {
        fullName: 'Wanjiku Grace Karanja',
        dob: '1998-03-02',
        nationalIdNumber: '34819273',
        nationality: 'Kenyan',
        phoneNumber: '+254701234567',
        email: 'wanjiku.karanja.demo@example.com',
      },
      documents: [
        {
          id: 'doc_apex_d5',
          organizationId: 'org_apex_fin',
          sessionId: 'sess_apex_104',
          documentType: 'KE_PASSPORT',
          side: 'SINGLE',
          fileName: 'synthetic_ke_passport_wkaranja.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 512000,
          sha256Checksum: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
          storageRef: 'tenants/org_apex_fin/sessions/sess_apex_104/documents/passport.enc',
          uploadedAt: '2026-11-04T14:22:00Z',
          visualTamperingDetected: false,
          tamperingConfidence: 0.01,
          quality: {
            glareDetected: false,
            blurScore: 0.96,
            resolutionDpi: 300,
            fourCornersDetected: true,
            passedQualityChecks: true,
            feedbackMessages: ['Passport MRZ checksum valid', 'No glare detected'],
          },
          extractedFields: [
            { fieldName: 'passport_number', label: 'Passport No', value: 'AK091823', confidenceScore: 0.99, validationStatus: 'VALID' },
            { fieldName: 'full_name', label: 'Full Name', value: 'WANJIKU GRACE KARANJA', confidenceScore: 0.98, validationStatus: 'VALID' },
          ],
        },
      ],
      biometrics: {
        id: 'bio_apex_104',
        organizationId: 'org_apex_fin',
        sessionId: 'sess_apex_104',
        consentRecorded: true,
        consentTimestamp: '2026-11-04T14:21:00Z',
        livenessStatus: 'CHALLENGE_PASSED',
        faceComparisonStatus: 'NOT_PERFORMED',
        thresholdUsed: 0.85,
        engineVersion: 'ICE-BioNet-v1.4',
        reviewerEscalated: false,
        notes: 'Awaiting background 1:1 facial comparison job execution.',
      },
      riskIndicators: [],
      reviewerActions: [],
      createdAt: '2026-11-04T14:20:00Z',
      expiresAt: '2026-11-11T14:20:00Z',
      isSyntheticDemo: true,
    },

    // TENANT 2 (Safari Payments PLC) - Strictly Isolated Session
    {
      id: 'sess_safari_201',
      organizationId: 'org_safari_pay',
      personId: 'per_safari_01',
      customerId: 'per_safari_01',
      externalReferenceId: 'SAF-WALLET-9921',
      verificationPurpose: 'MICRO_LOAN_DISBURSEMENT_CHECK',
      workflowId: 'wf_safari_lite',
      workflowVersion: 'v1.0',
      status: 'VERIFIED',
      overallRiskScore: 10,
      authoritativeCheckStatus: 'NOT_PERFORMED',
      submittedData: {
        fullName: 'David Mwangi Kariuki',
        dob: '1992-04-14',
        nationalIdNumber: '28471920',
        nationality: 'Kenyan',
        phoneNumber: '+254712345678',
        email: 'david.kariuki.mobile@example.com',
      },
      documents: [
        {
          id: 'doc_safari_d1',
          organizationId: 'org_safari_pay',
          sessionId: 'sess_safari_201',
          documentType: 'KE_NATIONAL_ID',
          side: 'FRONT',
          fileName: 'synthetic_safari_upload_dmwangi.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 440000,
          sha256Checksum: '99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa',
          storageRef: 'tenants/org_safari_pay/sessions/sess_safari_201/documents/doc.enc',
          uploadedAt: '2026-11-05T09:32:00Z',
          visualTamperingDetected: false,
          tamperingConfidence: 0.02,
          quality: {
            glareDetected: false,
            blurScore: 0.94,
            resolutionDpi: 300,
            fourCornersDetected: true,
            passedQualityChecks: true,
            feedbackMessages: ['Passed mobile scan checks'],
          },
          extractedFields: [
            { fieldName: 'document_number', label: 'ID Number', value: '28471920', confidenceScore: 0.98, validationStatus: 'VALID' },
          ],
        },
      ],
      riskIndicators: [],
      reviewerActions: [],
      finalDecision: {
        status: 'VERIFIED',
        decidedBy: 'AUTOMATED_WORKFLOW',
        reason: 'Auto-approved by policy. Low risk score (10/100) below threshold of 15.',
        timestamp: '2026-11-05T09:35:00Z',
      },
      createdAt: '2026-11-05T09:30:00Z',
      completedAt: '2026-11-05T09:35:00Z',
      expiresAt: '2026-11-12T09:30:00Z',
      isSyntheticDemo: true,
    },
  ];

  // ---------------------------------------------------------------------------
  // CORE RECORD TYPE C: Cases (Formal Investigations requiring human attention)
  // RULE: Cases are created ONLY when a workflow rule or human reviewer triggers one.
  // Successful or standard reviews do NOT automatically become cases.
  // ---------------------------------------------------------------------------
  public investigationCases: InvestigationCase[] = [
    {
      id: 'case_apex_501',
      organizationId: 'org_apex_fin',
      caseNumber: 'CASE-2026-0041',
      verificationId: 'sess_apex_103',
      personId: 'per_apex_03',
      caseType: 'DOCUMENT_TAMPERING_INVESTIGATION',
      reasonForOpening: 'Workflow Rule [CRIT_RULE_TAMPER] triggered: Digital font alteration detected on DOB substrate and screen replay spoofing flagged.',
      openedBy: 'AUTOMATED_WORKFLOW_RULE',
      priority: 'CRITICAL',
      assignedReviewerId: 'usr_james',
      assignedReviewerName: 'James Kariuki (Fraud Analyst)',
      status: 'IN_INVESTIGATION',
      slaTargetMinutes: 120, // 2 Hours per Organization Critical Risk Policy (not arbitrary 30-min timer)
      notes: [
        {
          id: 'note_1',
          authorId: 'sys_workflow',
          authorName: 'Workflow Engine (v1.4)',
          text: 'Auto-opened formal case after high-confidence tampering detected (tampering_confidence: 0.89). Cross-referenced SHA-256 hash in compromised artifact registry.',
          createdAt: '2026-11-03T11:49:10Z',
        },
        {
          id: 'note_2',
          authorId: 'usr_james',
          authorName: 'James Kariuki (Fraud Analyst)',
          text: 'Inspecting coordinate box [x:140, y:280]. Font kerning on date "1995" does not align with Kenyan National Registration Bureau standard Helvetica Neue substrate printing. Escalating to Senior Risk Pool.',
          createdAt: '2026-11-03T12:00:00Z',
        },
      ],
      evidenceReferences: [
        'Document ID: doc_apex_d4 (synthetic_ke_id_altered.jpg)',
        'Biometric Session ID: bio_apex_103 (liveness: SPOOF_SUSPECTED)',
        'Known Tampered File SHA-256: a3e8b091f82c49a1d2e947c92bfa...',
      ],
      actionHistory: [
        {
          id: 'cact_1',
          action: 'CASE_OPENED',
          actor: 'Workflow Engine Rule: rule_2',
          timestamp: '2026-11-03T11:49:10Z',
          details: 'Priority set to CRITICAL based on severe forensic tampering flag.',
        },
        {
          id: 'cact_2',
          action: 'ASSIGNED_TO_REVIEWER',
          actor: 'System Router',
          timestamp: '2026-11-03T11:50:00Z',
          details: 'Assigned to James Kariuki based on Tier 2 Fraud Specialization.',
        },
        {
          id: 'cact_3',
          action: 'NOTE_ADDED',
          actor: 'James Kariuki',
          timestamp: '2026-11-03T12:00:00Z',
          details: 'Added optical forensic inspection notes.',
        },
      ],
      createdAt: '2026-11-03T11:49:10Z',
      updatedAt: '2026-11-03T12:00:00Z',
    },
  ];

  // ---------------------------------------------------------------------------
  // WORKFLOW EXECUTION RECORDS (Immutable step-by-step logs)
  // ---------------------------------------------------------------------------
  public workflowExecutions: WorkflowExecutionRecord[] = [
    // Execution for sess_apex_101
    { id: 'exec_101_1', verificationId: 'sess_apex_101', workflowId: 'wf_apex_standard', workflowVersion: 'v1.4', stepId: 'step_1', stepName: 'Collect Personal Information', startedAt: '2026-11-01T08:12:00Z', completedAt: '2026-11-01T08:12:10Z', status: 'PASSED', actionTaken: 'Input captured' },
    { id: 'exec_101_2', verificationId: 'sess_apex_101', workflowId: 'wf_apex_standard', workflowVersion: 'v1.4', stepId: 'step_2', stepName: 'Capture National ID / Passport', startedAt: '2026-11-01T08:14:00Z', completedAt: '2026-11-01T08:14:45Z', status: 'PASSED', outputReference: 'doc_apex_d1, doc_apex_d2' },
    { id: 'exec_101_3', verificationId: 'sess_apex_101', workflowId: 'wf_apex_standard', workflowVersion: 'v1.4', stepId: 'step_3', stepName: 'Optical Image Quality & Clarity', startedAt: '2026-11-01T08:15:00Z', completedAt: '2026-11-01T08:15:05Z', status: 'PASSED', outputReference: 'blur: 0.95, dpi: 300' },
    { id: 'exec_101_4', verificationId: 'sess_apex_101', workflowId: 'wf_apex_standard', workflowVersion: 'v1.4', stepId: 'step_4', stepName: 'OCR Field Extraction & Regex Checks', startedAt: '2026-11-01T08:15:05Z', completedAt: '2026-11-01T08:15:15Z', status: 'PASSED', outputReference: 'ID Number: 28471920 (confidence: 99%)' },
    { id: 'exec_101_5', verificationId: 'sess_apex_101', workflowId: 'wf_apex_standard', workflowVersion: 'v1.4', stepId: 'step_6', stepName: 'Biometric Passive & Active Liveness', startedAt: '2026-11-01T08:16:00Z', completedAt: '2026-11-01T08:16:30Z', status: 'PASSED', outputReference: 'challenge_passed (confidence: 94%)' },
    { id: 'exec_101_6', verificationId: 'sess_apex_101', workflowId: 'wf_apex_standard', workflowVersion: 'v1.4', stepId: 'step_7', stepName: '1:1 Face Similarity Match', startedAt: '2026-11-01T08:16:30Z', completedAt: '2026-11-01T08:16:45Z', status: 'PASSED', outputReference: 'similarity: 0.92 >= 0.85' },

    // Execution for sess_apex_102 (Flagged for blur)
    { id: 'exec_102_1', verificationId: 'sess_apex_102', workflowId: 'wf_apex_standard', workflowVersion: 'v1.4', stepId: 'step_1', stepName: 'Collect Personal Information', startedAt: '2026-11-02T10:15:00Z', completedAt: '2026-11-02T10:15:08Z', status: 'PASSED' },
    { id: 'exec_102_2', verificationId: 'sess_apex_102', workflowId: 'wf_apex_standard', workflowVersion: 'v1.4', stepId: 'step_3', stepName: 'Optical Image Quality & Clarity', startedAt: '2026-11-02T10:18:05Z', completedAt: '2026-11-02T10:18:10Z', status: 'FLAGGED', failureReason: 'Optical blur 0.52 fell below minimum threshold 0.70', actionTaken: 'Route to Review Queue' },

    // Execution for sess_apex_103 (Failed tampering, triggered Case)
    { id: 'exec_103_1', verificationId: 'sess_apex_103', workflowId: 'wf_apex_standard', workflowVersion: 'v1.4', stepId: 'step_5', stepName: 'Forensic Document Substrate Analysis', startedAt: '2026-11-03T11:49:00Z', completedAt: '2026-11-03T11:49:05Z', status: 'FAILED', failureReason: 'Digital font mismatch detected in date of birth zone', actionTaken: 'Execute Rule rule_2 -> Opened case_apex_501' },
    { id: 'exec_103_2', verificationId: 'sess_apex_103', workflowId: 'wf_apex_standard', workflowVersion: 'v1.4', stepId: 'step_6', stepName: 'Biometric Passive & Active Liveness', startedAt: '2026-11-03T11:49:05Z', completedAt: '2026-11-03T11:49:15Z', status: 'FAILED', failureReason: 'Screen replay detected during active rotation challenge' },
  ];

  // API Credentials
  public apiCredentials: ApiCredential[] = [
    {
      id: 'cred_apex_prod_01',
      organizationId: 'org_apex_fin',
      projectId: 'prj_apex_lending',
      name: 'Production Core Backend API Key',
      environment: 'PRODUCTION',
      keyPrefix: 'ice_live_7x9q',
      keyHash: 'sha256_e9qO218b76a19f029c381e9d1a8e2',
      secretMasked: 'ice_live_7x9q••••••••••••••••••••',
      scopes: ['verifications:create', 'verifications:read', 'verifications:cancel'],
      status: 'ACTIVE',
      lastUsedAt: '2026-11-08T13:42:00Z',
      createdAt: '2025-01-20T10:00:00Z',
    },
    {
      id: 'cred_apex_sand_01',
      organizationId: 'org_apex_fin',
      projectId: 'prj_apex_lending',
      name: 'Sandbox Integration Test Key',
      environment: 'SANDBOX',
      keyPrefix: 'ice_test_4m8k',
      keyHash: 'sha256_k89127c819a023b78119c8127391a',
      secretMasked: 'ice_test_4m8k••••••••••••••••••••',
      scopes: ['verifications:create', 'verifications:read', 'sandbox:simulate'],
      status: 'ACTIVE',
      lastUsedAt: '2026-11-08T14:15:00Z',
      createdAt: '2025-01-20T10:05:00Z',
    },
    {
      id: 'cred_safari_sand_01',
      organizationId: 'org_safari_pay',
      name: 'Safari Dev Sandbox Key',
      environment: 'SANDBOX',
      keyPrefix: 'ice_test_9p1a',
      keyHash: 'sha256_p88231c9910a2837190b8123912a',
      secretMasked: 'ice_test_9p1a••••••••••••••••••••',
      scopes: ['verifications:create', 'verifications:read'],
      status: 'ACTIVE',
      lastUsedAt: '2026-11-07T16:20:00Z',
      createdAt: '2025-03-25T11:00:00Z',
    },
  ];

  // Webhooks
  public webhookEndpoints: WebhookEndpoint[] = [
    {
      id: 'wh_apex_01',
      organizationId: 'org_apex_fin',
      projectId: 'prj_apex_lending',
      environment: 'PRODUCTION',
      url: 'https://api.apexfinance.co.ke/v1/ice-webhooks',
      events: ['verification.completed', 'verification.needs_review', 'document.tampered'],
      signingSecret: 'whsec_7f9a2b1c4d3e5f608192a3b4c5d6e7f8',
      secretMasked: 'whsec_••••••••••••94f2',
      isActive: true,
      createdAt: '2025-02-10T14:00:00Z',
      failureCount: 0,
      retryCount: 0,
      lastDeliveryAt: '2026-11-03T12:05:03Z',
      lastDeliveryStatus: 'SUCCESS',
    },
    {
      id: 'wh_safari_01',
      organizationId: 'org_safari_pay',
      environment: 'SANDBOX',
      url: 'https://gateway.safaripay.com/hooks/ice-idv',
      events: ['verification.completed'],
      signingSecret: 'whsec_33b1982a74c1029e81b7a264d8129c71',
      secretMasked: 'whsec_••••••••••••33b1',
      isActive: true,
      createdAt: '2025-04-01T09:00:00Z',
      failureCount: 0,
      retryCount: 0,
    },
  ];

  // Webhook Delivery History
  public webhookDeliveries: WebhookDelivery[] = [
    {
      id: 'del_101',
      organizationId: 'org_apex_fin',
      projectId: 'prj_apex_lending',
      endpointId: 'wh_apex_01',
      eventType: 'verification.completed',
      payloadSnippet: '{"id":"sess_apex_101","status":"VERIFIED","risk_score":8}',
      statusCode: 200,
      deliveredAt: '2026-11-01T08:25:02Z',
      success: true,
      latencyMs: 142,
      attemptCount: 1,
      signature: 't=1730449502,v1=9e8b7c6d5a4e3f2b1a0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a',
    },
    {
      id: 'del_102',
      organizationId: 'org_apex_fin',
      projectId: 'prj_apex_lending',
      endpointId: 'wh_apex_01',
      eventType: 'verification.needs_review',
      payloadSnippet: '{"id":"sess_apex_102","status":"NEEDS_REVIEW","risk_score":62}',
      statusCode: 200,
      deliveredAt: '2026-11-02T10:19:08Z',
      success: true,
      latencyMs: 168,
      attemptCount: 1,
      signature: 't=1730542748,v1=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    },
    {
      id: 'del_103',
      organizationId: 'org_apex_fin',
      projectId: 'prj_apex_lending',
      endpointId: 'wh_apex_01',
      eventType: 'document.tampered',
      payloadSnippet: '{"id":"sess_apex_103","status":"REJECTED","reason":"Tampering"}',
      statusCode: 200,
      deliveredAt: '2026-11-03T12:05:03Z',
      success: true,
      latencyMs: 155,
      attemptCount: 1,
      signature: 't=1730635503,v1=7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e',
    },
  ];

  // Integration API Traffic Logs (Tenant and Project Scoped, Redacted)
  public integrationLogs: IntegrationLog[] = [
    {
      id: 'log_apex_01',
      organizationId: 'org_apex_fin',
      projectId: 'prj_apex_lending',
      environment: 'PRODUCTION',
      method: 'POST',
      endpoint: '/api/v1/sessions',
      statusCode: 201,
      durationMs: 142,
      requestId: 'req_live_881920',
      clientIp: '102.219.208.14',
      timestamp: '2026-11-09T14:32:10Z',
      userAgent: 'ApexMobileLending/2.4 (Android 14; OkHttp/4.12)',
      requestBodyMasked: {
        verification_profile_id: 'prof_apex_loan',
        external_reference: 'LOAN-APP-8849',
        applicant: { first_name: 'David', last_name: 'M••••••' },
      },
      responseSnippet: '{"id":"sess_apex_101","status":"PENDING_SUBMISSION"}',
    },
    {
      id: 'log_apex_02',
      organizationId: 'org_apex_fin',
      projectId: 'prj_apex_lending',
      environment: 'PRODUCTION',
      method: 'GET',
      endpoint: '/api/v1/verifications/sess_apex_101',
      statusCode: 200,
      durationMs: 38,
      requestId: 'req_live_881921',
      clientIp: '102.219.208.14',
      timestamp: '2026-11-09T14:32:15Z',
      userAgent: 'ApexMobileLending/2.4 (Android 14; OkHttp/4.12)',
      responseSnippet: '{"id":"sess_apex_101","status":"VERIFIED","overall_risk_score":8}',
    },
    {
      id: 'log_apex_03',
      organizationId: 'org_apex_fin',
      projectId: 'prj_apex_lending',
      environment: 'SANDBOX',
      method: 'POST',
      endpoint: '/api/v1/sessions',
      statusCode: 201,
      durationMs: 165,
      requestId: 'req_sand_449102',
      clientIp: '197.232.14.92',
      timestamp: '2026-11-08T11:15:22Z',
      userAgent: 'PostmanRuntime/7.36.0',
      requestBodyMasked: {
        verification_profile_id: 'prof_apex_loan',
        external_reference: 'TEST-LOAN-009',
        applicant: { first_name: 'Amina', last_name: 'H••••••' },
      },
      responseSnippet: '{"id":"sess_apex_sand_201","status":"PENDING_SUBMISSION"}',
    },
    {
      id: 'log_apex_04',
      organizationId: 'org_apex_fin',
      projectId: 'prj_apex_lending',
      environment: 'PRODUCTION',
      method: 'POST',
      endpoint: '/api/v1/sessions',
      statusCode: 400,
      durationMs: 24,
      requestId: 'req_live_881925',
      clientIp: '102.219.208.14',
      timestamp: '2026-11-07T09:12:00Z',
      userAgent: 'ApexMobileLending/2.4 (Android 14; OkHttp/4.12)',
      requestBodyMasked: {
        verification_profile_id: 'prof_apex_draft',
        external_reference: 'LOAN-DRAFT-01',
      },
      errorMessage: 'DRAFT_PROFILE_CANNOT_BE_USED_IN_PRODUCTION',
    },
    {
      id: 'log_apex_05',
      organizationId: 'org_apex_fin',
      projectId: 'prj_apex_merchant',
      environment: 'PRODUCTION',
      method: 'POST',
      endpoint: '/api/v1/sessions',
      statusCode: 201,
      durationMs: 135,
      requestId: 'req_live_881930',
      clientIp: '197.232.55.12',
      timestamp: '2026-11-06T16:40:11Z',
      userAgent: 'ApexMerchantPortal/1.1 (Node.js/20.10.0)',
      requestBodyMasked: {
        verification_profile_id: 'prof_apex_standard',
        external_reference: 'MERCHANT-POS-940',
      },
      responseSnippet: '{"id":"sess_apex_102","status":"PENDING_SUBMISSION"}',
    },
  ];

  // Audit Events
  public auditEvents: AuditEvent[] = [
    {
      id: 'aud_1',
      tenantId: 'org_apex_fin',
      actorId: 'usr_sarah',
      actorName: 'Sarah Kimani (Compliance)',
      actorType: 'USER',
      action: 'CASE_DECISION_RECORDED',
      resourceType: 'VERIFICATION_SESSION',
      resourceId: 'sess_apex_101',
      ipAddress: '102.219.208.14',
      timestamp: '2026-11-01T08:25:00Z',
      details: { decision: 'VERIFIED', reasonCode: 'LOW_RISK_DOCUMENT_CONSISTENT' },
    },
    {
      id: 'aud_2',
      tenantId: 'org_apex_fin',
      actorId: 'usr_james',
      actorName: 'James Kariuki (Fraud Analyst)',
      actorType: 'USER',
      action: 'CASE_DECISION_RECORDED',
      resourceType: 'VERIFICATION_SESSION',
      resourceId: 'sess_apex_103',
      ipAddress: '197.232.88.92',
      timestamp: '2026-11-03T12:05:00Z',
      details: { decision: 'REJECTED', reasonCode: 'SUSPECTED_FRAUD_ALTERED_DOCUMENT' },
    },
    {
      id: 'aud_3',
      tenantId: 'org_apex_fin',
      actorId: 'usr_mark',
      actorName: 'Mark Otieno (Developer)',
      actorType: 'USER',
      action: 'API_KEY_CREATED',
      resourceType: 'API_CREDENTIAL',
      resourceId: 'cred_apex_sand_01',
      ipAddress: '102.219.208.20',
      timestamp: '2026-11-05T14:10:00Z',
      details: { environment: 'SANDBOX', scopes: ['verifications:create', 'verifications:read'] },
    },
    {
      id: 'aud_plat_01',
      actorId: 'plat_adm_01',
      actorName: 'Platform Super Administrator',
      actorType: 'ICE_STAFF',
      action: 'ENGINE_VERSION_REGISTERED',
      resourceType: 'PROCESSING_ENGINE',
      resourceId: 'ICE-DocVision-v2.4',
      ipAddress: '10.0.4.12',
      timestamp: '2026-10-28T09:00:00Z',
      details: { changelog: 'Enhanced Kenyan Alien Card MRZ format parser' },
    },
  ];

  // -------------------------------------------------------------
  // Multi-Tenant Access Methods (Strictly Enforced)
  // -------------------------------------------------------------

  /**
   * Get all People for a specific tenant, checking RBAC.
   */
  getPeople(tenantId: string, userRole: OrganizationRole): Person[] {
    if (!hasPermission(userRole, 'VERIFICATIONS_READ')) {
      throw new UnauthorizedError(`Role ${userRole} lacks permission to view people`);
    }
    return this.people.filter((p) => p.organizationId === tenantId);
  }

  /**
   * Get a single Person by ID with strict tenant boundary check.
   */
  getPersonById(tenantId: string, personId: string, userRole: OrganizationRole): Person {
    if (!hasPermission(userRole, 'VERIFICATIONS_READ')) {
      throw new UnauthorizedError(`Role ${userRole} lacks permission to view person`);
    }
    const person = this.people.find((p) => p.id === personId);
    if (!person) {
      throw new Error(`Person '${personId}' not found.`);
    }
    assertTenantMatch(tenantId, person.organizationId, 'Person');
    return person;
  }

  /**
   * Get all verification sessions for a Person, sorted chronologically.
   */
  getPersonVerifications(tenantId: string, personId: string, userRole: OrganizationRole): VerificationSession[] {
    if (!hasPermission(userRole, 'VERIFICATIONS_READ')) {
      throw new UnauthorizedError(`Role ${userRole} lacks permission to view person history`);
    }
    const person = this.getPersonById(tenantId, personId, userRole);
    return this.sessions
      .filter((s) => s.organizationId === tenantId && (s.personId === person.id || s.customerId === person.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get all verifications for a specific tenant, checking RBAC.
   */
  getVerifications(tenantId: string, userRole: OrganizationRole): VerificationSession[] {
    if (!hasPermission(userRole, 'VERIFICATIONS_READ')) {
      throw new UnauthorizedError(`Role ${userRole} lacks permission VERIFICATIONS_READ`);
    }

    const tenantSessions = this.sessions.filter((s) => s.organizationId === tenantId);

    // If role cannot view raw docs, mask national ID
    if (!hasPermission(userRole, 'DOCUMENTS_VIEW_RAW')) {
      return tenantSessions.map((s) => ({
        ...s,
        submittedData: {
          ...s.submittedData,
          nationalIdNumber: s.submittedData.nationalIdNumber.replace(/^(\d{4})(\d+)/, '$1****'),
        },
      }));
    }

    return tenantSessions;
  }

  /**
   * Retrieve a single verification session with strict tenant boundary validation.
   */
  getVerificationById(tenantId: string, sessionId: string, userRole: OrganizationRole): VerificationSession {
    if (!hasPermission(userRole, 'VERIFICATIONS_READ')) {
      throw new UnauthorizedError(`Role ${userRole} lacks permission VERIFICATIONS_READ`);
    }

    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error(`Verification session '${sessionId}' not found.`);
    }

    assertTenantMatch(tenantId, session.organizationId, 'VerificationSession');

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId,
      actorId: 'current_user',
      actorName: `User (${userRole})`,
      actorType: 'USER',
      action: 'VERIFICATION_VIEWED',
      resourceType: 'VERIFICATION_SESSION',
      resourceId: sessionId,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { viewMode: 'DETAIL_INSPECTION' },
    });

    return session;
  }

  /**
   * Get Investigation Cases for an organization.
   */
  getCases(tenantId: string, userRole: OrganizationRole, filter?: string): InvestigationCase[] {
    if (!hasPermission(userRole, 'VERIFICATIONS_READ')) {
      throw new UnauthorizedError(`Role ${userRole} lacks permission to view cases`);
    }

    let tenantCases = this.investigationCases.filter((c) => c.organizationId === tenantId);

    if (filter && filter !== 'ALL') {
      if (filter === 'OPEN') {
        tenantCases = tenantCases.filter((c) => c.status === 'OPEN' || c.status === 'IN_INVESTIGATION');
      } else if (filter === 'UNASSIGNED') {
        tenantCases = tenantCases.filter((c) => !c.assignedReviewerId);
      } else if (filter === 'WAITING_FOR_EVIDENCE') {
        tenantCases = tenantCases.filter((c) => c.status === 'WAITING_FOR_EVIDENCE');
      } else if (filter === 'RESOLVED') {
        tenantCases = tenantCases.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED');
      }
    }

    return tenantCases;
  }

  /**
   * Get a single Case by ID.
   */
  getCaseById(tenantId: string, caseId: string, userRole: OrganizationRole): InvestigationCase {
    if (!hasPermission(userRole, 'VERIFICATIONS_READ')) {
      throw new UnauthorizedError(`Role ${userRole} lacks permission to view case`);
    }
    const c = this.investigationCases.find((item) => item.id === caseId);
    if (!c) {
      throw new Error(`Case '${caseId}' not found.`);
    }
    assertTenantMatch(tenantId, c.organizationId, 'InvestigationCase');
    return c;
  }

  /**
   * Explicitly create a formal Investigation Case from a verification session.
   * Cases must NOT be created automatically for every verification!
   */
  createCase(
    tenantId: string,
    input: {
      verificationId: string;
      caseType: InvestigationCase['caseType'];
      reasonForOpening: string;
      priority: InvestigationCase['priority'];
      assignedReviewerId?: string;
      assignedReviewerName?: string;
      openedBy?: InvestigationCase['openedBy'];
    },
    userRole: OrganizationRole,
    actorName: string
  ): InvestigationCase {
    if (!hasPermission(userRole, 'DECISIONS_OVERRIDE') && !hasPermission(userRole, 'WORKFLOWS_MANAGE')) {
      throw new UnauthorizedError(`Role ${userRole} is not authorized to open formal investigation cases.`);
    }

    const session = this.getVerificationById(tenantId, input.verificationId, userRole);

    const caseId = `case_${tenantId.split('_')[1] || 'org'}_${Date.now().toString().slice(-4)}`;
    const caseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCase: InvestigationCase = {
      id: caseId,
      organizationId: tenantId,
      caseNumber,
      verificationId: session.id,
      personId: session.personId,
      caseType: input.caseType,
      reasonForOpening: input.reasonForOpening,
      openedBy: input.openedBy || 'HUMAN_REVIEWER',
      priority: input.priority,
      assignedReviewerId: input.assignedReviewerId,
      assignedReviewerName: input.assignedReviewerName,
      status: input.assignedReviewerId ? 'IN_INVESTIGATION' : 'OPEN',
      slaTargetMinutes: input.priority === 'CRITICAL' ? 120 : input.priority === 'HIGH' ? 240 : null,
      notes: [
        {
          id: `note_${Date.now()}`,
          authorId: 'actor_current',
          authorName: actorName,
          text: `Opened investigation: ${input.reasonForOpening}`,
          createdAt: new Date().toISOString(),
        },
      ],
      evidenceReferences: session.documents.map((d) => `Doc: ${d.documentType} (${d.fileName})`),
      actionHistory: [
        {
          id: `cact_${Date.now()}`,
          action: 'CASE_MANUALLY_OPENED',
          actor: actorName,
          timestamp: new Date().toISOString(),
          details: `Priority: ${input.priority}, Type: ${input.caseType}`,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.investigationCases.unshift(newCase);

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId,
      actorId: 'current_user',
      actorName,
      actorType: 'USER',
      action: 'INVESTIGATION_CASE_OPENED',
      resourceType: 'INVESTIGATION_CASE',
      resourceId: caseId,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { caseNumber, verificationId: session.id, priority: input.priority },
    });

    return newCase;
  }

  /**
   * Add note to a Case
   */
  addCaseNote(tenantId: string, caseId: string, text: string, authorName: string, userRole: OrganizationRole): InvestigationCase {
    const c = this.getCaseById(tenantId, caseId, userRole);
    c.notes.push({
      id: `note_${Date.now()}`,
      authorId: 'current_user',
      authorName,
      text,
      createdAt: new Date().toISOString(),
    });
    c.updatedAt = new Date().toISOString();
    return c;
  }

  /**
   * Resolve an investigation case
   */
  resolveCase(
    tenantId: string,
    caseId: string,
    resolution: { status: 'CLEARED' | 'FRAUD_CONFIRMED' | 'FALSE_POSITIVE' | 'ACCOUNT_BLOCKED'; reason: string },
    resolverName: string,
    userRole: OrganizationRole
  ): InvestigationCase {
    if (!hasPermission(userRole, 'DECISIONS_OVERRIDE')) {
      throw new UnauthorizedError(`Role ${userRole} lacks permission to resolve investigation cases.`);
    }

    const c = this.getCaseById(tenantId, caseId, userRole);
    c.status = 'RESOLVED';
    c.resolution = {
      status: resolution.status,
      resolvedBy: resolverName,
      reason: resolution.reason,
      resolvedAt: new Date().toISOString(),
    };
    c.actionHistory.push({
      id: `cact_${Date.now()}`,
      action: `CASE_RESOLVED_${resolution.status}`,
      actor: resolverName,
      timestamp: new Date().toISOString(),
      details: resolution.reason,
    });
    c.updatedAt = new Date().toISOString();

    // If fraud confirmed, update Person status
    if (resolution.status === 'FRAUD_CONFIRMED') {
      const person = this.people.find((p) => p.id === c.personId);
      if (person) {
        person.status = 'SUSPECTED_FRAUD';
      }
    }

    return c;
  }

  /**
   * Get workflow execution records for a session
   */
  getWorkflowExecutions(tenantId: string, verificationId: string): WorkflowExecutionRecord[] {
    const session = this.sessions.find((s) => s.id === verificationId);
    if (!session) return [];
    assertTenantMatch(tenantId, session.organizationId, 'VerificationSession');
    return this.workflowExecutions.filter((e) => e.verificationId === verificationId);
  }

  /**
   * Simulate a workflow against synthetic test inputs.
   * Simulation is clearly isolated and never creates real production decisions.
   */
  simulateWorkflow(
    tenantId: string,
    workflowId: string,
    testScenario: 'CLEAN_NATIONAL_ID' | 'BLURRY_DOCUMENT' | 'ALTERED_DOCUMENT_TAMPER' | 'SPOOF_FACE_REPLAY'
  ) {
    const workflow = this.workflows.find((w) => w.id === workflowId && w.organizationId === tenantId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found for tenant.`);
    }

    const simulationSteps: Array<{
      stepName: string;
      status: 'PASSED' | 'FAILED' | 'FLAGGED';
      detail: string;
    }> = [];

    let matchedRule = 'None';
    let triggeredAction = 'COMPLETE_VERIFICATION';
    let simulatedRiskScore = 10;

    if (testScenario === 'CLEAN_NATIONAL_ID') {
      simulationSteps.push({ stepName: 'Collect Personal Information', status: 'PASSED', detail: 'Valid Kenyan National ID format provided' });
      simulationSteps.push({ stepName: 'Capture Document', status: 'PASSED', detail: 'Front & Back images received' });
      simulationSteps.push({ stepName: 'Optical Quality & Clarity Check', status: 'PASSED', detail: 'Blur score: 0.94 >= 0.70 threshold. Four corners detected.' });
      simulationSteps.push({ stepName: 'OCR Field Extraction', status: 'PASSED', detail: 'ID number and DOB regex validation passed (confidence 98%)' });
      simulationSteps.push({ stepName: 'Substrate & Forensics Analysis', status: 'PASSED', detail: 'No font alterations or coordinate box anomalies detected.' });
      simulationSteps.push({ stepName: 'Biometric Passive & Active Liveness', status: 'PASSED', detail: 'Liveness challenge completed successfully.' });
      simulationSteps.push({ stepName: '1:1 Face Similarity Match', status: 'PASSED', detail: 'Similarity score 0.93 >= 0.85 threshold.' });
      matchedRule = 'rule_4 (All Checks Clear & Low Risk)';
      triggeredAction = 'COMPLETE_VERIFICATION';
      simulatedRiskScore = 8;
    } else if (testScenario === 'BLURRY_DOCUMENT') {
      simulationSteps.push({ stepName: 'Collect Personal Information', status: 'PASSED', detail: 'Input captured' });
      simulationSteps.push({ stepName: 'Capture Document', status: 'PASSED', detail: 'Document received' });
      simulationSteps.push({ stepName: 'Optical Quality & Clarity Check', status: 'FLAGGED', detail: 'Optical blur 0.51 fell below 0.70 threshold.' });
      simulationSteps.push({ stepName: 'OCR Field Extraction', status: 'FLAGGED', detail: 'Low OCR confidence (62%) on date of birth field.' });
      matchedRule = 'rule_1 (Quality Blur Below 0.70)';
      triggeredAction = 'SEND_TO_REVIEW_QUEUE';
      simulatedRiskScore = 60;
    } else if (testScenario === 'ALTERED_DOCUMENT_TAMPER') {
      simulationSteps.push({ stepName: 'Collect Personal Information', status: 'PASSED', detail: 'Input captured' });
      simulationSteps.push({ stepName: 'Capture Document', status: 'PASSED', detail: 'Document received' });
      simulationSteps.push({ stepName: 'Optical Quality & Clarity Check', status: 'PASSED', detail: 'Resolution adequate' });
      simulationSteps.push({ stepName: 'Substrate & Forensics Analysis', status: 'FAILED', detail: 'Digital font alteration detected on date of birth coordinate box.' });
      matchedRule = 'rule_2 (Font or Substrate Alteration Detected)';
      triggeredAction = 'CREATE_INVESTIGATION_CASE (Priority: CRITICAL)';
      simulatedRiskScore = 88;
    } else if (testScenario === 'SPOOF_FACE_REPLAY') {
      simulationSteps.push({ stepName: 'Document Checks', status: 'PASSED', detail: 'Valid document' });
      simulationSteps.push({ stepName: 'Biometric Passive & Active Liveness', status: 'FAILED', detail: 'Presentation attack detected (screen replay video artifact).' });
      matchedRule = 'rule_3 (Liveness Spoof Detected)';
      triggeredAction = 'CREATE_INVESTIGATION_CASE (Priority: HIGH)';
      simulatedRiskScore = 82;
    }

    return {
      simulationId: `sim_${Date.now()}`,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      scenario: testScenario,
      stepsRun: simulationSteps,
      matchedRule,
      triggeredAction,
      simulatedRiskScore,
      isSimulation: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create an immutable new version of a workflow.
   * Editing an existing published workflow version is prohibited!
   */
  createWorkflowVersion(
    tenantId: string,
    baseWorkflowId: string,
    newVersionTag: string,
    updates: Partial<Workflow>,
    userRole: OrganizationRole
  ): Workflow {
    if (!hasPermission(userRole, 'WORKFLOWS_MANAGE')) {
      throw new UnauthorizedError(`Role ${userRole} lacks permission to manage workflows.`);
    }

    const base = this.workflows.find((w) => w.id === baseWorkflowId && w.organizationId === tenantId);
    if (!base) {
      throw new Error(`Base workflow '${baseWorkflowId}' not found.`);
    }

    // Check version uniqueness
    const exists = this.workflows.some(
      (w) => w.organizationId === tenantId && w.name === (updates.name || base.name) && w.version === newVersionTag
    );
    if (exists) {
      throw new Error(`Workflow version '${newVersionTag}' already exists. Workflow versions are immutable.`);
    }

    const newWorkflow: Workflow = {
      ...base,
      ...updates,
      id: `wf_${tenantId.split('_')[1] || 'org'}_${Date.now().toString().slice(-4)}`,
      organizationId: tenantId,
      version: newVersionTag,
      status: 'PUBLISHED',
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };

    this.workflows.push(newWorkflow);

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId,
      actorId: 'current_user',
      actorName: `User (${userRole})`,
      actorType: 'USER',
      action: 'WORKFLOW_VERSION_PUBLISHED',
      resourceType: 'WORKFLOW',
      resourceId: newWorkflow.id,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { baseWorkflowId, newVersionTag },
    });

    return newWorkflow;
  }

  /**
   * Record human reviewer decision
   */
  recordDecision(
    tenantId: string,
    sessionId: string,
    reviewerId: string,
    reviewerName: string,
    role: OrganizationRole,
    result: DecidedResult
  ): VerificationSession {
    if (!hasPermission(role, 'DECISIONS_OVERRIDE')) {
      throw new UnauthorizedError(`Role ${role} is not permitted to record verification decisions.`);
    }

    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    assertTenantMatch(tenantId, session.organizationId, 'VerificationSession');

    session.reviewerActions.push({
      id: `act_${Date.now()}`,
      reviewerId,
      reviewerName,
      action: result.status === 'VERIFIED' ? 'APPROVED' : result.status === 'REJECTED' ? 'REJECTED' : 'REQUESTED_INFO',
      notes: result.reason,
      timestamp: new Date().toISOString(),
    });

    if (result.status === 'VERIFIED' || result.status === 'REJECTED') {
      session.status = result.status;
      session.finalDecision = {
        status: result.status,
        decidedBy: 'HUMAN_REVIEWER',
        reason: result.reason,
        timestamp: new Date().toISOString(),
      };
      session.completedAt = new Date().toISOString();

      // Update Person aggregate status
      const person = this.people.find((p) => p.id === session.personId);
      if (person) {
        person.status = result.status === 'VERIFIED' ? 'VERIFIED' : 'NEEDS_ATTENTION';
        person.lastVerificationAt = session.completedAt;
      }
    } else if (result.status === 'NEEDS_MORE_INFORMATION') {
      session.status = 'NEEDS_MORE_INFORMATION';
    }

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId,
      actorId: reviewerId,
      actorName: reviewerName,
      actorType: 'USER',
      action: `DECISION_${result.status}`,
      resourceType: 'VERIFICATION_SESSION',
      resourceId: sessionId,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { decision: result.status, reason: result.reason },
    });

    // Trigger webhook delivery for decision event
    const eventType = result.status === 'VERIFIED' ? 'verification.completed' : result.status === 'REJECTED' ? 'verification.rejected' : 'verification.needs_review';
    this.triggerWebhookDelivery(tenantId, eventType, {
      sessionId: session.id,
      externalReferenceId: session.externalReferenceId,
      status: session.status,
      workflowId: session.workflowId,
      workflowVersion: session.workflowVersion,
      riskScore: session.overallRiskScore,
      decisionReason: result.reason,
      authoritativeStatus: session.authoritativeCheckStatus,
      completedAt: session.completedAt,
    }, session.projectId);

    return session;
  }

  /**
   * Create a new hosted verification session (e.g. from customer journey or API)
   */
  /**
   * Create a new hosted verification session (e.g. from customer journey or API)
   */
  createSession(
    tenantId: string,
    customerData: {
      fullName: string;
      dob: string;
      idNumber: string;
      email: string;
      phone: string;
      workflowId?: string;
      verificationProfileId?: string;
      projectId?: string;
      returnUrl?: string;
      cancelUrl?: string;
      customerReferenceId?: string;
      integrationMethod?: IntegrationMethod;
      environment?: 'SANDBOX' | 'PRODUCTION';
    }
  ): VerificationSession {
    const org = this.organizations.find((o) => o.id === tenantId);
    if (!org) {
      throw new Error(`Organization ${tenantId} not found`);
    }

    // Check if Person already exists for this organization by matching National ID hash
    const maskedId = customerData.idNumber.length > 4 ? `${customerData.idNumber.slice(0, 4)}****` : '****';
    let person = this.people.find(
      (p) => p.organizationId === tenantId && p.nationalIdMasked === maskedId && p.dateOfBirth === customerData.dob
    );

    if (!person) {
      const personId = `per_${tenantId.split('_')[1] || 'dev'}_${Date.now().toString().slice(-4)}`;
      person = {
        id: personId,
        organizationId: tenantId,
        externalReferenceId: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
        primaryName: customerData.fullName,
        dateOfBirth: customerData.dob,
        nationalIdMasked: maskedId,
        nationalIdHash: `hash_${Date.now()}`,
        phoneNumber: customerData.phone,
        email: customerData.email,
        status: 'UNVERIFIED',
        firstSeenAt: new Date().toISOString(),
        lastVerificationAt: new Date().toISOString(),
        verificationAttemptCount: 1,
        resolutionPolicy: 'EXACT_HASH_MATCH_WITH_ORG_SCOPED_ID',
        createdAt: new Date().toISOString(),
      };
      this.people.unshift(person);
    } else {
      person.verificationAttemptCount += 1;
      person.lastVerificationAt = new Date().toISOString();
    }

    // Define sessionId
    const sessionId = `sess_${tenantId.split('_')[1] || 'dev'}_${Date.now()}`;

    // If projectId is provided, check origin validation
    const sessionToken = `tok_${sessionId}_${Math.random().toString(36).substring(2, 14)}`;
    const allowedReturnUrl = customerData.returnUrl;
    const allowedCancelUrl = customerData.cancelUrl;

    let project: IntegrationProject | undefined;
    if (customerData.projectId) {
      project = this.projects.find((p) => p.organizationId === tenantId && p.id === customerData.projectId);
      if (project) {
        // Domain validation for return_url
        if (customerData.returnUrl) {
          try {
            const urlObj = new URL(customerData.returnUrl);
            const origin = urlObj.origin;
            const isAllowed = project.allowedOrigins.some(
              (o) => o === origin || origin.includes('localhost') || origin.includes('run.app')
            );
            if (!isAllowed && project.allowedOrigins.length > 0) {
              const err: any = new Error(`[DomainValidationError] Return URL origin '${origin}' is not registered in project allowed_origins [${project.allowedOrigins.join(', ')}]`);
              err.name = 'DomainValidationError';
              throw err;
            }
          } catch (e: any) {
            if (e.name === 'DomainValidationError') throw e;
          }
        }
      }
    }

    // Resolve Verification Profile
    const profileIdToResolve = customerData.verificationProfileId || project?.defaultVerificationProfileId;
    let resolvedProfile: VerificationProfile | undefined;

    if (profileIdToResolve) {
      resolvedProfile = this.verificationProfiles.find(
        (p) => p.id === profileIdToResolve && p.organizationId === tenantId
      );
      if (!resolvedProfile) {
        throw new Error(`Verification Profile '${profileIdToResolve}' not found for organization '${tenantId}'.`);
      }

      // In production environment, prohibit unapproved draft profiles
      if (org.environment === 'PRODUCTION' && resolvedProfile.status === 'DRAFT') {
        const err: any = new Error(`[ProfileStatusError] Draft verification profile '${resolvedProfile.id}' cannot be used in production. Please publish the profile first.`);
        err.name = 'ProfileStatusError';
        throw err;
      }
    } else {
      // Default fallback profile for organization
      resolvedProfile = this.verificationProfiles.find(
        (p) => p.organizationId === tenantId && p.isDefault
      ) || this.verificationProfiles.find((p) => p.organizationId === tenantId);
    }

    // Determine workflow, version, and required steps
    const resolvedWorkflowId = resolvedProfile?.workflowVersionId || customerData.workflowId || 'wf_apex_standard';
    const resolvedWorkflowVersion = resolvedProfile?.version || 'v1.4';
    const resolvedPurpose = resolvedProfile?.verificationPurpose || 'TIER_1_KYC_ACCOUNT_OPENING';
    const resolvedCollectionMode = resolvedProfile?.identityCollectionMode || 'EXTRACT_FROM_DOCUMENT';

    // Compute required steps summary
    const requiredStepsSummary: string[] = [];
    if (resolvedProfile) {
      if (resolvedProfile.allowedDocumentTypes.length > 0) {
        requiredStepsSummary.push('DOCUMENT_SELECTION', 'DOCUMENT_CAPTURE', 'OCR_CONFIRMATION');
      }
      if (resolvedProfile.selfieCaptureEnabled) {
        requiredStepsSummary.push('SELFIE_CAPTURE');
      }
      if (resolvedProfile.livenessCheckEnabled) {
        requiredStepsSummary.push('LIVENESS_CHECK');
      }
      if (resolvedProfile.faceComparisonEnabled) {
        requiredStepsSummary.push('FACE_COMPARISON');
      }
    } else {
      requiredStepsSummary.push('DOCUMENT_SELECTION', 'DOCUMENT_CAPTURE', 'OCR_CONFIRMATION', 'SELFIE_CAPTURE', 'LIVENESS_CHECK');
    }

    const newSession: VerificationSession = {
      id: sessionId,
      organizationId: tenantId,
      projectId: customerData.projectId,
      environment: (org.environment as any) || 'SANDBOX',
      personId: person.id,
      customerId: person.id,
      externalReferenceId: customerData.customerReferenceId || person.externalReferenceId,
      verificationPurpose: resolvedPurpose,
      verificationProfileId: resolvedProfile?.id,
      verificationProfileName: resolvedProfile?.name,
      workflowId: resolvedWorkflowId,
      workflowVersion: resolvedWorkflowVersion,
      identityCollectionMode: resolvedCollectionMode,
      requiredStepsSummary,
      status: 'PENDING_SUBMISSION',
      overallRiskScore: 10,
      authoritativeCheckStatus: 'NOT_PERFORMED',
      authoritativeCheckSource: 'Not Configured (Government authoritative database check not connected)',
      returnUrl: allowedReturnUrl,
      cancelUrl: allowedCancelUrl,
      sessionToken,
      integrationMethod: customerData.integrationMethod || 'HOSTED_VERIFICATION',
      submittedData: {
        fullName: customerData.fullName,
        dob: customerData.dob,
        nationalIdNumber: customerData.idNumber,
        nationality: 'Kenyan',
        phoneNumber: customerData.phone,
        email: customerData.email,
      },
      documents: [],
      riskIndicators: [],
      reviewerActions: [],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      isSyntheticDemo: true,
    };

    this.sessions.unshift(newSession);

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId,
      actorId: 'api_or_guest',
      actorName: 'Hosted Journey Initiator',
      actorType: 'SYSTEM',
      action: 'VERIFICATION_SESSION_CREATED',
      resourceType: 'VERIFICATION_SESSION',
      resourceId: sessionId,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { personId: person.id, externalRef: newSession.externalReferenceId, projectId: customerData.projectId },
    });

    // Auto-dispatch webhook for session creation
    this.triggerWebhookDelivery(tenantId, 'verification.session.created', {
      sessionId: newSession.id,
      externalReferenceId: newSession.externalReferenceId,
      status: newSession.status,
      workflowId: newSession.workflowId,
      workflowVersion: newSession.workflowVersion,
      riskScore: newSession.overallRiskScore,
      authoritativeStatus: newSession.authoritativeCheckStatus,
    }, customerData.projectId);

    return newSession;
  }

  // ===========================================================================
  // VERIFICATION PROFILES MANAGEMENT
  // Declarative company-facing concept defining identity checks & applicant flow
  // ===========================================================================
  public getVerificationProfiles(organizationId: string): VerificationProfile[] {
    return this.verificationProfiles.filter((p) => p.organizationId === organizationId);
  }

  public getVerificationProfile(organizationId: string, profileId: string): VerificationProfile | null {
    const prof = this.verificationProfiles.find((p) => p.organizationId === organizationId && p.id === profileId);
    return prof || null;
  }

  public createVerificationProfile(organizationId: string, input: Partial<VerificationProfile>): VerificationProfile {
    const org = this.organizations.find((o) => o.id === organizationId);
    if (!org) throw new Error(`Organization ${organizationId} not found`);

    const id = `prof_${organizationId.split('_')[1] || 'dev'}_${Date.now().toString().slice(-6)}`;
    const workflowId = `wf_${id}_v1.0`;

    // Automatically provision a backing published Workflow Version snapshot
    const newWorkflow: Workflow = {
      id: workflowId,
      organizationId,
      name: `${input.name || 'Custom'} Execution Policy`,
      version: 'v1.0',
      status: 'PUBLISHED',
      description: `Backing workflow snapshot for verification profile ${input.name || id}`,
      purpose: input.verificationPurpose || 'CUSTOM_VERIFICATION',
      countryScope: input.countryScope || ['KE'],
      allowedDocumentTypes: input.allowedDocumentTypes || ['KE_NATIONAL_ID'],
      isDefault: false,
      requirements: {
        requireDocument: (input.allowedDocumentTypes || []).length > 0,
        allowedDocumentTypes: input.allowedDocumentTypes || ['KE_NATIONAL_ID'],
        requireSelfie: !!input.selfieCaptureEnabled,
        requireLiveness: !!input.livenessCheckEnabled,
        allowFileUploadFallback: true,
        autoApproveRiskScoreThreshold: input.decisionPolicy?.autoApproveRiskScoreThreshold ?? 20,
      },
      steps: [],
      rules: [],
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };
    this.workflows.unshift(newWorkflow);

    const newProfile: VerificationProfile = {
      id,
      organizationId,
      name: input.name || 'New Verification Profile',
      slug: (input.name || 'new-profile').toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description: input.description || 'Custom company verification profile.',
      verificationPurpose: input.verificationPurpose || 'FULL_CUSTOMER_KYC',
      countryScope: input.countryScope || ['KE'],
      supportedLanguages: input.supportedLanguages || ['en', 'sw'],
      allowedDocumentTypes: input.allowedDocumentTypes || ['KE_NATIONAL_ID'],
      documentCaptureRules: input.documentCaptureRules || {
        KE_NATIONAL_ID: { documentType: 'KE_NATIONAL_ID', requiredSides: 'FRONT_AND_BACK', allowUploadFallback: true },
      },
      identityCollectionMode: input.identityCollectionMode || 'EXTRACT_FROM_DOCUMENT',
      ocrEnabled: input.ocrEnabled ?? true,
      documentQualityChecks: input.documentQualityChecks || {
        blurThreshold: 0.70,
        glareDetection: true,
        fourCornersDetection: true,
      },
      documentForensicChecks: input.documentForensicChecks || {
        tamperingDetection: true,
        fontConsistency: true,
        layoutValidation: true,
      },
      selfieCaptureEnabled: input.selfieCaptureEnabled ?? true,
      livenessCheckEnabled: input.livenessCheckEnabled ?? true,
      livenessMethod: input.livenessMethod || 'ACTIVE_CHALLENGE',
      faceComparisonEnabled: input.faceComparisonEnabled ?? true,
      faceMatchThreshold: input.faceMatchThreshold ?? 0.85,
      additionalChecks: input.additionalChecks || {
        duplicateSubjectDetection: true,
        velocityCheck: true,
        sanctionsScreening: false,
        authoritativeGovCheck: false,
      },
      recaptureRules: input.recaptureRules || {
        maxRecaptureAttempts: 3,
        allowManualReviewEscalation: true,
      },
      decisionPolicy: input.decisionPolicy || {
        autoApproveEnabled: true,
        autoApproveRiskScoreThreshold: 20,
        routeToReviewQueueOnQualityFail: true,
        routeToCaseOnTampering: true,
      },
      applicantInstructions: input.applicantInstructions || {
        welcomeTitle: 'Identity Verification Required',
        welcomeSubtitle: 'Please follow the guided verification steps.',
      },
      status: 'DRAFT',
      version: 'v1.0-draft',
      workflowVersionId: workflowId,
      isDefault: false,
      environment: (org.environment as any) || 'SANDBOX',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      changelogNotes: 'Created new draft verification profile.',
    };

    this.verificationProfiles.unshift(newProfile);

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId: organizationId,
      actorId: 'usr_owner_01',
      actorName: 'Organization Owner',
      actorType: 'USER',
      action: 'VERIFICATION_PROFILE_CREATED',
      resourceType: 'VERIFICATION_PROFILE',
      resourceId: newProfile.id,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { profileName: newProfile.name, purpose: newProfile.verificationPurpose },
    });

    return newProfile;
  }

  public updateVerificationProfile(organizationId: string, profileId: string, updates: Partial<VerificationProfile>): VerificationProfile {
    const prof = this.getVerificationProfile(organizationId, profileId);
    if (!prof) throw new Error(`Profile ${profileId} not found`);

    Object.assign(prof, updates, {
      updatedAt: new Date().toISOString(),
    });

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId: organizationId,
      actorId: 'usr_owner_01',
      actorName: 'Organization Owner',
      actorType: 'USER',
      action: 'VERIFICATION_PROFILE_UPDATED',
      resourceType: 'VERIFICATION_PROFILE',
      resourceId: prof.id,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { profileName: prof.name, version: prof.version, status: prof.status },
    });

    return prof;
  }

  public publishVerificationProfile(organizationId: string, profileId: string, changelogNotes?: string): VerificationProfile {
    const prof = this.getVerificationProfile(organizationId, profileId);
    if (!prof) throw new Error(`Profile ${profileId} not found`);

    // Increment version, e.g. v1.0 -> v1.1
    const currentNum = parseFloat(prof.version.replace(/[^0-9.]/g, '')) || 1.0;
    const newVersion = `v${(currentNum + 0.1).toFixed(1)}`;

    // Create immutable backing Workflow snapshot for this published version
    const workflowId = `wf_${prof.id}_${newVersion}`;
    const publishedWorkflow: Workflow = {
      id: workflowId,
      organizationId,
      name: `${prof.name} (${newVersion}) Policy`,
      version: newVersion,
      status: 'PUBLISHED',
      description: `Immutable snapshot for profile ${prof.name} ${newVersion}. Notes: ${changelogNotes || 'Routine update'}`,
      purpose: prof.verificationPurpose,
      countryScope: [...prof.countryScope],
      allowedDocumentTypes: [...prof.allowedDocumentTypes],
      isDefault: prof.isDefault,
      requirements: {
        requireDocument: prof.allowedDocumentTypes.length > 0,
        allowedDocumentTypes: [...prof.allowedDocumentTypes],
        requireSelfie: prof.selfieCaptureEnabled,
        requireLiveness: prof.livenessCheckEnabled,
        allowFileUploadFallback: true,
        autoApproveRiskScoreThreshold: prof.decisionPolicy.autoApproveRiskScoreThreshold,
      },
      steps: [],
      rules: [],
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };
    this.workflows.unshift(publishedWorkflow);

    prof.status = 'PUBLISHED';
    prof.version = newVersion;
    prof.workflowVersionId = workflowId;
    prof.publishedAt = new Date().toISOString();
    prof.updatedAt = new Date().toISOString();
    prof.changelogNotes = changelogNotes || `Published version ${newVersion}`;

    // Record immutable version history snapshot
    this.profileVersionHistory.unshift({
      id: `pvh_${prof.id}_${Date.now()}`,
      profileId: prof.id,
      organizationId,
      version: newVersion,
      publishedAt: new Date().toISOString(),
      publishedBy: 'usr_owner_01',
      changelogNotes: prof.changelogNotes,
      snapshot: JSON.parse(JSON.stringify(prof)),
    });

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId: organizationId,
      actorId: 'usr_owner_01',
      actorName: 'Organization Owner',
      actorType: 'USER',
      action: 'VERIFICATION_PROFILE_PUBLISHED',
      resourceType: 'VERIFICATION_PROFILE',
      resourceId: prof.id,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { version: newVersion, changelog: changelogNotes },
    });

    return prof;
  }

  public revertToProfileVersion(organizationId: string, profileId: string, targetVersion: string): VerificationProfile {
    const history = this.profileVersionHistory.find(
      (h) => h.profileId === profileId && h.organizationId === organizationId && h.version === targetVersion
    );
    if (!history) throw new Error(`Version history for ${targetVersion} not found`);

    const prof = this.getVerificationProfile(organizationId, profileId);
    if (!prof) throw new Error(`Profile ${profileId} not found`);

    // Restore snapshot settings into the active profile
    Object.assign(prof, history.snapshot, {
      updatedAt: new Date().toISOString(),
      changelogNotes: `Restored configuration from version ${targetVersion}`,
    });

    return prof;
  }

  public getProfileVersionHistory(organizationId: string, profileId: string): ProfileVersionHistory[] {
    return this.profileVersionHistory.filter(
      (h) => h.organizationId === organizationId && h.profileId === profileId
    );
  }

  // ===========================================================================
  // INTEGRATION PROJECTS MANAGEMENT
  // ===========================================================================
  public getProjects(organizationId: string): IntegrationProject[] {
    return this.projects.filter((p) => p.organizationId === organizationId);
  }

  public getProject(organizationId: string, projectId: string): IntegrationProject | null {
    return this.projects.find((p) => p.organizationId === organizationId && p.id === projectId) || null;
  }

  public createProject(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      allowedOrigins: string[];
      country?: string;
      intendedUseCase?: string;
      defaultWorkflowId?: string;
      defaultVerificationProfileId?: string;
      integrationMethod?: IntegrationMethod;
      primaryIntegrationMethod?: IntegrationMethod;
      environment?: 'SANDBOX' | 'PRODUCTION';
    }
  ): IntegrationProject {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const method = data.primaryIntegrationMethod || data.integrationMethod || 'EMBEDDED_WEB_SDK';
    const newProject: IntegrationProject = {
      id: `prj_${organizationId.split('_')[1] || 'ext'}_${Date.now().toString().slice(-4)}`,
      organizationId,
      name: data.name,
      slug,
      description: data.description || '',
      allowedOrigins: data.allowedOrigins || [],
      country: data.country || 'KE',
      intendedUseCase: data.intendedUseCase || 'Customer identity verification for external application.',
      defaultWorkflowId: data.defaultWorkflowId || 'wf_apex_standard',
      defaultVerificationProfileId: data.defaultVerificationProfileId || 'prof_apex_loan',
      sandboxWorkflowId: data.defaultWorkflowId || 'wf_apex_standard',
      productionWorkflowId: data.defaultWorkflowId || 'wf_apex_standard',
      integrationMethod: method,
      primaryIntegrationMethod: method,
      sdkVersion: 'v1.0.0',
      status: 'ACTIVE',
      environment: data.environment || 'SANDBOX',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.projects.push(newProject);

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId: organizationId,
      actorId: 'usr_owner_01',
      actorName: 'Organization Owner',
      actorType: 'USER',
      action: 'INTEGRATION_PROJECT_CREATED',
      resourceType: 'INTEGRATION_PROJECT',
      resourceId: newProject.id,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { name: newProject.name, allowedOrigins: newProject.allowedOrigins },
    });

    return newProject;
  }

  public updateProject(organizationId: string, projectId: string, updates: Partial<IntegrationProject>): IntegrationProject {
    const project = this.getProject(organizationId, projectId);
    if (!project) throw new Error(`Project ${projectId} not found for organization ${organizationId}`);

    Object.assign(project, updates, { updatedAt: new Date().toISOString() });
    return project;
  }

  // ===========================================================================
  // ORGANIZATION ONBOARDING & PRODUCTION APPROVAL PIPELINE
  // ===========================================================================
  public getOnboardingApplication(organizationId: string): OrganizationOnboardingApplication | null {
    return this.onboardingApplications.find((a) => a.organizationId === organizationId) || null;
  }

  public getApprovalHistory(organizationId: string): OrganizationApprovalHistory[] {
    return this.approvalHistory.filter((h) => h.organizationId === organizationId);
  }

  public createOrUpdateOnboardingApplication(
    organizationId: string,
    data: Partial<OrganizationOnboardingApplication>
  ): OrganizationOnboardingApplication {
    let existing = this.getOnboardingApplication(organizationId);
    const org = this.organizations.find((o) => o.id === organizationId);

    if (!existing) {
      existing = {
        id: `app_${organizationId.split('_')[1] || 'ext'}_${Date.now().toString().slice(-4)}`,
        organizationId,
        legalBusinessName: data.legalBusinessName || org?.name || 'Registered Organization Ltd',
        tradingName: data.tradingName || '',
        country: data.country || 'Kenya',
        businessType: data.businessType || 'LIMITED_COMPANY',
        industry: data.industry || 'Digital Lending / FinTech',
        registrationNumber: data.registrationNumber || 'PVT-PENDING',
        website: data.website || 'https://example.com',
        contactName: data.contactName || 'Primary Contact',
        contactEmail: data.contactEmail || 'contact@example.com',
        contactPhone: data.contactPhone || '+254700000000',
        intendedUseCase: data.intendedUseCase || 'Customer identity verification',
        expectedMonthlyVolume: data.expectedMonthlyVolume || 'LESS_THAN_1000',
        status: 'EMAIL_VERIFICATION_REQUIRED',
        emailVerified: false,
        emailVerificationToken: `vtok_${Math.random().toString(36).substring(2, 10)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.onboardingApplications.push(existing);
    } else {
      Object.assign(existing, data, { updatedAt: new Date().toISOString() });
    }

    return existing;
  }

  /**
   * Completes email verification step. Automatically transitions to SANDBOX_ACTIVE!
   */
  public verifyOrganizationEmail(organizationId: string): boolean {
    const app = this.getOnboardingApplication(organizationId);
    if (!app) return false;

    const prevStatus = app.status;
    app.emailVerified = true;
    app.status = 'SANDBOX_ACTIVE';
    app.updatedAt = new Date().toISOString();

    const org = this.organizations.find((o) => o.id === organizationId);
    if (org) {
      org.onboardingStatus = 'SANDBOX_ACTIVE';
    }

    this.approvalHistory.unshift({
      id: `aph_${Date.now()}`,
      organizationId,
      previousStatus: prevStatus,
      newStatus: 'SANDBOX_ACTIVE',
      changedBy: 'SYSTEM',
      changedByName: 'Automated Registration Gate',
      changedAt: new Date().toISOString(),
      reasonNotes: 'Business email confirmed. Granted automatic sandbox access for integration and testing.',
    });

    return true;
  }

  /**
   * Organization submits formal request for live production access
   */
  public submitProductionApplication(organizationId: string, docs?: any[]): OrganizationOnboardingApplication {
    const app = this.getOnboardingApplication(organizationId);
    if (!app) throw new Error(`Onboarding application not found for organization ${organizationId}`);

    const prevStatus = app.status;
    app.status = 'PRODUCTION_APPLICATION_SUBMITTED';
    app.submittedAt = new Date().toISOString();
    app.updatedAt = new Date().toISOString();
    if (docs) {
      app.complianceDocuments = docs;
    }

    const org = this.organizations.find((o) => o.id === organizationId);
    if (org) {
      org.onboardingStatus = 'PRODUCTION_APPLICATION_SUBMITTED';
    }

    this.approvalHistory.unshift({
      id: `aph_${Date.now()}`,
      organizationId,
      previousStatus: prevStatus,
      newStatus: 'PRODUCTION_APPLICATION_SUBMITTED',
      changedBy: 'usr_owner',
      changedByName: app.contactName,
      changedAt: new Date().toISOString(),
      reasonNotes: 'Organization submitted corporate documents and applied for live production activation.',
    });

    return app;
  }

  /**
   * Internal ICE Staff Review in Platform Console
   */
  public reviewOrganizationApplication(
    organizationId: string,
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO' | 'SUSPEND' | 'REINSTATE',
    reviewerId: string,
    reviewerName: string,
    notes: string
  ): OrganizationOnboardingApplication {
    const app = this.getOnboardingApplication(organizationId);
    if (!app) throw new Error(`Onboarding application not found for organization ${organizationId}`);

    const prevStatus = app.status;
    let newStatus: OrganizationOnboardingStatus = app.status;

    if (decision === 'APPROVE') {
      newStatus = 'PRODUCTION_APPROVED';
      app.status = 'PRODUCTION_APPROVED';
      app.reviewedAt = new Date().toISOString();
      app.reviewerId = reviewerId;
      app.reviewerName = reviewerName;
      app.reviewNotes = notes;

      const org = this.organizations.find((o) => o.id === organizationId);
      if (org) {
        org.onboardingStatus = 'PRODUCTION_APPROVED';
        org.environment = 'PRODUCTION';
        org.productionApprovedAt = new Date().toISOString();
        org.productionApprovedBy = reviewerId;
      }
    } else if (decision === 'REJECT') {
      newStatus = 'PRODUCTION_REJECTED';
      app.status = 'PRODUCTION_REJECTED';
      app.reviewedAt = new Date().toISOString();
      app.reviewerId = reviewerId;
      app.reviewerName = reviewerName;
      app.rejectionReason = notes;

      const org = this.organizations.find((o) => o.id === organizationId);
      if (org) org.onboardingStatus = 'PRODUCTION_REJECTED';
    } else if (decision === 'REQUEST_MORE_INFO') {
      newStatus = 'ADDITIONAL_INFORMATION_REQUIRED';
      app.status = 'ADDITIONAL_INFORMATION_REQUIRED';
      app.additionalInfoRequested = notes;

      const org = this.organizations.find((o) => o.id === organizationId);
      if (org) org.onboardingStatus = 'ADDITIONAL_INFORMATION_REQUIRED';
    } else if (decision === 'SUSPEND') {
      newStatus = 'SUSPENDED';
      app.status = 'SUSPENDED';

      const org = this.organizations.find((o) => o.id === organizationId);
      if (org) org.onboardingStatus = 'SUSPENDED';
    } else if (decision === 'REINSTATE') {
      newStatus = 'PRODUCTION_APPROVED';
      app.status = 'PRODUCTION_APPROVED';

      const org = this.organizations.find((o) => o.id === organizationId);
      if (org) org.onboardingStatus = 'PRODUCTION_APPROVED';
    }

    app.updatedAt = new Date().toISOString();

    this.approvalHistory.unshift({
      id: `aph_${Date.now()}`,
      organizationId,
      previousStatus: prevStatus,
      newStatus,
      changedBy: reviewerId,
      changedByName: reviewerName,
      changedAt: new Date().toISOString(),
      reasonNotes: notes,
    });

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId: organizationId,
      actorId: reviewerId,
      actorName: reviewerName,
      actorType: 'ICE_STAFF',
      action: `ORGANIZATION_REVIEW_${decision}`,
      resourceType: 'ORGANIZATION',
      resourceId: organizationId,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { decision, notes },
    });

    return app;
  }

  // ===========================================================================
  // API CREDENTIALS LIFECYCLE
  // ===========================================================================
  public createApiCredential(
    organizationId: string,
    projectId: string | undefined,
    environment: 'SANDBOX' | 'PRODUCTION',
    name: string,
    scopes: string[] = ['verifications:create', 'verifications:read']
  ): { credential: ApiCredential; secretKey: string } {
    const org = this.organizations.find((o) => o.id === organizationId);
    if (environment === 'PRODUCTION' && org?.onboardingStatus !== 'PRODUCTION_APPROVED') {
      throw new Error('[Security Policy Violation] Cannot generate production credentials: Organization has not completed formal ICE production approval.');
    }

    const keyPrefix = environment === 'PRODUCTION' ? 'ice_live_' : 'ice_test_';
    const randomSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const fullSecretKey = `${keyPrefix}${randomSecret}`;

    const newCred: ApiCredential = {
      id: `cred_${organizationId.split('_')[1] || 'ext'}_${Date.now().toString().slice(-4)}`,
      organizationId,
      projectId,
      name,
      environment,
      keyPrefix: fullSecretKey.substring(0, 12),
      keyHash: `sha256_${Date.now()}_hash`,
      secretMasked: `${fullSecretKey.substring(0, 12)}••••••••••••••••••••`,
      scopes,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    this.apiCredentials.unshift(newCred);

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId: organizationId,
      actorId: 'usr_owner_01',
      actorName: 'Organization Owner',
      actorType: 'USER',
      action: 'API_KEY_CREATED',
      resourceType: 'API_CREDENTIAL',
      resourceId: newCred.id,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { name: newCred.name, environment: newCred.environment },
    });

    return { credential: newCred, secretKey: fullSecretKey };
  }

  public rotateApiCredential(organizationId: string, credentialId: string): { oldCredential: ApiCredential; newCredential: ApiCredential; newSecretKey: string } {
    const old = this.apiCredentials.find((c) => c.organizationId === organizationId && c.id === credentialId);
    if (!old) throw new Error(`Credential ${credentialId} not found`);

    old.status = 'REVOKED';

    const { credential: newCred, secretKey } = this.createApiCredential(
      organizationId,
      old.projectId,
      old.environment,
      `${old.name} (Rotated)`
    );

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId: organizationId,
      actorId: 'usr_owner_01',
      actorName: 'Organization Owner',
      actorType: 'USER',
      action: 'API_KEY_ROTATED',
      resourceType: 'API_CREDENTIAL',
      resourceId: credentialId,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { oldId: old.id, newId: newCred.id },
    });

    return { oldCredential: old, newCredential: newCred, newSecretKey: secretKey };
  }

  public revokeApiCredential(organizationId: string, credentialId: string): ApiCredential {
    const cred = this.apiCredentials.find((c) => c.organizationId === organizationId && c.id === credentialId);
    if (!cred) throw new Error(`Credential ${credentialId} not found`);

    cred.status = 'REVOKED';

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId: organizationId,
      actorId: 'usr_owner_01',
      actorName: 'Organization Owner',
      actorType: 'USER',
      action: 'API_KEY_REVOKED',
      resourceType: 'API_CREDENTIAL',
      resourceId: credentialId,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { name: cred.name },
    });

    return cred;
  }

  // ===========================================================================
  // WEBHOOK ENGINE & DISPATCH
  // ===========================================================================
  public createWebhookEndpoint(
    organizationId: string,
    projectId: string | undefined,
    environment: 'SANDBOX' | 'PRODUCTION',
    url: string,
    events: string[]
  ): { endpoint: WebhookEndpoint; signingSecret: string } {
    // Validate HTTPS in production
    if (environment === 'PRODUCTION' && !url.startsWith('https://')) {
      throw new Error('[Security Error] Production webhook endpoints must use secure HTTPS.');
    }

    const signingSecret = WebhookEngine.generateSigningSecret();
    const newEndpoint: WebhookEndpoint = {
      id: `wh_${organizationId.split('_')[1] || 'ext'}_${Date.now().toString().slice(-4)}`,
      organizationId,
      projectId,
      environment,
      url,
      events,
      signingSecret,
      secretMasked: `${signingSecret.substring(0, 10)}••••••••••••••••`,
      isActive: true,
      failureCount: 0,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    this.webhookEndpoints.unshift(newEndpoint);

    this.auditEvents.unshift({
      id: `aud_${Date.now()}`,
      tenantId: organizationId,
      actorId: 'usr_owner_01',
      actorName: 'Organization Owner',
      actorType: 'USER',
      action: 'WEBHOOK_ENDPOINT_CREATED',
      resourceType: 'WEBHOOK_ENDPOINT',
      resourceId: newEndpoint.id,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      details: { url, events },
    });

    return { endpoint: newEndpoint, signingSecret };
  }

  public triggerWebhookDelivery(
    tenantId: string,
    eventType: string,
    sessionData: any,
    projectId?: string
  ): WebhookDelivery[] {
    const matchingEndpoints = this.webhookEndpoints.filter(
      (ep) => ep.organizationId === tenantId && ep.isActive && (ep.events.includes(eventType) || ep.events.includes('*'))
    );

    const deliveries: WebhookDelivery[] = [];

    for (const ep of matchingEndpoints) {
      const payloadObj = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        event: eventType,
        timestamp: new Date().toISOString(),
        tenantId,
        projectId: ep.projectId || projectId,
        data: sessionData,
      };

      const payloadJson = JSON.stringify(payloadObj);
      const signature = WebhookEngine.signPayload(payloadJson, ep.signingSecret);

      const delivery: WebhookDelivery = {
        id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organizationId: tenantId,
        projectId: ep.projectId || projectId,
        endpointId: ep.id,
        eventType,
        payloadSnippet: payloadJson.substring(0, 200),
        payloadFull: payloadObj,
        statusCode: 200,
        deliveredAt: new Date().toISOString(),
        success: true,
        latencyMs: Math.floor(80 + Math.random() * 80),
        attemptCount: 1,
        signature,
      };

      ep.lastDeliveryAt = delivery.deliveredAt;
      ep.lastDeliveryStatus = 'SUCCESS';

      this.webhookDeliveries.unshift(delivery);
      deliveries.push(delivery);
    }

    return deliveries;
  }

  public retryWebhookDelivery(deliveryId: string): WebhookDelivery | null {
    const delivery = this.webhookDeliveries.find((d) => d.id === deliveryId);
    if (!delivery) return null;

    delivery.attemptCount += 1;
    delivery.deliveredAt = new Date().toISOString();
    delivery.statusCode = 200;
    delivery.success = true;
    delivery.latencyMs = Math.floor(90 + Math.random() * 50);

    return delivery;
  }

  // ===========================================================================
  // INTEGRATION LOGS & USAGE ANALYTICS
  // ===========================================================================
  public getIntegrationLogs(organizationId: string, projectId?: string): IntegrationLog[] {
    return this.integrationLogs.filter((l) => {
      if (l.organizationId !== organizationId) return false;
      if (projectId && l.projectId && l.projectId !== projectId) return false;
      return true;
    });
  }

  public recordIntegrationLog(log: Omit<IntegrationLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): IntegrationLog {
    const entry: IntegrationLog = {
      ...log,
      id: log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: log.timestamp || new Date().toISOString(),
    };
    this.integrationLogs.unshift(entry);
    return entry;
  }

  public getProjectUsage(organizationId: string, projectId?: string) {
    const orgSessions = this.sessions.filter((v) => {
      if (v.organizationId !== organizationId) return false;
      if (projectId && v.projectId && v.projectId !== projectId) return false;
      return true;
    });

    const orgLogs = this.getIntegrationLogs(organizationId, projectId);
    const orgDeliveries = this.webhookDeliveries.filter((d) => {
      if (d.organizationId !== organizationId) return false;
      if (projectId && d.projectId && d.projectId !== projectId) return false;
      return true;
    });

    const sessionsCreated = orgSessions.length;
    const completedSessions = orgSessions.filter((s) => s.status === 'VERIFIED' || s.status === 'REJECTED').length;
    const failedSessions = orgSessions.filter((s) => s.status === 'REJECTED').length;
    const approvedStp = orgSessions.filter((s) => s.status === 'VERIFIED').length;
    const routedToReview = orgSessions.filter((s) => s.status === 'NEEDS_REVIEW').length;
    const stpRate = sessionsCreated > 0 ? ((approvedStp / sessionsCreated) * 100).toFixed(1) : '100.0';
    const apiRequests = orgLogs.length;
    const webhookDeliveriesCount = orgDeliveries.length;
    const successfulDeliveries = orgDeliveries.filter((d) => d.success).length;

    return {
      totalSessions: sessionsCreated,
      sessionsCreated,
      completedSessions,
      failedSessions,
      approvedStp,
      stpRate,
      routedToReview,
      rejected: failedSessions,
      apiRequests,
      webhookDeliveries: webhookDeliveriesCount,
      webhookDeliveryRate: webhookDeliveriesCount > 0 ? ((successfulDeliveries / webhookDeliveriesCount) * 100).toFixed(1) : '100.0',
      monthlyAllowance: 10000,
      monthlyConsumed: sessionsCreated,
      isSyntheticDemoData: true,
    };
  }

  public recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const newEvent: AuditEvent = {
      ...event,
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditEvents.unshift(newEvent);
    return newEvent;
  }
}

// Global singleton instance
export const db = new SyntheticDatabase();
