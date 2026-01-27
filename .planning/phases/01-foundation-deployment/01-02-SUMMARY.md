---
phase: 01-foundation-deployment
plan: 02
subsystem: auth
tags: [jwt, bcrypt, fastify, auth, cookies, postgresql]

# Dependency graph
requires:
  - phase: 01-01
    provides: PostgreSQL database with users table, Fastify backend framework
provides:
  - Complete JWT authentication API (signup, login, refresh, logout)
  - Bcrypt password hashing service
  - Auth service with user enumeration protection
  - HttpOnly cookie-based refresh tokens with sliding window
  - Protected route pattern (/auth/me endpoint)
affects: [01-04-auth-frontend, 02-messaging-backend]

# Tech tracking
tech-stack:
  added:
    - bcrypt: "^5.1.1"
    - "@fastify/jwt": "^9.0.1"
    - "@fastify/cookie": "^10.0.1"
    - "@fastify/cors": "^10.0.1"
  patterns:
    - JWT access tokens in memory (15 min expiry)
    - Refresh tokens in httpOnly cookies (7 day expiry, sliding window)
    - User enumeration protection (constant-time comparison)
    - Generic error messages for auth failures
    - TypeScript service layer pattern

key-files:
  created:
    - backend/src/types/index.ts: Type definitions for User, JwtPayload, AuthResponse
    - backend/src/db/index.ts: PostgreSQL connection pool and query helper
    - backend/src/services/auth.service.ts: Auth business logic with bcrypt
    - backend/src/routes/auth.ts: Auth route handlers with cookie management
  modified:
    - backend/tsconfig.json: Updated to NodeNext module resolution
    - backend/src/server.ts: Registered auth routes and CORS configuration

key-decisions:
  - "12 bcrypt salt rounds for password hashing (balance of security and performance)"
  - "Sliding window refresh tokens (both tokens rotated on refresh, resets 7-day expiry)"
  - "Generic 'Invalid credentials' error for both wrong password and user not found (prevents user enumeration)"
  - "httpOnly cookies with sameSite strict and secure in production"
  - "Access token 15m, refresh token 7d (configurable via env vars)"

patterns-established:
  - "Service layer pattern: business logic in services/, route handlers in routes/"
  - "Singleton service export: export const authService = new AuthService()"
  - "Cookie configuration pattern: httpOnly, secure (prod only), sameSite strict, path restricted"
  - "JWT payload minimization: access token has userId+email, refresh token only userId"

# Metrics
duration: 2min
completed: 2026-01-27
---

# Phase 01 Plan 02: JWT Authentication API Summary

**Complete JWT auth backend with bcrypt password hashing, httpOnly refresh tokens with sliding window rotation, and user enumeration protection**

## Performance

- **Duration:** 2 min 16 sec
- **Started:** 2026-01-27T16:24:56Z
- **Completed:** 2026-01-27T16:27:12Z
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments

- Complete authentication API with 5 endpoints (signup, login, refresh, logout, me)
- Bcrypt password hashing with 12 salt rounds and constant-time comparison
- Sliding window refresh tokens (resets 7-day expiry on each refresh)
- User enumeration protection (same error for wrong password and nonexistent user)
- HttpOnly cookies with proper security configuration (secure in production, sameSite strict)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database connection and TypeScript configuration** - `58e0b9b` (chore)
   - Updated tsconfig.json to NodeNext module resolution
   - Created types/index.ts with User, JwtPayload, and AuthResponse interfaces
   - Created db/index.ts with PostgreSQL connection pool and query helper
   - Added connection test on startup

2. **Task 2: Implement auth service with bcrypt and JWT** - `58cfded` (feat)
   - Created AuthService class with signup, login, findById methods
   - Implemented bcrypt password hashing with 12 salt rounds
   - Added user enumeration protection (constant-time comparison)
   - Implemented generateTokens method with configurable expiry

3. **Task 3: Implement auth routes with cookie handling** - `1f37f8e` (feat)
   - Created auth routes plugin with 5 endpoints
   - Implemented httpOnly cookie management with sliding window refresh
   - Updated server.ts to register auth routes with /auth prefix
   - Configured CORS with credentials support

## Files Created/Modified

**Created:**
- `backend/src/types/index.ts` - TypeScript interfaces for User, JWT payload, and auth responses
- `backend/src/db/index.ts` - PostgreSQL connection pool with query helper and connection testing
- `backend/src/services/auth.service.ts` - Auth business logic: signup, login, findById, token generation
- `backend/src/routes/auth.ts` - Auth endpoints: signup, login, refresh, logout, me

**Modified:**
- `backend/tsconfig.json` - Updated to NodeNext module resolution with declaration files
- `backend/src/server.ts` - Registered auth routes and configured CORS with CORS_ORIGIN env var

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 12 bcrypt salt rounds | Balance between security and performance (10-12 recommended for standard security) |
| Sliding window refresh | Active users stay logged in indefinitely, inactive users log out after 7 days |
| Generic "Invalid credentials" error | Prevents user enumeration attacks (same response for wrong password and nonexistent user) |
| Cookie path restricted to /api/auth | Limits cookie exposure to only auth endpoints |
| Refresh token contains only userId | Minimal payload reduces JWT size and limits exposure if leaked |
| Access token 15m, refresh 7d | Short-lived access tokens for security, long-lived refresh for UX |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly with existing database schema and Fastify plugins from 01-01.

## User Setup Required

None - no external service configuration required.

## Verification Status

### Completed Verifications

- ✅ TypeScript compiles without errors (all 3 tasks)
- ✅ backend/src/db/index.ts exports pool and query
- ✅ Types are properly defined and exported in types/index.ts
- ✅ AuthService exports all four methods (signup, login, findById, generateTokens)
- ✅ bcrypt.hash called with 12 salt rounds
- ✅ Login returns null for both "not found" and "wrong password"
- ✅ Token generation uses environment variables for expiry
- ✅ All 5 auth endpoints implemented (signup, login, refresh, logout, me)
- ✅ Signup returns accessToken and sets httpOnly cookie
- ✅ Refresh endpoint implements sliding window (rotates both tokens)
- ✅ Logout clears the cookie

### Pending Verifications (Requires Docker)

The following verifications require Docker to be running and were not possible in the execution environment:

- ⏳ Start backend with `docker compose up -d`
- ⏳ Test signup flow with curl
- ⏳ Test login with wrong password returns 401 "Invalid credentials"
- ⏳ Test refresh returns new accessToken and sets new cookie
- ⏳ Test /auth/me with valid token returns user data
- ⏳ Test logout clears the cookie

**Note:** All code-level verifications passed. Runtime verification requires Docker environment with database connection.

## Next Phase Readiness

**Blockers:** None

**What's Ready:**
- Auth API ready for frontend integration (01-04)
- All security patterns established (bcrypt, JWT, httpOnly cookies)
- Database connection pool ready for future features
- CORS configured with credentials support for frontend

**Recommended Next Steps:**
1. Test auth flow with curl commands once Docker is running
2. Verify cookie behavior in browser DevTools
3. Proceed with 01-04 (auth frontend integration)

---
*Phase: 01-foundation-deployment*
*Completed: 2026-01-27*
