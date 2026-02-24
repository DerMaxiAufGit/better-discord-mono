# Security & Codebase Audit

## 1. Bugs & Correctness

### [Critical] Single-socket map breaks multi-device sessions and causes dropped delivery

- **Location:** `backend/src/routes/websocket.ts:21`, `backend/src/routes/websocket.ts:117`, `backend/src/routes/websocket.ts:486`
- `activeConnections` stores only one socket per user. A second login overwrites the first socket; when either socket closes, `delete(userId)` removes the user entirely. This causes active devices to stop receiving messages/call events.

### [Moderate] Unvalidated numeric query params can generate runtime errors

- **Location:** `backend/src/routes/messages.ts:39-40`, `backend/src/routes/groups.ts:180-181`, `backend/src/routes/reactions.ts:51`
- `parseInt` outputs are used without validating `Number.isFinite(...)`. Inputs like `limit=abc` or `messageId=foo` can propagate `NaN` into DB calls and produce avoidable 4xx/5xx behavior.

---

## 2. Security

### [Critical] Unblocking auto-creates friendship without mutual consent

- **Location:** `backend/src/services/blockService.ts:43-52`, `backend/src/services/friendService.ts:109-136`
- `unblockUser` calls `restoreFriendship`, which can create an `accepted` friendship record directly. A user can block/unblock any known user ID and become “friends” without the target accepting.

### [Moderate] Call signaling lacks relationship/block authorization checks

- **Location:** `backend/src/routes/websocket.ts:323-463`
- `call-*` handlers do not enforce friend status or block status (unlike DM messaging). Any authenticated user with a target ID can push ringing/signaling traffic.

### [Moderate] SQL text is logged for every query in production path

- **Location:** `backend/src/db/index.ts:28-31`
- Raw query text and error objects are logged for all operations, increasing leakage risk of sensitive data-access patterns and expanding log attack surface.

---

## 3. Architecture & Design

### [Moderate] WebSocket route is a god-module with many responsibilities

- **Location:** `backend/src/routes/websocket.ts:87-502`
- The single handler mixes auth, DM, groups, reactions, typing, presence, and call signaling. This increases coupling and regression risk.

---

## 4. Error Handling

### [Moderate] `createGroup` can leave partial state on failure

- **Location:** `backend/src/services/groupService.ts:18-29`
- Group creation and owner-membership insertion are not wrapped in a transaction. If the second query fails, an orphan group row can remain.

---

## 5. Performance

### [Moderate] Message history does N+1 file queries

- **Location:** `backend/src/services/messageService.ts:77-91`, `backend/src/services/fileService.ts:125-130`
- Each message in history triggers a separate `getFilesByMessage` query, causing linear DB round-trips as page size grows.

### [Moderate] Presence batch endpoint performs sequential per-user lookups

- **Location:** `backend/src/services/presenceService.ts:159-166`
- `getBatchVisibleStatus` loops with awaited calls one-by-one, increasing latency for larger friend lists.

### [Moderate] File uploads fully buffer content in memory

- **Location:** `backend/src/routes/files.ts:24-29`
- Uploads up to 100MB are accumulated in RAM before write. Concurrent uploads can create memory pressure and GC stalls.

---

## 6. Data Integrity

### [Moderate] Invite usage limit is race-prone

- **Location:** `backend/src/services/groupService.ts:220-246`
- Max-use check, membership insert, and `uses` increment happen in separate non-transactional statements. Concurrent joins can exceed `max_uses`.

---

## 7. Dependencies & Build

### [Moderate] Backend has known vulnerable transitive dependencies

- **Location:** `backend/package.json:13`
- `npm audit --omit=dev` reports 9 production vulnerabilities (4 moderate, 5 high), including chains through:
  - `@fastify/jwt -> fast-jwt -> asn1.js -> bn.js`
  - `@mapbox/node-pre-gyp -> tar/glob/minimatch/rimraf`

---

## 8. Testing Gaps

### [Moderate] No automated tests for critical auth/realtime/blocking flows

- **Location:** `backend/package.json:5-9`, `frontend/package.json:6-10`
- Only build/dev scripts are present. No `*.test.*` / `*.spec.*` files were found in `backend/` or `frontend/`.

---

## Top Priority Findings

| # | Severity | Area | Issue | Location |
|---|----------|------|-------|----------|
| 1 | Critical | Security | Unblock path can create accepted friendships without consent | `backend/src/services/blockService.ts:43`, `backend/src/services/friendService.ts:135` |
| 2 | Critical | Bugs & Correctness | Single-socket connection map drops active device delivery/presence | `backend/src/routes/websocket.ts:21`, `backend/src/routes/websocket.ts:486` |
| 3 | Moderate | Security | Call signaling has no friend/block authorization checks | `backend/src/routes/websocket.ts:323` |
| 4 | Moderate | Data Integrity | Invite max-use check is race-prone (non-transactional) | `backend/src/services/groupService.ts:220` |
| 5 | Moderate | Performance | Message history performs N+1 file queries | `backend/src/services/messageService.ts:77`, `backend/src/services/fileService.ts:125` |
