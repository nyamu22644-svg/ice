// ICE Platform Core Type Definitions

export type DocumentType = 
  | 'KE_NATIONAL_ID'
  | 'KE_PASSPORT'
  | 'KE_ALIEN_ID'
  | 'KE_KRA_PIN'
  | 'SUPPORTING_DOCUMENT';

export type VerificationStatus = 
  | 'DRAFT'
  | 'PENDING_SUBMISSION'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'NEEDS_REVIEW'
  | 'NEEDS_MORE_INFORMATION'
  | 'REJECTED'
  | 'FAILED'
  | 'EXPIRED';

export type OrganizationRole = 
  | 'ORGANIZATION_OWNER'
  | 'ORGANIZATION_ADMIN'
  | 'COMPLIANCE_MANAGER'
  | 'KYC_REVIEWER'
  | 'FRAUD_ANALYST'
  | 'AUDITOR'
  | 'DEVELOPER'
  | 'OPERATIONS_ANALYST';

export type PlatformRole = 
  | 'PLATFORM_SUPER_ADMIN'
  | 'SECURITY_ADMIN'
  | 'PLATFORM_OPERATIONS'
  | 'SUPPORT_ENGINEER'
  | 'MODEL_ADMIN'
  | 'PRIVACY_OFFICER';

export type Permission = 
  | 'VERIFICATIONS_READ'
  | 'VERIFICATIONS_WRITE'
  | 'DOCUMENTS_VIEW_RAW'
  | 'DOCUMENTS_DOWNLOAD'
  | 'DECISIONS_OVERRIDE'
  | 'BIOMETRICS_VIEW'
  | 'RISK_RULES_MANAGE'
  | 'API_KEYS_MANAGE'
  | 'WEBHOOKS_MANAGE'
  | 'WORKFLOWS_MANAGE'
  | 'AUDIT_LOGS_VIEW'
  | 'TEAM_MANAGE'
  | 'PLATFORM_ADMIN'
  | 'SUPPORT_ACCESS_REQUEST';

export type OrganizationOnboardingStatus = 
  | 'DRAFT'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'SANDBOX_ACTIVE'
  | 'PRODUCTION_APPLICATION_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ADDITIONAL_INFORMATION_REQUIRED'
  | 'PRODUCTION_APPROVED'
  | 'PRODUCTION_REJECTED'
  | 'SUSPENDED';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  createdAt: string;
  dataRetentionDays: number;
  environment: 'SANDBOX' | 'PRODUCTION';
  authoritativeSourceConnected: boolean; // false by default
  onboardingStatus?: OrganizationOnboardingStatus;
  productionApprovedAt?: string;
  productionApprovedBy?: string;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: OrganizationRole;
  isActive: boolean;
}

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
  isOwner: boolean;
  permissions: Permission[];
  joinedAt: string;
}

export interface UnifiedUserAccount {
  id: string;
  email: string;
  fullName: string;
  organizations: OrganizationMembership[];
  activeOrganizationId: string;
  createdAt: string;
}

export type AutomatedOutcome = 
  | 'AUTOMATICALLY_APPROVED'
  | 'AUTOMATICALLY_REJECTED'
  | 'NEEDS_HUMAN_REVIEW'
  | 'WAITING_FOR_APPLICANT'
  | 'PROCESSING_FAILED'
  | 'EXTERNAL_CHECK_UNAVAILABLE';

export type EngineClassification = 
  | 'IMPLEMENTED_AND_TESTED'
  | 'SANDBOX_ONLY'
  | 'SIMULATED'
  | 'NOT_CONFIGURED'
  | 'PLANNED';

export interface EngineSpecification {
  id: string;
  name: string;
  category: 'DOCUMENT_QUALITY' | 'OCR_EXTRACTION' | 'DOCUMENT_FORENSICS' | 'BIOMETRICS_LIVENESS' | 'BIOMETRICS_1TO1' | 'RISK_INTELLIGENCE' | 'GOVERNMENT_GATEWAY' | 'SANCTIONS_PEP';
  version: string;
  classification: EngineClassification;
  isAutomated: boolean;
  benchmarkFarFrr?: string;
  honestStatusNotes: string;
}

export interface PipelineExecutionTrace {
  pipelineVersion: string;
  executedAt: string;
  totalDurationMs: number;
  stages: {
    informationCollection: {
      status: 'PASSED' | 'MISSING_FIELDS';
      fieldsCollected: string[];
    };
    documentQuality: {
      status: 'PASSED' | 'FAILED_RECAPTURE_REQUESTED';
      blurScore: number;
      glareDetected: boolean;
      resolutionDpi: number;
      fourCornersDetected: boolean;
      feedback: string[];
    };
    ocrExtraction: {
      status: 'PASSED' | 'PARTIAL' | 'FAILED';
      fieldConfidenceAverage: number;
      fieldsExtractedCount: number;
      discrepancies: string[];
    };
    documentAnalysis: {
      status: 'CONSISTENT' | 'SUSPECTED_ALTERATION' | 'ANOMALOUS_LAYOUT';
      classificationConfirmed: boolean;
      layoutConsistencyScore: number;
      alterationSignals: string[];
      securityFeaturesVerified: string[];
    };
    biometricVerification: {
      status: 'MATCH_CONFIRMED' | 'INCONCLUSIVE' | 'SPOOF_SUSPECTED' | 'NOT_CONFIGURED';
      livenessScore?: number;
      livenessMethod: string;
      faceSimilarityScore?: number;
      thresholdUsed: number;
      adapterName: string;
      explainableOutcome: string;
    };
    additionalChecks: {
      duplicateSubjectDetected: boolean;
      velocityCount: number;
      sanctionsStatus: 'NOT_CONFIGURED' | 'NOT_PERFORMED' | 'CLEAR' | 'MATCH';
      authoritativeGovCheckStatus: 'NOT_PERFORMED' | 'VERIFIED' | 'FAILED';
    };
    automatedDecision: {
      outcome: AutomatedOutcome;
      primaryReason: string;
      humanReviewRequired: boolean;
      escalationReason?: string;
      ruleTriggered?: string;
    };
  };
}

export interface AutomationOperationalMetrics {
  totalVerifications: number;
  automaticallyApprovedCount: number;
  automaticallyRejectedCount: number;
  automaticallyCompletedCount: number;
  stpRatePercent: number; // Straight-Through Processing rate %
  humanReviewCount: number;
  humanReviewRatePercent: number;
  recaptureRequestedCount: number;
  recaptureRatePercent: number;
  processingFailureCount: number;
  processingFailureRatePercent: number;
  avgAutomatedProcessingSeconds: number;
  avgManualReviewMinutes: number;
  evaluatedBenchmarkSamples: number;
  benchmarkFar: number; // False Acceptance Rate %
  benchmarkFrr: number; // False Rejection Rate %
}

export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: PlatformRole;
  mfaEnabled: boolean;
}

export interface IdentitySubject {
  id: string;
  nationalIdNumberHash: string; // Hash to prevent cross-tenant plaintext correlation
  primaryName: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// CORE RECORD TYPE A: Person (Organization-scoped ongoing identity record)
// -----------------------------------------------------------------------------
export interface Person {
  id: string; // per_...
  organizationId: string;
  externalReferenceId: string; // Supplied by company, e.g. ACC-KE-849201
  primaryName: string;
  dateOfBirth: string;
  nationalIdMasked: string; // e.g. 2847****
  nationalIdHash: string; // SHA-256 hash for privacy-preserving resolution
  phoneNumber: string;
  email: string;
  status: 'VERIFIED' | 'NEEDS_ATTENTION' | 'UNVERIFIED' | 'SUSPECTED_FRAUD';
  firstSeenAt: string;
  lastVerificationAt: string;
  verificationAttemptCount: number;
  resolutionPolicy: string; // e.g. 'EXACT_HASH_MATCH_WITH_ORG_SCOPED_ID'
  createdAt: string;
}

// Backward-compatible alias for existing imports
export type OrganizationCustomer = Person;

export interface ExtractedField {
  fieldName: string;
  label: string;
  value: string;
  confidenceScore: number; // 0.00 to 1.00
  validationStatus: 'VALID' | 'SUSPICIOUS' | 'FORMAT_MISMATCH';
  notes?: string;
}

export interface DocumentQualityResult {
  glareDetected: boolean;
  blurScore: number; // 0.00 (very blurry) to 1.00 (crisp)
  resolutionDpi: number;
  fourCornersDetected: boolean;
  passedQualityChecks: boolean;
  feedbackMessages: string[];
}

export interface IdentityDocument {
  id: string;
  organizationId: string;
  sessionId: string;
  documentType: DocumentType;
  side: 'FRONT' | 'BACK' | 'SINGLE';
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  storageRef: string; // Private S3 path: /tenants/{tenantId}/...
  uploadedAt: string;
  quality: DocumentQualityResult;
  extractedFields: ExtractedField[];
  visualTamperingDetected: boolean;
  tamperingConfidence: number;
}

export interface BiometricSession {
  id: string;
  organizationId: string;
  sessionId: string;
  consentRecorded: boolean;
  consentTimestamp?: string;
  selfieStorageRef?: string;
  livenessStatus: 'NOT_CONFIGURED' | 'NOT_PERFORMED' | 'CHALLENGE_PASSED' | 'SPOOF_SUSPECTED' | 'INCONCLUSIVE';
  livenessConfidence?: number;
  faceComparisonStatus: 'NOT_CONFIGURED' | 'NOT_PERFORMED' | 'MATCH_CONFIRMED' | 'NO_MATCH' | 'INCONCLUSIVE';
  faceSimilarityScore?: number; // 0.00 to 1.00
  thresholdUsed: number;
  engineVersion: string;
  reviewerEscalated: boolean;
  notes?: string;
}

export interface RiskIndicator {
  id: string;
  sessionId: string;
  signalType: 
    | 'DUPLICATE_DOCUMENT_HASH'
    | 'DOB_MISMATCH'
    | 'HIGH_VELOCITY_ATTEMPTS'
    | 'LOW_IMAGE_QUALITY'
    | 'UNUSUAL_GEO_LOCATION'
    | 'SUSPECTED_FONT_TAMPERING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  evidenceReference: string;
  timestamp: string;
  engineVersion: string;
}

export interface VerificationRequirement {
  requireDocument: boolean;
  allowedDocumentTypes: DocumentType[];
  requireSelfie: boolean;
  requireLiveness: boolean;
  allowFileUploadFallback: boolean;
  autoApproveRiskScoreThreshold: number; // e.g. 20 (lower = lower risk)
}

export type WorkflowStatus = 'DRAFT' | 'TESTING' | 'PUBLISHED' | 'ARCHIVED';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 
    | 'COLLECT_INFORMATION' 
    | 'CAPTURE_DOCUMENT' 
    | 'IMAGE_QUALITY_CHECK' 
    | 'OCR_EXTRACTION' 
    | 'CONSISTENCY_CHECK' 
    | 'CAPTURE_SELFIE' 
    | 'LIVENESS_CHECK' 
    | 'FACE_COMPARISON' 
    | 'AUTHORITATIVE_CHECK';
  isRequired: boolean;
  failureBehavior: 'ABORT' | 'FLAG_FOR_REVIEW' | 'REQUEST_RETRY' | 'CONTINUE';
  engineConfig?: {
    minQualityBlur?: number;
    minSimilarityScore?: number;
    requireFourCorners?: boolean;
  };
}

export interface WorkflowRule {
  id: string;
  conditionName: string;
  conditionExpression: string;
  action: 
    | 'COMPLETE_VERIFICATION' 
    | 'REQUEST_ADDITIONAL_INFO' 
    | 'SEND_TO_REVIEW_QUEUE' 
    | 'CREATE_INVESTIGATION_CASE' 
    | 'REJECT_SESSION';
  actionPayload?: Record<string, any>;
}

export interface Workflow {
  id: string;
  organizationId: string;
  name: string;
  version: string;
  status: WorkflowStatus;
  description: string;
  purpose: string;
  countryScope: string[];
  allowedDocumentTypes: DocumentType[];
  isDefault: boolean;
  steps: WorkflowStep[];
  rules: WorkflowRule[];
  requirements: VerificationRequirement;
  createdAt: string;
  publishedAt?: string;
}

// -----------------------------------------------------------------------------
// VERIFICATION PROFILE (Company-Facing Declarative Verification Architecture)
// Defines what ICE must collect, check, and process for a given purpose.
// Maps cleanly to an underlying immutable Workflow Version snapshot.
// -----------------------------------------------------------------------------
export type ProfileStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type IdentityCollectionMode = 
  | 'EXTRACT_FROM_DOCUMENT' // Default: capture document -> OCR extracts -> user confirms (minimizes typing)
  | 'MANUAL_ENTRY_FIRST'    // User types everything before upload
  | 'HYBRID';

export interface DocumentCaptureRule {
  documentType: DocumentType;
  requiredSides: 'FRONT_ONLY' | 'FRONT_AND_BACK' | 'PASSPORT_PAGE';
  allowUploadFallback: boolean;
  minResolutionDpi?: number;
}

export interface VerificationProfile {
  id: string; // e.g. prof_apex_standard, prof_apex_loan
  organizationId: string;
  name: string; // e.g. "Full Customer KYC", "Document Verification Only", "Loan Applicant KYC"
  slug: string;
  description: string;
  verificationPurpose: string; // e.g. 'FULL_CUSTOMER_KYC', 'DOCUMENT_ONLY', 'BIOMETRIC_ONLY', 'LOAN_APPLICANT_KYC'
  
  // Geographic & Language Scope
  countryScope: string[]; // e.g. ['KE'], ['KE', 'UG', 'TZ']
  supportedLanguages: string[]; // e.g. ['en', 'sw']

  // Documents Configuration
  allowedDocumentTypes: DocumentType[];
  documentCaptureRules: Record<string, DocumentCaptureRule>;
  identityCollectionMode: IdentityCollectionMode;
  
  // Optical & Quality Checks
  ocrEnabled: boolean;
  documentQualityChecks: {
    blurThreshold: number; // e.g. 0.70
    glareDetection: boolean;
    fourCornersDetection: boolean;
  };
  documentForensicChecks: {
    tamperingDetection: boolean;
    fontConsistency: boolean;
    layoutValidation: boolean;
  };

  // Biometrics Configuration
  selfieCaptureEnabled: boolean;
  livenessCheckEnabled: boolean;
  livenessMethod: 'ACTIVE_CHALLENGE' | 'PASSIVE_DETECTION' | 'NONE';
  faceComparisonEnabled: boolean;
  faceMatchThreshold: number; // e.g. 0.85

  // Additional Checks (transparent engine status)
  additionalChecks: {
    duplicateSubjectDetection: boolean;
    velocityCheck: boolean;
    sanctionsScreening: boolean; // clearly flagged: Sandbox/Simulated Only
    authoritativeGovCheck: boolean; // clearly flagged: Not Connected
  };

  // Recapture & Exception Rules
  recaptureRules: {
    maxRecaptureAttempts: number;
    allowManualReviewEscalation: boolean;
  };

  // Automated Decision & Review Routing
  decisionPolicy: {
    autoApproveEnabled: boolean;
    autoApproveRiskScoreThreshold: number; // e.g. 20
    routeToReviewQueueOnQualityFail: boolean;
    routeToCaseOnTampering: boolean;
  };

  // Customizable Applicant Instructions
  applicantInstructions?: {
    welcomeTitle?: string;
    welcomeSubtitle?: string;
    documentCaptureHelp?: string;
    selfieHelp?: string;
  };

  // Publishing & Versioning State
  status: ProfileStatus;
  version: string; // e.g. 'v1.0', 'v1.1', 'v2.0-draft'
  workflowVersionId: string; // Immutable bound Workflow / WorkflowVersion snapshot
  isDefault: boolean;
  environment: 'SANDBOX' | 'PRODUCTION';
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
  changelogNotes?: string;
}

export interface ProfileVersionHistory {
  id: string;
  profileId: string;
  organizationId: string;
  version: string;
  publishedAt: string;
  publishedBy: string;
  changelogNotes: string;
  snapshot: VerificationProfile;
}

export interface WorkflowExecutionRecord {
  id: string;
  verificationId: string;
  workflowId: string;
  workflowVersion: string;
  stepId: string;
  stepName: string;
  startedAt: string;
  completedAt: string;
  status: 'PASSED' | 'FAILED' | 'FLAGGED' | 'SKIPPED' | 'SIMULATED';
  outputReference?: string;
  failureReason?: string;
  actionTaken?: string;
}

export interface ReviewerAction {
  id: string;
  reviewerId: string;
  reviewerName: string;
  action: 'APPROVED' | 'REJECTED' | 'REQUESTED_INFO' | 'ESCALATED' | 'NOTE_ADDED';
  reasonCode?: string;
  notes: string;
  timestamp: string;
}

// -----------------------------------------------------------------------------
// CORE RECORD TYPE B: Verification (Specific attempt to verify a person)
// -----------------------------------------------------------------------------
export interface VerificationSession {
  id: string; // sess_...
  organizationId: string;
  personId: string; // Links to Person.id
  customerId: string; // Kept for backward compatibility
  externalReferenceId?: string;
  verificationPurpose: string; // e.g. 'TIER_1_KYC_ACCOUNT_OPENING', 'HIGH_VALUE_TX'
  
  // Bound Verification Profile & Underlying Immutable Workflow Version
  verificationProfileId?: string; // Links to VerificationProfile.id
  verificationProfileName?: string;
  workflowId: string;
  workflowVersion: string; // Immutable version snapshot
  identityCollectionMode?: IdentityCollectionMode;
  requiredStepsSummary?: string[]; // e.g. ['DOCUMENT_CAPTURE', 'OCR_CONFIRMATION', 'SELFIE_LIVENESS']
  
  status: VerificationStatus;
  
  // Person input
  submittedData: {
    fullName: string;
    dob: string;
    nationalIdNumber: string;
    nationality: string;
    phoneNumber: string;
    email: string;
  };

  // Associated Evidence
  documents: IdentityDocument[];
  biometrics?: BiometricSession;
  riskIndicators: RiskIndicator[];
  overallRiskScore: number; // 0 (lowest) to 100 (highest)
  
  // Authoritative Source Verification Status
  // ALWAYS explicitly marked NOT_PERFORMED unless an authorized government source (e.g., IPRS) is connected
  authoritativeCheckStatus: 'NOT_PERFORMED' | 'AUTHENTICATED' | 'RECORD_NOT_FOUND' | 'SERVICE_UNAVAILABLE';
  authoritativeCheckSource?: string;

  // Review history
  reviewerActions: ReviewerAction[];
  finalDecision?: {
    status: 'VERIFIED' | 'REJECTED';
    decidedBy: 'AUTOMATED_WORKFLOW' | 'HUMAN_REVIEWER';
    reason: string;
    timestamp: string;
  };

  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  isSyntheticDemo: boolean;

  // External Integration Context
  projectId?: string;
  environment?: 'SANDBOX' | 'PRODUCTION';
  returnUrl?: string;
  cancelUrl?: string;
  sessionToken?: string;
  integrationMethod?: 'HOSTED_VERIFICATION' | 'EMBEDDED_WEB_SDK' | 'REST_API' | 'NATIVE_MOBILE_SDK';
}

// -----------------------------------------------------------------------------
// CORE RECORD TYPE C: Case (Formal investigation requiring human attention)
// -----------------------------------------------------------------------------
export interface CaseNote {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface CaseAction {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
}

export interface InvestigationCase {
  id: string; // case_...
  organizationId: string;
  caseNumber: string; // e.g. CASE-2026-0041
  verificationId: string; // Links to VerificationSession.id
  personId: string; // Links to Person.id
  caseType: 
    | 'DOCUMENT_TAMPERING_INVESTIGATION' 
    | 'BIOMETRIC_SPOOF_INSPECTION' 
    | 'POLICY_ESCALATION' 
    | 'MANUAL_COMPLIANCE_AUDIT';
  reasonForOpening: string;
  openedBy: 'AUTOMATED_WORKFLOW_RULE' | 'HUMAN_REVIEWER' | 'FRAUD_ENGINE' | 'MANUAL_AUDIT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  status: 'OPEN' | 'IN_INVESTIGATION' | 'WAITING_FOR_EVIDENCE' | 'WAITING_FOR_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  slaTargetMinutes?: number | null; // Configured by policy only, otherwise null
  notes: CaseNote[];
  evidenceReferences: string[];
  actionHistory: CaseAction[];
  resolution?: {
    status: 'CLEARED' | 'FRAUD_CONFIRMED' | 'FALSE_POSITIVE' | 'ACCOUNT_BLOCKED';
    resolvedBy: string;
    reason: string;
    resolvedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  tenantId?: string; // undefined for platform-wide events
  actorId: string;
  actorName: string;
  actorType: 'USER' | 'API_KEY' | 'SYSTEM' | 'ICE_STAFF';
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  timestamp: string;
  details: Record<string, any>;
  sensitiveAccessJustification?: string;
}

export type IntegrationMethod = 
  | 'HOSTED_VERIFICATION' 
  | 'EMBEDDED_WEB_SDK' 
  | 'REST_API' 
  | 'NATIVE_MOBILE_SDK';

export interface IntegrationProject {
  id: string; // prj_...
  organizationId: string;
  name: string; // e.g. "Lending Application"
  slug: string; // e.g. "lending-application"
  description: string;
  allowedOrigins: string[]; // e.g. ["https://lending.example.com"]
  country: string; // "KE"
  intendedUseCase: string;
  defaultWorkflowId: string; // "wf_apex_standard"
  defaultVerificationProfileId?: string; // e.g. "prof_apex_standard" or "prof_apex_loan"
  sandboxWorkflowId: string;
  productionWorkflowId?: string;
  integrationMethod: IntegrationMethod;
  primaryIntegrationMethod?: IntegrationMethod;
  sdkVersion?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  environment: 'SANDBOX' | 'PRODUCTION';
  createdAt: string;
  updatedAt: string;
}

export interface ApiCredential {
  id: string;
  organizationId: string;
  projectId?: string;
  name: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  keyPrefix: string;
  keyHash: string; // sha256 representation, raw secret shown only once
  secretMasked: string; // e.g. "ice_test_••••••••"
  scopes: string[];
  status: 'ACTIVE' | 'REVOKED';
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface WebhookEndpoint {
  id: string;
  organizationId: string;
  projectId?: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  url: string;
  events: string[];
  signingSecret: string; // HMAC secret e.g. "whsec_..."
  secretMasked: string;
  isActive: boolean;
  failureCount: number;
  retryCount: number;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: 'SUCCESS' | 'FAILED';
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  organizationId: string;
  projectId?: string;
  endpointId: string;
  eventType: string;
  payloadSnippet: string;
  payloadFull?: any;
  statusCode: number;
  deliveredAt: string;
  success: boolean;
  latencyMs: number;
  attemptCount: number;
  signature: string;
  error?: string;
}

export interface OrganizationOnboardingApplication {
  id: string; // app_...
  organizationId: string;
  legalBusinessName: string;
  tradingName?: string;
  country: string; // e.g. "Kenya"
  businessType: 'LIMITED_COMPANY' | 'PARTNERSHIP' | 'SOLE_PROPRIETORSHIP' | 'FINANCIAL_INSTITUTION' | 'NGO';
  industry: string; // e.g. "Digital Lending / FinTech"
  registrationNumber: string; // e.g. "PVT-1928471"
  website: string; // e.g. "https://lending.example.com"
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  intendedUseCase: string; // e.g. "Automated KYC for digital micro-loans"
  expectedMonthlyVolume: 'LESS_THAN_1000' | '1000_TO_10000' | '10000_TO_50000' | '50000_PLUS';
  status: OrganizationOnboardingStatus;
  emailVerified: boolean;
  emailVerificationToken?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  additionalInfoRequested?: string;
  complianceDocuments?: { name: string; url: string; uploadedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationApprovalHistory {
  id: string;
  organizationId: string;
  previousStatus: OrganizationOnboardingStatus;
  newStatus: OrganizationOnboardingStatus;
  changedBy: string; // staff ID or SYSTEM
  changedByName: string;
  changedAt: string;
  reasonNotes: string;
}

export interface IntegrationLog {
  id: string;
  organizationId: string;
  projectId?: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  clientIp: string;
  timestamp: string;
  userAgent?: string;
  requestBodyMasked?: any;
  responseSnippet?: string;
  errorMessage?: string;
}
