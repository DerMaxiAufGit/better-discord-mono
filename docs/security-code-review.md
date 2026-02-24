# Security Code Review

Date: 2026-02-24
Scope: `backend/` and `frontend/` source code (excluding `node_modules`).

## Executive summary

I found **5 security issues** worth tracking:

1. CORS is effectively open while credentials are enabled.
2. JWT uses a weak development fallback secret in production code path.
3. Raw user credentials are stored in browser `sessionStorage`.
4. Access tokens are sent in WebSocket query parameters.
5. Authentication endpoints do not have rate-limiting controls.

---

## Findings

### 1) CORS origin reflection with credentials enabled (High)

**What I observed**
- The CORS callback reflects untrusted origins when they are not explicitly allowed.
- `credentials: true` is enabled globally.

**Why this is risky**
- Reflecting arbitrary origins while allowing credentials can allow malicious websites to make authenticated cross-origin requests and read responses where cookies/tokens are accepted.
- This can enable account actions from untrusted origins and increase CSRF-style risk surface.

**Code locations**
- `backend/src/server.ts` (`origin` callback + `credentials: true`).

**Recommended fix**
- Reject unknown origins with an error (`cb(new Error('Not allowed'), false)`), do not reflect them.
- Require explicit allowlist in production and fail fast if not configured.
- Add CSRF protections for cookie-authenticated endpoints.

### 2) Insecure default JWT secret fallback (High)

**What I observed**
- JWT secret falls back to a hardcoded development string if `JWT_SECRET` is missing.

**Why this is risky**
- If env configuration is missing in production, attackers can forge valid JWTs using the known fallback secret.

**Code locations**
- `backend/src/server.ts` (`secret: process.env.JWT_SECRET || 'dev-secret-change-in-production'`).

**Recommended fix**
- Remove fallback and terminate startup when `JWT_SECRET` is absent/weak.
- Enforce minimum secret entropy requirements.

### 3) Plaintext credentials persisted in `sessionStorage` (High)

**What I observed**
- Email and password are stored in `sessionStorage` as base64 JSON (`_ec`).

**Why this is risky**
- Base64 is not encryption; any XSS, extension, or compromised script can recover credentials directly.
- This increases account takeover impact beyond token theft.

**Code locations**
- `frontend/src/stores/auth.ts` (multiple `sessionStorage.setItem('_ec', btoa(JSON.stringify({ e: email, p: password })))`).

**Recommended fix**
- Never store raw passwords in web storage.
- Use a short-lived re-auth flow, WebCrypto-protected key material, or server-side key escrow if needed by product requirements.

### 4) WebSocket bearer token in URL query string (Medium)

**What I observed**
- Frontend appends access token to WebSocket URL query string.
- Backend expects token from query param.

**Why this is risky**
- URL query strings can leak via logs, reverse proxies, browser history, and observability tools.
- Token compromise allows session hijacking until expiry.

**Code locations**
- `frontend/src/lib/websocket/useMessaging.ts` (constructs `/api/ws?token=...`).
- `backend/src/middleware/wsAuth.ts` (reads token from `request.query`).

**Recommended fix**
- Move token to `Authorization` header during WebSocket upgrade, or secure cookie + origin checks.
- Redact query strings in logs if temporary compatibility is needed.

### 5) Missing login/signup rate limiting and abuse controls (Medium)

**What I observed**
- No rate-limit plugin or endpoint-specific throttling on auth routes.

**Why this is risky**
- Enables credential stuffing and brute-force attempts at scale.
- Can amplify DoS pressure on bcrypt-intensive login paths.

**Code locations**
- `backend/src/server.ts` and `backend/src/routes/auth.ts` (no throttling configured).

**Recommended fix**
- Add per-IP and per-account rate limits (burst + sustained).
- Add login lockouts / exponential backoff / CAPTCHA after repeated failures.
- Emit security telemetry for detection.
