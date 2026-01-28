# Phase 4: UI Polish & Production Readiness - Research

**Researched:** 2026-01-28
**Domain:** React UI/UX patterns, responsive design, loading states, error handling
**Confidence:** HIGH

## Summary

This phase focuses on refining the user experience across four key areas: responsive mobile design, loading state feedback, error handling UX, and recovery patterns. The research investigated modern React patterns for these domains, with particular attention to libraries and approaches that work well with the existing stack (React 19, TypeScript, Tailwind CSS v3, Zustand).

The standard approach in 2026 involves: (1) Mobile-first responsive design using Tailwind's breakpoint system with custom hooks for conditional logic, (2) Context-dependent loading states using skeleton screens (react-loading-skeleton) and optimistic UI (React's useOptimistic hook), (3) Modern toast notifications (Sonner) combined with error boundaries for comprehensive error handling, and (4) Exponential backoff with jitter for retry logic.

Key findings include React 19's native useOptimistic hook for message sending patterns, Sonner as the de-facto standard for toast notifications in modern React apps, and proven patterns for JWT token refresh with axios interceptors.

**Primary recommendation:** Use Tailwind's mobile-first breakpoint system with a custom useBreakpoint hook, implement optimistic updates with React's useOptimistic, adopt Sonner for toast notifications, and leverage react-loading-skeleton for loading states. For swipe gestures, use react-swipeable (actively maintained, v7.0.2).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | v3.4+ | Responsive utilities | Mobile-first breakpoint system, already in project |
| react-loading-skeleton | v3.5.0 | Skeleton loaders | Auto-adapts to content, widely adopted (4.2k stars) |
| Sonner | v2.0.7 | Toast notifications | De-facto standard for shadcn/ui projects, 11.9k stars, 8M+ weekly downloads |
| react-swipeable | v7.0.2 | Touch gestures | Actively maintained, supports both touch and mouse |
| React useOptimistic | React 19+ | Optimistic updates | Native React hook for instant UI feedback |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-simple-pull-to-refresh | Latest | Pull-to-refresh | 0 dependencies, works mobile and desktop |
| react-error-boundary | v4+ | Error boundaries | Catch rendering errors, integrate with toast system |
| axios | Latest | HTTP client | Token refresh with interceptors (if not using fetch) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sonner | React Hot Toast | Lighter (5KB) but less opinionated, no shadcn/ui integration |
| Sonner | React Toastify | More features but heavier, older API style |
| react-loading-skeleton | Manual Tailwind | More control but requires custom animation, more maintenance |
| react-swipeable | @use-gesture/react | More powerful but heavier, steeper learning curve |

**Installation:**
```bash
npm install sonner react-loading-skeleton react-swipeable react-simple-pull-to-refresh react-error-boundary
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/                  # Existing shadcn/ui components
│   ├── mobile/              # Mobile-specific layouts (bottom nav, etc.)
│   ├── loading/             # Skeleton components
│   └── error/               # Error fallback components
├── hooks/
│   ├── useBreakpoint.ts     # Responsive logic hook
│   ├── useTokenRefresh.ts   # JWT refresh logic
│   └── useRetry.ts          # Exponential backoff hook
└── lib/
    ├── toast.ts             # Sonner wrapper/config
    └── retry.ts             # Retry utilities
```

### Pattern 1: Mobile-First Responsive Design
**What:** Use unprefixed Tailwind utilities for mobile, add breakpoint prefixes for larger screens
**When to use:** All responsive styling decisions
**Example:**
```typescript
// Source: https://tailwindcss.com/docs/responsive-design
// Mobile first - unprefixed is mobile, md: is 768px+
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Full width on mobile, half on tablet, third on desktop */}
</div>

// Show/hide based on breakpoint
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>
```

### Pattern 2: Conditional Rendering with useBreakpoint Hook
**What:** Custom hook to handle logic that can't be done with CSS alone
**When to use:** Different component trees for mobile vs desktop, conditional prop values
**Example:**
```typescript
// Source: React patterns 2026
function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState('mobile')

  useEffect(() => {
    const updateBreakpoint = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setBreakpoint('desktop')
      } else if (window.matchMedia('(min-width: 768px)').matches) {
        setBreakpoint('tablet')
      } else {
        setBreakpoint('mobile')
      }
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return breakpoint
}

// Usage
const breakpoint = useBreakpoint()
return breakpoint === 'mobile' ? <MobileNav /> : <DesktopSidebar />
```

### Pattern 3: Optimistic Message Sending
**What:** Show message immediately with "sending" state, update when confirmed
**When to use:** Message sending, any user action that should feel instant
**Example:**
```typescript
// Source: https://react.dev/reference/react/useOptimistic
import { useOptimistic, startTransition } from 'react'

function MessageList({ messages, sendMessage }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (state, newMessage) => [
      ...state,
      { ...newMessage, status: 'sending' }
    ]
  )

  async function handleSend(text) {
    // 1. Show optimistically
    addOptimistic({ id: crypto.randomUUID(), text, timestamp: Date.now() })

    // 2. Send in background
    startTransition(async () => {
      await sendMessage(text)
    })
  }

  return (
    <>
      {optimisticMessages.map(msg => (
        <Message
          key={msg.id}
          {...msg}
          isPending={msg.status === 'sending'}
        />
      ))}
    </>
  )
}
```

### Pattern 4: Skeleton Loading States
**What:** Show placeholder content that mimics final layout
**When to use:** List loading (conversations, contacts), initial page load
**Example:**
```typescript
// Source: https://github.com/dvtng/react-loading-skeleton
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

function ConversationListSkeleton() {
  return (
    <SkeletonTheme baseColor="#202020" highlightColor="#444">
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton circle width={48} height={48} />
            <div className="flex-1">
              <Skeleton width="60%" height={20} />
              <Skeleton width="80%" height={16} className="mt-2" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonTheme>
  )
}
```

### Pattern 5: Context-Dependent Error Display
**What:** Use different UI patterns based on error severity and context
**When to use:** All error scenarios
**Example:**
```typescript
// Source: Modern React patterns 2026
import { toast } from 'sonner'

// Minor errors: Toast
toast.error('Failed to update settings', {
  action: { label: 'Retry', onClick: () => retryUpdate() }
})

// Persistent issues: Banner (in component state)
const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected'>('connected')
{wsStatus === 'disconnected' && (
  <Banner variant="warning">
    Connection lost. Trying to reconnect...
  </Banner>
)}

// Critical errors: Modal
function AuthExpiredModal({ onReauth }) {
  return (
    <Dialog open>
      <DialogContent>
        <DialogTitle>Session Expired</DialogTitle>
        <p>Please log in again to continue</p>
        <Button onClick={onReauth}>Log In</Button>
      </DialogContent>
    </Dialog>
  )
}
```

### Pattern 6: Exponential Backoff with Jitter
**What:** Retry with increasing delays plus randomness to prevent thundering herd
**When to use:** WebSocket reconnection, failed API requests, call reconnection
**Example:**
```typescript
// Source: https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1
function calculateBackoff(attemptNumber: number): number {
  const baseDelay = 1000 // 1 second
  const maxDelay = 30000 // 30 seconds
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attemptNumber),
    maxDelay
  )

  // Add jitter (randomness between 0-1000ms)
  const jitter = Math.random() * 1000
  return exponentialDelay + jitter
}

// Usage in reconnection logic
let reconnectAttempts = 0
const maxAttempts = 3

function reconnect() {
  if (reconnectAttempts >= maxAttempts) {
    toast.error('Unable to connect. Please try again later.')
    return
  }

  const delay = calculateBackoff(reconnectAttempts)
  reconnectAttempts++

  toast.info(`Reconnecting in ${Math.round(delay / 1000)}s...`)

  setTimeout(() => {
    // Attempt reconnection
    connect()
  }, delay)
}
```

### Pattern 7: Silent Token Refresh
**What:** Automatically refresh access tokens before they expire without user intervention
**When to use:** JWT authentication, maintain session continuity
**Example:**
```typescript
// Source: https://www.bezkoder.com/react-refresh-token/
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })
let refreshTokenPromise: Promise<string> | null = null

// Request interceptor: Add access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: Handle 401 and refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Prevent multiple simultaneous refresh requests
      if (!refreshTokenPromise) {
        refreshTokenPromise = refreshAccessToken()
      }

      try {
        const newToken = await refreshTokenPromise
        localStorage.setItem('accessToken', newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed - show login modal
        showLoginModal()
        return Promise.reject(refreshError)
      } finally {
        refreshTokenPromise = null
      }
    }

    return Promise.reject(error)
  }
)

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken')
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })

  if (!response.ok) throw new Error('Refresh failed')

  const data = await response.json()
  return data.accessToken
}
```

### Pattern 8: Touch Gestures with react-swipeable
**What:** Detect swipe gestures for mobile interactions
**When to use:** Swipe-to-go-back, swipe actions on messages, swipeable cards
**Example:**
```typescript
// Source: https://github.com/FormidableLabs/react-swipeable
import { useSwipeable } from 'react-swipeable'

function MessageItem({ message, onDelete }) {
  const [swipeOffset, setSwipeOffset] = useState(0)

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Show delete button as user swipes left
      if (eventData.dir === 'Left') {
        setSwipeOffset(Math.max(-80, eventData.deltaX))
      }
    },
    onSwipedLeft: () => {
      if (swipeOffset < -60) {
        // Threshold reached - show delete action
        setSwipeOffset(-80)
      } else {
        setSwipeOffset(0)
      }
    },
    onSwipedRight: () => setSwipeOffset(0),
    trackMouse: true // Enable mouse for desktop testing
  })

  return (
    <div {...handlers} className="relative overflow-hidden">
      <div
        className="transition-transform"
        style={{ transform: `translateX(${swipeOffset}px)` }}
      >
        <MessageContent message={message} />
      </div>
      {swipeOffset < 0 && (
        <button
          className="absolute right-0 top-0 h-full w-20 bg-red-500"
          onClick={onDelete}
        >
          Delete
        </button>
      )}
    </div>
  )
}
```

### Pattern 9: Pull-to-Refresh
**What:** Let users refresh content by pulling down on lists
**When to use:** Conversation list, contact list, any list that can be refreshed
**Example:**
```typescript
// Source: https://www.npmjs.com/package/react-simple-pull-to-refresh
import PullToRefresh from 'react-simple-pull-to-refresh'

function ConversationList() {
  const [conversations, setConversations] = useState([])

  async function handleRefresh() {
    const fresh = await fetchConversations()
    setConversations(fresh)
  }

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={<div className="text-center py-4">Pull to refresh</div>}
      refreshingContent={<div className="text-center py-4">Refreshing...</div>}
    >
      <div className="space-y-2">
        {conversations.map(conv => (
          <ConversationItem key={conv.id} conversation={conv} />
        ))}
      </div>
    </PullToRefresh>
  )
}
```

### Anti-Patterns to Avoid
- **Using sm: for mobile styling**: In Tailwind's mobile-first system, sm: means "640px and up", not "small screens". Use unprefixed utilities for mobile.
- **Hard-coding breakpoint values**: Don't use magic numbers like `window.innerWidth < 768`. Use Tailwind's breakpoints or a centralized breakpoint constant.
- **Skeleton screens that don't match content**: Skeletons should approximate the final layout. Drastically different shapes confuse users.
- **Global loading spinners**: In 2026, global spinners feel outdated. Each section should handle its own loading state.
- **Retrying without backoff**: Immediate retries can overwhelm recovering servers. Always use exponential backoff.
- **Showing all errors as toasts**: Critical errors (like auth failure) need modals. Persistent issues (like offline state) need banners.
- **Storing access tokens in localStorage**: Prefer memory for access tokens (XSS protection). Only refresh tokens go in httpOnly cookies ideally.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skeleton loaders | Custom div with animate-pulse | react-loading-skeleton | Auto-adapts to content, handles RTL, theme support |
| Toast notifications | Custom positioned divs | Sonner | Stacking, animations, accessibility, queue management |
| Touch gestures | Raw touch event handlers | react-swipeable | Handles edge cases, works on desktop, velocity tracking |
| Exponential backoff | Manual setTimeout logic | Proven formula with jitter | Prevents thundering herd, tested in production |
| Token refresh | Manual 401 handling | Axios interceptors pattern | Prevents duplicate refresh requests, queues pending requests |
| Error boundaries | Try-catch everywhere | react-error-boundary | Catches rendering errors, provides recovery UI |
| Pull-to-refresh | Custom scroll listeners | react-simple-pull-to-refresh | Handles overscroll, momentum, threshold detection |
| Breakpoint detection | Multiple window.matchMedia | Custom useBreakpoint hook | Single source of truth, handles SSR, cleanup |

**Key insight:** UI polish is where subtle details matter. Libraries in this domain have solved dozens of edge cases (touch momentum, stacked toasts, RTL support, accessibility) that take weeks to implement correctly. The time saved by using proven libraries is better spent on app-specific polish.

## Common Pitfalls

### Pitfall 1: Mobile-First Confusion
**What goes wrong:** Developers style for mobile using sm: prefix, causing unpredictable behavior
**Why it happens:** Intuition says "sm means small screens" but Tailwind's sm: means "640px and LARGER"
**How to avoid:** Remember: unprefixed = mobile (all sizes), sm: = tablet+, md: = laptop+, lg: = desktop+
**Warning signs:** Styles not appearing on mobile, having to use max-sm: frequently

### Pitfall 2: Optimistic Updates Without Rollback
**What goes wrong:** Message appears to send, but failure leaves UI in inconsistent state
**Why it happens:** Developer adds optimistic update but forgets to handle failure case
**How to avoid:** useOptimistic automatically handles this - when the transition completes, React syncs with real state
**Warning signs:** Duplicate messages, "sending" state never clearing, phantom messages

### Pitfall 3: Thundering Herd on Reconnection
**What goes wrong:** All clients reconnect at the same time after server restart, causing another crash
**Why it happens:** Using fixed retry intervals (e.g., retry every 5 seconds)
**How to avoid:** Use exponential backoff WITH jitter (randomness)
**Warning signs:** Server struggles after restart, connection attempts in synchronized waves

### Pitfall 4: Multiple Simultaneous Token Refreshes
**What goes wrong:** Multiple API requests get 401 simultaneously, each triggers a refresh, creating race conditions
**Why it happens:** No global coordination of refresh attempts
**How to avoid:** Use a shared promise that all 401s await (see Pattern 7 example)
**Warning signs:** Multiple refresh API calls, inconsistent token state, logout loops

### Pitfall 5: Skeleton Mismatch
**What goes wrong:** Skeleton shows 3 lines but content shows 5, causing jarring shift
**Why it happens:** Skeleton designed once, content changes over time
**How to avoid:** Keep skeletons in same file as components, update together. Use react-loading-skeleton's auto-sizing.
**Warning signs:** Layout shift on load, complaints about "jumpy" UI

### Pitfall 6: Toast Fatigue
**What goes wrong:** Too many toasts overwhelm users, important messages missed
**Why it happens:** Toasting every state change, every API response
**How to avoid:** Only toast user-initiated actions and errors. Don't toast background syncs. Limit concurrent toasts (Sonner's visibleToasts prop).
**Warning signs:** Users complaining about notifications, important errors missed

### Pitfall 7: Not Testing Touch Gestures on Desktop
**What goes wrong:** Swipe features only work on mobile, can't test in browser
**Why it happens:** Developers forget to enable mouse simulation
**How to avoid:** react-swipeable's trackMouse: true enables desktop testing
**Warning signs:** Development cycle requires phone testing, slow iteration

### Pitfall 8: Fixed Retry Limits for All Scenarios
**What goes wrong:** WebSocket retries 3 times then gives up, but user has flaky connection
**Why it happens:** Applying same retry limit to all scenarios
**How to avoid:** Different retry strategies for different scenarios - WebSocket should retry indefinitely with backoff, API calls should fail after 3 attempts, call reconnection should show manual retry option after 3 attempts
**Warning signs:** Users reporting "stuck offline" when connection is actually available

### Pitfall 9: Breakpoint Logic in CSS Instead of JS
**What goes wrong:** Need to render different components on mobile, but CSS can only hide/show
**Why it happens:** Over-reliance on Tailwind's hidden/block utilities
**How to avoid:** Use useBreakpoint hook for logic that affects component tree, use Tailwind for styling only
**Warning signs:** Rendering both mobile and desktop components then hiding one, unnecessary DOM nodes, performance issues

### Pitfall 10: Storing Sensitive Tokens Insecurely
**What goes wrong:** Access tokens in localStorage vulnerable to XSS attacks
**Why it happens:** Convenience - localStorage persists across refreshes
**How to avoid:** Store access tokens in memory only, refresh tokens in httpOnly cookies (requires backend cooperation)
**Warning signs:** Security audit flags token storage, concerns about XSS

## Code Examples

Verified patterns from official sources:

### Responsive Grid Layout
```typescript
// Source: https://tailwindcss.com/docs/responsive-design
// Mobile: stacked, Tablet: 2 columns, Desktop: 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Bottom Navigation (Mobile)
```typescript
// Mobile-first: Show on mobile, hide on desktop where sidebar exists
<nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden">
  <div className="flex justify-around py-2">
    <NavButton icon={MessageSquare} label="Chats" to="/conversations" />
    <NavButton icon={Phone} label="Calls" to="/calls" />
    <NavButton icon={Users} label="Contacts" to="/contacts" />
    <NavButton icon={Settings} label="Settings" to="/settings" />
  </div>
</nav>
```

### Toast Configuration
```typescript
// Source: https://github.com/emilkowalski/sonner
import { Toaster } from 'sonner'

// In app root
function App() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          className: 'toast-custom'
        }}
        visibleToasts={3}
        closeButton
      />
      {/* Rest of app */}
    </>
  )
}

// Usage anywhere
import { toast } from 'sonner'

toast.success('Message sent')
toast.error('Failed to connect', {
  action: { label: 'Retry', onClick: () => retry() }
})
toast.promise(
  sendMessage(),
  {
    loading: 'Sending...',
    success: 'Sent!',
    error: 'Failed to send'
  }
)
```

### Error Boundary with Toast Integration
```typescript
// Source: https://github.com/bvaughn/react-error-boundary
import { ErrorBoundary } from 'react-error-boundary'
import { toast } from 'sonner'

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2>Something went wrong</h2>
      <pre className="text-sm text-muted-foreground">{error.message}</pre>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  )
}

function onError(error, info) {
  console.error('Error boundary caught:', error, info)
  toast.error('An unexpected error occurred')
}

// Wrap components
<ErrorBoundary FallbackComponent={ErrorFallback} onError={onError}>
  <App />
</ErrorBoundary>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Desktop-first design | Mobile-first design | ~2015 | Mobile traffic exceeds desktop, default experience should be mobile |
| Global loading spinner | Context-aware loading states | ~2020 | Better UX - users see what's loading, partial content usable |
| react-toast-notifications | Sonner | 2024-2025 | Older library unmaintained, Sonner adopted by shadcn/ui ecosystem |
| Custom optimistic UI | React useOptimistic hook | 2024 (React 19) | Native support simplifies implementation, better Suspense integration |
| Fixed retry intervals | Exponential backoff with jitter | Proven pattern | Prevents thundering herd, better server recovery |
| Toasts for everything | Context-dependent error UI | 2022-2024 | Toasts for minor, banners for persistent, modals for critical |
| Access tokens in localStorage | Access tokens in memory | Security best practice | XSS protection - tokens can't be stolen via script injection |
| Manual token refresh | Axios interceptor pattern | Established pattern | Prevents duplicate refreshes, queues concurrent requests |

**Deprecated/outdated:**
- react-toast-notifications: No longer maintained as of 2023
- Using sm: for mobile styling: Common misconception in Tailwind, leads to bugs
- Global loading states: Modern apps use section-specific loading
- Toast-only error handling: Context-dependent approach is now standard

## Open Questions

Things that couldn't be fully resolved:

1. **Pull-to-refresh browser compatibility**
   - What we know: react-simple-pull-to-refresh claims desktop support, but pull-to-refresh is primarily a mobile pattern
   - What's unclear: Whether desktop browser implementation feels natural or awkward
   - Recommendation: Implement for mobile, test desktop experience, may want to add explicit "Refresh" button for desktop as fallback

2. **Ideal skeleton count for conversations**
   - What we know: Showing 5-8 skeleton items is common practice
   - What's unclear: Optimal count for this specific app's viewport sizes
   - Recommendation: Start with 6 skeletons, adjust based on average viewport height in analytics

3. **WebSocket reconnection max attempts**
   - What we know: Call reconnection should be limited (3 attempts per context), but WebSocket for messaging is more critical
   - What's unclear: Whether WebSocket should retry indefinitely or have an upper bound
   - Recommendation: Retry indefinitely with exponential backoff capped at 30s, but show persistent "offline" banner after 3 failures so user knows

4. **Tablet-specific breakpoint**
   - What we know: User specified 768px (md) as the mobile breakpoint
   - What's unclear: Whether tablets (768-1024px) should get mobile or desktop layout
   - Recommendation: Use mobile layout through md breakpoint, switch to desktop layout at lg (1024px). Tablets get bottom nav, larger phones in landscape might show sidebar.

## Sources

### Primary (HIGH confidence)
- Tailwind CSS Official Docs - Responsive Design: https://tailwindcss.com/docs/responsive-design
- React Official Docs - useOptimistic: https://react.dev/reference/react/useOptimistic
- Sonner GitHub: https://github.com/emilkowalski/sonner (v2.0.7)
- react-swipeable GitHub: https://github.com/FormidableLabs/react-swipeable (v7.0.2)
- react-loading-skeleton GitHub: https://github.com/dvtng/react-loading-skeleton (v3.5.0)

### Secondary (MEDIUM confidence)
- LogRocket - React Toast Libraries Compared 2025: https://blog.logrocket.com/react-toast-libraries-compared-2025/
- Knock Blog - Top 9 React Notification Libraries 2026: https://knock.app/blog/the-top-notification-libraries-for-react
- DEV Community - Robust WebSocket Reconnection with Exponential Backoff: https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1
- BezKoder - React Refresh Token with JWT and Axios Interceptors: https://www.bezkoder.com/react-refresh-token/
- React Error Boundary GitHub: https://github.com/bvaughn/react-error-boundary

### Tertiary (LOW confidence - WebSearch only)
- Material UI Bottom Navigation: https://mui.com/material-ui/react-bottom-navigation/
- React Navigation Bottom Tabs: https://reactnavigation.org/docs/bottom-tab-navigator/
- Flowbite Skeleton Components: https://flowbite.com/docs/components/skeleton/

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified with official docs, current versions confirmed, actively maintained
- Architecture: HIGH - Patterns verified with official React docs (useOptimistic) and Tailwind docs (responsive design), proven in production
- Pitfalls: HIGH - Based on documented common mistakes and official documentation warnings

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable domain, React 19 patterns recently established)
