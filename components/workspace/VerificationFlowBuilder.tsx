'use client';

import React, { useState, useMemo } from 'react';
import { 
  Sliders, 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  Plus, 
  Save, 
  UploadCloud, 
  History, 
  Play, 
  AlertTriangle, 
  Check, 
  Eye, 
  Smile, 
  Camera, 
  Sparkles, 
  Lock, 
  FileText, 
  RotateCcw, 
  ChevronRight, 
  Info,
  CheckCircle2,
  ExternalLink,
  Layers,
  AlertCircle
} from 'lucide-react';
import { 
  VerificationProfile, 
  DocumentType, 
  ProfileStatus, 
  ProfileVersionHistory 
} from '@/lib/types';
import { db } from '@/lib/store/synthetic-db';
import { VerificationJourney } from '../verify/VerificationJourney';
import { automatedPipeline, ENGINE_SPECIFICATIONS } from '@/lib/engines/automated-pipeline';

interface VerificationFlowBuilderProps {
  tenantId: string;
  onProfileSelected?: (profileId: string) => void;
}

export function VerificationFlowBuilder({
  tenantId,
  onProfileSelected,
}: VerificationFlowBuilderProps) {
  // Available profiles for this tenant
  const [profiles, setProfiles] = useState<VerificationProfile[]>(() => {
    return db.getVerificationProfiles(tenantId);
  });

  // Selected profile ID
  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => {
    const list = db.getVerificationProfiles(tenantId);
    return list[0]?.id || 'prof_apex_standard';
  });

  // Active working copy of the profile (for live preview & draft edits)
  const [activeProfile, setActiveProfile] = useState<VerificationProfile>(() => {
    const p = db.getVerificationProfile(tenantId, selectedProfileId);
    return p ? JSON.parse(JSON.stringify(p)) : db.verificationProfiles[0];
  });

  // Live preview device frame mode ('mobile' or 'desktop')
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Active configuration tab on left panel
  const [configTab, setConfigTab] = useState<'basics' | 'documents' | 'optical' | 'biometrics' | 'decision' | 'instructions'>('documents');

  // Feedback notifications
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Publish Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishChangelog, setPublishChangelog] = useState('');

  // Version History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState<ProfileVersionHistory[]>([]);

  // Sandbox Pipeline Test Execution Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testExecutionTrace, setTestExecutionTrace] = useState<any>(null);
  const [isExecutingTest, setIsExecutingTest] = useState(false);

  // When profile selection changes
  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    const p = db.getVerificationProfile(tenantId, id);
    if (p) {
      setActiveProfile(JSON.parse(JSON.stringify(p)));
      setFeedbackMessage({ text: `Loaded profile: ${p.name}`, type: 'info' });
      setTimeout(() => setFeedbackMessage(null), 2500);
    }
  };

  // Update working active profile fields
  const updateDraft = (updates: Partial<VerificationProfile>) => {
    setActiveProfile((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  // Save Draft action
  const handleSaveDraft = () => {
    try {
      const updated = db.updateVerificationProfile(tenantId, activeProfile.id, {
        ...activeProfile,
        status: 'DRAFT',
      });
      setProfiles(db.getVerificationProfiles(tenantId));
      setActiveProfile(JSON.parse(JSON.stringify(updated)));
      setFeedbackMessage({ text: 'Draft configuration saved successfully.', type: 'success' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (e: any) {
      setFeedbackMessage({ text: e.message, type: 'error' });
    }
  };

  // Open Publish Modal
  const handleOpenPublish = () => {
    setPublishChangelog(`Updated ${activeProfile.name} verification parameters.`);
    setIsPublishModalOpen(true);
  };

  // Confirm Publish
  const handleConfirmPublish = () => {
    try {
      // First persist any current draft changes
      db.updateVerificationProfile(tenantId, activeProfile.id, activeProfile);
      // Publish new immutable version
      const published = db.publishVerificationProfile(tenantId, activeProfile.id, publishChangelog);
      setProfiles(db.getVerificationProfiles(tenantId));
      setActiveProfile(JSON.parse(JSON.stringify(published)));
      setIsPublishModalOpen(false);
      setFeedbackMessage({ 
        text: `Published immutable version ${published.version}! New sessions will resolve to this configuration.`, 
        type: 'success' 
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (e: any) {
      setFeedbackMessage({ text: e.message, type: 'error' });
    }
  };

  // Create New Profile
  const handleCreateNewProfile = () => {
    const newProf = db.createVerificationProfile(tenantId, {
      name: 'Custom KYC Flow',
      verificationPurpose: 'FULL_CUSTOMER_KYC',
      allowedDocumentTypes: ['KE_NATIONAL_ID'],
      selfieCaptureEnabled: true,
      livenessCheckEnabled: true,
    });
    setProfiles(db.getVerificationProfiles(tenantId));
    setSelectedProfileId(newProf.id);
    setActiveProfile(JSON.parse(JSON.stringify(newProf)));
    setFeedbackMessage({ text: `Created new draft profile: ${newProf.name}`, type: 'success' });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Open Version History
  const handleOpenHistory = () => {
    const list = db.getProfileVersionHistory(tenantId, activeProfile.id);
    setHistoryList(list);
    setIsHistoryModalOpen(true);
  };

  // Restore Previous Version
  const handleRestoreVersion = (version: string) => {
    try {
      const restored = db.revertToProfileVersion(tenantId, activeProfile.id, version);
      setActiveProfile(JSON.parse(JSON.stringify(restored)));
      setIsHistoryModalOpen(false);
      setFeedbackMessage({ text: `Restored configuration to version ${version}.`, type: 'info' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (e: any) {
      setFeedbackMessage({ text: e.message, type: 'error' });
    }
  };

  // Run Real Test in Sandbox Pipeline (Requirement 6 & 11)
  const handleRunSandboxPipelineTest = () => {
    setIsExecutingTest(true);
    setIsTestModalOpen(true);
    setTestExecutionTrace(null);

    setTimeout(() => {
      // Run actual pipeline execution with active profile constraints
      const trace = automatedPipeline.processVerification({
        tenantId,
        sessionId: 'test_sess_sandbox_101',
        documentType: activeProfile.allowedDocumentTypes[0] || 'KE_NATIONAL_ID',
        applicantInput: {
          fullName: 'David Mwangi Kariuki',
          idNumber: '28471920',
          dob: '1992-04-14',
          phoneNumber: '+254712345678',
          email: 'david.kariuki@test.example.com',
        },
        selfieProvided: activeProfile.selfieCaptureEnabled,
        biometricConsentGiven: true,
      });

      setTestExecutionTrace(trace);
      setIsExecutingTest(false);
    }, 1200);
  };

  // Toggle Document Type
  const toggleDocType = (docType: DocumentType) => {
    const current = activeProfile.allowedDocumentTypes || [];
    let updated: DocumentType[];
    if (current.includes(docType)) {
      updated = current.filter((d) => d !== docType);
    } else {
      updated = [...current, docType];
    }
    updateDraft({ allowedDocumentTypes: updated });
  };

  return (
    <div className="space-y-5">
      {/* Top Banner / Feedback */}
      {feedbackMessage && (
        <div className={`p-3 rounded text-xs flex items-center justify-between transition-all ${
          feedbackMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : feedbackMessage.type === 'error'
            ? 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
            : 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-cyan-300 border border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Profile Header & Selector Bar */}
      <div className="bg-white dark:bg-[#101C2C] p-4 rounded-lg border border-[#E2E8F0] dark:border-[#1E2F47] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Active Verification Profile
            </span>
            <div className="flex items-center gap-2">
              <select
                value={selectedProfileId}
                onChange={(e) => handleSelectProfile(e.target.value)}
                className="text-sm font-bold text-[#101C2C] dark:text-white bg-slate-50 dark:bg-[#172B43] border border-[#CBD5E1] dark:border-[#203652] rounded px-3 py-1.5 focus:outline-hidden"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.version}) — {p.status}
                  </option>
                ))}
              </select>

              <button
                onClick={handleCreateNewProfile}
                className="px-2.5 py-1.5 bg-[#172B43] hover:bg-[#203652] text-white text-xs font-semibold rounded border border-[#203652] flex items-center gap-1.5"
                title="Create New Verification Profile"
              >
                <Plus className="w-3.5 h-3.5 text-[#26B8C7]" />
                <span className="hidden sm:inline">New Profile</span>
              </button>
            </div>
          </div>

          {/* Status & Version Pill Metadata */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-3 md:pt-4">
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
              activeProfile.status === 'PUBLISHED'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}>
              {activeProfile.status}
            </span>
            <span>·</span>
            <span className="font-mono text-[11px]">Version: {activeProfile.version}</span>
            <span>·</span>
            <span className="font-mono text-[11px] truncate max-w-[140px]" title={activeProfile.workflowVersionId}>
              Policy: {activeProfile.workflowVersionId}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenHistory}
            className="px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] text-[#536273] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#172B43] text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer"
            title="View immutable published versions"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>History</span>
          </button>

          <button
            onClick={handleRunSandboxPipelineTest}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer"
            title="Execute test applicant through real sandbox automated pipeline"
          >
            <Play className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Test Pipeline</span>
          </button>

          <button
            onClick={handleSaveDraft}
            className="px-3 py-1.5 border border-[#2676D2] text-[#2676D2] dark:text-cyan-300 hover:bg-blue-50 dark:hover:bg-[#2676D2]/10 text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={handleOpenPublish}
            className="px-3.5 py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Publish Version</span>
          </button>
        </div>
      </div>

      {/* TWO-PANEL WORKSPACE: LEFT CONFIG CONTROLS | RIGHT LIVE PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================= */}
        {/* LEFT PANEL: CONFIGURATION CONTROLS (7 Columns) */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Navigation Tabs for Configuration Sections */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#101C2C] rounded-lg border border-[#E2E8F0] dark:border-[#1E2F47] overflow-x-auto text-xs font-medium">
            {[
              { id: 'documents', label: 'Documents & OCR' },
              { id: 'optical', label: 'Quality & Forensics' },
              { id: 'biometrics', label: 'Selfie & Liveness' },
              { id: 'decision', label: 'Decision Policy' },
              { id: 'instructions', label: 'Instructions & Copy' },
              { id: 'basics', label: 'Scope & Settings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setConfigTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  configTab === tab.id
                    ? 'bg-white dark:bg-[#172B43] text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Config Box Container */}
          <div className="bg-white dark:bg-[#101C2C] p-5 rounded-lg border border-[#E2E8F0] dark:border-[#1E2F47] shadow-xs space-y-5">
            {/* TAB 1: DOCUMENTS & OCR */}
            {configTab === 'documents' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-[#101C2C] dark:text-white">
                    Identity Document Collection & OCR
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select which official government identification types are accepted, and configure field extraction.
                  </p>
                </div>

                {/* Document Type Checkboxes */}
                <div className="space-y-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                    Accepted Identity Documents
                  </span>
                  {[
                    { id: 'KE_NATIONAL_ID', name: 'Kenyan National Identity Card', desc: 'Front and Back capture required. Extracts ID number, DOB, full name.' },
                    { id: 'KE_PASSPORT', name: 'Kenyan Passport', desc: 'Identity & MRZ code page capture required.' },
                    { id: 'KE_ALIEN_ID', name: 'Kenyan Alien Identity Card', desc: 'Foreign national resident registration certificate.' },
                    { id: 'KE_KRA_PIN', name: 'KRA PIN Certificate', desc: 'Taxpayer PIN certificate verification.' },
                  ].map((doc) => {
                    const isChecked = (activeProfile.allowedDocumentTypes || []).includes(doc.id as DocumentType);
                    return (
                      <label
                        key={doc.id}
                        className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-[#2676D2] bg-blue-50/50 dark:bg-blue-950/20'
                            : 'border-[#E2E8F0] dark:border-[#203652] hover:bg-slate-50 dark:hover:bg-[#172B43]/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleDocType(doc.id as DocumentType)}
                          className="mt-0.5 rounded text-[#2676D2]"
                        />
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900 dark:text-white block">{doc.name}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{doc.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Identity Collection Mode (Requirement 5) */}
                <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E2F47] space-y-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                    Identity Details Collection Mode
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      onClick={() => updateDraft({ identityCollectionMode: 'EXTRACT_FROM_DOCUMENT' })}
                      className={`p-3 rounded border cursor-pointer ${
                        activeProfile.identityCollectionMode === 'EXTRACT_FROM_DOCUMENT'
                          ? 'border-[#2676D2] bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-[#E2E8F0] dark:border-[#203652]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="collMode"
                          checked={activeProfile.identityCollectionMode === 'EXTRACT_FROM_DOCUMENT'}
                          onChange={() => {}}
                          className="text-[#2676D2]"
                        />
                        <span className="font-bold text-slate-900 dark:text-white">Extract from Document (Recommended)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-5">
                        Applicant scans ID first. ICE extracts fields automatically and presents for quick confirmation, minimizing typing.
                      </p>
                    </label>

                    <label
                      onClick={() => updateDraft({ identityCollectionMode: 'MANUAL_ENTRY_FIRST' })}
                      className={`p-3 rounded border cursor-pointer ${
                        activeProfile.identityCollectionMode === 'MANUAL_ENTRY_FIRST'
                          ? 'border-[#2676D2] bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-[#E2E8F0] dark:border-[#203652]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="collMode"
                          checked={activeProfile.identityCollectionMode === 'MANUAL_ENTRY_FIRST'}
                          onChange={() => {}}
                          className="text-[#2676D2]"
                        />
                        <span className="font-bold text-slate-900 dark:text-white">Manual Entry First</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-5">
                        Applicant types their full name and ID number before taking document photos.
                      </p>
                    </label>
                  </div>
                </div>

                {/* OCR Toggle */}
                <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E2F47] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">OCR Field Extraction Engine</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Extracts structured fields (Name, ID, DOB, Serial, District) and parses Kenyan ID checksums.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeProfile.ocrEnabled}
                    onChange={(e) => updateDraft({ ocrEnabled: e.target.checked })}
                    className="h-4 w-4 rounded text-[#2676D2]"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: QUALITY & FORENSICS */}
            {configTab === 'optical' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-[#101C2C] dark:text-white">
                    Optical Quality & Document Forensics
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure thresholds for image focus, glare detection, and substrate alteration checks.
                  </p>
                </div>

                {/* Blur Threshold Slider */}
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-[#172B43] rounded border border-[#E2E8F0] dark:border-[#203652]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Minimum Optical Focus (Laplacian Blur Threshold)
                    </span>
                    <span className="font-mono font-bold text-[#2676D2] dark:text-cyan-300 text-sm">
                      {((activeProfile.documentQualityChecks?.blurThreshold || 0.70) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="5"
                    value={Math.round((activeProfile.documentQualityChecks?.blurThreshold || 0.70) * 100)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) / 100;
                      updateDraft({
                        documentQualityChecks: {
                          ...activeProfile.documentQualityChecks,
                          blurThreshold: val,
                        },
                      });
                    }}
                    className="w-full accent-[#2676D2]"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Images below this score are flagged for recapture or routed to human review. Standard production threshold is 70%.
                  </p>
                </div>

                {/* Quality Toggles */}
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-2.5 rounded border border-[#E2E8F0] dark:border-[#203652] cursor-pointer">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">Surface Glare & Flash Detection</span>
                      <span className="text-[11px] text-slate-500">Detects high-luminance specular highlights obscuring key text.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeProfile.documentQualityChecks?.glareDetection}
                      onChange={(e) => {
                        updateDraft({
                          documentQualityChecks: {
                            ...activeProfile.documentQualityChecks,
                            glareDetection: e.target.checked,
                          },
                        });
                      }}
                      className="rounded text-[#2676D2]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded border border-[#E2E8F0] dark:border-[#203652] cursor-pointer">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">Four-Corner Boundary Detection</span>
                      <span className="text-[11px] text-slate-500">Ensures entire document perimeter is visible without cropping.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeProfile.documentQualityChecks?.fourCornersDetection}
                      onChange={(e) => {
                        updateDraft({
                          documentQualityChecks: {
                            ...activeProfile.documentQualityChecks,
                            fourCornersDetection: e.target.checked,
                          },
                        });
                      }}
                      className="rounded text-[#2676D2]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded border border-[#E2E8F0] dark:border-[#203652] cursor-pointer">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">Substrate & Tampering Forensics</span>
                      <span className="text-[11px] text-slate-500">Detects font inconsistencies, digital collage artifacts, and altered IDs.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeProfile.documentForensicChecks?.tamperingDetection}
                      onChange={(e) => {
                        updateDraft({
                          documentForensicChecks: {
                            ...activeProfile.documentForensicChecks,
                            tamperingDetection: e.target.checked,
                          },
                        });
                      }}
                      className="rounded text-[#2676D2]"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 3: SELFIE & BIOMETRICS */}
            {configTab === 'biometrics' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-[#101C2C] dark:text-white">
                    Facial Biometrics & Liveness
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure selfie camera capture, active presence challenges, and 1:1 facial comparison against ID portrait.
                  </p>
                </div>

                {/* Master Selfie Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#172B43] rounded border border-[#E2E8F0] dark:border-[#203652]">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Enable Live Selfie Capture</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      When disabled, the journey becomes Document-Only (no camera selfie screens appear).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeProfile.selfieCaptureEnabled}
                    onChange={(e) => updateDraft({ selfieCaptureEnabled: e.target.checked })}
                    className="h-4 w-4 rounded text-[#2676D2]"
                  />
                </div>

                {activeProfile.selfieCaptureEnabled && (
                  <div className="space-y-3 pl-2 border-l-2 border-[#2676D2]">
                    <div className="flex items-center justify-between p-2.5 rounded border border-[#E2E8F0] dark:border-[#203652]">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">Active Liveness Challenge</span>
                        <span className="text-[11px] text-slate-500">Prompts applicant to complete interactive actions (Blink + Smile).</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={activeProfile.livenessCheckEnabled}
                        onChange={(e) => updateDraft({ livenessCheckEnabled: e.target.checked })}
                        className="rounded text-[#2676D2]"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded border border-[#E2E8F0] dark:border-[#203652]">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">1:1 Face Similarity Match</span>
                        <span className="text-[11px] text-slate-500">Compares live selfie portrait against cropped document face.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={activeProfile.faceComparisonEnabled}
                        onChange={(e) => updateDraft({ faceComparisonEnabled: e.target.checked })}
                        className="rounded text-[#2676D2]"
                      />
                    </div>

                    {activeProfile.faceComparisonEnabled && (
                      <div className="p-3 bg-slate-50 dark:bg-[#172B43] rounded border border-[#E2E8F0] dark:border-[#203652] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Minimum Face Similarity Match Threshold
                          </span>
                          <span className="font-mono font-bold text-[#2676D2] dark:text-cyan-300">
                            {((activeProfile.faceMatchThreshold || 0.85) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="70"
                          max="95"
                          step="5"
                          value={Math.round((activeProfile.faceMatchThreshold || 0.85) * 100)}
                          onChange={(e) => updateDraft({ faceMatchThreshold: parseInt(e.target.value) / 100 })}
                          className="w-full accent-[#2676D2]"
                        />
                        <span className="text-[10px] text-slate-400">Standard FAR: 0.01% @ 0.85 cosine threshold.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Honest Engine Limitation Callout (Requirement 1) */}
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Engine Limitation & Transparency Notice</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Client-side camera capture, framing validation, and active challenge detection are fully functional. Deep biometric embedding match is executed via sandboxed simulation. Government database matching (IPRS) remains <strong className="font-semibold">NOT_CONFIGURED</strong> until certified government credentials are provisioned.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: DECISION POLICY */}
            {configTab === 'decision' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-[#101C2C] dark:text-white">
                    Automated Decision Policy & Exception Routing
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Define Straight-Through Processing (STP) auto-approval criteria and human review routing rules.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#172B43] rounded border border-[#E2E8F0] dark:border-[#203652]">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Enable Straight-Through Processing (Auto-Approve)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Clean applicants with zero risk indicators are approved instantly in under 2 seconds.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeProfile.decisionPolicy?.autoApproveEnabled}
                    onChange={(e) => updateDraft({
                      decisionPolicy: {
                        ...activeProfile.decisionPolicy,
                        autoApproveEnabled: e.target.checked,
                      },
                    })}
                    className="h-4 w-4 rounded text-[#2676D2]"
                  />
                </div>

                <div className="space-y-3">
                  <div className="p-3 border border-[#E2E8F0] dark:border-[#203652] rounded space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Max Allowable Risk Score for Auto-Approval
                      </span>
                      <span className="font-mono font-bold text-[#2676D2] dark:text-cyan-300">
                        {activeProfile.decisionPolicy?.autoApproveRiskScoreThreshold ?? 20} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="5"
                      value={activeProfile.decisionPolicy?.autoApproveRiskScoreThreshold ?? 20}
                      onChange={(e) => updateDraft({
                        decisionPolicy: {
                          ...activeProfile.decisionPolicy,
                          autoApproveRiskScoreThreshold: parseInt(e.target.value),
                        },
                      })}
                      className="w-full accent-[#2676D2]"
                    />
                    <p className="text-[10px] text-slate-400">
                      Scores &gt; this threshold will be routed to the manual Review Queue.
                    </p>
                  </div>

                  <label className="flex items-center justify-between p-2.5 rounded border border-[#E2E8F0] dark:border-[#203652] cursor-pointer">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        Route to Review Queue on Blur/Glare Failure
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Allow applicant to proceed but assign an exception task for compliance review.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeProfile.decisionPolicy?.routeToReviewQueueOnQualityFail}
                      onChange={(e) => updateDraft({
                        decisionPolicy: {
                          ...activeProfile.decisionPolicy,
                          routeToReviewQueueOnQualityFail: e.target.checked,
                        },
                      })}
                      className="rounded text-[#2676D2]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded border border-[#E2E8F0] dark:border-[#203652] cursor-pointer">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        Escalate to Investigation Case on Suspected Tampering
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Creates an audit investigation case with SLA timers for suspected fraud.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeProfile.decisionPolicy?.routeToCaseOnTampering}
                      onChange={(e) => updateDraft({
                        decisionPolicy: {
                          ...activeProfile.decisionPolicy,
                          routeToCaseOnTampering: e.target.checked,
                        },
                      })}
                      className="rounded text-[#2676D2]"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 5: APPLICANT INSTRUCTIONS & COPY */}
            {configTab === 'instructions' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-[#101C2C] dark:text-white">
                    Applicant-Facing Copy & Instructions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Customize the guidance displayed to applicants on their verification screens.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Welcome Title
                    </label>
                    <input
                      type="text"
                      value={activeProfile.applicantInstructions?.welcomeTitle || ''}
                      onChange={(e) => updateDraft({
                        applicantInstructions: {
                          ...activeProfile.applicantInstructions,
                          welcomeTitle: e.target.value,
                        },
                      })}
                      placeholder="e.g. Identity Verification Required"
                      className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Welcome Subtitle / Context
                    </label>
                    <textarea
                      rows={2}
                      value={activeProfile.applicantInstructions?.welcomeSubtitle || ''}
                      onChange={(e) => updateDraft({
                        applicantInstructions: {
                          ...activeProfile.applicantInstructions,
                          welcomeSubtitle: e.target.value,
                        },
                      })}
                      placeholder="e.g. Please verify your Kenyan National ID to complete your loan application."
                      className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Document Capture Guidance
                    </label>
                    <input
                      type="text"
                      value={activeProfile.applicantInstructions?.documentCaptureHelp || ''}
                      onChange={(e) => updateDraft({
                        applicantInstructions: {
                          ...activeProfile.applicantInstructions,
                          documentCaptureHelp: e.target.value,
                        },
                      })}
                      placeholder="e.g. Place document on a dark flat surface with no glare."
                      className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Selfie Guidance Prompt
                    </label>
                    <input
                      type="text"
                      value={activeProfile.applicantInstructions?.selfieHelp || ''}
                      onChange={(e) => updateDraft({
                        applicantInstructions: {
                          ...activeProfile.applicantInstructions,
                          selfieHelp: e.target.value,
                        },
                      })}
                      placeholder="e.g. Look directly at the camera and blink when prompted."
                      className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: BASICS & SCOPE */}
            {configTab === 'basics' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-[#101C2C] dark:text-white">Profile Basics & Scope</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure name, description, country scope, and primary verification purpose.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Profile Name
                    </label>
                    <input
                      type="text"
                      value={activeProfile.name}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Verification Purpose
                    </label>
                    <select
                      value={activeProfile.verificationPurpose}
                      onChange={(e) => updateDraft({ verificationPurpose: e.target.value })}
                      className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs font-mono"
                    >
                      <option value="FULL_CUSTOMER_KYC">FULL_CUSTOMER_KYC (Document + Biometrics)</option>
                      <option value="DOCUMENT_ONLY">DOCUMENT_ONLY (Document Extraction without Selfie)</option>
                      <option value="BIOMETRIC_ONLY">BIOMETRIC_ONLY (Selfie & Liveness Only)</option>
                      <option value="LOAN_APPLICANT_KYC">LOAN_APPLICANT_KYC (Fast Micro-lending)</option>
                      <option value="SELLER_VERIFICATION">SELLER_VERIFICATION (Merchant Onboarding)</option>
                      <option value="AGE_VERIFICATION">AGE_VERIFICATION (Age Threshold Gate)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={activeProfile.description}
                      onChange={(e) => updateDraft({ description: e.target.value })}
                      className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Country Scope
                      </label>
                      <input
                        type="text"
                        value={activeProfile.countryScope.join(', ')}
                        onChange={(e) => updateDraft({
                          countryScope: e.target.value.split(',').map((s) => s.trim().toUpperCase()),
                        })}
                        placeholder="KE, UG, TZ"
                        className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Supported Languages
                      </label>
                      <input
                        type="text"
                        value={activeProfile.supportedLanguages.join(', ')}
                        onChange={(e) => updateDraft({
                          supportedLanguages: e.target.value.split(',').map((s) => s.trim().toLowerCase()),
                        })}
                        placeholder="en, sw"
                        className="w-full px-3 py-1.5 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#101C2C] text-[#101C2C] dark:text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANEL: LIVE ICE VERIFY APPLICANT PREVIEW (5 Columns) */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-3 sticky top-20">
          {/* Preview Controls Bar */}
          <div className="bg-white dark:bg-[#101C2C] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#1E2F47] shadow-xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">Live Preview</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                Reacts Real-Time
              </span>
            </div>

            {/* Device Frame Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#172B43] p-1 rounded border border-[#CBD5E1] dark:border-[#203652]">
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1 rounded flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  previewDevice === 'mobile'
                    ? 'bg-white dark:bg-[#101C2C] text-[#2676D2] dark:text-cyan-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Mobile View"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1 rounded flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  previewDevice === 'desktop'
                    ? 'bg-white dark:bg-[#101C2C] text-[#2676D2] dark:text-cyan-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
            </div>
          </div>

          {/* Device Mockup Shell */}
          <div className="p-4 bg-slate-200 dark:bg-[#070D14] rounded-xl border border-slate-300 dark:border-[#1B293C] shadow-inner flex items-center justify-center min-h-[580px]">
            {previewDevice === 'mobile' ? (
              /* Phone Frame */
              <div className="w-full max-w-[360px] bg-slate-900 rounded-[32px] p-2.5 shadow-2xl border-4 border-slate-800">
                {/* Speaker notch */}
                <div className="w-24 h-4 bg-slate-800 mx-auto rounded-b-lg mb-2 flex items-center justify-center">
                  <div className="w-8 h-1 bg-slate-700 rounded-full" />
                </div>
                {/* Screen Content */}
                <div className="rounded-[22px] overflow-hidden bg-[#F4F7FA] dark:bg-[#0B131E]">
                  <VerificationJourney
                    profile={activeProfile}
                    companyName="Apex Finance Ltd"
                    isEmbeddedPreview={true}
                    previewDevice="mobile"
                  />
                </div>
              </div>
            ) : (
              /* Desktop Frame */
              <div className="w-full max-w-xl bg-white dark:bg-[#101C2C] rounded-lg shadow-lg border border-slate-300 dark:border-slate-800 overflow-hidden">
                <div className="bg-slate-100 dark:bg-[#172B43] px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono ml-2">
                    https://verify.ice.example.com/{activeProfile.slug}
                  </span>
                </div>
                <VerificationJourney
                  profile={activeProfile}
                  companyName="Apex Finance Ltd"
                  isEmbeddedPreview={true}
                  previewDevice="desktop"
                />
              </div>
            )}
          </div>

          {/* Clarification Notice */}
          <div className="p-2.5 bg-slate-100 dark:bg-[#101C2C] rounded border border-slate-200 dark:border-[#1E2F47] text-[11px] text-slate-500 dark:text-slate-400 text-center">
            <strong>Interactive Visual Preview:</strong> This preview uses the genuine ICE Verify runtime engine and updates dynamically to reflect your configuration choices.
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: PUBLISH IMMUTABLE VERSION MODAL */}
      {/* =================================================================== */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#101C2C] rounded-lg border border-[#E2E8F0] dark:border-[#1E2F47] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#2676D2]/10 text-[#2676D2] dark:text-cyan-300 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#101C2C] dark:text-white">
                  Publish Immutable Profile Version
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Profile: {activeProfile.name}
                </p>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-cyan-200 space-y-1">
              <span className="font-semibold block">Version Snapshot Guarantee:</span>
              <p className="text-[11px] leading-relaxed">
                Publishing creates a new permanent, immutable version (e.g. <strong>v1.5</strong>) and underlying workflow snapshot. Existing active sessions will continue running their original version without disruption.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Changelog / Release Notes
              </label>
              <textarea
                rows={3}
                value={publishChangelog}
                onChange={(e) => setPublishChangelog(e.target.value)}
                placeholder="Describe what changed in this version..."
                className="w-full px-3 py-2 border border-[#CBD5E1] dark:border-[#203652] rounded bg-white dark:bg-[#172B43] text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#203652]">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 border border-[#CBD5E1] dark:border-[#203652] text-xs font-semibold rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#172B43]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPublish}
                className="px-4 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-xs"
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: VERSION HISTORY & RESTORE MODAL */}
      {/* =================================================================== */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#101C2C] rounded-lg border border-[#E2E8F0] dark:border-[#1E2F47] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#203652] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#2676D2] dark:text-cyan-300" />
                <h3 className="text-base font-bold text-[#101C2C] dark:text-white">
                  Version History — {activeProfile.name}
                </h3>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {historyList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No published version snapshots recorded yet. Publish your first version above.
                </div>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 dark:bg-[#172B43] rounded border border-[#E2E8F0] dark:border-[#203652] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{item.version}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-300">
                        {item.changelogNotes || 'Routine version release'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRestoreVersion(item.version)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#2676D2] dark:text-cyan-300 border border-[#2676D2]/30 hover:bg-blue-50 dark:hover:bg-[#2676D2]/10 rounded cursor-pointer whitespace-nowrap"
                    >
                      Restore Version
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E2E8F0] dark:border-[#203652]">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 border border-[#CBD5E1] dark:border-[#203652] text-xs font-semibold rounded text-slate-600 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: SANDBOX PIPELINE TEST TRACE (Real Engine Run) */}
      {/* =================================================================== */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#101C2C] rounded-lg border border-[#E2E8F0] dark:border-[#1E2F47] shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#203652] pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="text-base font-bold text-[#101C2C] dark:text-white">
                  Real Sandbox Pipeline Execution
                </h3>
              </div>
              <button onClick={() => setIsTestModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {isExecutingTest ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-8 h-8 mx-auto border-2 border-[#2676D2] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Executing synthetic applicant through real automated pipeline...
                </p>
              </div>
            ) : testExecutionTrace ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#F4F7FA] dark:bg-[#172B43] rounded border border-[#E2E8F0] dark:border-[#203652] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Automated Decision</span>
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {testExecutionTrace.stages.automatedDecision.outcome}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Execution Latency</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {testExecutionTrace.totalDurationMs} ms
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                    Pipeline Stages Execution Breakdown
                  </span>
                  <div className="bg-[#101C2C] rounded p-3 font-mono text-[11px] text-slate-300 space-y-1 max-h-56 overflow-y-auto">
                    <div>
                      <span className="text-[#26B8C7]">1. Document Quality: </span>
                      <span className="text-emerald-400">{testExecutionTrace.stages.documentQuality.status}</span> (Blur: {testExecutionTrace.stages.documentQuality.blurScore})
                    </div>
                    <div>
                      <span className="text-[#26B8C7]">2. OCR Extraction: </span>
                      <span className="text-emerald-400">{testExecutionTrace.stages.ocrExtraction.status}</span> ({testExecutionTrace.stages.ocrExtraction.fieldsExtractedCount} fields extracted)
                    </div>
                    <div>
                      <span className="text-[#26B8C7]">3. Forensics: </span>
                      <span className="text-emerald-400">{testExecutionTrace.stages.documentAnalysis.status}</span>
                    </div>
                    <div>
                      <span className="text-[#26B8C7]">4. Biometrics: </span>
                      <span className="text-emerald-400">{testExecutionTrace.stages.biometricVerification.status}</span> ({testExecutionTrace.stages.biometricVerification.livenessMethod})
                    </div>
                    <div>
                      <span className="text-[#26B8C7]">5. Authoritative Gov: </span>
                      <span className="text-amber-400">{testExecutionTrace.stages.additionalChecks.authoritativeGovCheckStatus}</span> (Transparent honest reporting)
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-[#E2E8F0] dark:border-[#203652]">
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="px-4 py-2 bg-[#2676D2] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
