// ICE Platform — Repository Interface Architecture
// Decouples UI components and API routes from the underlying data store, enabling seamless transition
// between local Synthetic In-Memory Mode and Supabase PostgreSQL.

import { 
  VerificationSession, 
  Organization, 
  Person,
  InvestigationCase,
  Workflow, 
  AuditEvent, 
  ApiCredential, 
  WebhookEndpoint, 
  WebhookDelivery,
  IntegrationProject,
  VerificationProfile,
  IntegrationLog,
  OrganizationRole,
} from '../types';

export interface DecidedResult {
  status: 'VERIFIED' | 'REJECTED' | 'NEEDS_MORE_INFORMATION' | 'ESCALATED';
  reason: string;
  reviewerId: string;
  reviewerName: string;
}

export interface CreateSessionInput {
  fullName: string;
  dob: string;
  idNumber: string;
  email: string;
  phone: string;
  workflowId?: string;
  verificationProfileId?: string;
  projectId?: string;
  customerReferenceId?: string;
  environment?: 'SANDBOX' | 'PRODUCTION';
}

export interface ConnectionInfo {
  provider: 'SYNTHETIC_IN_MEMORY' | 'SUPABASE_POSTGRESQL';
  isConnected: boolean;
  isAuthoritativeSourceConnected: boolean;
  statusMessage?: string;
  details?: {
    supabaseUrl?: string;
    hasPublishableKey: boolean;
    hasAnonKey: boolean;
    hasSecretKey: boolean;
    hasServiceRoleKey: boolean;
    keyType: 'MODERN_SECRETS' | 'LEGACY_KEYS' | 'MIXED' | 'NONE';
    keyDetails?: string;
  };
}

export interface IdentityRepository {
  // 1. Organizations
  getOrganizations(): Promise<Organization[]>;
  getOrganizationById(tenantId: string): Promise<Organization | null>;
  createOrganization?(data: Partial<Organization>): Promise<Organization>;

  // 2. Integration Projects
  getProjects(tenantId: string): Promise<IntegrationProject[]>;
  getProjectById(tenantId: string, projectId: string): Promise<IntegrationProject | null>;
  createProject(tenantId: string, data: Partial<IntegrationProject>): Promise<IntegrationProject>;
  updateProject(tenantId: string, projectId: string, patch: Partial<IntegrationProject>): Promise<IntegrationProject>;

  // 3. Verification Profiles
  getVerificationProfiles(tenantId: string): Promise<VerificationProfile[]>;
  getVerificationProfileById(tenantId: string, profileId: string): Promise<VerificationProfile | null>;
  createVerificationProfile(tenantId: string, profile: Partial<VerificationProfile>): Promise<VerificationProfile>;
  publishVerificationProfile(tenantId: string, profileId: string): Promise<VerificationProfile>;

  // 4. Immutable Workflows
  getWorkflows(tenantId: string): Promise<Workflow[]>;
  getWorkflowExecutions?(tenantId: string, verificationId: string): Promise<any[]>;
  simulateWorkflow?(tenantId: string, workflowId: string, scenario: any): any;

  // 5. Verification Sessions
  getVerifications(tenantId: string, role: OrganizationRole): Promise<VerificationSession[]>;
  getVerificationById(tenantId: string, sessionId: string, role: OrganizationRole): Promise<VerificationSession>;
  createSession(tenantId: string, input: CreateSessionInput): Promise<VerificationSession>;
  recordDecision(
    tenantId: string, 
    sessionId: string, 
    reviewerId: string, 
    reviewerName: string, 
    role: OrganizationRole, 
    decision: DecidedResult
  ): Promise<VerificationSession>;

  // 6. People & Customers
  getPeople(tenantId: string, role?: OrganizationRole): Promise<Person[]>;
  getPersonById?(tenantId: string, personId: string, role?: OrganizationRole): Promise<Person>;
  getCustomers(tenantId: string): Promise<Person[]>;

  // 7. Formal Cases & Escalations
  getCases(tenantId: string, role?: OrganizationRole, filter?: string): Promise<InvestigationCase[]>;
  getCaseById?(tenantId: string, caseId: string, role?: OrganizationRole): Promise<InvestigationCase>;
  createCase?(
    tenantId: string,
    input: any,
    role: OrganizationRole,
    actorName: string
  ): Promise<InvestigationCase>;

  // 8. API Credentials
  getApiCredentials(tenantId: string, projectId?: string): Promise<ApiCredential[]>;
  createApiCredential(tenantId: string, input: any): Promise<ApiCredential>;
  rotateApiCredential(tenantId: string, credentialId: string): Promise<ApiCredential>;
  revokeApiCredential(tenantId: string, credentialId: string): Promise<boolean>;

  // 9. Webhooks & Deliveries
  getWebhookEndpoints(tenantId: string, projectId?: string): Promise<WebhookEndpoint[]>;
  createWebhookEndpoint(tenantId: string, input: any): Promise<WebhookEndpoint>;
  getWebhookDeliveries(tenantId: string, projectId?: string): Promise<WebhookDelivery[]>;
  recordWebhookDelivery(delivery: Partial<WebhookDelivery>): Promise<WebhookDelivery>;

  // 10. Integration Logs & Audit
  getIntegrationLogs(tenantId: string, projectId?: string): Promise<IntegrationLog[]>;
  recordIntegrationLog(log: Partial<IntegrationLog>): Promise<IntegrationLog>;
  getAuditEvents(tenantId: string): Promise<AuditEvent[]>;
  recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent>;

  // 11. Health & Connection Diagnostics
  getConnectionInfo(): ConnectionInfo;
  testDatabaseConnection(): Promise<{ success: boolean; latencyMs: number; error?: string; provider: string }>;
}
