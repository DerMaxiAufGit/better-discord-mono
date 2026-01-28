---
phase: 04-ui-polish-production-readiness
plan: 06
type: execute
subsystem: authentication
tags: [auth, session-management, modal, ux]

requires:
  - 04-02  # Toast infrastructure for error handling
  - 02-01  # Auth tokens and refresh mechanism

provides:
  - Graceful session recovery with in-place modal
  - sessionExpired state tracking
  - relogin action for seamless re-authentication

affects:
  - None (complete auth recovery flow)

tech-stack:
  added: []
  patterns:
    - In-place modal for session recovery (preserves app state)
    - State-driven modal rendering (sessionExpired boolean)
    - Silent token refresh with fallback to modal

key-files:
  created:
    - frontend/src/components/auth/SessionExpiredModal.tsx
  modified:
    - frontend/src/stores/auth.ts
    - frontend/src/lib/api.ts
    - frontend/src/App.tsx

decisions:
  - key: "sessionExpired boolean in auth store"
    rationale: "Single source of truth for session state, triggers modal globally"
    alternatives: ["Event system", "Redirect flow"]
    chosen: "Boolean state"
  - key: "relogin action mirrors login logic"
    rationale: "Reuses existing API endpoint, sets sessionExpired to false to close modal"
    alternatives: ["Separate reauth endpoint"]
    chosen: "Reuse login endpoint"
  - key: "Modal renders in App.tsx above all content"
    rationale: "Preserves entire app state beneath modal, no route changes"
    alternatives: ["Redirect to login page", "Per-page modal"]
    chosen: "Global modal in App.tsx"

metrics:
  duration: 9
  completed: 2026-01-28
---

# Phase 04 Plan 06: Session Recovery Modal Summary

Session expiry shows login modal instead of redirect, preserving app state for seamless re-authentication

## Objective

Implement graceful auth recovery with in-place login modal when session expires, avoiding redirect that would lose app state.

## Work Completed

### Task 1: Add sessionExpired State to Auth Store
**Commit:** 337d3ea

Added session expiry tracking to auth store:
- sessionExpired boolean state (default false)
- setSessionExpired action to control modal display  
- relogin action that mirrors login but sets sessionExpired to false
- Relogin reuses /api/auth/login endpoint and updates tokens
- Reinitializes crypto keys after successful relogin

### Task 2: Create SessionExpiredModal Component  
**Commit:** d443f76

Built modal for in-place re-authentication:
- Login form with email and password fields
- Pre-fills email from current user if available
- Calls relogin action from auth store
- Modal automatically closes when sessionExpired becomes false
- Displays above all app content (z-50)
- Uses shadcn/ui components (Input, Label, Button)

### Task 3: Integrate Session Expiry into api.ts and App.tsx
**Commit:** 8ad3c9c

Connected session expiry flow:
- **api.ts:** When token refresh fails, calls setSessionExpired(true)
- **App.tsx:** Conditionally renders SessionExpiredModal when sessionExpired is true
- Modal renders above Toaster, call UI, and router content
- App state (open conversation, etc.) preserved beneath modal

## Decisions Made

**1. In-place modal instead of redirect**
- Preserves all app state (open conversation, scroll position, form data)
- Better UX than forcing full re-login flow
- User context maintained throughout re-authentication

**2. Single sessionExpired boolean in auth store**
- Simple state management (true/false)
- Single source of truth for session state
- Modal automatically closes when set to false after successful relogin

**3. Relogin action reuses login endpoint**
- No need for separate reauth API endpoint
- Same token refresh and crypto key initialization logic
- DRY principle maintained

## Files Changed

**Created:**
- frontend/src/components/auth/SessionExpiredModal.tsx (87 lines)

**Modified:**
- frontend/src/stores/auth.ts (+33 lines)
- frontend/src/lib/api.ts (+5 lines)  
- frontend/src/App.tsx (+4 lines)

## Testing & Verification

All verification checks passed:
- TypeScript compilation successful
- sessionExpired state present in auth store
- SessionExpiredModal imported and rendered in App.tsx
- setSessionExpired called in api.ts on refresh failure
- Frontend build successful

## Integration Points

**Triggers:**
- Token refresh failure in api.ts (401 response after refresh attempt)

**Dependencies:**
- Toast infrastructure (04-02) for error display
- Auth token refresh mechanism (02-01)  
- Crypto key management (02-02)

**Affects:**
- All authenticated API requests benefit from graceful session recovery

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for:**
- 04-07 (if exists) - Error boundaries and error handling
- Production deployment with graceful session management

**No blockers.**

## Success Criteria Met

- [x] Auth store tracks sessionExpired state
- [x] SessionExpiredModal renders when sessionExpired is true
- [x] Successful re-login clears sessionExpired and restores session
- [x] App state (open conversations, etc.) preserved during re-auth

## Performance Notes

- Modal only renders when needed (conditional rendering)
- No polling or background checks for session state
- Minimal bundle size impact (~87 lines)
- Relogin reuses existing API endpoint (no new backend route)

## Security Considerations

- Session expiry properly detected via refresh token failure
- User must re-enter password (no automatic re-auth)
- Crypto keys re-derived from password (not cached insecurely)
- Access token and refresh token properly rotated on relogin

## User Experience Improvements

1. **Preserved Context:** User doesn't lose place in conversation
2. **Clear Communication:** Modal explains session expired
3. **Pre-filled Email:** Reduces friction with known email
4. **Automatic Close:** Modal disappears on successful login
5. **Error Feedback:** Login errors displayed in modal

## Technical Highlights

- State-driven modal rendering (React patterns)
- Zustand store for global state management
- TypeScript type safety throughout
- shadcn/ui component consistency
- Clean separation of concerns (store/component/API)

---

**One-liner:** In-place session recovery modal preserves app state when refresh token expires, enabling seamless re-authentication without redirect.
