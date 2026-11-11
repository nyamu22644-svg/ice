'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  ShieldCheck, 
  ChevronRight, 
  Lock,
  ExternalLink,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { IceLogo } from '../brand/IceLogo';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export interface PortalShellProps {
  portalType: 'workspace' | 'developers' | 'platform';
  portalTitle: string;
  portalSubtitle?: string;
  portalBadge?: {
    label: string;
    variant?: 'ice' | 'success' | 'warning' | 'error' | 'neutral';
  };
  navGroups: NavGroup[];
  activeItemId: string;
  onNavigate: (id: string) => void;
  headerControls?: React.ReactNode;
  bannerNotice?: React.ReactNode;
  children: React.ReactNode;
}

export function PortalShell({
  portalType,
  portalTitle,
  portalSubtitle,
  portalBadge,
  navGroups,
  activeItemId,
  onNavigate,
  headerControls,
  bannerNotice,
  children,
}: PortalShellProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileDrawerOpen]);

  // Portal style variations
  const isPlatform = portalType === 'platform';
  const isDevelopers = portalType === 'developers';
  const isWorkspace = portalType === 'workspace';

  // Badge styling
  const getBadgeClasses = (variant = 'neutral') => {
    switch (variant) {
      case 'ice':
        return 'bg-[#2676D2]/15 text-[#26B8C7] border-[#2676D2]/30';
      case 'success':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
    }
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#101C2C] text-white">
      {/* Portal Branding / Identity Header */}
      <div className="p-4 border-b border-[#1D2F47] shrink-0">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-block" onClick={() => setMobileDrawerOpen(false)}>
            <IceLogo variant="dark" size="sm" />
          </Link>
          {mobileDrawerOpen && (
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="lg:hidden p-1 rounded text-slate-400 hover:text-white"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Portal Name & Category */}
        <div className="mt-3.5 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white truncate">
              {portalTitle}
            </span>
            {portalBadge && (
              <span className={`text-[10px] font-mono uppercase font-semibold px-1.5 py-0.5 rounded border ${getBadgeClasses(portalBadge.variant)}`}>
                {portalBadge.label}
              </span>
            )}
          </div>
          {portalSubtitle && (
            <p className="text-[11px] text-[#8E9BAE] truncate">
              {portalSubtitle}
            </p>
          )}
        </div>

        {/* Special Platform Console Warning Tag */}
        {isPlatform && (
          <div className="mt-2.5 px-2 py-1 bg-red-950/50 border border-red-800/60 rounded text-[10px] font-mono text-red-300 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-red-400 shrink-0" />
            <span className="font-semibold uppercase tracking-wider">Internal Ops Boundary</span>
          </div>
        )}
      </div>

      {/* Navigation Groups List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {group.title && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3 py-1 block">
                {group.title}
              </span>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeItemId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded transition-colors text-left cursor-pointer ${
                      isActive
                        ? isPlatform
                          ? 'bg-[#1E3A5F] text-white font-semibold border-l-2 border-[#26B8C7]'
                          : 'bg-[#2676D2] text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-[#172B43]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold shrink-0 ml-1.5 ${
                        item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-[#172B43] text-slate-300')
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 bg-[#0D1724] border-t border-[#1D2F47] text-[11px] text-slate-400 shrink-0 space-y-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="font-mono text-[10px]">ICE Core v1.4</span>
          </span>
          <span className="font-mono text-[10px] text-slate-500 uppercase">
            {isPlatform ? 'STAFF ONLY' : isDevelopers ? 'SANDBOX' : 'RLS ACTIVE'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-[#F4F7FA] dark:bg-[#0B131E] transition-colors duration-150">
      {/* DESKTOP PERSISTENT LEFT SIDEBAR */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[#E2E8F0] dark:border-[#1E2F47] sticky top-16 h-[calc(100vh-64px)] z-20">
        {renderSidebarContent()}
      </aside>

      {/* MOBILE SLIDE-IN DRAWER */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          {/* Drawer Body */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Control Bar with Mobile Hamburger & Context Controls */}
        <div className="bg-white dark:bg-[#101C2C] border-b border-[#E2E8F0] dark:border-[#1E2F47] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 sticky top-16 z-10 shadow-xs transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-[#101C2C] dark:text-white hover:bg-slate-100 dark:hover:bg-[#172B43] border border-[#CBD5E1] dark:border-[#233954]"
              aria-label="Open portal navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb / Section Name */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline">{portalTitle}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hidden sm:inline" />
              <span className="font-bold text-[#101C2C] dark:text-[#26B8C7] capitalize">
                {activeItemId.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Dynamic Header Controls (e.g. Organization/Role dropdowns, Action links) */}
          <div className="flex items-center gap-2">
            {headerControls}
          </div>
        </div>

        {/* Optional Alert/Notice Banner */}
        {bannerNotice && (
          <div className="px-4 sm:px-6 pt-4">
            {bannerNotice}
          </div>
        )}

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
