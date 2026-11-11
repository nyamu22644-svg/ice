// ICE Portal Authentication & Domain Boundaries
// Implements separate product domain entry points, access boundaries, and authorization checks.

import { OrganizationRole, PlatformRole } from '../types';

export type PortalType = 'verify' | 'workspace' | 'developers' | 'platform';

export interface DomainConfig {
  portal: PortalType;
  primaryDomain: string;
  localPath: string;
  displayName: string;
  description: string;
  requiresAuth: boolean;
  allowPublicRegistration: boolean;
}

export const PORTAL_DOMAINS: Record<PortalType, DomainConfig> = {
  verify: {
    portal: 'verify',
    primaryDomain: 'verify.ice.example',
    localPath: '/verify',
    displayName: 'ICE Verify',
    description: 'Hosted verification experience for applicants (No permanent registration required)',
    requiresAuth: false,
    allowPublicRegistration: false,
  },
  workspace: {
    portal: 'workspace',
    primaryDomain: 'app.ice.example',
    localPath: '/workspace',
    displayName: 'Company Workspace',
    description: 'Enterprise operations, compliance reviews, and identity verification management',
    requiresAuth: true,
    allowPublicRegistration: true, // Company onboarding registration
  },
  developers: {
    portal: 'developers',
    primaryDomain: 'developers.ice.example',
    localPath: '/developers',
    displayName: 'Developer Portal',
    description: 'Public API documentation, sandbox environment, and organization-scoped API tools',
    requiresAuth: false, // Public docs are free to view; private tools require login
    allowPublicRegistration: true, // Individual developer accounts
  },
  platform: {
    portal: 'platform',
    primaryDomain: 'console.ice.example',
    localPath: '/platform',
    displayName: 'ICE Platform Console',
    description: 'Restricted ICE internal operations and zero-knowledge governance',
    requiresAuth: true,
    allowPublicRegistration: false, // Strictly invite-only and admin provisioned
  },
};

// Organization Onboarding Status for Newly Registered Companies
export type OrganizationOnboardingStatus = 
  | 'PENDING_BUSINESS_VERIFICATION'
  | 'DOCUMENTS_REQUESTED'
  | 'ACTIVE_COMPLIANCE'
  | 'RESTRICTED';

export interface CompanyRegistrationInput {
  companyName: string;
  businessEmail: string;
  contactPerson: string;
  country: string;
  businessType: string;
  password?: string;
}

export interface DeveloperRegistrationInput {
  fullName: string;
  developerEmail: string;
  organizationInviteCode?: string;
  password?: string;
}

// Server-side / Host-level domain resolution helper
export function resolvePortalFromHostname(hostname: string): PortalType {
  const host = hostname.toLowerCase().split(':')[0];
  if (host === 'verify.ice.example') return 'verify';
  if (host === 'app.ice.example') return 'workspace';
  if (host === 'developers.ice.example') return 'developers';
  if (host === 'console.ice.example') return 'platform';
  
  // Default to workspace for app subdomains or fallback
  return 'workspace';
}

// Validates redirect URLs to prevent open redirect vulnerabilities
export function isValidRedirectUrl(url: string): boolean {
  if (!url) return false;
  // Disallow javascript: or data: schemes
  if (/^(javascript|data|vbscript):/i.test(url)) return false;

  // Relative URLs within current application are allowed
  if (url.startsWith('/') && !url.startsWith('//')) return true;

  try {
    const parsed = new URL(url);
    const allowedHosts = [
      'verify.ice.example',
      'app.ice.example',
      'developers.ice.example',
      'console.ice.example',
      'localhost',
      '127.0.0.1',
    ];
    return allowedHosts.some((allowed) => parsed.hostname === allowed || parsed.hostname.endsWith('.ice.example'));
  } catch {
    return false;
  }
}

// Strict Access Check for ICE Platform Console
// Prohibits company users and developers from accessing internal operations
export function canAccessPlatformConsole(user?: {
  role?: OrganizationRole | PlatformRole | string;
  isInternalStaff?: boolean;
  mfaVerified?: boolean;
}): { allowed: boolean; reason?: string } {
  if (!user) {
    return { allowed: false, reason: 'Authentication required' };
  }

  const staffRoles = [
    'PLATFORM_SUPER_ADMIN',
    'SECURITY_ADMIN',
    'PLATFORM_OPERATIONS',
    'SUPPORT_ENGINEER',
    'MODEL_ADMIN',
    'PRIVACY_OFFICER',
  ];

  if (!user.isInternalStaff && !staffRoles.includes(user.role as string)) {
    return {
      allowed: false,
      reason: 'Access Denied: Internal ICE staff credentials required. Company workspace and developer accounts cannot enter the platform console.',
    };
  }

  if (!user.mfaVerified) {
    return {
      allowed: false,
      reason: 'Multi-Factor Authentication (MFA) is mandatory for ICE Platform Console access.',
    };
  }

  return { allowed: true };
}

// Checks if a developer is authorized for a specific organization's API credentials
export function isDeveloperAuthorizedForOrganization(
  developerId: string,
  targetOrganizationId: string,
  userOrganizations: Array<{ organizationId: string; role: string }>
): boolean {
  const membership = userOrganizations.find(
    (m) => m.organizationId === targetOrganizationId
  );
  if (!membership) return false;
  return ['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'DEVELOPER'].includes(membership.role);
}
