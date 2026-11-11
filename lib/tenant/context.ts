// ICE Platform Tenant Isolation Boundary Architecture

export class TenantIsolationError extends Error {
  constructor(message: string, public readonly attemptedTenantId?: string, public readonly actorTenantId?: string) {
    super(`[ICE Security Violation: Tenant Boundary Breach Attempted] ${message}`);
    this.name = 'TenantIsolationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string, public readonly requiredPermission?: string) {
    super(`[ICE Access Denied] ${message}`);
    this.name = 'UnauthorizedError';
  }
}

export interface SecurityContext {
  organizationId: string;
  userId: string;
  role: string;
  ipAddress: string;
}

/**
 * Validates that an entity belongs to the current tenant.
 * Never relies on client-side filtering.
 */
export function assertTenantMatch(actorTenantId: string, resourceTenantId: string, resourceType: string): void {
  if (!actorTenantId || !resourceTenantId) {
    throw new TenantIsolationError(`Missing tenant context for resource ${resourceType}`);
  }
  if (actorTenantId !== resourceTenantId) {
    throw new TenantIsolationError(
      `Cross-tenant access prohibited for ${resourceType}. Actor tenant (${actorTenantId}) != Resource tenant (${resourceTenantId})`,
      resourceTenantId,
      actorTenantId
    );
  }
}

/**
 * Generates an isolated storage path for document and selfie artifacts.
 * S3 Path format: /tenants/{tenantId}/sessions/{sessionId}/{category}/{filename}
 */
export function buildTenantStoragePath(tenantId: string, sessionId: string, category: 'documents' | 'biometrics' | 'exports', filename: string): string {
  // Prevent path traversal
  const cleanTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanSession = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFile = filename.replace(/[^a-zA-Z0-9_.-]/g, '');
  return `tenants/${cleanTenant}/sessions/${cleanSession}/${category}/${cleanFile}`;
}
