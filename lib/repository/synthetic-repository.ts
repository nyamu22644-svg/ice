// ICE Synthetic Identity Repository
// Preserves full working in-memory demonstration state while implementing the standard repository interface.

import { db } from '../store/synthetic-db';
import { 
  IdentityRepository, 
  CreateSessionInput, 
  DecidedResult,
  ConnectionInfo
} from './identity-repository';
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
  OrganizationRole 
} from '../types';

export class SyntheticIdentityRepository implements IdentityRepository {
  async getOrganizations(): Promise<Organization[]> {
    return [...db.organizations];
  }

  async getOrganizationById(tenantId: string): Promise<Organization | null> {
    return db.organizations.find((o) => o.id === tenantId) || null;
  }

  async getProjects(tenantId: string): Promise<IntegrationProject[]> {
    return db.getProjects(tenantId);
  }

  async getProjectById(tenantId: string, projectId: string): Promise<IntegrationProject | null> {
    return db.getProjects(tenantId).find((p) => p.id === projectId) || null;
  }

  async createProject(tenantId: string, data: Partial<IntegrationProject>): Promise<IntegrationProject> {
    return db.createProject(tenantId, {
      name: data.name || 'Untitled Integration Project',
      allowedOrigins: data.allowedOrigins || [],
      ...data,
    });
  }

  async updateProject(tenantId: string, projectId: string, patch: Partial<IntegrationProject>): Promise<IntegrationProject> {
    const updated = db.updateProject(tenantId, projectId, patch);
    if (!updated) {
      throw new Error(`Project ${projectId} not found.`);
    }
    return updated;
  }

  async getVerificationProfiles(tenantId: string): Promise<VerificationProfile[]> {
    return db.getVerificationProfiles(tenantId);
  }

  async getVerificationProfileById(tenantId: string, profileId: string): Promise<VerificationProfile | null> {
    return db.getVerificationProfiles(tenantId).find((p) => p.id === profileId) || null;
  }

  async createVerificationProfile(tenantId: string, profile: Partial<VerificationProfile>): Promise<VerificationProfile> {
    return db.createVerificationProfile(tenantId, profile);
  }

  async publishVerificationProfile(tenantId: string, profileId: string): Promise<VerificationProfile> {
    return db.publishVerificationProfile(tenantId, profileId);
  }

  async getVerifications(tenantId: string, role: OrganizationRole): Promise<VerificationSession[]> {
    return db.getVerifications(tenantId, role);
  }

  async getVerificationById(tenantId: string, sessionId: string, role: OrganizationRole): Promise<VerificationSession> {
    return db.getVerificationById(tenantId, sessionId, role);
  }

  async createSession(tenantId: string, input: CreateSessionInput): Promise<VerificationSession> {
    return db.createSession(tenantId, {
      fullName: input.fullName,
      dob: input.dob,
      idNumber: input.idNumber,
      email: input.email,
      phone: input.phone,
      workflowId: input.workflowId,
      verificationProfileId: input.verificationProfileId,
      projectId: input.projectId,
      customerReferenceId: input.customerReferenceId,
      environment: input.environment,
    });
  }

  async recordDecision(
    tenantId: string,
    sessionId: string,
    reviewerId: string,
    reviewerName: string,
    role: OrganizationRole,
    decision: DecidedResult
  ): Promise<VerificationSession> {
    return db.recordDecision(tenantId, sessionId, reviewerId, reviewerName, role, decision);
  }

  async getWorkflows(tenantId: string): Promise<Workflow[]> {
    return db.workflows.filter((w) => w.organizationId === tenantId);
  }

  async getWorkflowExecutions(tenantId: string, verificationId: string): Promise<any[]> {
    return db.getWorkflowExecutions(tenantId, verificationId);
  }

  simulateWorkflow(tenantId: string, workflowId: string, scenario: any): any {
    return db.simulateWorkflow(tenantId, workflowId, scenario);
  }

  async getPeople(tenantId: string, role: OrganizationRole = 'KYC_REVIEWER'): Promise<Person[]> {
    return db.getPeople(tenantId, role);
  }

  async getPersonById(tenantId: string, personId: string, role: OrganizationRole = 'KYC_REVIEWER'): Promise<Person> {
    return db.getPersonById(tenantId, personId, role);
  }

  async getCases(tenantId: string, role: OrganizationRole = 'KYC_REVIEWER', filter?: string): Promise<InvestigationCase[]> {
    return db.getCases(tenantId, role, filter);
  }

  async getCaseById(tenantId: string, caseId: string, role: OrganizationRole = 'KYC_REVIEWER'): Promise<InvestigationCase> {
    return db.getCaseById(tenantId, caseId, role);
  }

  async createCase(tenantId: string, input: any, role: OrganizationRole, actorName: string): Promise<InvestigationCase> {
    return db.createCase(tenantId, input, role, actorName);
  }

  async getCustomers(tenantId: string): Promise<Person[]> {
    return db.people.filter((c) => c.organizationId === tenantId);
  }

  async getAuditEvents(tenantId: string): Promise<AuditEvent[]> {
    return db.auditEvents.filter((a) => a.tenantId === tenantId);
  }

  async recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    return db.recordAuditEvent(event);
  }

  async getApiCredentials(tenantId: string, projectId?: string): Promise<ApiCredential[]> {
    return db.apiCredentials.filter((c) => {
      if (c.organizationId !== tenantId) return false;
      if (projectId && c.projectId && c.projectId !== projectId) return false;
      return true;
    });
  }

  async createApiCredential(tenantId: string, input: any): Promise<ApiCredential> {
    const res = db.createApiCredential(
      tenantId,
      input.projectId,
      input.environment || 'SANDBOX',
      input.name || 'API Key',
      input.scopes || ['verifications:create', 'verifications:read']
    );
    return res.credential;
  }

  async rotateApiCredential(tenantId: string, credentialId: string): Promise<ApiCredential> {
    const res = db.rotateApiCredential(tenantId, credentialId);
    return res.newCredential;
  }

  async revokeApiCredential(tenantId: string, credentialId: string): Promise<boolean> {
    const cred = db.revokeApiCredential(tenantId, credentialId);
    return cred.status === 'REVOKED';
  }

  async getWebhookEndpoints(tenantId: string, projectId?: string): Promise<WebhookEndpoint[]> {
    return db.webhookEndpoints.filter((w) => {
      if (w.organizationId !== tenantId) return false;
      if (projectId && w.projectId && w.projectId !== projectId) return false;
      return true;
    });
  }

  async createWebhookEndpoint(tenantId: string, input: any): Promise<WebhookEndpoint> {
    const res = db.createWebhookEndpoint(
      tenantId,
      input.projectId,
      input.environment || 'SANDBOX',
      input.url,
      input.events || ['session.completed']
    );
    return res.endpoint;
  }

  async getWebhookDeliveries(tenantId: string, projectId?: string): Promise<WebhookDelivery[]> {
    return db.webhookDeliveries.filter((d) => {
      if (d.organizationId !== tenantId) return false;
      if (projectId && d.projectId && d.projectId !== projectId) return false;
      return true;
    });
  }

  async recordWebhookDelivery(delivery: Partial<WebhookDelivery>): Promise<WebhookDelivery> {
    const record: WebhookDelivery = {
      id: delivery.id || `whd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      endpointId: delivery.endpointId || 'ep_sandbox',
      organizationId: delivery.organizationId || 'org_apex_fin',
      projectId: delivery.projectId,
      eventType: delivery.eventType || 'session.completed',
      payloadSnippet: delivery.payloadSnippet || JSON.stringify(delivery.payloadFull || {}),
      payloadFull: delivery.payloadFull,
      attemptCount: delivery.attemptCount || 1,
      statusCode: delivery.statusCode || 200,
      deliveredAt: delivery.deliveredAt || new Date().toISOString(),
      latencyMs: delivery.latencyMs || 45,
      signature: delivery.signature || 'sha256=test_sig',
      success: delivery.success !== false,
      error: delivery.error,
    };
    db.webhookDeliveries.unshift(record);
    return record;
  }

  async getIntegrationLogs(tenantId: string, projectId?: string): Promise<IntegrationLog[]> {
    return db.getIntegrationLogs(tenantId, projectId);
  }

  async recordIntegrationLog(log: Partial<IntegrationLog>): Promise<IntegrationLog> {
    return db.recordIntegrationLog({
      organizationId: log.organizationId || 'org_apex_fin',
      environment: log.environment || 'SANDBOX',
      method: log.method || 'GET',
      endpoint: log.endpoint || '/api/v1',
      statusCode: log.statusCode || 200,
      durationMs: log.durationMs || 25,
      requestId: log.requestId || `req_${Date.now()}`,
      clientIp: log.clientIp || '127.0.0.1',
      ...log,
    });
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      provider: 'SYNTHETIC_IN_MEMORY',
      isConnected: true,
      isAuthoritativeSourceConnected: false,
      statusMessage: 'Operating in local sandbox mode. Supabase Publishable Key and Secret Key not configured in environment secrets.',
      details: {
        hasPublishableKey: false,
        hasAnonKey: false,
        hasSecretKey: false,
        hasServiceRoleKey: false,
        keyType: 'NONE',
        keyDetails: 'No Supabase credentials detected in environment secrets. Using in-memory synthetic state.',
      },
    };
  }

  async testDatabaseConnection(): Promise<{ success: boolean; latencyMs: number; error?: string; provider: string }> {
    return {
      success: true,
      latencyMs: 1,
      provider: 'SYNTHETIC_IN_MEMORY',
    };
  }
}

export const syntheticRepo = new SyntheticIdentityRepository();
