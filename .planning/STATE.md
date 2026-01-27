# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Own your communication — your server, your data, your rules. Privacy through self-hosting and E2E encryption.
**Current focus:** Phase 1: Foundation & Deployment

## Current Position

Phase: 1 of 4 (Foundation & Deployment)
Plan: 04 of 05 complete
Status: In progress
Last activity: 2026-01-27 — Completed 01-04-PLAN.md (Frontend Authentication)

Progress: [████████░░] 80% (4/5 Phase 1 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 5 minutes
- Total execution time: 0.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-deployment | 4 | 19 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (4 min), 01-02 (2 min), 01-03 (8 min), 01-04 (5 min)
- Trend: Auth flows consistent (2-5 min), frontend with UI setup longer (8 min)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Date | Decision | Context | Impact |
|------|----------|---------|--------|
| 2026-01-27 | Single refresh promise for thundering herd | Concurrent 401s share one refresh request | Prevents API stampede when multiple requests fail simultaneously |
| 2026-01-27 | ProtectedRoute isInitialized check | Wait for auth check before redirecting | Avoids flashing login page when already authenticated |
| 2026-01-27 | Password strength meter with zxcvbn | Industry-standard strength estimation | Real-time feedback on password quality |
| 2026-01-27 | Access token in localStorage, refresh in httpOnly | Balance JS access with XSS protection | Access token 15m (needs JS), refresh 7d (protected) |
| 2026-01-27 | Sliding window refresh tokens | Active users stay logged in indefinitely | Refresh endpoint rotates both access and refresh tokens |
| 2026-01-27 | Generic "Invalid credentials" error | Prevents user enumeration attacks | Same response for wrong password and nonexistent user |
| 2026-01-27 | 12 bcrypt salt rounds | Balance security and performance | Standard for password hashing |
| 2026-01-27 | HttpOnly cookies with sameSite strict | XSS protection, CSRF protection | Refresh tokens never accessible to JavaScript |
| 2026-01-27 | Tailwind CSS v3 over v4 | v4 incompatible with shadcn/ui patterns | Stable foundation for UI components |
| 2026-01-27 | next-themes for theme management | System preference detection, localStorage persistence | Theme persists across sessions |
| 2026-01-27 | Sidebar-based navigation (240px/64px) | Discord/Slack pattern, collapsible | Main navigation pattern for all phases |
| 2026-01-27 | PostgreSQL 18-alpine for database | Latest stable, smaller image | Foundation for all data storage |
| 2026-01-27 | Fastify over Express for backend | 20-30% faster, TypeScript-native | API framework for all endpoints |
| 2026-01-27 | Nginx reverse proxy with /api pattern | Single port in production, simpler CORS | Frontend/backend communication pattern |
| 2026-01-27 | Health check orchestration | Reliable startup ordering | All services use depends_on: service_healthy |
| - | P2P for 1:1 calls | Privacy, reduced server load (from PROJECT.md) | Future Phase 3 |
| - | E2E encryption for messages | Core value proposition (from PROJECT.md) | Future Phase 2 |
| - | Docker Compose deployment | Accessible to self-hosters (from PROJECT.md) | Completed in 01-01 |

### Pending Todos

None yet.

### Blockers/Concerns

**Current (Phase 1):**
- Docker runtime verification pending (requires user to test `docker compose up`)
- Backend npm dependencies have 2 high severity vulnerabilities (should run `npm audit fix`)
- Frontend auth flow needs runtime testing with backend (code complete, needs integration test)

**Phase 2 (E2E Encryption):** Research flagged this phase for deeper investigation during planning. Custom E2EE protocol design using libsodium.js vs full Signal Protocol needs validation based on cryptographic complexity vs team expertise.

**General:** All phases marked as "TBD" for plan count — will be refined during plan-phase execution.

## Session Continuity

Last session: 2026-01-27 during plan execution
Stopped at: Completed 01-04-PLAN.md — Frontend auth with Zustand, protected routes, and password strength meter
Resume file: None (plan complete, ready for 01-05 or other plans)
