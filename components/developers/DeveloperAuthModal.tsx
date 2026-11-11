'use client';

import React, { useState } from 'react';
import { 
  Terminal, 
  Mail, 
  Lock, 
  User, 
  Key, 
  ShieldCheck, 
  X, 
  ArrowRight,
  RefreshCw,
  Building2,
  AlertCircle,
  PlusCircle,
  CheckCircle2
} from 'lucide-react';
import { IceLogo } from '../brand/IceLogo';
import { unifiedAuth, SEEDED_UNIFIED_USERS } from '@/lib/auth/unified-auth';
import { supabaseAuth } from '@/lib/auth/supabase-auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface DeveloperAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (developerEmail: string, orgId?: string) => void;
}

export function DeveloperAuthModal({
  isOpen,
  onClose,
  onSuccess,
}: DeveloperAuthModalProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setIsError(true);
      setFeedback('Please provide both email and password.');
      return;
    }
    if (isRegistering && password.length < 6) {
      setIsError(true);
      setFeedback('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    setIsError(false);

    try {
      if (isRegistering) {
        const res = await supabaseAuth.registerCompany({
          email: email.trim(),
          password,
          companyName: fullName ? `${fullName.trim()} Workspace` : 'Developer Workspace',
          contactPerson: fullName.trim() || email.split('@')[0],
          businessType: 'Software Development',
        });

        setIsSubmitting(false);

        if (res.success) {
          setIsError(false);
          setFeedback(res.message || 'Developer account registered successfully!');
          setTimeout(() => {
            const activeOrg = unifiedAuth.getActiveMembership();
            onSuccess?.(email.trim(), activeOrg?.organizationId);
            onClose();
          }, 1000);
        } else {
          setIsError(true);
          setFeedback(res.error || 'Registration failed.');
        }
      } else {
        const res = await supabaseAuth.signIn(email.trim(), password);
        setIsSubmitting(false);

        if (res.success && res.user) {
          setIsError(false);
          const activeOrg = unifiedAuth.getActiveMembership();
          if (activeOrg?.isOwner) {
            setFeedback(`Authenticated as Organization Owner for ${activeOrg.organizationName}. Full API key, webhook, and developer management permissions granted.`);
          } else {
            setFeedback(`Authenticated as ${res.user.fullName || res.user.email} (${activeOrg?.role || 'Developer'}). Accessing sandbox tools.`);
          }
          setTimeout(() => {
            onSuccess?.(email.trim(), activeOrg?.organizationId);
            onClose();
          }, 800);
        } else {
          setIsError(true);
          setFeedback(res.error || 'Authentication error. Please check your credentials.');
        }
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setIsError(true);
      setFeedback(err.message || 'Authentication request error.');
    }
  };

  const handleQuickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('DemoPass123!');
    setIsSubmitting(true);
    const res = await supabaseAuth.signIn(userEmail, 'DemoPass123!');
    setIsSubmitting(false);
    if (res.success && res.user) {
      const activeOrg = unifiedAuth.getActiveMembership();
      onSuccess?.(userEmail, activeOrg?.organizationId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-slate-900 dark:text-slate-100 transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-[#101C2C] text-white p-5 flex items-center justify-between border-b border-[#1E2F47]">
          <div className="flex items-center gap-2.5">
            <IceLogo variant="dark" size="sm" showTagline={false} />
            <div className="border-l border-slate-700 pl-2.5">
              <span className="text-xs font-bold text-white block">Developer Portal Auth</span>
              <span className="text-[10px] text-cyan-300 block">Host: developers.ice.example</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-[#203652] bg-slate-50 dark:bg-[#101C2C] text-xs">
          <button
            onClick={() => {
              setIsRegistering(false);
              setFeedback(null);
            }}
            className={`flex-1 py-3 font-semibold text-center transition-colors border-b-2 ${
              !isRegistering
                ? 'border-[#2676D2] text-[#2676D2] dark:text-cyan-300 bg-white dark:bg-[#172B43]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Developer Login
          </button>
          <button
            onClick={() => {
              setIsRegistering(true);
              setFeedback(null);
            }}
            className={`flex-1 py-3 font-semibold text-center transition-colors border-b-2 ${
              isRegistering
                ? 'border-[#2676D2] text-[#2676D2] dark:text-cyan-300 bg-white dark:bg-[#172B43]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Create Developer Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {feedback && (
            <div className={`p-3 rounded text-xs flex items-start gap-2 border ${
              isError
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
            }`}>
              {isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{feedback}</span>
            </div>
          )}

          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Kamau"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Developer Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {isRegistering && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Organization Invite Code (Optional)
                </label>
                <span className="text-[10px] text-slate-400">Leave blank if independent</span>
              </div>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g. INV-APEX-89021"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#101C2C] text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
          )}

          {/* Organization Scoping Security Boundary Notice */}
          <div className="p-3 bg-slate-50 dark:bg-[#101C2C] rounded border border-slate-200 dark:border-[#203652] text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
            <span className="font-semibold block text-slate-800 dark:text-slate-200">
              One Organization Account Policy:
            </span>
            <p>
              Organization Owners use their company registered email to access both Company Workspace and Developer Portal. No second developer account needed.
            </p>
            {!isRegistering && (
              <div className="pt-2 border-t border-slate-200 dark:border-[#203652] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Quick Test Logins:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('owner@apexfinance.com')}
                    className="px-2 py-1 rounded bg-[#2676D2]/10 text-[#2676D2] dark:text-cyan-300 hover:bg-[#2676D2]/20 font-medium text-[10px] cursor-pointer"
                  >
                    👑 Apex Finance Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('david.dev@apexfinance.com')}
                    className="px-2 py-1 rounded bg-slate-200 dark:bg-[#172B43] text-slate-700 dark:text-slate-300 hover:bg-slate-300 font-medium text-[10px] cursor-pointer"
                  >
                    💻 Invited Developer
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{isRegistering ? 'Register Developer Account' : 'Sign In as Developer'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
