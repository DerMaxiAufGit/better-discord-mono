# Security Issues (Ready to file)

Below are issue drafts based on the repository review.

---

## Issue 1: CORS misconfiguration reflects arbitrary origins while allowing credentials

**Severity:** High  
**Component:** Backend API (`fastify` CORS config)

### Description
The CORS origin callback returns the request origin even when that origin is not in the allowlist, while `credentials: true` is enabled.

### Evidence
- `backend/src/server.ts`:
  - `origin` callback returns `cb(null, origin)` on non-allowlisted origin.
  - `credentials: true`.

### Security impact
A malicious site can potentially make authenticated cross-origin requests and read responses if browser CORS checks succeed with reflected origins.

### Recommended remediation
- Reject non-allowlisted origins explicitly.
- Require non-empty allowlist in production.
- Add CSRF controls for cookie-backed auth endpoints.

---

## Issue 2: JWT secret has insecure hardcoded fallback

**Severity:** High  
**Component:** Backend auth/JWT config

### Description
Server uses a predictable fallback secret (`dev-secret-change-in-production`) when `JWT_SECRET` is unset.

### Evidence
- `backend/src/server.ts`: `secret: process.env.JWT_SECRET || 'dev-secret-change-in-production'`

### Security impact
If production env var is missing, attackers can forge valid JWTs and impersonate users.

### Recommended remediation
- Remove fallback; fail startup when `JWT_SECRET` is missing.
- Enforce minimum secret entropy (length + randomness checks).

---

## Issue 3: Plaintext user credentials stored in sessionStorage

**Severity:** High  
**Component:** Frontend auth store

### Description
The app stores `{ email, password }` in `sessionStorage` (`_ec`) after login/signup/relogin.

### Evidence
- `frontend/src/stores/auth.ts`:
  - `sessionStorage.setItem('_ec', btoa(JSON.stringify({ e: email, p: password })))`

### Security impact
Any XSS or compromised script can retrieve raw credentials, enabling full account takeover and reuse against other services.

### Recommended remediation
- Stop storing raw passwords in browser storage.
- Replace with secure re-auth flow and/or device-bound encrypted key material.

---

## Issue 4: WebSocket access token sent via query string

**Severity:** Medium  
**Component:** Frontend + backend WebSocket auth

### Description
Frontend appends bearer token in WebSocket URL (`?token=...`) and backend reads token from query parameters.

### Evidence
- `frontend/src/lib/websocket/useMessaging.ts`: `/api/ws?token=${accessToken}`
- `backend/src/middleware/wsAuth.ts`: reads `request.query.token`

### Security impact
Tokens in URLs can leak via logs, proxy instrumentation, and browser artifacts.

### Recommended remediation
- Authenticate WebSocket upgrade via headers/cookies instead of query params.
- Redact query strings in access logs.

---

## Issue 5: No rate limiting on authentication endpoints

**Severity:** Medium  
**Component:** Backend auth routes

### Description
No rate limiting or anti-automation controls are configured for signup/login/refresh endpoints.

### Evidence
- `backend/src/server.ts` and `backend/src/routes/auth.ts` have no throttle/rate-limit controls.

### Security impact
Increases risk of credential stuffing, brute force, and resource exhaustion (especially bcrypt-heavy login attempts).

### Recommended remediation
- Add per-IP and per-account rate limits.
- Add failure-based backoff/lockout and monitoring alerts.
