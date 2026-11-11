'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IceLogo } from '../brand/IceLogo';
import { 
  Building2, 
  Terminal, 
  ShieldCheck, 
  UserCheck, 
  Layers, 
  Lock,
  ChevronDown
} from 'lucide-react';
import { OrganizationRole } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/auth/rbac';

import { ThemeSwitch } from '@/lib/theme/ThemeContext';

interface GlobalHeaderProps {
  currentTenantId?: string;
  onTenantChange?: (tenantId: string) => void;
  currentRole?: OrganizationRole;
  onRoleChange?: (role: OrganizationRole) => void;
  tenants?: Array<{ id: string; name: string; tier: string; environment: string }>;
}

export function GlobalHeader({
  currentTenantId = 'org_apex_fin',
  onTenantChange,
  currentRole = 'COMPLIANCE_MANAGER',
  onRoleChange,
  tenants = [
    { id: 'org_apex_fin', name: 'Apex Finance Ltd', tier: 'ENTERPRISE', environment: 'PRODUCTION' },
    { id: 'org_safari_pay', name: 'Safari Payments PLC', tier: 'GROWTH', environment: 'SANDBOX' },
  ],
}: GlobalHeaderProps) {
  const pathname = usePathname();

  // Determine active product portal
  const isVerify = pathname.startsWith('/verify');
  const isWorkspace = pathname.startsWith('/workspace');
  const isDevelopers = pathname.startsWith('/developers');
  const isPlatform = pathname.startsWith('/platform');

  return (
    <header className="sticky top-0 z-50 bg-[#101C2C] border-b border-[#172B43] text-white">
      {/* Top Banner / Environment notification */}
      <div className="bg-[#172B43] px-4 py-1 text-xs flex items-center justify-between border-b border-[#203652] text-[#8E9BAE]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-medium text-slate-200">ICE Identity Verification Platform</span>
          <span className="hidden sm:inline text-slate-400">— Multi-Tenant Enterprise Architecture</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Synthetic Demonstration Mode
          </span>
          <span className="hidden md:inline text-[11px] text-slate-400">
            Official identity check: <strong className="text-slate-300 font-normal">Not Connected</strong>
          </span>
        </div>
      </div>

      {/* Main navigation row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <IceLogo variant="dark" size="md" showTagline={false} />
          </Link>

          {/* Four Distinct Interfaces Navigator */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#172B43]/70 p-1 rounded-md border border-[#203652]">
            <Link
              href="/verify"
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                isVerify
                  ? 'bg-[#2676D2] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>ICE Verify</span>
              <span className="text-[10px] opacity-80">(Customer)</span>
            </Link>

            <Link
              href="/workspace"
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                isWorkspace
                  ? 'bg-[#2676D2] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Business Dashboard</span>
              <span className="text-[10px] opacity-80">(Workspace)</span>
            </Link>

            <Link
              href="/developers"
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                isDevelopers
                  ? 'bg-[#2676D2] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Developer Portal</span>
              <span className="text-[10px] opacity-80">(APIs)</span>
            </Link>

            <Link
              href="/platform"
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                isPlatform
                  ? 'bg-[#2676D2] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Platform Console</span>
              <span className="text-[10px] opacity-80">(ICE Internal)</span>
            </Link>
          </nav>
        </div>

        {/* Right side controls: Organization switcher, Role Switcher & Theme Switch */}
        <div className="flex items-center gap-2.5">
          {/* Theme Switcher (accessible across all product zones) */}
          <ThemeSwitch compact />

          {/* Organization Switcher (Show when in Workspace or Dev portal) */}
          {(isWorkspace || isDevelopers) && onTenantChange && (
            <div className="flex items-center gap-1.5 bg-[#172B43] px-2.5 py-1 rounded border border-[#203652] text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#26B8C7]" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Organization</span>
                <select
                  value={currentTenantId}
                  onChange={(e) => onTenantChange(e.target.value)}
                  className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs pr-1"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#101C2C] text-white">
                      {t.name} ({t.tier})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Role Switcher (To test RBAC permissions) */}
          {isWorkspace && onRoleChange && (
            <div className="flex items-center gap-1.5 bg-[#172B43] px-2.5 py-1 rounded border border-[#203652] text-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">RBAC Role</span>
                <select
                  value={currentRole}
                  onChange={(e) => onRoleChange(e.target.value as OrganizationRole)}
                  className="bg-transparent text-amber-300 font-semibold outline-none cursor-pointer text-xs pr-1"
                >
                  {Object.entries(ROLE_LABELS).map(([roleKey, meta]) => (
                    <option key={roleKey} value={roleKey} className="bg-[#101C2C] text-slate-200">
                      {meta.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Quick link to start customer verification */}
          <Link
            href="/verify"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-sm transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Start verification</span>
          </Link>
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-2 bg-[#172B43] border-t border-[#203652] gap-2 text-xs">
        <Link
          href="/verify"
          className={`shrink-0 px-2.5 py-1 rounded ${isVerify ? 'bg-[#2676D2] text-white font-semibold' : 'text-slate-300'}`}
        >
          ICE Verify
        </Link>
        <Link
          href="/workspace"
          className={`shrink-0 px-2.5 py-1 rounded ${isWorkspace ? 'bg-[#2676D2] text-white font-semibold' : 'text-slate-300'}`}
        >
          Company Workspace
        </Link>
        <Link
          href="/developers"
          className={`shrink-0 px-2.5 py-1 rounded ${isDevelopers ? 'bg-[#2676D2] text-white font-semibold' : 'text-slate-300'}`}
        >
          Developer Portal
        </Link>
        <Link
          href="/platform"
          className={`shrink-0 px-2.5 py-1 rounded ${isPlatform ? 'bg-[#2676D2] text-white font-semibold' : 'text-slate-300'}`}
        >
          Platform Console
        </Link>
      </div>
    </header>
  );
}
