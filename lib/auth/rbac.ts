// ICE Platform Role-Based Access Control (RBAC) Matrix

import { OrganizationRole, Permission, PlatformRole } from '../types';

export const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  ORGANIZATION_OWNER: [
    'VERIFICATIONS_READ',
    'VERIFICATIONS_WRITE',
    'DOCUMENTS_VIEW_RAW',
    'DOCUMENTS_DOWNLOAD',
    'DECISIONS_OVERRIDE',
    'BIOMETRICS_VIEW',
    'RISK_RULES_MANAGE',
    'API_KEYS_MANAGE',
    'WEBHOOKS_MANAGE',
    'WORKFLOWS_MANAGE',
    'AUDIT_LOGS_VIEW',
    'TEAM_MANAGE',
  ],
  ORGANIZATION_ADMIN: [
    'VERIFICATIONS_READ',
    'VERIFICATIONS_WRITE',
    'DOCUMENTS_VIEW_RAW',
    'DOCUMENTS_DOWNLOAD',
    'DECISIONS_OVERRIDE',
    'BIOMETRICS_VIEW',
    'RISK_RULES_MANAGE',
    'API_KEYS_MANAGE',
    'WEBHOOKS_MANAGE',
    'WORKFLOWS_MANAGE',
    'AUDIT_LOGS_VIEW',
    'TEAM_MANAGE',
  ],
  COMPLIANCE_MANAGER: [
    'VERIFICATIONS_READ',
    'VERIFICATIONS_WRITE',
    'DOCUMENTS_VIEW_RAW',
    'DOCUMENTS_DOWNLOAD',
    'DECISIONS_OVERRIDE',
    'BIOMETRICS_VIEW',
    'RISK_RULES_MANAGE',
    'WORKFLOWS_MANAGE',
    'AUDIT_LOGS_VIEW',
  ],
  KYC_REVIEWER: [
    'VERIFICATIONS_READ',
    'VERIFICATIONS_WRITE',
    'DOCUMENTS_VIEW_RAW',
    'DECISIONS_OVERRIDE',
    'BIOMETRICS_VIEW',
  ],
  FRAUD_ANALYST: [
    'VERIFICATIONS_READ',
    'DOCUMENTS_VIEW_RAW',
    'BIOMETRICS_VIEW',
    'RISK_RULES_MANAGE',
    'AUDIT_LOGS_VIEW',
  ],
  AUDITOR: [
    'VERIFICATIONS_READ',
    'AUDIT_LOGS_VIEW',
    // Auditors have read-only oversight; no raw document download or decision tampering
  ],
  DEVELOPER: [
    'VERIFICATIONS_READ',
    'API_KEYS_MANAGE',
    'WEBHOOKS_MANAGE',
    'WORKFLOWS_MANAGE',
    // Developers build integrations; they do NOT have automatic access to customer raw documents or biometrics!
  ],
  OPERATIONS_ANALYST: [
    'VERIFICATIONS_READ',
    'AUDIT_LOGS_VIEW',
  ],
};

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  PLATFORM_SUPER_ADMIN: [
    'PLATFORM_ADMIN',
    'AUDIT_LOGS_VIEW',
    'SUPPORT_ACCESS_REQUEST',
  ],
  SECURITY_ADMIN: [
    'PLATFORM_ADMIN',
    'AUDIT_LOGS_VIEW',
  ],
  PLATFORM_OPERATIONS: [
    'PLATFORM_ADMIN',
  ],
  SUPPORT_ENGINEER: [
    'SUPPORT_ACCESS_REQUEST',
  ],
  MODEL_ADMIN: [
    'PLATFORM_ADMIN',
  ],
  PRIVACY_OFFICER: [
    'AUDIT_LOGS_VIEW',
  ],
};

/**
 * Check if an organization role has a specific permission.
 * Deny-by-default architecture.
 */
export function hasPermission(role: OrganizationRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Check if a platform internal role has a specific permission.
 */
export function hasPlatformPermission(role: PlatformRole, permission: Permission): boolean {
  const permissions = PLATFORM_ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export const ROLE_LABELS: Record<OrganizationRole, { title: string; description: string }> = {
  ORGANIZATION_OWNER: {
    title: 'Organization Owner',
    description: 'Full administrative authority and organization management.',
  },
  ORGANIZATION_ADMIN: {
    title: 'Organization Admin',
    description: 'Manages team members, settings, and workflows.',
  },
  COMPLIANCE_MANAGER: {
    title: 'Compliance Manager',
    description: 'Oversees KYC policies, case escalations, and review workflows.',
  },
  KYC_REVIEWER: {
    title: 'KYC Reviewer',
    description: 'Reviews pending cases, inspects submitted evidence, and records decisions.',
  },
  FRAUD_ANALYST: {
    title: 'Fraud Analyst',
    description: 'Investigates risk signals, duplicate candidates, and forensic flags.',
  },
  AUDITOR: {
    title: 'Auditor',
    description: 'Read-only access to audit trails, decisions, and system logs.',
  },
  DEVELOPER: {
    title: 'Developer',
    description: 'Manages API credentials, sandbox testing, and webhooks.',
  },
  OPERATIONS_ANALYST: {
    title: 'Operations Analyst',
    description: 'Monitors verification throughput, latency, and SLA trends.',
  },
};
