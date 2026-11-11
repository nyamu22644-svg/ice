'use client';

import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Code2, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  ShieldCheck, 
  Key, 
  Webhook, 
  AlertTriangle, 
  HelpCircle, 
  History, 
  Layers, 
  Lock, 
  Play, 
  ChevronRight, 
  CheckCircle2, 
  FileText, 
  Cpu, 
  UserCheck, 
  ArrowRight,
  Globe
} from 'lucide-react';
import { IceLogo } from '../brand/IceLogo';

export type DocSectionId = 
  | 'intro'
  | 'how_ice_works'
  | 'quick_start'
  | 'kenya_lending_guide'
  | 'api_reference'
  | 'auth'
  | 'create_verification'
  | 'hosted_verification'
  | 'doc_verification'
  | 'biometric_verification'
  | 'verification_results'
  | 'webhooks'
  | 'error_codes'
  | 'security'
  | 'sdks'
  | 'sandbox_guide'
  | 'faq'
  | 'changelog';

type CodeLanguage = 'typescript' | 'python' | 'php' | 'java' | 'csharp';

interface PublicDocumentationProps {
  onOpenDeveloperAuth?: () => void;
}

const DOC_NAV_ITEMS: Array<{ id: DocSectionId; label: string; group: string; status?: 'LIVE' | 'SANDBOX' | 'PLANNED' }> = [
  { id: 'intro', label: 'Introduction', group: 'Getting Started' },
  { id: 'how_ice_works', label: 'How ICE Works', group: 'Getting Started' },
  { id: 'quick_start', label: 'Quick Start', group: 'Getting Started' },
  { id: 'kenya_lending_guide', label: 'Kenyan Lending Guide', group: 'Getting Started', status: 'LIVE' },
  
  { id: 'api_reference', label: 'API Reference', group: 'Endpoints', status: 'LIVE' },
  { id: 'auth', label: 'Authentication', group: 'Endpoints', status: 'LIVE' },
  { id: 'create_verification', label: 'Create a Verification', group: 'Endpoints', status: 'LIVE' },
  { id: 'hosted_verification', label: 'Hosted Verification', group: 'Endpoints', status: 'LIVE' },
  { id: 'doc_verification', label: 'Document Verification', group: 'Endpoints', status: 'LIVE' },
  { id: 'biometric_verification', label: 'Biometric Verification', group: 'Endpoints', status: 'SANDBOX' },
  { id: 'verification_results', label: 'Verification Results', group: 'Endpoints', status: 'LIVE' },
  
  { id: 'webhooks', label: 'Webhooks', group: 'Integration', status: 'LIVE' },
  { id: 'sdks', label: 'SDKs and Libraries', group: 'Integration' },
  { id: 'sandbox_guide', label: 'Sandbox Guide', group: 'Integration', status: 'SANDBOX' },
  
  { id: 'error_codes', label: 'Error Codes', group: 'Reference' },
  { id: 'security', label: 'Security & RLS', group: 'Reference' },
  { id: 'faq', label: 'Frequently Asked Questions', group: 'Reference' },
  { id: 'changelog', label: 'Changelog', group: 'Reference' },
];

export function PublicDocumentation({ onOpenDeveloperAuth }: PublicDocumentationProps) {
  const [activeSection, setActiveSection] = useState<DocSectionId>('intro');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>('typescript');
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedBlock(id);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return DOC_NAV_ITEMS;
    return DOC_NAV_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.group.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Multilanguage Code Snippets for Create Verification Session
  const createSessionSnippets: Record<CodeLanguage, string> = {
    typescript: `// TypeScript / Node.js
import axios from 'axios';

async function createVerification() {
  const response = await axios.post(
    'https://api.ice.example/v1/verifications',
    {
      workflow_id: 'wf_kenya_standard',
      customer_reference: 'USER-849201',
      applicant: {
        full_name: 'David Mwangi Kariuki',
        national_id_number: '28471920',
        phone_number: '+254712345678',
        email: 'david.kariuki@example.com'
      },
      callback_url: 'https://your-company.com/webhooks/ice'
    },
    {
      headers: {
        'Authorization': 'Bearer ice_live_sec_9941a82f',
        'Content-Type': 'application/json',
        'Idempotency-Key': 'req_idx_849201'
      }
    }
  );

  console.log('Verification URL:', response.data.hosted_url);
  console.log('Session ID:', response.data.session_id);
  return response.data;
}`,
    python: `# Python 3 / Django / FastAPI
import requests
import uuid

def create_verification():
    url = "https://api.ice.example/v1/verifications"
    headers = {
        "Authorization": "Bearer ice_live_sec_9941a82f",
        "Content-Type": "application/json",
        "Idempotency-Key": str(uuid.uuid4())
    }
    payload = {
        "workflow_id": "wf_kenya_standard",
        "customer_reference": "USER-849201",
        "applicant": {
            "full_name": "David Mwangi Kariuki",
            "national_id_number": "28471920",
            "phone_number": "+254712345678",
            "email": "david.kariuki@example.com"
        },
        "callback_url": "https://your-company.com/webhooks/ice"
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    print("Hosted Verify Link:", data["hosted_url"])
    return data`,
    php: `<?php
// PHP 8+ / Laravel
use Illuminate\\Support\\Facades\\Http;
use Illuminate\\Support\\Str;

$response = Http::withHeaders([
    'Authorization' => 'Bearer ice_live_sec_9941a82f',
    'Content-Type' => 'application/json',
    'Idempotency-Key' => (string) Str::uuid(),
])->post('https://api.ice.example/v1/verifications', [
    'workflow_id' => 'wf_kenya_standard',
    'customer_reference' => 'USER-849201',
    'applicant' => [
        'full_name' => 'David Mwangi Kariuki',
        'national_id_number' => '28471920',
        'phone_number' => '+254712345678',
        'email' => 'david.kariuki@example.com',
    ],
    'callback_url' => 'https://your-company.com/webhooks/ice',
]);

if ($response->successful()) {
    $data = $response->json();
    $hostedUrl = $data['hosted_url'];
    // Redirect applicant or return link to client app
}`,
    java: `// Java 17+ / Spring Boot / OkHttp
import okhttp3.*;
import java.util.UUID;

public class IceClient {
    private static final OkHttpClient client = new OkHttpClient();

    public static void createVerification() throws Exception {
        MediaType JSON = MediaType.get("application/json; charset=utf-8");
        String jsonPayload = """
        {
          "workflow_id": "wf_kenya_standard",
          "customer_reference": "USER-849201",
          "applicant": {
            "full_name": "David Mwangi Kariuki",
            "national_id_number": "28471920",
            "phone_number": "+254712345678",
            "email": "david.kariuki@example.com"
          },
          "callback_url": "https://your-company.com/webhooks/ice"
        }
        """;

        Request request = new Request.Builder()
            .url("https://api.ice.example/v1/verifications")
            .addHeader("Authorization", "Bearer ice_live_sec_9941a82f")
            .addHeader("Idempotency-Key", UUID.randomUUID().toString())
            .post(RequestBody.create(jsonPayload, JSON))
            .build();

        try (Response response = client.newCall(request).execute()) {
            System.out.println(response.body().string());
        }
    }
}`,
    csharp: `// C# / .NET 8 / HttpClient
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class IceVerificationService
{
    private static readonly HttpClient client = new HttpClient();

    public async Task<string> CreateVerificationAsync()
    {
        var payload = new
        {
            workflow_id = "wf_kenya_standard",
            customer_reference = "USER-849201",
            applicant = new
            {
                full_name = "David Mwangi Kariuki",
                national_id_number = "28471920",
                phone_number = "+254712345678",
                email = "david.kariuki@example.com"
            },
            callback_url = "https://your-company.com/webhooks/ice"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.ice.example/v1/verifications");
        request.Headers.Add("Authorization", "Bearer ice_live_sec_9941a82f");
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync();
    }
}`
  };

  // Webhook Signature Verification Snippet
  const webhookVerificationSnippets: Record<CodeLanguage, string> = {
    typescript: `// TypeScript / Node.js Express Webhook Handler
import crypto from 'crypto';

app.post('/webhooks/ice', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-ice-signature'];
  const timestamp = req.headers['x-ice-timestamp'];
  const webhookSecret = process.env.ICE_WEBHOOK_SECRET; // e.g. whsec_9814a...

  // 1. Replay attack protection (check timestamp within 5 minutes)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return res.status(400).send('Timestamp too old');
  }

  // 2. Validate HMAC-SHA256 signature
  const signedPayload = \`\${timestamp}.\${req.body}\`;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body.toString());
  console.log('Received event:', event.event_type, event.data.session_id);

  // Return HTTP 200 promptly
  res.status(200).json({ received: true });
});`,
    python: `# Python / Flask Webhook Verification
import hmac
import hashlib
import time
from flask import Flask, request, jsonify, abort

app = Flask(__name__)
WEBHOOK_SECRET = "whsec_9814a..."

@app.route("/webhooks/ice", methods=["POST"])
def ice_webhook():
    signature = request.headers.get("X-ICE-Signature")
    timestamp = request.headers.get("X-ICE-Timestamp")
    raw_body = request.get_data()

    if not signature or not timestamp:
        abort(400, "Missing signature headers")

    # Reject replay attempts older than 5 minutes
    if int(timestamp) < (time.time() - 300):
        abort(400, "Timestamp expired")

    # Compute expected signature
    signed_payload = f"{timestamp}.".encode("utf-8") + raw_body
    computed = hmac.new(WEBHOOK_SECRET.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(signature, computed):
        abort(401, "Invalid signature")

    event = request.get_json()
    print("Verification update:", event["event_type"])
    return jsonify({"received": True}), 200`,
    php: `<?php
// PHP Webhook Signature Verification
$signature = $_SERVER['HTTP_X_ICE_SIGNATURE'] ?? '';
$timestamp = $_SERVER['HTTP_X_ICE_TIMESTAMP'] ?? '';
$rawBody = file_get_contents('php://input');
$webhookSecret = getenv('ICE_WEBHOOK_SECRET');

// Verify timestamp within 5 minutes
if ((int)$timestamp < (time() - 300)) {
    http_response_code(400);
    exit('Timestamp expired');
}

$signedPayload = $timestamp . '.' . $rawBody;
$computed = hash_hmac('sha256', $signedPayload, $webhookSecret);

if (!hash_equals($signature, $computed)) {
    http_response_code(401);
    exit('Invalid signature');
}

$event = json_decode($rawBody, true);
// Process event and respond with 200
http_response_code(200);
echo json_encode(['received' => true]);`,
    java: `// Java Webhook Signature Verification
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

public class WebhookValidator {
    public static boolean isValid(String signature, String timestamp, String payload, String secret) throws Exception {
        long ts = Long.parseLong(timestamp);
        long now = Instant.now().getEpochSecond();
        if (ts < (now - 300)) return false; // Replay check

        Mac hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        hmac.init(keySpec);

        String signedPayload = timestamp + "." + payload;
        byte[] hash = hmac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8));
        
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString().equals(signature);
    }
}`,
    csharp: `// C# Webhook Signature Verification
using System;
using System.Security.Cryptography;
using System.Text;

public static class WebhookVerifier
{
    public static bool Verify(string signature, string timestamp, string rawBody, string secret)
    {
        if (!long.TryParse(timestamp, out long ts)) return false;
        long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (ts < now - 300) return false; // Reject requests > 5 minutes old

        string payloadToSign = $"{timestamp}.{rawBody}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payloadToSign));
        string computedSignature = Convert.ToHexString(hash).ToLower();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(signature),
            Encoding.UTF8.GetBytes(computedSignature)
        );
    }
}`
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 bg-white dark:bg-[#101C2C] rounded-xl border border-slate-200 dark:border-[#1E2F47] shadow-xs overflow-hidden transition-colors">
      {/* LEFT-HAND DOCUMENTATION SIDEBAR */}
      <aside className="w-full lg:w-64 shrink-0 bg-slate-50 dark:bg-[#0B131E] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#1E2F47] p-4 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Docs Brand & Search */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                Documentation
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-[#2676D2] dark:text-cyan-300 font-semibold">
                v1.4 REST
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-[#203652] bg-white dark:bg-[#172B43] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2676D2]"
              />
            </div>
          </div>

          {/* Navigation Items Grouped */}
          <nav className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {['Getting Started', 'Endpoints', 'Integration', 'Reference'].map((groupName) => {
              const items = filteredNavItems.filter((i) => i.group === groupName);
              if (items.length === 0) return null;

              return (
                <div key={groupName} className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 block">
                    {groupName}
                  </span>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded transition-colors text-left cursor-pointer ${
                            isActive
                              ? 'bg-[#2676D2] text-white font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#172B43]'
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {item.status && (
                            <span className={`text-[9px] font-mono uppercase px-1 py-0.2 rounded font-semibold ${
                              item.status === 'LIVE'
                                ? isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : item.status === 'SANDBOX'
                                ? isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                                : isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {item.status}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Developer Account CTA in Documentation Sidebar */}
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-[#1E2F47] space-y-2">
          <div className="p-2.5 bg-white dark:bg-[#172B43] rounded border border-slate-200 dark:border-[#203652] text-xs">
            <span className="font-semibold block text-slate-900 dark:text-white mb-0.5">Ready to integrate?</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              Sign in to manage API keys, webhooks, and live delivery logs.
            </p>
            <button
              onClick={onOpenDeveloperAuth}
              className="w-full py-1.5 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Developer Sign In</span>
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN DOCUMENTATION CONTENT VIEW */}
      <div className="flex-1 p-6 lg:p-8 max-w-4xl space-y-8">
        {/* SECTION: INTRODUCTION */}
        {activeSection === 'intro' && (
          <article className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#2676D2] dark:text-cyan-300 border border-blue-200 dark:border-blue-900/60">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Public Documentation • No Account Required</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Introduction to ICE
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                ICE is an independent identity verification platform built for organizations across Africa and global markets. We provide simple REST APIs and hosted verification workflows to verify applicant identities, extract document fields, validate optical quality, and evaluate risk without storing unnecessary personal records.
              </p>
            </div>

            {/* Core Technology Independence Callout */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] space-y-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#2676D2]" />
                <span>Works With Any Technology Stack</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                ICE is completely language-independent. Whether your backend is built with <strong>PHP (Laravel), Java (Spring Boot), Python (Django/FastAPI), Node.js (Express/Nest), or C# (.NET)</strong>, you communicate via standard JSON over HTTPS. You never need to change your database or framework.
              </p>
            </div>

            {/* Integration Channels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded border border-slate-200 dark:border-[#203652] bg-white dark:bg-[#0B131E] space-y-2">
                <span className="font-bold text-xs text-[#2676D2] dark:text-cyan-300 block">1. Hosted Verification Links</span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Generate a secure, time-limited link. Send it to your applicant via SMS or email; ICE handles the camera capture, document scanning, and liveness check.
                </p>
              </div>

              <div className="p-4 rounded border border-slate-200 dark:border-[#203652] bg-white dark:bg-[#0B131E] space-y-2">
                <span className="font-bold text-xs text-[#2676D2] dark:text-cyan-300 block">2. Direct REST API</span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Full programmatic control. Submit encrypted document images and selfies directly from your own server and receive structured JSON responses.
                </p>
              </div>

              <div className="p-4 rounded border border-slate-200 dark:border-[#203652] bg-white dark:bg-[#0B131E] space-y-2">
                <span className="font-bold text-xs text-[#2676D2] dark:text-cyan-300 block">3. Signed Webhooks</span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Real-time event notifications delivered to your endpoint with HMAC-SHA256 signatures, replay timestamp protection, and retry queues.
                </p>
              </div>

              <div className="p-4 rounded border border-slate-200 dark:border-[#203652] bg-white dark:bg-[#0B131E] space-y-2">
                <span className="font-bold text-xs text-[#2676D2] dark:text-cyan-300 block">4. Embeddable Web SDK</span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Drop ICE capture components directly into your React, Vue, or vanilla HTML frontend without taking applicants off your domain.
                </p>
              </div>
            </div>
          </article>
        )}

        {/* SECTION: HOW ICE WORKS */}
        {activeSection === 'how_ice_works' && (
          <article className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">How ICE Works</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              ICE follows a structured four-stage verification sequence designed to maximize completion rates and maintain complete data safety:
            </p>

            <div className="space-y-4">
              {[
                {
                  step: '1. Create Verification Session',
                  desc: 'Your application makes an authenticated POST request to /v1/verifications with an applicant reference and workflow ID. ICE returns a unique session ID and hosted URL.',
                },
                {
                  step: '2. Document & Selfie Collection',
                  desc: 'The applicant opens the link on their mobile phone or desktop camera. Real-time optical checks ensure images are crisp (blur score >= 0.70) with no glare or cut-off corners.',
                },
                {
                  step: '3. Risk Intelligence & Extraction',
                  desc: 'ICE extracts structured text from the document (name, document number, date of birth) and computes optical tampering indicators. Biometrics perform passive or active liveness verification.',
                },
                {
                  step: '4. Decision Delivery & Verification',
                  desc: 'ICE dispatches a signed webhook (verification.completed) to your server. Your server retrieves the authoritative result via GET /v1/verifications/{id} and updates your own database.',
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-slate-50 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] space-y-1">
                  <span className="text-xs font-bold text-[#2676D2] dark:text-cyan-300 block">{item.step}</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* People Module / Non-CRM Clarification */}
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-bold block">Important Architectural Note:</span>
              <p>
                ICE is an identity verification processor, not your customer database. Your organization remains the sole owner of your customer relationships, accounts, and financial records. ICE stores only what is necessary to audit the verification decision.
              </p>
            </div>
          </article>
        )}

        {/* SECTION: QUICK START */}
        {activeSection === 'quick_start' && (
          <article className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quick Start Guide</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Get your first verification session running in under 5 minutes. Select your language below to inspect code snippets.
            </p>

            {/* Language Selector Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652]">
              {(['typescript', 'python', 'php', 'java', 'csharp'] as CodeLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                    selectedLanguage === lang
                      ? 'bg-white dark:bg-[#2676D2] text-[#2676D2] dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'csharp' ? 'C# (.NET)' : lang === 'typescript' ? 'Node.js / TS' : lang}
                </button>
              ))}
            </div>

            {/* Code Block Container */}
            <div className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-[#203652] bg-[#0D1724] text-slate-100 font-mono text-xs">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#172B43] border-b border-[#203652]">
                <span className="text-[11px] text-slate-300">Create Verification Session ({selectedLanguage})</span>
                <button
                  onClick={() => handleCopy(createSessionSnippets[selectedLanguage], 'quick_start')}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#101C2C] hover:bg-[#203652] text-[11px] text-cyan-300 transition-colors"
                >
                  {copiedBlock === 'quick_start' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBlock === 'quick_start' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 overflow-x-auto leading-relaxed text-[11px]">
                {createSessionSnippets[selectedLanguage]}
              </pre>
            </div>
          </article>
        )}

        {/* SECTION: API REFERENCE */}
        {activeSection === 'api_reference' && (
          <article className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">API Reference</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              The ICE REST API conforms to OpenAPI 3.0 specifications. All requests must use HTTPS with JSON payloads.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Base URL</span>
                <div className="flex items-center gap-2 font-mono text-xs text-[#2676D2] dark:text-cyan-300 bg-white dark:bg-[#101C2C] p-2 rounded border border-slate-300 dark:border-[#203652]">
                  <span>https://api.ice.example/v1</span>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-[#203652] rounded-lg overflow-hidden">
                <div className="bg-[#172B43] px-4 py-2 text-xs font-bold text-white flex items-center justify-between">
                  <span>Core Endpoints</span>
                  <span className="text-[10px] text-slate-300 font-mono">v1.4 Spec</span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-[#203652] text-xs">
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px]">POST</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">/v1/verifications</span>
                    </div>
                    <span className="text-slate-500">Create new verification session</span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded text-[11px]">GET</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">/v1/verifications/{'{id}'}</span>
                    </div>
                    <span className="text-slate-500">Retrieve authoritative verification results</span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px]">POST</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">/v1/verifications/{'{id}'}/documents</span>
                    </div>
                    <span className="text-slate-500">Directly upload document evidence</span>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded text-[11px]">GET</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">/v1/workflows</span>
                    </div>
                    <span className="text-slate-500">List configured organization workflows</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        )}

        {/* SECTION: AUTHENTICATION */}
        {activeSection === 'auth' && (
          <article className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">API Authentication</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Every API request must include your secret API key in the <code className="font-mono text-[#2676D2]">Authorization</code> HTTP header using Bearer token format.
            </p>

            <div className="p-4 rounded-lg bg-[#0D1724] border border-[#203652] text-xs font-mono text-slate-200">
              <code>Authorization: Bearer ice_live_sec_9941a82f3c...</code>
            </div>

            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 space-y-1">
              <span className="font-bold block">Keep API Keys Secret:</span>
              <p>
                Never expose secret keys (<code className="font-mono font-semibold">ice_live_sec_*</code>) in client-side code, mobile application bundles, or public GitHub repositories. Use them only from your backend servers.
              </p>
            </div>
          </article>
        )}

        {/* SECTION: WEBHOOKS */}
        {activeSection === 'webhooks' && (
          <article className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Webhooks Integration</h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Webhook:</strong> A message ICE automatically sends to your application when a verification changes status. This allows your backend to act immediately (e.g. approving a loan or unlocking an account) without polling.
              </p>
            </div>

            {/* Language Selector for Webhook Verification */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652]">
              {(['typescript', 'python', 'php', 'java', 'csharp'] as CodeLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                    selectedLanguage === lang
                      ? 'bg-white dark:bg-[#2676D2] text-[#2676D2] dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'csharp' ? 'C# (.NET)' : lang === 'typescript' ? 'Node.js / TS' : lang}
                </button>
              ))}
            </div>

            <div className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-[#203652] bg-[#0D1724] text-slate-100 font-mono text-xs">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#172B43] border-b border-[#203652]">
                <span className="text-[11px] text-slate-300">Verify Webhook HMAC Signature ({selectedLanguage})</span>
                <button
                  onClick={() => handleCopy(webhookVerificationSnippets[selectedLanguage], 'webhooks')}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#101C2C] hover:bg-[#203652] text-[11px] text-cyan-300 transition-colors"
                >
                  {copiedBlock === 'webhooks' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBlock === 'webhooks' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 overflow-x-auto leading-relaxed text-[11px]">
                {webhookVerificationSnippets[selectedLanguage]}
              </pre>
            </div>

            {/* Important Rule: Retrieve Authoritative Decision */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white block">Authoritative Decision Rule:</span>
              <p>
                Do not trust a webhook notification alone as the sole trigger for high-value financial actions. Treat webhooks as an alert to fetch the authoritative result via your authenticated connection (<code className="font-mono text-[#2676D2]">GET /v1/verifications/{'{id}'}</code>).
              </p>
            </div>
          </article>
        )}

        {/* SECTION: ERROR CODES */}
        {activeSection === 'error_codes' && (
          <article className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Error Codes & Responses</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              ICE uses standard HTTP status codes combined with human-readable error descriptions and unique request identifiers.
            </p>

            <div className="border border-slate-200 dark:border-[#203652] rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#172B43] text-white">
                  <tr>
                    <th className="px-4 py-3">HTTP Code</th>
                    <th className="px-4 py-3">Error Code</th>
                    <th className="px-4 py-3">Meaning & Troubleshooting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#203652]">
                  <tr className="hover:bg-slate-50 dark:hover:bg-[#172B43]">
                    <td className="px-4 py-3 font-mono font-bold text-amber-600">400</td>
                    <td className="px-4 py-3 font-mono">INVALID_DOCUMENT_IMAGE</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Image blur exceeds limit (blur score &lt; 0.70) or glare obstructs critical numbers.</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-[#172B43]">
                    <td className="px-4 py-3 font-mono font-bold text-red-600">401</td>
                    <td className="px-4 py-3 font-mono">UNAUTHORIZED</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Missing or invalid Bearer API key. Check Developer Portal credentials.</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-[#172B43]">
                    <td className="px-4 py-3 font-mono font-bold text-red-600">403</td>
                    <td className="px-4 py-3 font-mono">CROSS_TENANT_FORBIDDEN</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Your API key belongs to a different organization than the requested resource.</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-[#172B43]">
                    <td className="px-4 py-3 font-mono font-bold text-amber-600">409</td>
                    <td className="px-4 py-3 font-mono">IDEMPOTENCY_CONFLICT</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">An existing request already succeeded with this Idempotency-Key.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        )}

        {/* SECTION: FREQUENTLY ASKED QUESTIONS */}
        {activeSection === 'faq' && (
          <article className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h1>
            <div className="space-y-4">
              <div className="p-4 rounded border border-slate-200 dark:border-[#203652] bg-white dark:bg-[#172B43] space-y-1">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Does ICE replace our customer CRM database?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  No. ICE verifies identities on request and returns the resulting verification signals. Your organization maintains full ownership and control of customer accounts, business balances, and transactions in your own database.
                </p>
              </div>

              <div className="p-4 rounded border border-slate-200 dark:border-[#203652] bg-white dark:bg-[#172B43] space-y-1">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Can Company A view Company B&apos;s records?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Never. ICE enforces strict composite-key tenant isolation and PostgreSQL Row-Level Security (RLS). Every query and storage reference is scoped to the authenticated organization.
                </p>
              </div>

              <div className="p-4 rounded border border-slate-200 dark:border-[#203652] bg-white dark:bg-[#172B43] space-y-1">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">How does official identity checking work?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  ICE never misrepresents optical OCR extraction as government verification. If an organization does not have an active, verified regulatory connector to official registers (e.g. Kenya IPRS), the status explicitly states <strong className="text-slate-800 dark:text-white">Not Connected</strong>.
                </p>
              </div>
            </div>
          </article>
        )}

        {/* SECTION: KENYAN LENDING APPLICATION INTEGRATION GUIDE */}
        {activeSection === 'kenya_lending_guide' && (
          <article className="space-y-6">
            <div className="border-b border-slate-200 dark:border-[#203652] pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-cyan-300">
                  REAL-WORLD REFERENCE ARCHITECTURE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Kenya Digital Credit
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                Safari Pesa Lending Integration Guide
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                A complete implementation guide demonstrating how an independent Kenyan digital credit provider
                (<strong>Safari Pesa Microfinance Limited</strong>, domain: <code className="font-mono">https://lending.example.com</code>)
                integrates ICE identity verification into its loan origination pipeline.
              </p>
            </div>

            {/* Architecture Separation Principles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">1. Independent Applications</span>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                  Safari Pesa maintains its own database, customer auth, loan ledger, and credit scoring algorithms completely separate from ICE.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">2. Allowed Origin Whitelisting</span>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                  Verification sessions validate <code className="font-mono">https://lending.example.com</code> against registered project origins to prevent phishing redirects.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">3. Strict Data Minimization</span>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                  The lending app queries authoritative claims (authenticity, match, risk score). Raw biometrics and templates are never transmitted.
                </p>
              </div>
            </div>

            {/* Architecture Sequence Flow Diagram */}
            <div className="bg-[#0D1724] p-5 rounded-lg border border-[#203652] text-slate-200 font-mono text-[11px] space-y-3">
              <div className="flex items-center justify-between text-xs text-cyan-300 font-bold border-b border-[#203652] pb-2">
                <span>INTERACTION SEQUENCE: LENDING APPLICATION &lt;---&gt; ICE VERIFICATION PLATFORM</span>
                <span className="text-[10px] text-slate-400 font-normal">Standard 5-Step Origination Flow</span>
              </div>
              <div className="leading-relaxed text-slate-300 overflow-x-auto py-2">
                <pre>{`[Lending Customer Browser]          [Safari Pesa Backend]                    [ICE Platform API]
      |                                      |                                       |
      | 1. Apply for Loan (LOAN-APP-8849)   |                                       |
      |------------------------------------->|                                       |
      |                                      | 2. POST /api/v1/sessions              |
      |                                      |    (Bearer ice_test_sec_...,          |
      |                                      |     workflow: wf_kenya_standard,      |
      |                                      |     return_url: lending.example.com)  |
      |                                      |-------------------------------------->|
      |                                      |<--------------------------------------|
      |                                      | 3. Returns session_token & hosted_url |
      |                                      |                                       |
      | 4a. Redirect to hosted_url OR        |                                       |
      | 4b. Mount @ice-identity/verify-sdk   |                                       |
      |<-------------------------------------|                                       |
      |                                                                              |
      | 5. Applicant snaps Kenya National ID + Live Selfie                          |
      |----------------------------------------------------------------------------->|
      |                                                                              |
      |                                      | 6. POST /webhooks/ice (HMAC Signed)   |
      |                                      |    X-ICE-Signature: t=171...,v1=4f... |
      |                                      |<--------------------------------------|
      |                                      | 7. Validate timestamp (<300s) & HMAC  |
      |                                      | 8. GET /api/v1/verifications/{id}     |
      |                                      |    (Retrieves Minimized Claims)       |
      |                                      |-------------------------------------->|
      |                                      |<--------------------------------------|
      |                                      | 9. Disburse Loan / Advance Approval   |
      | 10. Loan Approved (KES 25,000)       |                                       |
      |<-------------------------------------|                                       |`}</pre>
              </div>
            </div>

            {/* Step-by-Step Code Walkthrough */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Step 1: Lending Backend Creates Verification Session
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Safari Pesa initiates the session with <code className="font-mono">POST /api/v1/sessions</code>:
              </p>

              {/* Multilanguage Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652]">
                {(['typescript', 'python', 'php', 'java', 'csharp'] as CodeLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                      selectedLanguage === lang
                        ? 'bg-white dark:bg-[#2676D2] text-[#2676D2] dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'csharp' ? 'C# (.NET)' : lang === 'typescript' ? 'Node.js / TS' : lang}
                  </button>
                ))}
              </div>

              <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-[#203652] bg-[#0D1724] text-slate-100 font-mono text-xs">
                <pre className="p-4 overflow-x-auto leading-relaxed text-[11px]">
                  {selectedLanguage === 'typescript' && `// Safari Pesa Lending Backend (Node.js/Express)
const response = await fetch('https://api.ice.example/v1/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.ICE_SECRET_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    project_id: 'proj_safari_lending',
    workflow_id: 'wf_kenya_standard',
    customer_reference_id: 'LOAN-APP-8849',
    return_url: 'https://lending.example.com/apply/loan-8849/complete',
    cancel_url: 'https://lending.example.com/apply/loan-8849/cancel',
    applicant_data: {
      full_name: 'David Mwangi Kariuki',
      id_number: '28471920',
      phone_number: '+254712345678'
    }
  })
});
const { session_id, hosted_url, session_token } = await response.json();`}
                  {selectedLanguage === 'python' && `# Safari Pesa Lending Backend (Python/FastAPI)
import requests

response = requests.post(
    "https://api.ice.example/v1/sessions",
    headers={"Authorization": f"Bearer {ICE_SECRET_KEY}"},
    json={
        "project_id": "proj_safari_lending",
        "workflow_id": "wf_kenya_standard",
        "customer_reference_id": "LOAN-APP-8849",
        "return_url": "https://lending.example.com/apply/loan-8849/complete",
        "cancel_url": "https://lending.example.com/apply/loan-8849/cancel",
        "applicant_data": {
            "full_name": "David Mwangi Kariuki",
            "id_number": "28471920",
            "phone_number": "+254712345678"
        }
    }
)
data = response.json()`}
                  {selectedLanguage === 'php' && `<?php
// Safari Pesa Lending Backend (PHP/Laravel)
$response = Http::withToken(config('services.ice.secret'))
    ->post('https://api.ice.example/v1/sessions', [
        'project_id' => 'proj_safari_lending',
        'workflow_id' => 'wf_kenya_standard',
        'customer_reference_id' => 'LOAN-APP-8849',
        'return_url' => 'https://lending.example.com/apply/loan-8849/complete',
        'cancel_url' => 'https://lending.example.com/apply/loan-8849/cancel',
        'applicant_data' => [
            'full_name' => 'David Mwangi Kariuki',
            'id_number' => '28471920',
            'phone_number' => '+254712345678'
        ]
    ]);
$data = $response->json();`}
                  {selectedLanguage === 'java' && `// Safari Pesa Lending Backend (Java/Spring Boot)
String payload = """
{
  "project_id": "proj_safari_lending",
  "workflow_id": "wf_kenya_standard",
  "customer_reference_id": "LOAN-APP-8849",
  "return_url": "https://lending.example.com/apply/loan-8849/complete",
  "applicant_data": {
    "full_name": "David Mwangi Kariuki",
    "id_number": "28471920",
    "phone_number": "+254712345678"
  }
}
""";
Request request = new Request.Builder()
    .url("https://api.ice.example/v1/sessions")
    .addHeader("Authorization", "Bearer " + secretKey)
    .post(RequestBody.create(payload, MediaType.get("application/json")))
    .build();`}
                  {selectedLanguage === 'csharp' && `// Safari Pesa Lending Backend (C#/.NET)
var payload = new {
    project_id = "proj_safari_lending",
    workflow_id = "wf_kenya_standard",
    customer_reference_id = "LOAN-APP-8849",
    return_url = "https://lending.example.com/apply/loan-8849/complete",
    applicant_data = new {
        full_name = "David Mwangi Kariuki",
        id_number = "28471920",
        phone_number = "+254712345678"
    }
};
var response = await httpClient.PostAsJsonAsync("https://api.ice.example/v1/sessions", payload);`}
                </pre>
              </div>

              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pt-2">
                Step 2: Embedded Web SDK in Safari Pesa Loan Application
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                To keep applicants inside the loan funnel without full-page navigation, Safari Pesa embeds ICE via the client SDK:
              </p>
              <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-[#203652] bg-[#0D1724] text-slate-100 font-mono text-xs">
                <pre className="p-4 overflow-x-auto leading-relaxed text-[11px]">{`import { IceVerify } from '@ice-identity/verify-sdk';

// Initialize the embedded verification container
const ice = new IceVerify({
  sessionToken: response.session_token,
  containerId: 'ice-verify-embed',
  onReady: () => {
    console.log('[Safari Pesa] ICE camera and document interface initialized');
  },
  onStepChange: (step) => {
    console.log('[Safari Pesa] Applicant progressed to step:', step);
  },
  onComplete: (result) => {
    console.log('[Safari Pesa] Verification submitted:', result.sessionId, result.status);
    // Show loan underwriting spinner while waiting for webhook confirmation
    showLoanUnderwritingProgress();
  },
  onCancel: () => {
    window.location.href = '/apply/loan-8849/cancelled';
  },
  onError: (error) => {
    displayLoanErrorNotification(error.message);
  }
});`}</pre>
              </div>

              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pt-2">
                Step 3: Webhook Verification with 300s Timestamp Tolerance
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                When ICE completes processing, it sends a signed webhook to Safari Pesa&apos;s webhook endpoint.
                The header <code className="font-mono">X-ICE-Signature: t={'{timestamp}'},v1={'{signature}'}</code> protects against replay attacks:
              </p>
              <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-[#203652] bg-[#0D1724] text-slate-100 font-mono text-xs">
                <pre className="p-4 overflow-x-auto leading-relaxed text-[11px]">{`// Safari Pesa Webhook Handler (Express/Node.js)
import crypto from 'crypto';

app.post('/api/webhooks/ice', express.raw({ type: 'application/json' }), (req, res) => {
  const sigHeader = req.headers['x-ice-signature']; // format: t=1731114000,v1=9f8a...
  const parts = Object.fromEntries(sigHeader.split(',').map(kv => kv.split('=')));
  const timestamp = parseInt(parts.t, 10);
  const signature = parts.v1;

  // Replay Attack Guard: Reject if older than 300 seconds (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return res.status(400).send('Webhook timestamp exceeds 300s replay window');
  }

  // Validate HMAC-SHA256
  const payloadToSign = \`\${timestamp}.\${req.body.toString('utf-8')}\`;
  const computed = crypto.createHmac('sha256', process.env.ICE_WEBHOOK_SECRET)
                         .update(payloadToSign)
                         .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computed, 'hex'))) {
    return res.status(401).send('Invalid webhook HMAC signature');
  }

  const event = JSON.parse(req.body.toString());
  if (event.event_type === 'verification.completed') {
    // Session completed, query minimized claims and approve loan!
    advanceLoanOrigination(event.data.customer_reference_id, event.data.session_id);
  }

  res.status(200).json({ received: true });
});`}</pre>
              </div>

              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pt-2">
                Step 4: Minimized Decision Claim Retrieval
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Safari Pesa retrieves the authoritative result via <code className="font-mono">GET /api/v1/verifications/{'{session_id}'}</code>.
                In accordance with Kenyan Data Protection Act 2019, ICE delivers only decision claims, strictly withholding raw biometrics:
              </p>
              <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-[#203652] bg-[#0D1724] text-slate-100 font-mono text-xs">
                <pre className="p-4 overflow-x-auto leading-relaxed text-[11px]">{`// Authoritative Minimized Response received by Safari Pesa Backend
{
  "verification_id": "sess_safari_lending_8849",
  "customer_reference_id": "LOAN-APP-8849",
  "status": "APPROVED",
  "decision_summary": {
    "is_id_authentic": true,
    "is_face_matched": true,
    "risk_score": 12,
    "risk_band": "LOW_RISK",
    "sanctions_cleared": true
  },
  "verified_claims": {
    "full_name": "David Mwangi Kariuki",
    "document_type": "KE_NATIONAL_ID",
    "id_number": "28471920",
    "date_of_birth": "1992-04-14",
    "nationality": "KE"
  },
  "data_minimization_notice": "Raw biometric templates and unmasked images withheld under Kenyan Data Protection Act 2019."
}`}</pre>
              </div>
            </div>
          </article>
        )}

        {/* SECTION: CHANGELOG */}
        {activeSection === 'changelog' && (
          <article className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Changelog & Version History</h1>
            <div className="space-y-4">
              <div className="p-4 rounded border border-slate-200 dark:border-[#203652] bg-white dark:bg-[#172B43] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#2676D2] dark:text-cyan-300">v1.4.0 — November 2026</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold">Current</span>
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                  <li>Added full Dark Mode, Light Mode, and System appearance support.</li>
                  <li>Refactored Company Workspace &quot;People&quot; module to clarify non-CRM identity boundary.</li>
                  <li>Released Public Developer Documentation readable without registration.</li>
                  <li>Updated all client SDK examples to support TypeScript, Python, PHP (Laravel), Java, and C# (.NET).</li>
                  <li>Established Supabase PostgreSQL Row-Level Security architecture and private bucket policies.</li>
                </ul>
              </div>
            </div>
          </article>
        )}

        {/* Fallback for other sections */}
        {!['intro', 'how_ice_works', 'quick_start', 'api_reference', 'auth', 'webhooks', 'error_codes', 'faq', 'changelog'].includes(activeSection) && (
          <article className="space-y-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
              {activeSection.replace(/_/g, ' ')}
            </h1>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>
                This section contains detailed reference specifications for <strong>{activeSection.replace(/_/g, ' ')}</strong>.
              </p>
              <p>
                In the ICE sandbox, you can execute live requests or inspect interactive responses without charging production credits.
              </p>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
