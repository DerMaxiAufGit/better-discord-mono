# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Own your communication — your server, your data, your rules. Privacy through self-hosting and E2E encryption.
**Current focus:** v1.1.0 - Phase 5 Enhanced Communication in progress

## Current Position

Phase: 5 of 7 (Enhanced Communication) - IN PROGRESS
Version: 1.1.0 target  
Status: **Executing Phase 5**
Last activity: 2026-01-28 — Completed 05-10-PLAN.md (video UI components)

Progress: [████████████████████░░░] 76% (32 of 42 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 32
- Average duration: 4.5 minutes
- Total execution time: 2.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-deployment | 5 | 21 min | 4.2 min |
| 02-e2e-encrypted-messaging | 7 | 38 min | 5.4 min |
| 03-voice-video-calls | 6 | 16 min | 2.7 min |
| 04-ui-polish-production-readiness | 6 | 32 min | 5.3 min |
| 05-enhanced-communication | 8 | 60 min | 7.5 min |

**Recent Trend:**
- Last 5 plans: 05-10 (7 min), 05-06 (12 min), 05-04 (16 min), 05-03 (5 min), 05-02 (5 min)
- Trend: Phase 5 plans averaging longer due to complexity

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Date | Decision | Context | Impact |
|------|----------|---------|--------|
| 2026-01-28 | VideoPreview mirrors camera by default | Natural self-view UX (from 05-10) | Users see themselves as in a mirror |
| 2026-01-28 | Video settings persist to localStorage | video-device, video-quality, video-blur keys (from 05-10) | Settings remembered across sessions |
| 2026-01-28 | 100MB maximum file size | Balance usability with server constraints (from 05-05) | Prevents resource exhaustion while supporting most use cases |
| 2026-01-28 | Year/month/day storage hierarchy | Chronological file organization (from 05-05) | Easier backup/archival management, prevents single directory bloat |
| 2026-01-28 | Multi-level file authorization | Uploader, message participants, group members (from 05-05) | Ensures conversation participants can access shared files |
| 2026-01-28 | Encryption header as database BYTEA | Store with file metadata (from 05-05) | Enables E2E encrypted file sharing with decryption metadata |
| 2026-01-28 | Permission system hasPermission check | Role-based access with owner/admin/moderator/member (from 05-04) | Centralized permission logic, easy to audit |
| 2026-01-28 | Invite codes use base64url encoding | crypto.randomBytes(8).toString('base64url') (from 05-04) | URL-safe invite links without escaping |
| 2026-01-28 | Banned users auto-unban on re-add | addMember() removes ban automatically (from 05-04) | Simplifies re-inviting previously banned users |
| 2026-01-28 | JWT user extraction via cast pattern | (request.user as { userId: string }).userId (from 05-04) | Matches actual JWT payload structure from auth service |
| 2026-01-28 | Toggle endpoint for reactions | Single POST adds or removes (from 05-06) | Cleaner than separate add/remove endpoints |
| 2026-01-28 | 50 unique emoji limit per message | Prevents emoji spam (from 05-06) | Applies to distinct emoji, not total count |
| 2026-01-28 | Reaction summaries grouped by emoji | ReactionSummary with count and user list (from 05-06) | Efficient for UI display |
| 2026-01-28 | Authorization via hasAccessToMessage | Check sender/recipient/group membership (from 05-06) | Returns 404 for unauthorized (doesn't leak existence) |
| 2026-01-28 | Four-tier group role system | owner, admin, moderator, member (from 05-01) | Provides granular permissions without excessive complexity |
| 2026-01-28 | Optional invite expiry and usage limits | Nullable expires_at and max_uses columns (from 05-01) | Supports both permanent and temporary invite links |
| 2026-01-28 | Nullable recipient_id for group messages | ALTER COLUMN recipient_id DROP NOT NULL (from 05-01) | Group messages use group_id instead of recipient_id |
| 2026-01-28 | Store libsodium header as BYTEA | encryption_header BYTEA NOT NULL (from 05-01) | Required for client-side decryption of chunked file streams |
| 2026-01-28 | 20fps throttle for background blur | Balance smoothness and CPU usage (from 05-03) | Prevents CPU overload while maintaining acceptable visual quality |
| 2026-01-28 | MediaPipe landscape model for blur | Model 1 faster than general model 0 (from 05-03) | Better real-time performance for video calls |
| 2026-01-28 | Chromium + OffscreenCanvas for blur support | MediaPipe reliable only in Chromium (from 05-03) | Clear browser compatibility detection, graceful degradation |
| 2026-01-28 | Video constraints use ideal/max not exact | Avoid OverconstrainedError on devices (from 05-03) | Better device compatibility, graceful fallback |
| 2026-01-28 | Quality presets: low/medium/high | Standard video quality tiers (from 05-03) | Simple user-facing control, predictable resource usage |

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 5 In Progress:**
- 05-01: Database schema for enhanced communication complete
- 05-02: Frontend typing indicator integration complete
- 05-03: Video helper library complete (videoConstraints, backgroundBlur, useCamera)
- 05-04: Backend group service complete
- 05-05: Backend file storage service complete
- 05-06: Backend reaction service complete
- 05-10: Video UI components complete (VideoPreview, VideoControls, VideoSettings)
- Next: Continue Phase 5 remaining plans (07-09, 11-16)

**Previous phases complete:**
- Phase 1: Foundation and deployment ✓
- Phase 2: E2E encrypted messaging ✓
- Phase 3: Voice/video calls ✓
- Phase 4: UI polish and production readiness ✓

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

Last session: 2026-01-28
Stopped at: Completed 05-10-PLAN.md (video UI components)
Resume file: None
