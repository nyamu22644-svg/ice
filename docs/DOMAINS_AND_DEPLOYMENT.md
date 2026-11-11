# ICE — Domain and Deployment Configuration Guide

This document specifies the routing, domain mapping, and authentication boundary configuration for the ICE Identity Verification Platform.

---

## 1. Portal Domain Architecture

ICE is architected around four distinct operational experiences, each with its own authorization model and user journey.

| Product Experience | Proposed Production Domain | Local Development Path | Access Model |
| :--- | :--- | :--- | :--- |
| **ICE Verify** | `https://verify.ice.example` | `http://localhost:3000/verify` | **Public Time-Limited Session Token**. No permanent registration required. Applicants arrive via signed links. |
| **Company Workspace** | `https://app.ice.example` | `http://localhost:3000/workspace` | **Company Registration & Login**. Organization-scoped RBAC (Owner, Compliance Manager, Reviewer, Auditor). |
| **Developer Portal** | `https://developers.ice.example` | `http://localhost:3000/developers` | **Hybrid**: Public documentation is open without login. Private developer tools (API keys, webhooks) require developer registration. |
| **ICE Platform Console** | `https://console.ice.example` | `http://localhost:3000/platform` | **Internal Staff Only**. No public registration. Invite-only, administrative provisioning with mandatory MFA. |

---

## 2. Shared Supabase Project with Strict Server-Side Boundaries

A single Supabase project foundation is used across the four portals. However, **domain separation does not equal authorization separation**:

1. **No Broad Wildcard Cookies**:
   - Authentication cookies are host-scoped to their respective domains (e.g., `Host-app-session`, `Host-dev-session`, `Host-console-session`).
   - An authenticated session on `developers.ice.example` does NOT automatically confer access to `app.ice.example` or `console.ice.example`.

2. **Server-Side Access Guard**:
   - All protected routes and API endpoints validate the user's role against PostgreSQL table `public.users` or `public.platform_staff`.
   - Merely having a valid Supabase JWT does not grant access to the ICE Platform Console (`console.ice.example`). The user must possess an internal staff role (`PLATFORM_SUPER_ADMIN`, `SECURITY_ADMIN`, etc.) and confirmed MFA.

3. **Multi-Tenant Row-Level Security (RLS)**:
   - Every tenant record in PostgreSQL enforces `organization_id = public.current_tenant_id()`.
   - An independent developer registered on `developers.ice.example` cannot read or query any company's verification sessions until the company owner invites them.

---

## 3. Supabase Auth URL Configuration

In your Supabase Project Dashboard under **Authentication -> URL Configuration**, configure the following:

### Site URL
```
https://app.ice.example
```

### Additional Redirect URLs
```
https://app.ice.example/auth/callback
https://developers.ice.example/auth/callback
https://console.ice.example/auth/callback
http://localhost:3000/auth/callback
http://localhost:3000/workspace
http://localhost:3000/developers
http://localhost:3000/platform
```

### Email Confirmation URL
```
https://app.ice.example/auth/confirm
```

### Password Recovery URL
```
https://app.ice.example/auth/reset-password
```

---

## 4. Safe Redirect Validation

The platform includes server-side redirect validation (`isValidRedirectUrl` in `lib/auth/portal-auth.ts`).
Redirect targets are checked against the allowed domain list to prevent open-redirect vulnerabilities.

---

## 5. Webhook Security and Replay Protection

When configuring company webhooks:
- **Signing Algorithm**: HMAC-SHA256 over `${timestamp}.${rawBody}`.
- **Header**: `X-ICE-Signature`.
- **Timestamp Header**: `X-ICE-Timestamp` (UNIX epoch seconds).
- **Tolerance Window**: 300 seconds (5 minutes). Replay requests with older timestamps are rejected.
- **Authoritative Rule**: Companies must verify the result by querying `GET /v1/verifications/{id}` via authenticated REST API rather than trusting webhook payloads blindly.
