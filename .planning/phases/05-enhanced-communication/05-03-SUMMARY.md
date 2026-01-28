---
phase: 05-enhanced-communication
plan: 03
subsystem: video
tags: [mediapipe, webrtc, camera, background-blur, video-constraints]

# Dependency graph
requires:
  - phase: 03-voice-video-calls
    provides: Audio device hooks pattern (useAudioDevices)
provides:
  - Video constraints helper with quality presets (low/medium/high)
  - Background blur processor using MediaPipe Selfie Segmentation
  - useCamera hook for camera preview management
affects: [05-04, 05-05, video-calls, camera-settings]

# Tech tracking
tech-stack:
  added: [@mediapipe/selfie_segmentation]
  patterns: [MediaPipe CDN loading, canvas-based video processing, 20fps throttling]

key-files:
  created:
    - frontend/src/lib/video/videoConstraints.ts
    - frontend/src/lib/video/backgroundBlur.ts
    - frontend/src/hooks/useCamera.ts
  modified: []

key-decisions:
  - "Use ideal/max constraints instead of exact to avoid OverconstrainedError"
  - "MediaPipe Selfie Segmentation landscape model (faster) with 20fps throttle"
  - "Canvas-based background blur with getOutputStream() for MediaStream output"
  - "Browser compatibility check: Chromium + OffscreenCanvas for blur support"

patterns-established:
  - "Video library pattern: lib/video/ for video-specific utilities"
  - "Quality presets pattern: low/medium/high with resolution and framerate"
  - "Camera hook pattern: follows useAudioDevices structure for consistency"

# Metrics
duration: 5min
completed: 2026-01-28
---

# Phase 5 Plan 3: Video Helper Library Summary

**Video utilities with MediaPipe background blur, quality presets, and camera preview management**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-28T22:43:53Z
- **Completed:** 2026-01-28T22:49:10Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Video constraints helper with ideal/max constraints for device compatibility
- MediaPipe-based background blur processor with 20fps throttle for performance
- useCamera hook for camera preview with device selection and quality control
- Browser compatibility detection (Chromium + OffscreenCanvas required for blur)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create video constraints helper** - `956eeb3` (feat)
2. **Task 2: Create background blur processor** - `e1f608c` (feat)
3. **Task 3: Create useCamera hook** - `3c74e6f` (feat)

**Plan metadata:** (to be committed with STATE.md update)

## Files Created/Modified
- `frontend/src/lib/video/videoConstraints.ts` - Quality presets and constraint builders (low/medium/high)
- `frontend/src/lib/video/backgroundBlur.ts` - MediaPipe Selfie Segmentation processor with canvas output
- `frontend/src/hooks/useCamera.ts` - Camera preview hook with device selection and quality control

## Decisions Made

**1. Use ideal/max constraints instead of exact**
- Rationale: Avoid OverconstrainedError on devices that don't support exact resolutions
- Impact: Better device compatibility, graceful fallback to closest supported resolution

**2. MediaPipe Selfie Segmentation landscape model**
- Rationale: Model 1 (landscape) is faster than model 0 (general) for real-time processing
- Impact: Better performance for video calls while maintaining quality

**3. 20fps throttle for background blur**
- Rationale: Balance between smooth appearance and CPU usage (50ms delay between frames)
- Impact: Prevents CPU overload while maintaining acceptable visual smoothness

**4. Browser compatibility check: Chromium + OffscreenCanvas**
- Rationale: MediaPipe works reliably only in Chromium browsers, OffscreenCanvas needed for processing
- Impact: Clear feature detection, graceful degradation in unsupported browsers

**5. Quality presets: low (640x360@15fps), medium (1280x720@24fps), high (1920x1080@30fps)**
- Rationale: Standard video quality tiers matching common bandwidth/performance profiles
- Impact: Simple user-facing quality control, predictable resource usage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Wave 2 plans (screen sharing, video call UI)
- Camera settings UI implementation
- Video call integration

**Foundation complete:**
- Video library structure established
- Background blur processing ready
- Camera preview management ready
- Quality presets defined

**Notes:**
- MediaPipe models loaded from CDN (no build-time bundling needed)
- Background blur requires Chromium browser (Chrome, Edge, Opera)
- Video constraints use ideal/max for maximum device compatibility

---
*Phase: 05-enhanced-communication*
*Completed: 2026-01-28*
