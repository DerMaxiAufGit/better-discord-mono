# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Own your communication — your server, your data, your rules. Privacy through self-hosting and E2E encryption.
**Current focus:** Phase 1: Foundation & Deployment

## Current Position

Phase: 1 of 4 (Foundation & Deployment)
Plan: 02 of 05 complete
Status: In progress
Last activity: 2026-01-27 — Completed 01-02-PLAN.md (JWT authentication API)

Progress: [███████░░░] 60% (3/5 Phase 1 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 5 minutes
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-deployment | 3 | 14 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (4 min), 01-02 (2 min), 01-03 (8 min)
- Trend: Auth backend very fast (2 min), frontend setup more complex (8 min)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Date | Decision | Context | Impact |
|------|----------|---------|--------|
| 2026-01-27 | Sliding window refresh tokens | Active users stay logged in indefinitely | Refresh endpoint rotates both access and refresh tokens |
| 2026-01-27 | Generic "Invalid credentials" error | Prevents user enumeration attacks | Same response for wrong password and nonexistent user |
| 2026-01-27 | 12 bcrypt salt rounds | Balance security and performance | Standard for password hashing |
| 2026-01-27 | Access token 15m, refresh 7d | Short-lived access for security, long refresh for UX | Configurable via JWT_ACCESS_EXPIRY and JWT_REFRESH_EXPIRY |
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

**Phase 2 (E2E Encryption):** Research flagged this phase for deeper investigation during planning. Custom E2EE protocol design using libsodium.js vs full Signal Protocol needs validation based on cryptographic complexity vs team expertise.

**General:** All phases marked as "TBD" for plan count — will be refined during plan-phase execution.

## Session Continuity

Last session: 2026-01-27 during plan execution
Stopped at: Completed 01-02-PLAN.md — JWT authentication API with bcrypt and httpOnly cookies
Resume file: None (plan complete, ready for 01-04 or other plans)
