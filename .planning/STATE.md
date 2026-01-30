# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Own your communication — your server, your data, your rules. Privacy through self-hosting and E2E encryption.
**Current focus:** v1.1.0 - Phase 5 Enhanced Communication in progress

## Current Position

Phase: 6 of 7 (Social Features)
Version: 1.2.0 target
Status: **In progress - 5 of 9 plans complete**
Last activity: 2026-01-30 — Completed 06-07-PLAN.md (frontend blocking UI with confirmation dialogs)

Progress: [█████████████████████████░] 99% (47 of 47 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 47
- Average duration: 4.4 minutes
- Total execution time: 3.7 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-deployment | 5 | 21 min | 4.2 min |
| 02-e2e-encrypted-messaging | 7 | 38 min | 5.4 min |
| 03-voice-video-calls | 6 | 16 min | 2.7 min |
| 04-ui-polish-production-readiness | 6 | 32 min | 5.3 min |
| 05-enhanced-communication | 16 | 130 min | 8.1 min |
| 06-social-features | 6 | 19 min | 3.2 min |

**Recent Trend:**
- Last 5 plans: 06-07 (6 min), 06-08 (3 min), 06-04 (3 min), 06-03 (3 min), 06-02 (1 min)
- Trend: Steady frontend component implementation

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Date | Decision | Context | Impact |
|------|----------|---------|--------|
| 2026-01-30 | History deletion defaults to false in block dialog | Safer default preserves conversation (from 06-07) | Prevents accidental data loss, user must explicitly check |
| 2026-01-30 | Optimistic state updates for blocking | Block/unblock immediately updates UI before server response (from 06-07) | Reduces perceived latency, better UX |
| 2026-01-30 | Set-based blocking ID lookup | blockedIds as Set<string> for O(1) checks (from 06-07) | Instant isBlocked() checks without array iteration |
| 2026-01-30 | Results grouped by conversation with 5-message preview | Shows up to 5 matches per conversation with "+N more" indicator (from 06-08) | Prevents overwhelming UI with dozens of results from single chat |
| 2026-01-30 | 300ms input debounce for search | Reduces search computation during rapid typing (from 06-08) | Matches industry standard, reduces CPU usage |
| 2026-01-30 | LRU eviction at 10K messages for IndexedDB | Prevents unbounded cache growth, oldest messages deleted first (from 06-08) | Maintains performance while caching recent messages |
| 2026-01-30 | Tokenized search with partial matching | Messages tokenized during indexing, query tokens matched via substring (from 06-08) | Fast search supporting partial word matches |
| 2026-01-30 | IndexedDB for local message cache | Server cannot search E2E encrypted content (from 06-08) | Enables client-side full-text search, persistent across sessions |
| 2026-01-30 | Unblock doesn't restore friendship | User must send new friend request after unblock (from 06-04) | Prevents automatic reconnection, gives both users control |
| 2026-01-30 | Group message filtering per-member | Members who blocked sender don't receive group messages (from 06-04) | Allows blocking individuals within shared groups |
| 2026-01-30 | Bidirectional blocking prevents messaging | Either user blocking prevents messages in both directions (from 06-04) | Consistent harassment prevention, matches social platform expectations |
| 2026-01-30 | Auto-unfriend on block | Blocking automatically removes friendship in both directions (from 06-04) | Prevents blocked user from seeing blocker's updates |
| 2026-01-30 | Heartbeat mechanism for presence | WebSocket clients send presence_heartbeat to prevent ghost users (from 06-03) | Updates lastSeen without broadcasting, prevents stale connections |
| 2026-01-30 | Visibility list for invisible status | Users can appear online to specific friends while invisible (from 06-03) | Enables "invisible to all except..." privacy pattern |
| 2026-01-30 | In-memory presence cache | Map-based cache for single-instance deployment (from 06-03) | Simple for now, requires Redis for multi-instance scaling |
| 2026-01-30 | WebSocket lifecycle presence tracking | userConnected/userDisconnected on connect/close (from 06-03) | Automatic presence updates without manual intervention |
| 2026-01-30 | WebP format with quality differentiation | Tiny/small at 85, large at 90 quality (from 06-02) | Optimized file size vs quality tradeoff for avatars |
| 2026-01-30 | Square crop with center position | Sharp fit: cover with center position (from 06-02) | Avatars fill frame without letterboxing, subject centered |
| 2026-01-30 | Directory-based avatar storage | Each user gets ./data/avatars/{userId}/ directory (from 06-02) | Easy cleanup, organized file structure |
| 2026-01-30 | Route-level multipart registration | Registered in avatarRoutes plugin (from 06-02) | Cleaner separation of concerns vs global registration |
| 2026-01-30 | Composite primary key for blocking | (blocker_id, blocked_id) prevents duplicate blocks (from 06-01) | Efficient blocking queries with bidirectional indexes |
| 2026-01-30 | Visibility list for invisible status | User can show status to specific contacts while invisible (from 06-01) | Enables "invisible to all except..." feature |
| 2026-01-30 | Three avatar sizes for responsive UI | 32x32 tiny, 64x64 small, 256x256 large (from 06-01) | Optimized avatar display across different UI contexts |
| 2026-01-30 | Privacy-first user settings defaults | show_last_seen and allow_friend_requests default to true (from 06-01) | User can opt out of public information sharing |
| 2026-01-29 | useCall hook wraps callStore with video | Video track management separate from state (from 05-15) | Clean separation of concerns for call logic |
| 2026-01-29 | Video toggle in VideoControlBar and CallControls | Multiple entry points for camera toggle (from 05-15) | Better UX during video calls |
| 2026-01-29 | Renamed storage to 'call-settings' | Audio and video settings colocated (from 05-15) | Single persist key for all call preferences |
| 2026-01-29 | FileUploader shows real-time progress | Display upload status/percentage from fileStore (from 05-12) | Visual feedback for encrypted file uploads |
| 2026-01-29 | Staggered animation delays for typing dots | 0ms, 150ms, 300ms via inline styles (from 05-14) | Smooth wave animation without custom keyframes |
| 2026-01-29 | Truncate reply content at different lengths | 100 chars for MessageReply, 60 for ReplyPreview (from 05-14) | Balances readability with space constraints |
| 2026-01-29 | Three typing indicator variants | Base, Inline, Compact for different contexts (from 05-14) | Flexible UI integration across conversation views |
| 2026-01-29 | FilePreview adapts to MIME type | Images/videos inline, generic files as cards (from 05-12) | Optimized display based on file type |
| 2026-01-29 | Lightbox with zoom/pan | yet-another-react-lightbox with zoom plugin (from 05-12) | Fullscreen image viewing with gesture support |
| 2026-01-29 | 64KB chunk size for SecretStream | Balance memory and performance (from 05-08) | Efficient streaming encryption for files up to 100MB |
| 2026-01-29 | CustomEvent pattern for typing indicators | Decoupled communication via window events (from 05-09) | Multiple components can listen to typing events |
| 2026-01-29 | 300ms debounce on typing input | Reduces WebSocket traffic (from 05-09) | Responsive UX without excessive network calls |
| 2026-01-29 | window.setTimeout for TypeScript compatibility | Avoid NodeJS namespace in browser (from 05-09) | Proper TypeScript types, number return value |
| 2026-01-29 | Encryption header as base64 form field | Send to server for BYTEA storage (from 05-08) | Enables server to store decryption metadata |
| 2026-01-29 | Progress tracking with 7 states | pending → encrypting → uploading → complete/error (from 05-08) | Detailed UI feedback for file operations |
| 2026-01-29 | Defer file key management | Upload complete, download awaits per-recipient encryption (from 05-08) | Postpone key distribution until message integration |
| 2026-01-29 | Pairwise group encryption | Reuse X25519 session keys, no shared group key (from 05-07) | Simpler, more secure for groups up to 200 members |
| 2026-01-29 | Skip members without public keys | Gracefully skip during encryption (from 05-07) | Allows partial encryption, prevents blocking operation |
| 2026-01-29 | Map-based member caching | Map<string, GroupMember[]> by groupId (from 05-07) | Efficient member lookup and updates |
| 2026-01-29 | PATCH via apiRequest | Direct method use, no wrapper (from 05-07) | Follows existing pattern, RequestInit supports all methods |
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

**Phase 6 In Progress:**
Database schema complete. Ready for backend service implementation (avatar upload, presence tracking, blocking, user settings).

**Previous phases complete:**
- Phase 1: Foundation and deployment ✓
- Phase 2: E2E encrypted messaging ✓
- Phase 3: Voice/video calls ✓
- Phase 4: UI polish and production readiness ✓
- Phase 5: Enhanced communication ✓ (awaiting verification)

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

Last session: 2026-01-30
Stopped at: Completed 06-07-PLAN.md (frontend blocking UI with confirmation dialogs)
Resume with: Continue Phase 6 with next plan
Resume file: None
