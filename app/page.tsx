'use client';

import React from 'react';
import Link from 'next/link';
import { GlobalHeader } from '@/components/navigation/GlobalHeader';
import { IceLogo } from '@/components/brand/IceLogo';
import { 
  ShieldCheck, 
  UserCheck, 
  Building2, 
  Terminal, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Activity, 
  FileCheck2, 
  Eye, 
  Database,
  ExternalLink,
  Sparkles,
  Server
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#101C2C] flex flex-col">
      <GlobalHeader />

      {/* Hero Section */}
      <section className="bg-[#101C2C] text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-[#172B43] relative overflow-hidden">
        {/* Subtle geometric grid background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#26B8C7_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#172B43] border border-[#203652] text-xs text-cyan-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-[#26B8C7]" />
            <span>Independent Enterprise Identity Verification Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Verify. Trust. Grow.
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            ICE is an enterprise-grade identity verification service built to help businesses verify identities, extract structured document data, and detect fraud signals with explainable evidence and strict logical multi-tenant isolation.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/workspace"
              className="px-5 py-2.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs sm:text-sm font-semibold rounded shadow-sm transition-colors flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Enter Company Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/verify"
              className="px-5 py-2.5 bg-[#172B43] hover:bg-[#203652] text-white text-xs sm:text-sm font-semibold rounded border border-[#203652] transition-colors flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-[#26B8C7]" />
              <span>Launch ICE Verify Flow</span>
            </Link>

            <Link
              href="/developers"
              className="px-5 py-2.5 bg-[#172B43] hover:bg-[#203652] text-white text-xs sm:text-sm font-semibold rounded border border-[#203652] transition-colors flex items-center gap-2"
            >
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Developer API Docs</span>
            </Link>
          </div>

          {/* Compliance & Standards Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              PostgreSQL Row-Level Security
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Kenya Data Protection Act 2019 Ready
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              Zero-Knowledge Multi-Tenant Partitioning
            </span>
          </div>
        </div>
      </section>

      {/* The 4 Distinct Product Interfaces Cards */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-[#2676D2] dark:text-cyan-300 block">
            Product Architecture
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#101C2C] dark:text-white mt-1">
            Four Distinct Operational Interfaces
          </h2>
          <p className="text-xs sm:text-sm text-[#536273] dark:text-[#8E9BAE] mt-1 max-w-3xl">
            ICE is not a generic dashboard. It provides separated user journeys with tailored access boundaries, security models, and workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: ICE Verify */}
          <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#2676D2]/10 dark:bg-[#2676D2]/20 border border-[#2676D2]/20 flex items-center justify-center text-[#2676D2] dark:text-cyan-300">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#2676D2] dark:text-cyan-300 font-semibold">
                  Customer Experience
                </span>
                <h3 className="text-base font-bold text-[#101C2C] dark:text-white mt-1">
                  A. ICE Verify — Hosted Verification Flow
                </h3>
                <p className="text-xs text-[#536273] dark:text-[#8E9BAE] mt-1 leading-relaxed">
                  Mobile-first, 12-stage customer journey. Handles camera capture, optical quality validation (blur/glare/framing), active liveness challenges, and encrypted submission without requiring permanent user accounts.
                </p>
              </div>

              <div className="p-3 bg-[#F4F7FA] dark:bg-[#101C2C] rounded border border-[#E2E8F0] dark:border-[#203652] text-xs text-[#536273] dark:text-[#8E9BAE] space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Supports Kenyan National ID, Passport, Alien Card & KRA PIN</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Real-time on-device optical feedback before transmission</span>
                </div>
              </div>
            </div>

            <Link
              href="/verify"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2676D2] dark:text-cyan-300 hover:text-[#1E62B0]"
            >
              <span>Test Hosted Customer Experience</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Company Workspace */}
          <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center text-[#16845B] dark:text-emerald-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                  Business Customer Portal
                </span>
                <h3 className="text-base font-bold text-[#101C2C] dark:text-white mt-1">
                  B. Company Workspace — Compliance & Review
                </h3>
                <p className="text-xs text-[#536273] dark:text-[#8E9BAE] mt-1 leading-relaxed">
                  Dedicated operations dashboard for financial institutions and merchants. Includes real-time operational metrics, manual review queue, structured evidence drawers, and reviewer decisions with audit logs.
                </p>
              </div>

              <div className="p-3 bg-[#F4F7FA] dark:bg-[#101C2C] rounded border border-[#E2E8F0] dark:border-[#203652] text-xs text-[#536273] dark:text-[#8E9BAE] space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Organization selector to verify cross-company data isolation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>RBAC role switcher (Compliance, Reviewer, Developer, Auditor)</span>
                </div>
              </div>
            </div>

            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16845B] dark:text-emerald-400 hover:text-emerald-700"
            >
              <span>Open Business Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Developer Portal */}
          <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-[#2676D2] dark:text-cyan-300">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-cyan-300 font-semibold">
                  API & SDK Platform
                </span>
                <h3 className="text-base font-bold text-[#101C2C] dark:text-white mt-1">
                  C. ICE Developer Portal
                </h3>
                <p className="text-xs text-[#536273] dark:text-[#8E9BAE] mt-1 leading-relaxed">
                  Complete developer experience for engineering teams integrating ICE. Public REST API documentation, HMAC-SHA256 webhook configuration, sandbox simulator, and client SDKs.
                </p>
              </div>

              <div className="p-3 bg-[#F4F7FA] dark:bg-[#101C2C] rounded border border-[#E2E8F0] dark:border-[#203652] text-xs text-[#536273] dark:text-[#8E9BAE] space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Public documentation accessible without account creation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Multi-language code examples (TypeScript, Python, PHP, Java, C#)</span>
                </div>
              </div>
            </div>

            <Link
              href="/developers"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2676D2] dark:text-cyan-300 hover:text-[#1E62B0]"
            >
              <span>Explore Developer Documentation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 4: Platform Console */}
          <div className="bg-white dark:bg-[#172B43] rounded-lg border border-[#E2E8F0] dark:border-[#203652] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-center justify-center text-[#C44747] dark:text-red-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 font-semibold">
                  ICE Internal Operations
                </span>
                <h3 className="text-base font-bold text-[#101C2C] dark:text-white mt-1">
                  D. ICE Platform Console
                </h3>
                <p className="text-xs text-[#536273] dark:text-[#8E9BAE] mt-1 leading-relaxed">
                  Restricted internal administration console. Platform health status, vision model version management, security event monitoring, and emergency dual-authorization support access.
                </p>
              </div>

              <div className="p-3 bg-[#F4F7FA] dark:bg-[#101C2C] rounded border border-[#E2E8F0] dark:border-[#203652] text-xs text-[#536273] dark:text-[#8E9BAE] space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Dual-auth protocol: No raw customer access without security sign-off</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Invite-only administrative provisioning with mandatory MFA</span>
                </div>
              </div>
            </div>

            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C44747] dark:text-red-400 hover:text-red-700"
            >
              <span>Access Internal Operations Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="bg-white dark:bg-[#101C2C] border-t border-[#E2E8F0] dark:border-[#1E2F47] py-12 px-4 sm:px-6 lg:px-8 mt-auto transition-colors">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-[#101C2C] dark:text-white">
              Enterprise Design Principles & Security Standards
            </h2>
            <p className="text-xs text-[#536273] dark:text-[#8E9BAE] mt-1">
              Built on strict architectural guarantees to meet international and Kenyan regulatory standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-4 bg-[#F4F7FA] dark:bg-[#172B43] border border-[#E2E8F0] dark:border-[#203652] rounded space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#101C2C] dark:text-white">
                <Database className="w-4 h-4 text-[#2676D2] dark:text-cyan-300" />
                <span>Multi-Tenant Logical Isolation</span>
              </div>
              <p className="text-[#536273] dark:text-[#8E9BAE] leading-relaxed">
                One PostgreSQL database with strict composite keys and Row-Level Security. Company A can never view Company B&apos;s people, documents, or cases.
              </p>
            </div>

            <div className="p-4 bg-[#F4F7FA] dark:bg-[#172B43] border border-[#E2E8F0] dark:border-[#203652] rounded space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#101C2C] dark:text-white">
                <ShieldCheck className="w-4 h-4 text-[#16845B] dark:text-emerald-400" />
                <span>Authoritative Check Transparency</span>
              </div>
              <p className="text-[#536273] dark:text-[#8E9BAE] leading-relaxed">
                Never misrepresents OCR or visual inspection as official government authentication. External source status explicitly states <strong className="text-slate-800 dark:text-slate-200">Not Connected</strong> unless authorized connection exists.
              </p>
            </div>

            <div className="p-4 bg-[#F4F7FA] dark:bg-[#172B43] border border-[#E2E8F0] dark:border-[#203652] rounded space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#101C2C] dark:text-white">
                <Lock className="w-4 h-4 text-[#C58A27] dark:text-amber-400" />
                <span>Private S3 Object Storage</span>
              </div>
              <p className="text-[#536273] dark:text-[#8E9BAE] leading-relaxed">
                No permanent public URLs. Documents and selfie frames are encrypted at rest with short-lived, signed URLs issued only after RBAC validation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#101C2C] text-white py-6 px-4 border-t border-[#172B43] text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <IceLogo variant="dark" size="sm" showTagline={true} />
          <div className="text-slate-400 text-center sm:text-right text-[11px]">
            <p>ICE Identity Verification Platform • Enterprise Multi-Tenant Architecture</p>
            <p className="text-slate-500 mt-0.5">Development Prototype • Synthetic Demonstration Data</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
