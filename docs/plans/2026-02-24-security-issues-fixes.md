# Security Issues Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the security issues listed in `docs/security-issues.md` for unblock auto-friendship, call signaling authorization, and production SQL query logging.

**Architecture:** Keep changes localized to existing services/routes. Enforce friendship + block checks in WebSocket call handlers, tighten friendship restore behavior, and gate query text logging based on `NODE_ENV`.

**Tech Stack:** Fastify (TypeScript), PostgreSQL, Node.js

---

### Task 1: Tighten friendship restore on unblock

**Files:**
- Modify: `backend/src/services/friendService.ts:107-140`
- Modify: `backend/src/services/blockService.ts:39-55`

**Step 1: Define expected behavior in a minimal test (manual until test harness exists)**

```txt
Given: No existing friend_requests row between A and B
When: A unblocks B
Then: No accepted friendship is created

Given: Existing friend_requests row between A and B with status pending or rejected
When: A unblocks B
Then: The row becomes accepted
```

**Step 2: Implement minimal code change**

```ts
// friendService.restoreFriendship
// - If a record exists, update to accepted when status is pending or rejected
// - If no record exists, return without inserting
```

**Step 3: Verify behavior manually**

Run: Use existing UI or direct DB setup to simulate prior friend_requests row vs none
Expected: Unblock only restores when row exists; no new accepted friendship is created

**Step 4: Commit**

```bash
git add backend/src/services/friendService.ts backend/src/services/blockService.ts
git commit -m "security: prevent unblock from creating new friendships"
```

---

### Task 2: Add call signaling authorization checks

**Files:**
- Modify: `backend/src/routes/websocket.ts:311-463`
- Modify: `backend/src/services/friendService.ts:187-197` (reuse)
- Modify: `backend/src/services/blockService.ts:72-80` (reuse)

**Step 1: Define expected behavior in a minimal test (manual until test harness exists)**

```txt
Given: Users A and B are not friends
When: A sends call-offer to B
Then: A receives an error and no message is forwarded

Given: Users A and B are friends but blocked in either direction
When: A sends call-offer to B
Then: A receives an error and no message is forwarded

Given: Users A and B are friends and not blocked
When: A sends call-offer to B
Then: The message is forwarded
```

**Step 2: Implement minimal code change**

```ts
// In each call-* handler:
// - await friendService.areFriends(userId, msg.recipientId)
// - await blockService.isBlockedBidirectional(userId, msg.recipientId)
// - if not friends or blocked: send error and return
```

**Step 3: Verify behavior manually**

Run: Use UI/dev tools to attempt calls as non-friends, blocked users, and friends
Expected: Only friends without blocks can signal

**Step 4: Commit**

```bash
git add backend/src/routes/websocket.ts
git commit -m "security: restrict call signaling to friends"
```

---

### Task 3: Gate SQL query text logging in production

**Files:**
- Modify: `backend/src/db/index.ts:23-31`

**Step 1: Define expected behavior in a minimal test (manual until test harness exists)**

```txt
Given: NODE_ENV=production
When: A query succeeds
Then: Log does not include SQL text

Given: NODE_ENV=development
When: A query succeeds
Then: Log includes SQL text
```

**Step 2: Implement minimal code change**

```ts
const isProd = process.env.NODE_ENV === 'production'
// On success: log text only when !isProd
// On error: log error without text in prod
```

**Step 3: Verify behavior manually**

Run: Start backend with NODE_ENV=production and run a request
Expected: success logs omit SQL text

**Step 4: Commit**

```bash
git add backend/src/db/index.ts
git commit -m "security: avoid query text logging in production"
```

---

### Task 4: Verify builds

**Files:**
- None

**Step 1: Run backend build**

Run: `npm run build` (in `backend/`)
Expected: PASS

**Step 2: Run frontend build**

Run: `npm run build` (in `frontend/`)
Expected: PASS (warnings about chunk size are acceptable)

**Step 3: Commit if any follow-up changes are needed**

```bash
git add <files>
git commit -m "chore: follow-up fixes"
```
