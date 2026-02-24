# Security Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove high/medium-risk auth and transport issues (CORS, JWT secret fallback, credential storage, WebSocket token handling, and auth rate limiting).

**Architecture:** Tighten backend startup validation and CORS allowlist behavior, add rate limiting for auth endpoints, switch WebSocket auth to a post-connect token message (no URL query tokens), and eliminate plaintext credential storage in the browser with an explicit re-auth flow.

**Tech Stack:** Fastify, @fastify/cors, @fastify/jwt, @fastify/rate-limit, React, Zustand, WebSocket.

---

### Task 1: Backend CORS + JWT Secret Validation + Rate-Limit Plugin

**Files:**
- Modify: `backend/src/server.ts`
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`

**Step 1: Add @fastify/rate-limit dependency**

```bash
cd backend
npm install @fastify/rate-limit
```

**Step 2: Add strict JWT secret validation and CORS allowlist enforcement**

```ts
// backend/src/server.ts
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProd && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGIN must be set in production');
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

await fastify.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (!isProd && allowedOrigins.length === 0) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed'), false);
  },
  credentials: true,
});

await fastify.register(jwt, { secret: jwtSecret });
```

**Step 3: Register rate-limit plugin (disabled globally)**

```ts
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  global: false,
});
```

**Step 4: Build backend to ensure types compile**

```bash
npm run build
```

Expected: build completes without TypeScript errors.

---

### Task 2: Add Rate Limits to Auth Endpoints

**Files:**
- Modify: `backend/src/routes/auth.ts`

**Step 1: Add rateLimit config per auth route**

```ts
fastify.post('/signup', {
  config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
}, async (request, reply) => { /* ... */ })

fastify.post('/login', {
  config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
}, async (request, reply) => { /* ... */ })

fastify.post('/refresh', {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
}, async (request, reply) => { /* ... */ })
```

**Step 2: Build backend**

```bash
npm run build
```

Expected: build completes without TypeScript errors.

---

### Task 3: WebSocket Auth Without Query Tokens

**Files:**
- Modify: `backend/src/routes/websocket.ts`
- Modify: `frontend/src/lib/websocket/useMessaging.ts`

**Step 1: Backend - switch to auth message flow**

```ts
// remove wsAuthHook usage
// add local auth state
let userId: string | null = null;
let isAuthed = false;
const authTimeout = setTimeout(() => {
  if (!isAuthed) socket.close(1008, 'Unauthorized');
}, 10000);

socket.on('message', async (data) => {
  const msg = JSON.parse(data.toString());
  if (!isAuthed) {
    if (msg.type !== 'auth' || !msg.token) {
      socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
      return;
    }
    const decoded = await fastify.jwt.verify(msg.token);
    userId = decoded.userId;
    isAuthed = true;
    clearTimeout(authTimeout);
    activeConnections.set(userId, socket);
    await presenceService.userConnected(userId);
    socket.send(JSON.stringify({ type: 'auth_ok' }));
    return;
  }

  // existing message handling uses userId
});
```

**Step 2: Frontend - send auth message on open, wait for auth_ok**

```ts
const wsUrl = `${protocol}//${window.location.host}/api/ws`;
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'auth', token: accessToken }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'auth_ok') {
    // now mark connected and start presence
  }
  // existing message handling...
};
```

**Step 3: Build frontend**

```bash
cd ../frontend
npm run build
```

Expected: build completes without TypeScript errors.

---

### Task 4: Remove Plaintext Credential Storage and Require Re-Auth for Crypto Keys

**Files:**
- Modify: `frontend/src/stores/auth.ts`
- Modify: `frontend/src/App.tsx`

**Step 1: Remove sessionStorage credential writes/reads**

```ts
// remove sessionStorage.setItem('_ec', ...)
// remove sessionStorage.getItem('_ec') usage
// remove sessionStorage.removeItem('_ec')
```

**Step 2: Trigger sessionExpired modal when crypto keys are missing**

```ts
const setSessionExpired = useAuthStore((state) => state.setSessionExpired);

if (isAuthInitialized && isAuthenticated && !isCryptoInitialized) {
  setSessionExpired(true);
}
```

**Step 3: Build frontend**

```bash
npm run build
```

Expected: build completes without TypeScript errors.

---

### Task 5: Config Updates for Production Safety

**Files:**
- Modify: `.env.example`
- Modify: `.env`

**Step 1: Add CORS_ORIGIN and document JWT secret requirements**

```env
CORS_ORIGIN=http://localhost,http://127.0.0.1
JWT_SECRET=CHANGE_ME_USE_LONG_RANDOM_STRING_AT_LEAST_32_CHARS
```

**Step 2: No tests required**

Manual verification only.

---

### Task 6: Final Verification

**Step 1: Backend build**

```bash
cd backend
npm run build
```

**Step 2: Frontend build**

```bash
cd ../frontend
npm run build
```

**Step 3: Summarize changes**

Provide a short summary and note any remaining risks (e.g., CSRF not implemented).
