// ICE Platform — Supabase Authentication & Session Management
// Provides unified, reliable Supabase Auth integration for registration, login, session persistence,
// and automatic organization linking.

import { createBrowserClient, isSupabaseConfigured, setRuntimeSupabaseConfig } from '@/lib/supabase/client';
import { unifiedAuth } from '@/lib/auth/unified-auth';
import { db } from '@/lib/store/synthetic-db';
import { OrganizationRole } from '@/lib/types';

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
    organizationId?: string;
    organizationName?: string;
    role?: OrganizationRole;
  };
  organization?: any;
  requiresEmailConfirmation?: boolean;
}

export interface RegisterCompanyParams {
  email: string;
  password?: string;
  companyName: string;
  contactPerson: string;
  country?: string;
  businessType?: string;
}

const LOCAL_STORAGE_SESSION_KEY = 'ice_auth_session_user';

class SupabaseAuthService {
  private initialized = false;

  /**
   * Initializes runtime configuration from server if needed.
   */
  async init(): Promise<void> {
    if (this.initialized || typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/auth/config');
      if (res.ok) {
        const config = await res.json();
        if (config.configured && config.supabaseUrl && config.publishableKey) {
          setRuntimeSupabaseConfig(config.supabaseUrl, config.publishableKey);
        }
      }
    } catch {
      // Ignore background config fetch errors
    } finally {
      this.initialized = true;
    }
  }

  /**
   * Register a new company and organization owner via Supabase Auth + Database provisioning.
   */
  async registerCompany(params: RegisterCompanyParams): Promise<AuthResponse> {
    await this.init();
    const { email, password, companyName, contactPerson, country = 'KE', businessType = 'Fintech' } = params;

    try {
      // Call server registration endpoint which uses admin client for instant email confirmation & RLS setup
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          companyName,
          contactPerson,
          country,
          businessType,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Registration failed. Please try again.',
        };
      }

      // Sync user into client-side unified auth
      if (data.user) {
        const orgId = data.user.organizationId || data.organization?.id || `org_${Date.now()}`;
        const orgName = data.user.organizationName || data.organization?.name || companyName;

        unifiedAuth.registerNewOrganization({
          organizationId: orgId,
          organizationName: orgName,
          ownerEmail: data.user.email,
          ownerName: data.user.fullName || contactPerson,
        });

        unifiedAuth.setExplicitSession({
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName || contactPerson,
          organizationId: orgId,
          organizationName: orgName,
          role: 'ORGANIZATION_OWNER',
        });

        // Ensure organization exists in synthetic db cache
        const existsInDb = db.organizations.some((o) => o.id === orgId);
        if (!existsInDb) {
          db.organizations.unshift({
            id: orgId,
            name: orgName,
            slug: data.organization?.slug || orgId,
            tier: 'STARTER',
            environment: 'SANDBOX',
            dataRetentionDays: 365,
            authoritativeSourceConnected: false,
            onboardingStatus: 'SANDBOX_ACTIVE',
            createdAt: new Date().toISOString(),
          });
        }

        // Persist session locally
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(data.user));
          } catch {}
        }
      }

      return {
        success: true,
        message: data.message || `Welcome to ICE! Organization ${companyName} created successfully.`,
        user: data.user,
        organization: data.organization,
        requiresEmailConfirmation: data.requiresEmailConfirmation,
      };
    } catch (err: any) {
      console.error('[SupabaseAuthService] Registration error:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during registration.',
      };
    }
  }

  /**
   * Sign in an existing organization user via Supabase Auth.
   */
  async signIn(email: string, password?: string): Promise<AuthResponse> {
    await this.init();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: password || 'IceSecure2026!',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Authentication failed. Please verify your credentials.',
        };
      }

      // Sync Supabase browser client session if token returned
      if (data.session) {
        try {
          const client = createBrowserClient();
          if (client && data.session.access_token && data.session.refresh_token) {
            await client.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
          }
        } catch (sessionErr) {
          console.warn('[SupabaseAuth] Client setSession note:', sessionErr);
        }
      }

      // Sync into unifiedAuth
      if (data.user) {
        const orgId = data.user.organizationId || 'org_apex_fin';
        const orgName = data.user.organizationName || 'My Organization';

        unifiedAuth.setExplicitSession({
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName || data.user.email.split('@')[0],
          organizationId: orgId,
          organizationName: orgName,
          role: data.user.role || 'ORGANIZATION_OWNER',
        });

        // Ensure organization in db cache
        const existsInDb = db.organizations.some((o) => o.id === orgId);
        if (!existsInDb && data.organization) {
          db.organizations.unshift({
            id: orgId,
            name: orgName,
            slug: data.organization.slug || orgId,
            tier: data.organization.tier || 'STARTER',
            environment: data.organization.environment || 'SANDBOX',
            dataRetentionDays: 365,
            authoritativeSourceConnected: false,
            onboardingStatus: 'SANDBOX_ACTIVE',
            createdAt: new Date().toISOString(),
          });
        }

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(data.user));
          } catch {}
        }
      }

      return {
        success: true,
        message: data.message || `Welcome back! Signed in as ${email}.`,
        user: data.user,
        organization: data.organization,
      };
    } catch (err: any) {
      console.error('[SupabaseAuthService] Sign-in error:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during login.',
      };
    }
  }

  /**
   * Signs out current user from Supabase Auth and local state.
   */
  async signOut(): Promise<void> {
    try {
      const supabase = createBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Error during Supabase signout:', err);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      } catch {}
    }

    unifiedAuth.logout();
  }

  /**
   * Restores active Supabase or persisted session on application load.
   */
  async restoreSession(): Promise<AuthResponse | null> {
    await this.init();

    // 1. Try Supabase Auth getSession()
    try {
      const supabase = createBrowserClient();
      if (supabase) {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.user) {
          const user = session.user;
          // Refresh user profile & organization mapping
          const profileRes = await fetch(`/api/auth/me?userId=${user.id}&email=${encodeURIComponent(user.email || '')}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.user) {
              const orgId = profileData.organization?.id || 'org_apex_fin';
              const orgName = profileData.organization?.name || 'My Organization';
              const role = profileData.user.role || 'ORGANIZATION_OWNER';

              unifiedAuth.setExplicitSession({
                id: user.id,
                email: user.email || '',
                fullName: profileData.user.name || user.user_metadata?.full_name || 'User',
                organizationId: orgId,
                organizationName: orgName,
                role,
              });

              return {
                success: true,
                user: {
                  id: user.id,
                  email: user.email || '',
                  fullName: profileData.user.name || user.user_metadata?.full_name || 'User',
                  organizationId: orgId,
                  organizationName: orgName,
                  role,
                },
                organization: profileData.organization,
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn('Supabase session restoration notice:', err);
    }

    // 2. Try Local Storage persisted session
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        if (saved) {
          const parsedUser = JSON.parse(saved);
          if (parsedUser && parsedUser.email) {
            unifiedAuth.setExplicitSession({
              id: parsedUser.id || `usr_${Date.now()}`,
              email: parsedUser.email,
              fullName: parsedUser.fullName || parsedUser.email.split('@')[0],
              organizationId: parsedUser.organizationId || 'org_apex_fin',
              organizationName: parsedUser.organizationName || 'My Organization',
              role: parsedUser.role || 'ORGANIZATION_OWNER',
            });

            return {
              success: true,
              user: parsedUser,
            };
          }
        }
      } catch {}
    }

    // Default to active unified auth session if present
    const current = unifiedAuth.getCurrentUser();
    const activeOrg = unifiedAuth.getActiveMembership();
    if (current && activeOrg) {
      return {
        success: true,
        user: {
          id: current.id,
          email: current.email,
          fullName: current.fullName,
          organizationId: activeOrg.organizationId,
          organizationName: activeOrg.organizationName,
          role: activeOrg.role,
        },
      };
    }

    return null;
  }

  /**
   * Request password reset link.
   */
  async resetPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    await this.init();
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return {
        success: data.success,
        message: data.message,
        error: data.error,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password reset request failed.' };
    }
  }
}

export const supabaseAuth = new SupabaseAuthService();
