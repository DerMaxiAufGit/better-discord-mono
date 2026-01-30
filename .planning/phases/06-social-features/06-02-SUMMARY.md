---
phase: 06-social-features
plan: 02
subsystem: api
tags: [sharp, image-processing, avatars, webp, rest-api, file-upload]

# Dependency graph
requires:
  - phase: 06-01
    provides: Database schema for avatars table with multi-resolution storage
provides:
  - Avatar upload service with Sharp for image processing
  - Multi-resolution avatar generation (32px, 64px, 256px WebP)
  - REST endpoints for avatar CRUD operations
  - Persistent avatar storage with Docker volume mounting
affects: [06-03, 06-05, 06-06, frontend-profile-ui]

# Tech tracking
tech-stack:
  added: [sharp]
  patterns:
    - "Multi-resolution image generation with Sharp"
    - "Server-side WebP compression for optimal file size"
    - "Avatar storage in user-specific directories"
    - "Volume mounting for persistent file storage in Docker"

key-files:
  created:
    - backend/src/services/avatarService.ts
    - backend/src/routes/avatars.ts
  modified:
    - backend/package.json
    - docker-compose.yml

key-decisions:
  - "Three avatar sizes (32px tiny, 64px small, 256px large) for different UI contexts"
  - "WebP format with quality 85 for tiny/small, 90 for large"
  - "5MB file size limit and 4096x4096 max dimensions"
  - "Sharp fit: 'cover' with center position for square crop"
  - "Avatars stored in ./data/avatars/{userId}/ directory structure"

patterns-established:
  - "Avatar service uses upsert pattern (INSERT ... ON CONFLICT DO UPDATE)"
  - "Image validation before processing (metadata check, dimension limits)"
  - "Parallel image generation with Promise.all for performance"
  - "Multipart registration at route level (not global)"

# Metrics
duration: 1min
completed: 2026-01-30
---

# Phase 6 Plan 2: Avatar Service Summary

**Sharp-powered avatar upload with automatic WebP conversion to 3 sizes (32px, 64px, 256px), REST endpoints, and Docker volume persistence**

## Performance

- **Duration:** 1 min
- **Started:** 2026-01-30T17:02:32Z
- **Completed:** 2026-01-30T17:04:22Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Avatar service with Sharp image processing library for multi-size generation
- REST endpoints for upload (POST), delete (DELETE), URL retrieval (GET), and image serving (GET with caching)
- Automatic WebP conversion with quality optimization (85 for small sizes, 90 for large)
- Docker volume mounting for persistent avatar storage across container restarts

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Sharp and create avatar service** - `2b78003` (feat)
   - Installed Sharp image processing library
   - Created AvatarService with uploadAvatar, deleteAvatar, getAvatar, getAvatarUrl methods
   - Implemented 3-size generation (32px tiny, 64px small, 256px large) as WebP
   - Image validation (max 4096x4096, max 5MB)
   - Database upsert pattern for avatar records

2. **Task 2: Create avatar REST routes** - `34f55aa` (feat)
   - POST /api/avatars for authenticated avatar upload
   - DELETE /api/avatars for authenticated avatar deletion
   - GET /api/avatars/:userId for public avatar URL retrieval
   - GET /api/avatars/:userId/:size for serving WebP images with 24h cache
   - 5MB file size validation and mime type checking

3. **Task 3: Configure avatar storage volume** - `145b283` (feat)
   - Added Docker volume mapping (./data/avatars:/app/data/avatars)
   - Created avatar directory structure
   - Enabled persistent storage across container rebuilds

## Files Created/Modified
- `backend/src/services/avatarService.ts` - Avatar service with Sharp image processing, multi-size generation, and file system management
- `backend/src/routes/avatars.ts` - REST endpoints for avatar upload, delete, URL fetch, and image serving with caching
- `backend/package.json` - Added sharp@^0.34.5 dependency
- `docker-compose.yml` - Added backend volume mount for avatar persistence

## Decisions Made

**1. WebP format with quality differentiation**
- Tiny and small avatars use quality 85 (smaller file size, less detail needed)
- Large avatars use quality 90 (higher quality for profile pages)
- WebP chosen for superior compression vs JPEG/PNG

**2. Square crop with center position**
- Sharp fit: 'cover' ensures avatars fill the entire size
- position: 'center' keeps the subject centered during crop
- Better than 'contain' which would add letterboxing

**3. Route-level multipart registration**
- Multipart plugin registered in avatarRoutes plugin scope
- Avoids global registration (cleaner separation of concerns)
- 5MB limit and 1 file constraint enforced at registration

**4. Directory-based storage structure**
- Each user gets their own directory: ./data/avatars/{userId}/
- Files named by size: tiny.webp, small.webp, large.webp
- Easy cleanup on avatar deletion (rm -rf userDir)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly with all dependencies available.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Avatar service fully operational and ready for frontend integration:
- Upload endpoint accepts multipart/form-data with image validation
- URLs follow pattern /api/avatars/{userId}/{size}
- Cache-Control headers set for 24h browser caching
- Volume persistence ensures avatars survive container restarts

No blockers. Ready for Plan 03 (presence service) and frontend avatar UI integration.

---
*Phase: 06-social-features*
*Completed: 2026-01-30*
