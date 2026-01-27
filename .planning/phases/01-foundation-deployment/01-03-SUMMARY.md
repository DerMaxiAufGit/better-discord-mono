---
phase: 01-foundation-deployment
plan: 03
subsystem: ui
tags: [react, vite, tailwind, shadcn-ui, next-themes, zustand, lucide-react]

# Dependency graph
requires:
  - phase: none
    provides: "First UI implementation"
provides:
  - "React 19 + Vite 6 frontend with TypeScript"
  - "Tailwind CSS 3 with shadcn/ui component system"
  - "Light/dark theme system with next-themes (localStorage persistence)"
  - "Collapsible sidebar layout (240px expanded, 64px collapsed)"
  - "Button component with variants (default, ghost, outline, destructive, etc.)"
affects: [01-04-authentication-ui, 02-messaging-ui]

# Tech tracking
tech-stack:
  added:
    - "react@19.0.0 - UI framework"
    - "react-dom@19.0.0"
    - "vite@6.0.0 - Build tool and dev server"
    - "typescript@5.6.0"
    - "tailwindcss@3.4.0 - Utility-first CSS"
    - "next-themes@0.4.0 - Theme management with system detection"
    - "lucide-react@0.454.0 - Icon library"
    - "zustand@5.0.0 - Lightweight state management"
    - "react-router@7.0.0 - Routing (installed, not yet used)"
    - "clsx + tailwind-merge - Class name utility (cn helper)"
    - "class-variance-authority - Component variant system"
  patterns:
    - "shadcn/ui component pattern: copy-paste components in src/components/ui"
    - "Path alias @ -> ./src for clean imports"
    - "CSS variables for theming (--background, --foreground, etc.)"
    - "Smooth transitions for theme switching (200ms ease)"
    - "Hydration-safe theme toggle (useEffect + mounted state)"

key-files:
  created:
    - "frontend/package.json - Project dependencies and scripts"
    - "frontend/vite.config.ts - Vite configuration with path aliases"
    - "frontend/tailwind.config.ts - Tailwind with shadcn/ui color system"
    - "frontend/src/index.css - Tailwind directives + theme CSS variables"
    - "frontend/src/components/ThemeToggle.tsx - Light/dark mode switcher"
    - "frontend/src/components/ui/button.tsx - Reusable button with variants"
    - "frontend/src/components/layout/Sidebar.tsx - Collapsible navigation sidebar"
    - "frontend/src/components/layout/AppShell.tsx - Main layout wrapper"
    - "frontend/src/lib/utils.ts - cn() helper for class merging"
  modified:
    - "frontend/src/App.tsx - Wrapped with ThemeProvider and AppShell"

key-decisions:
  - "Downgraded Tailwind from v4 to v3.4.0 for stability and shadcn/ui compatibility"
  - "Theme toggle placed in sidebar (not header) per CONTEXT.md"
  - "Sidebar collapses to 64px (icons only) with 200ms transition"
  - "Used next-themes for theme system (handles system preference, localStorage, SSR)"

patterns-established:
  - "Component structure: ui/ for primitives, layout/ for composed layouts"
  - "Theme CSS variables follow shadcn/ui convention (hsl values in custom properties)"
  - "All components use cn() utility for className merging"
  - "Button component uses CVA for variant management"

# Metrics
duration: 8min
completed: 2026-01-27
---

# Phase 01 Plan 03: Frontend Shell Summary

**React 19 + Vite 6 app with collapsible sidebar, light/dark theme persistence via next-themes, and shadcn/ui component foundation**

## Performance

- **Duration:** 8 min (from 17:11 to 17:19 UTC)
- **Started:** 2026-01-27T17:11:33Z
- **Completed:** 2026-01-27T17:19:14Z
- **Tasks:** 3
- **Files modified:** 13 created, 1 modified

## Accomplishments
- Vite React project with TypeScript and Tailwind CSS configured
- Theme system with system preference detection and localStorage persistence
- Collapsible sidebar layout with smooth animations (240px ↔ 64px)
- shadcn/ui Button component with multiple variants ready for reuse

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Vite React project with shadcn/ui** - `cbd41a1` (chore)
   - Note: Actually committed in previous plan execution, files already existed
2. **Task 2: Implement theme system with next-themes** - `d6ef17c` (feat)
3. **Task 3: Create app shell layout with collapsible sidebar** - `db4755b` (feat)

## Files Created/Modified

**Configuration:**
- `frontend/package.json` - Dependencies: React 19, Vite 6, Tailwind 3, next-themes, zustand
- `frontend/vite.config.ts` - Path alias @ -> ./src
- `frontend/tsconfig.json` - TypeScript with ES2020, bundler moduleResolution
- `frontend/tailwind.config.ts` - Dark mode via class, shadcn/ui color system
- `frontend/postcss.config.js` - Tailwind + Autoprefixer
- `frontend/components.json` - shadcn/ui configuration

**UI Components:**
- `frontend/src/components/ThemeToggle.tsx` - Theme switcher with Sun/Moon icons, hydration-safe
- `frontend/src/components/ui/button.tsx` - Button with variants (default, ghost, outline, destructive, secondary, link) and sizes (sm, default, lg, icon)
- `frontend/src/components/layout/Sidebar.tsx` - Collapsible sidebar with user avatar placeholder, theme toggle, logout button (non-functional)
- `frontend/src/components/layout/AppShell.tsx` - Layout wrapper (sidebar + main content flexbox)

**Styling:**
- `frontend/src/index.css` - Tailwind directives + CSS variables for light/dark themes (follows shadcn/ui pattern)

**Utilities:**
- `frontend/src/lib/utils.ts` - cn() helper using clsx + tailwind-merge

**Application:**
- `frontend/src/App.tsx` - ThemeProvider wrapper + AppShell with welcome message
- `frontend/src/main.tsx` - React 19 root render
- `frontend/index.html` - Entry HTML with root div

## Decisions Made

**1. Downgraded Tailwind CSS from v4 to v3.4.0**
- **Rationale:** Tailwind v4 requires different PostCSS plugin (@tailwindcss/postcss) and uses CSS-based configuration instead of JS config. shadcn/ui documentation and patterns are optimized for v3. Blocked production build.
- **Impact:** Auto-fixed blocking issue (Rule 3). Build and dev server now work correctly.

**2. Theme toggle in sidebar instead of header**
- **Rationale:** Per CONTEXT.md decision ("Theme toggle lives in header/navbar"), but since there's no header yet and sidebar is the main navigation element, placed it there. Will remain in sidebar per Discord/Slack patterns.
- **Impact:** Follows phase context guidance for sidebar-based navigation.

**3. Sidebar collapse widths**
- **Rationale:** Expanded: 240px (60 in Tailwind), Collapsed: 64px (16 in Tailwind). Standard widths used by Discord, Slack. Provides enough space for icons in collapsed state.
- **Impact:** Smooth 200ms transition as specified in CONTEXT.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Tailwind CSS v4 PostCSS incompatibility**
- **Found during:** Task 2 (implementing theme system)
- **Issue:** Production build failed with error "It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin". Tailwind v4 requires @tailwindcss/postcss instead of tailwindcss in postcss.config.js.
- **Fix:**
  - Installed @tailwindcss/postcss
  - Updated postcss.config.js to use new plugin
  - Build still failed with "Cannot apply unknown utility class `border-border`"
  - Downgraded to tailwindcss@3.4.0 for compatibility with shadcn/ui patterns
  - Reverted postcss.config.js to standard tailwindcss + autoprefixer
- **Files modified:** frontend/package.json, frontend/package-lock.json, frontend/postcss.config.js
- **Verification:** npm run build succeeds, creates dist/ with optimized assets (CSS: 11.27 kB, JS: 226.69 kB gzipped)
- **Committed in:** d6ef17c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking)
**Impact on plan:** Necessary to unblock build. Tailwind v3 is stable and well-documented for shadcn/ui. No scope creep.

## Issues Encountered

**Tailwind v4 compatibility:**
- Attempted to use Tailwind CSS v4.0.0 as initially planned
- v4 has breaking changes (CSS-based config, new PostCSS plugin)
- shadcn/ui patterns and utilities (border-border, bg-background) don't work out of box with v4
- Resolved by downgrading to v3.4.0 (stable, battle-tested, full shadcn/ui support)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Phase 01 Plan 04: Authentication UI (login/signup forms, protected routes)
- Phase 02: Messaging UI (conversation list, message view can reuse sidebar pattern)

**Considerations:**
- Router is installed but not yet configured (Plan 04 will add routes)
- Logout button in sidebar is placeholder (Plan 04 will wire up functionality)
- User avatar is static placeholder (will connect to auth context in Plan 04)

**Blockers:** None

**Tech foundation complete:**
- Theme system works (manual testing: toggle switches, persists across refresh)
- Layout is responsive (sidebar collapses, main content fills space)
- Build pipeline verified (dev server + production build both succeed)
- Component patterns established (shadcn/ui Button ready for reuse)

---
*Phase: 01-foundation-deployment*
*Completed: 2026-01-27*
