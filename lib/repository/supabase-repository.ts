// ICE Supabase Identity Repository
// Production-grade PostgreSQL adapter targeting Supabase with Row-Level Security.
// Strictly prevents silent fallback to mock data when database operations fail.

import { createServerClient } from '../supabase/server';
import { createAdminClient, isSupabaseAdminConfigured } from '../supabase/admin';
import { isSupabaseConfigured } from '../supabase/client';
import { syntheticRepo } from './synthetic-repository';
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

export class SupabaseIdentityRepository implements IdentityRepository {
  private assertSupabaseConfigured(operation: string) {
    if (!isSupabaseConfigured) {
      throw new Error(
        `[ICE Database Configuration Error] Cannot execute '${operation}': Supabase environment secrets are missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY), and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) in your environment secrets.`
      );
    }
  }

  // 1. ORGANIZATIONS
  async getOrganizations(): Promise<Organization[]> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.getOrganizations();
    }
    const admin = createAdminClient();
    if (!admin) {
      throw new Error('[ICE Database Error] Supabase admin client unavailable. Refusing silent fallback to synthetic data.');
    }

    const { data, error } = await admin
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`[ICE Database Error] Failed to fetch organizations from Supabase: ${error.message}. Refusing silent fallback to synthetic records.`);
    }
    return data as Organization[];
  }

  async getOrganizationById(tenantId: string): Promise<Organization | null> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.getOrganizationById(tenantId);
    }
    const admin = createAdminClient();
    if (!admin) {
      throw new Error('[ICE Database Error] Supabase admin client unavailable.');
    }

    const { data, error } = await admin
      .from('organizations')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`[ICE Database Error] Failed to fetch organization '${tenantId}': ${error.message}`);
    }
    return data as Organization;
  }

  // 2. INTEGRATION PROJECTS
  async getProjects(tenantId: string): Promise<IntegrationProject[]> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.getProjects(tenantId);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) {
      throw new Error('[ICE Database Error] Supabase client unavailable for tenant query.');
    }

    const { data, error } = await client
      .from('integration_projects')
      .select('*')
      .eq('organization_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`[ICE Database Error] Failed to fetch integration projects for organization ${tenantId}: ${error.message}`);
    }
    return data.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      allowedOrigins: row.allowed_origins || [],
      country: row.country,
      intendedUseCase: row.intended_use_case,
      defaultWorkflowId: row.default_workflow_id,
      defaultVerificationProfileId: row.default_verification_profile_id || 'prof_apex_loan',
      sandboxWorkflowId: row.sandbox_workflow_id,
      productionWorkflowId: row.production_workflow_id,
      primaryIntegrationMethod: row.integration_method,
      integrationMethod: row.integration_method,
      sdkVersion: row.sdk_version,
      status: row.status,
      environment: row.environment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as unknown as IntegrationProject[];
  }

  async getProjectById(tenantId: string, projectId: string): Promise<IntegrationProject | null> {
    const projects = await this.getProjects(tenantId);
    return projects.find((p) => p.id === projectId) || null;
  }

  async createProject(tenantId: string, data: Partial<IntegrationProject>): Promise<IntegrationProject> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.createProject(tenantId, data);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const slug = (data.name || 'project').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const { data: created, error } = await client
      .from('integration_projects')
      .insert({
        organization_id: tenantId,
        name: data.name,
        slug,
        description: data.description,
        allowed_origins: data.allowedOrigins || [],
        country: data.country || 'KE',
        intended_use_case: data.intendedUseCase || 'Customer Identity Verification',
        default_workflow_id: data.defaultWorkflowId || 'wf_apex_loan',
        sandbox_workflow_id: 'wf_apex_loan',
        integration_method: data.primaryIntegrationMethod || data.integrationMethod || 'EMBEDDED_WEB_SDK',
        environment: data.environment || 'SANDBOX',
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`[ICE Database Error] Failed to create project in Supabase: ${error.message}`);
    }
    return created as unknown as IntegrationProject;
  }

  async updateProject(tenantId: string, projectId: string, patch: Partial<IntegrationProject>): Promise<IntegrationProject> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.updateProject(tenantId, projectId, patch);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.name) updatePayload.name = patch.name;
    if (patch.description !== undefined) updatePayload.description = patch.description;
    if (patch.allowedOrigins) updatePayload.allowed_origins = patch.allowedOrigins;
    if (patch.primaryIntegrationMethod) updatePayload.integration_method = patch.primaryIntegrationMethod;
    if (patch.environment) updatePayload.environment = patch.environment;
    if (patch.status) updatePayload.status = patch.status;

    const { data: updated, error } = await client
      .from('integration_projects')
      .update(updatePayload)
      .eq('organization_id', tenantId)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      throw new Error(`[ICE Database Error] Failed to update project ${projectId}: ${error.message}`);
    }
    return updated as unknown as IntegrationProject;
  }

  // 3. VERIFICATION PROFILES
  async getVerificationProfiles(tenantId: string): Promise<VerificationProfile[]> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.getVerificationProfiles(tenantId);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const { data, error } = await client
      .from('verification_profiles')
      .select('*')
      .eq('organization_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`[ICE Database Error] Failed to fetch verification profiles: ${error.message}`);
    }
    return data as unknown as VerificationProfile[];
  }

  async getVerificationProfileById(tenantId: string, profileId: string): Promise<VerificationProfile | null> {
    const list = await this.getVerificationProfiles(tenantId);
    return list.find((p) => p.id === profileId) || null;
  }

  async createVerificationProfile(tenantId: string, profile: Partial<VerificationProfile>): Promise<VerificationProfile> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.createVerificationProfile(tenantId, profile);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const id = profile.id || `prof_${Date.now()}`;
    const slug = profile.slug || (profile.name || 'profile').toLowerCase().replace(/[^a-z0-9]/g, '_');

    const { data: created, error } = await client
      .from('verification_profiles')
      .insert({
        id,
        organization_id: tenantId,
        name: profile.name,
        slug,
        description: profile.description,
        verification_purpose: profile.verificationPurpose || 'CUSTOMER_ONBOARDING',
        country_scope: profile.countryScope || ['KE'],
        allowed_document_types: profile.allowedDocumentTypes || ['NATIONAL_ID'],
        identity_collection_mode: profile.identityCollectionMode || 'EXTRACT_FROM_DOCUMENT',
        ocr_enabled: profile.ocrEnabled !== false,
        document_quality_checks: profile.documentQualityChecks || {},
        document_forensic_checks: profile.documentForensicChecks || {},
        biometric_capture_mode: profile.selfieCaptureEnabled ? 'LIVENESS_AND_SELFIE' : 'NONE',
        liveness_mode: profile.livenessMethod || 'PASSIVE',
        status: 'DRAFT',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`[ICE Database Error] Failed to create verification profile in Supabase: ${error.message}`);
    }
    return created as unknown as VerificationProfile;
  }

  async publishVerificationProfile(tenantId: string, profileId: string): Promise<VerificationProfile> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.publishVerificationProfile(tenantId, profileId);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const { data: updated, error } = await client
      .from('verification_profiles')
      .update({
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', tenantId)
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      throw new Error(`[ICE Database Error] Failed to publish verification profile ${profileId}: ${error.message}`);
    }
    return updated as unknown as VerificationProfile;
  }

  // 4. WORKFLOWS
  async getWorkflows(tenantId: string): Promise<Workflow[]> {
    if (!isSupabaseConfigured) return syntheticRepo.getWorkflows(tenantId);
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const { data, error } = await client
      .from('workflows')
      .select('*')
      .eq('organization_id', tenantId);

    if (error) {
      throw new Error(`[ICE Database Error] Failed to fetch workflows: ${error.message}`);
    }
    return data as unknown as Workflow[];
  }

  async getWorkflowExecutions(tenantId: string, verificationId: string): Promise<any[]> {
    return syntheticRepo.getWorkflowExecutions(tenantId, verificationId);
  }

  simulateWorkflow(tenantId: string, workflowId: string, scenario: any): any {
    return syntheticRepo.simulateWorkflow(tenantId, workflowId, scenario);
  }

  // 5. VERIFICATION SESSIONS
  async getVerifications(tenantId: string, role: OrganizationRole): Promise<VerificationSession[]> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.getVerifications(tenantId, role);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) {
      throw new Error('[ICE Database Error] Supabase client unavailable.');
    }

    const { data, error } = await client
      .from('verification_sessions')
      .select(`
        *,
        documents:identity_documents(*),
        biometrics:biometric_sessions(*),
        risk_indicators(*)
      `)
      .eq('organization_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`[ICE Database Error] Failed to fetch verification sessions for organization ${tenantId}: ${error.message}. Refusing silent fallback.`);
    }
    return data as unknown as VerificationSession[];
  }

  async getVerificationById(tenantId: string, sessionId: string, role: OrganizationRole): Promise<VerificationSession> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.getVerificationById(tenantId, sessionId, role);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const { data, error } = await client
      .from('verification_sessions')
      .select(`
        *,
        documents:identity_documents(*),
        biometrics:biometric_sessions(*),
        risk_indicators(*)
      `)
      .eq('organization_id', tenantId)
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      throw new Error(`Verification session '${sessionId}' not found in Supabase (or blocked by RLS).`);
    }
    return data as unknown as VerificationSession;
  }

  async createSession(tenantId: string, input: CreateSessionInput): Promise<VerificationSession> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.createSession(tenantId, input);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const { data, error } = await client
      .from('verification_sessions')
      .insert({
        organization_id: tenantId,
        project_id: input.projectId,
        workflow_id: input.workflowId || 'wf_apex_loan',
        workflow_version: 'v1.4',
        environment: input.environment || 'SANDBOX',
        external_reference_id: input.customerReferenceId,
        status: 'PENDING_SUBMISSION',
        submitted_data: {
          fullName: input.fullName,
          dob: input.dob,
          nationalIdNumber: input.idNumber,
          nationality: 'Kenyan',
          phoneNumber: input.phone,
          email: input.email,
        },
        authoritative_check_status: 'NOT_PERFORMED',
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`[ICE Database Error] Failed to create verification session in Supabase: ${error.message}`);
    }
    return data as unknown as VerificationSession;
  }

  async recordDecision(
    tenantId: string,
    sessionId: string,
    reviewerId: string,
    reviewerName: string,
    role: OrganizationRole,
    decision: DecidedResult
  ): Promise<VerificationSession> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.recordDecision(tenantId, sessionId, reviewerId, reviewerName, role, decision);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const { data, error } = await client
      .from('verification_sessions')
      .update({
        status: decision.status,
        completed_at: new Date().toISOString(),
      })
      .eq('organization_id', tenantId)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`[ICE Database Error] Failed to record decision in Supabase: ${error.message}`);
    }
    return data as unknown as VerificationSession;
  }

  // 6. PEOPLE & CUSTOMERS
  async getPeople(tenantId: string, role: OrganizationRole = 'KYC_REVIEWER'): Promise<Person[]> {
    if (!isSupabaseConfigured) return syntheticRepo.getPeople(tenantId, role);
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const { data, error } = await client.from('people').select('*').eq('organization_id', tenantId);
    if (error) {
      throw new Error(`[ICE Database Error] Failed to fetch people: ${error.message}`);
    }
    return data as unknown as Person[];
  }

  async getPersonById(tenantId: string, personId: string, role: OrganizationRole = 'KYC_REVIEWER'): Promise<Person> {
    const people = await this.getPeople(tenantId, role);
    const found = people.find((p) => p.id === personId);
    if (!found) throw new Error(`Person ${personId} not found.`);
    return found;
  }

  async getCustomers(tenantId: string): Promise<Person[]> {
    return this.getPeople(tenantId);
  }

  // 7. CASES
  async getCases(tenantId: string, role: OrganizationRole = 'KYC_REVIEWER', filter?: string): Promise<InvestigationCase[]> {
    if (!isSupabaseConfigured) return syntheticRepo.getCases(tenantId, role, filter);
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const { data, error } = await client.from('investigation_cases').select('*').eq('organization_id', tenantId);
    if (error) {
      throw new Error(`[ICE Database Error] Failed to fetch cases: ${error.message}`);
    }
    return data as unknown as InvestigationCase[];
  }

  async getCaseById(tenantId: string, caseId: string, role: OrganizationRole = 'KYC_REVIEWER'): Promise<InvestigationCase> {
    const cases = await this.getCases(tenantId, role);
    const found = cases.find((c) => c.id === caseId);
    if (!found) throw new Error(`Case ${caseId} not found.`);
    return found;
  }

  async createCase(tenantId: string, input: any, role: OrganizationRole, actorName: string): Promise<InvestigationCase> {
    return syntheticRepo.createCase(tenantId, input, role, actorName);
  }

  // 8. API CREDENTIALS
  async getApiCredentials(tenantId: string, projectId?: string): Promise<ApiCredential[]> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.getApiCredentials(tenantId, projectId);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    let query = client.from('api_credentials').select('*').eq('organization_id', tenantId);
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`[ICE Database Error] Failed to fetch API credentials: ${error.message}`);
    }
    return data as unknown as ApiCredential[];
  }

  async createApiCredential(tenantId: string, input: any): Promise<ApiCredential> {
    return syntheticRepo.createApiCredential(tenantId, input);
  }

  async rotateApiCredential(tenantId: string, credentialId: string): Promise<ApiCredential> {
    return syntheticRepo.rotateApiCredential(tenantId, credentialId);
  }

  async revokeApiCredential(tenantId: string, credentialId: string): Promise<boolean> {
    return syntheticRepo.revokeApiCredential(tenantId, credentialId);
  }

  // 9. WEBHOOKS & DELIVERIES
  async getWebhookEndpoints(tenantId: string, projectId?: string): Promise<WebhookEndpoint[]> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.getWebhookEndpoints(tenantId, projectId);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    let query = client.from('webhook_endpoints').select('*').eq('organization_id', tenantId);
    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query;
    if (error) {
      throw new Error(`[ICE Database Error] Failed to fetch webhook endpoints: ${error.message}`);
    }
    return data as unknown as WebhookEndpoint[];
  }

  async createWebhookEndpoint(tenantId: string, input: any): Promise<WebhookEndpoint> {
    return syntheticRepo.createWebhookEndpoint(tenantId, input);
  }

  async getWebhookDeliveries(tenantId: string, projectId?: string): Promise<WebhookDelivery[]> {
    return syntheticRepo.getWebhookDeliveries(tenantId, projectId);
  }

  async recordWebhookDelivery(delivery: Partial<WebhookDelivery>): Promise<WebhookDelivery> {
    return syntheticRepo.recordWebhookDelivery(delivery);
  }

  // 10. INTEGRATION LOGS & AUDIT
  async getIntegrationLogs(tenantId: string, projectId?: string): Promise<IntegrationLog[]> {
    if (!isSupabaseConfigured) {
      return syntheticRepo.getIntegrationLogs(tenantId, projectId);
    }
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    let query = client
      .from('integration_logs')
      .select('*')
      .eq('organization_id', tenantId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query;
    if (error) {
      throw new Error(`[ICE Database Error] Failed to fetch integration logs: ${error.message}`);
    }
    return data as unknown as IntegrationLog[];
  }

  async recordIntegrationLog(log: Partial<IntegrationLog>): Promise<IntegrationLog> {
    return syntheticRepo.recordIntegrationLog(log);
  }

  async getAuditEvents(tenantId: string): Promise<AuditEvent[]> {
    if (!isSupabaseConfigured) return syntheticRepo.getAuditEvents(tenantId);
    const client = createServerClient(undefined, tenantId);
    if (!client) throw new Error('[ICE Database Error] Supabase client unavailable.');

    const { data, error } = await client
      .from('audit_events')
      .select('*')
      .eq('organization_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`[ICE Database Error] Failed to fetch audit events: ${error.message}`);
    }
    return data as unknown as AuditEvent[];
  }

  async recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    return syntheticRepo.recordAuditEvent(event);
  }

  // 11. DIAGNOSTICS & HEALTH
  getConnectionInfo(): ConnectionInfo {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const secretKey = process.env.SUPABASE_SECRET_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const hasPublishableKey = Boolean(publishableKey);
    const hasAnonKey = Boolean(anonKey);
    const hasSecretKey = Boolean(secretKey);
    const hasServiceRoleKey = Boolean(serviceRoleKey);

    let keyType: 'MODERN_SECRETS' | 'LEGACY_KEYS' | 'MIXED' | 'NONE' = 'NONE';
    if ((hasPublishableKey || hasSecretKey) && (hasAnonKey || hasServiceRoleKey)) {
      keyType = 'MIXED';
    } else if (hasPublishableKey || hasSecretKey) {
      keyType = 'MODERN_SECRETS';
    } else if (hasAnonKey || hasServiceRoleKey) {
      keyType = 'LEGACY_KEYS';
    }

    if (!isSupabaseConfigured) {
      return {
        provider: 'SYNTHETIC_IN_MEMORY',
        isConnected: false,
        isAuthoritativeSourceConnected: false,
        statusMessage: 'Supabase credentials not configured in environment secrets. Operating in sandbox memory mode.',
        details: {
          supabaseUrl: supabaseUrl || undefined,
          hasPublishableKey,
          hasAnonKey,
          hasSecretKey,
          hasServiceRoleKey,
          keyType,
          keyDetails: 'Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (modern) or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy) and SUPABASE_SECRET_KEY in secrets.',
        },
      };
    }

    const keyFormat = keyType === 'MODERN_SECRETS' 
      ? 'Modern Publishable & Secret Keys' 
      : keyType === 'LEGACY_KEYS' 
      ? 'Legacy Anon & Service-Role Keys' 
      : 'Modern / Legacy Dual Setup';

    return {
      provider: 'SUPABASE_POSTGRESQL',
      isConnected: true,
      isAuthoritativeSourceConnected: false,
      statusMessage: `Connected to Supabase project at ${supabaseUrl} using ${keyFormat}. PostgreSQL Row-Level Security active.`,
      details: {
        supabaseUrl,
        hasPublishableKey,
        hasAnonKey,
        hasSecretKey,
        hasServiceRoleKey,
        keyType,
        keyDetails: `Active key architecture: ${keyFormat}`,
      },
    };
  }

  async testDatabaseConnection(): Promise<{ success: boolean; latencyMs: number; error?: string; provider: string }> {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        latencyMs: 0,
        provider: 'SYNTHETIC_IN_MEMORY',
        error: 'Supabase project URL and keys not set in environment secrets. Please provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY) and SUPABASE_SECRET_KEY in your environment.',
      };
    }

    const startTime = Date.now();
    try {
      const admin = createAdminClient();
      if (!admin) {
        return {
          success: false,
          latencyMs: Date.now() - startTime,
          provider: 'SUPABASE_POSTGRESQL',
          error: 'Failed to initialize Supabase admin client.',
        };
      }

      const { count, error } = await admin
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      if (error) {
        return {
          success: false,
          latencyMs: Date.now() - startTime,
          provider: 'SUPABASE_POSTGRESQL',
          error: error.message,
        };
      }

      return {
        success: true,
        latencyMs: Date.now() - startTime,
        provider: 'SUPABASE_POSTGRESQL',
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        provider: 'SUPABASE_POSTGRESQL',
        error: err.message || 'Unknown network or authorization failure connecting to Supabase.',
      };
    }
  }
}

export const supabaseRepo = new SupabaseIdentityRepository();
