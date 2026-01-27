# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Own your communication — your server, your data, your rules. Privacy through self-hosting and E2E encryption.
**Current focus:** Phase 1: Foundation & Deployment

## Current Position

Phase: 1 of 4 (Foundation & Deployment)
Plan: 05 of 05 complete
Status: **Phase 1 COMPLETE**
Last activity: 2026-01-27 — Completed 01-05-PLAN.md (Documentation & Verification)

Progress: [██████████] 100% (5/5 Phase 1 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 4.2 minutes
- Total execution time: 0.35 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-deployment | 5 | 21 min | 4.2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (4 min), 01-02 (2 min), 01-03 (8 min), 01-04 (5 min), 01-05 (2 min)
- Trend: Auth flows fast (2 min), frontend UI takes longer (8 min), docs quick (2 min)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Date | Decision | Context | Impact |
|------|----------|---------|--------|
| 2026-01-27 | Three development setup options | Docker hybrid, full Docker, fully local (from 01-05) | Developers have different preferences for local development |
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

**Phase 1 Complete:**
- ✅ All Phase 1 success criteria verified programmatically
- ✅ Complete documentation suite created
- ✅ End-to-end deployment tested and confirmed working
- Note: Backend npm dependencies have 2 high severity vulnerabilities (non-blocking, should run `npm audit fix` before Phase 2)

**Phase 2 (E2E Encryption):** Research flagged this phase for deeper investigation during planning. Custom E2EE protocol design using libsodium.js vs full Signal Protocol needs validation based on cryptographic complexity vs team expertise.

**General:** All phases marked as "TBD" for plan count — will be refined during plan-phase execution.

## Development Infrastructure

**Database (External PostgreSQL):**
- Host: 172.16.70.14
- User: dev
- Password: ABlAMqQs2jDKKu7ZVWzOJbDywyjLswzWib5GQLtvKfGhjd6fn7woand1RMyPUKlv
- Database: chatapp

**Mail Server (for future email features):**
- Host: mail.maxi-haaser.de
- User: test@maxi-haaser.de
- Password: gdn1wbw@umj*mhw8YNE

**Note:** User prefers Claude to run demos/verification instead of manual testing.

## Session Continuity

Last session: 2026-01-27 during plan execution
Stopped at: **Phase 1 Complete** — Completed 01-05-PLAN.md (Documentation & Verification)
Resume file: None (Phase 1 complete, ready for Phase 2 planning)
