# Phase 1: Foundation & Deployment - Research

**Researched:** 2026-01-27
**Domain:** Docker Compose deployment, JWT authentication, React frontend with theming
**Confidence:** HIGH

## Summary

This research covers building a production-ready foundation for a self-hosted communication platform using Docker Compose. The phase establishes secure authentication with JWT tokens, a modern React frontend with light/dark mode theming, and a containerized deployment architecture that works with a single command.

The standard approach uses Vite + React + TypeScript for the frontend, Node.js (Express or Fastify) for the backend API, PostgreSQL for data persistence, and Docker Compose to orchestrate all services. Authentication follows the modern pattern of short-lived access tokens in memory combined with long-lived refresh tokens in HttpOnly cookies to balance security and user experience. The UI leverages shadcn/ui components with Tailwind CSS for rapid development of a polished interface.

Key architectural decisions center on security (no sensitive data in localStorage, proper CORS setup, bcrypt for passwords), developer experience (hot reload in development, health checks for orchestration), and self-hosting simplicity (environment variables for configuration, named volumes for data persistence, clear documentation).

**Primary recommendation:** Use Vite + React + shadcn/ui for frontend, Fastify + PostgreSQL for backend, implement JWT auth with refresh tokens in HttpOnly cookies, and structure Docker Compose with proper health checks and depends_on conditions for reliable startup ordering.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 6.x | React build tool | Fast HMR, optimal dev experience, production-ready builds with esbuild |
| React | 19.x | Frontend framework | Industry standard, large ecosystem, excellent TypeScript support |
| TypeScript | 5.x | Type safety | Required for maintainable medium+ apps, prevents runtime errors |
| shadcn/ui | Latest | UI components | 104k+ GitHub stars, copy-paste components, full control, Radix UI + Tailwind |
| Tailwind CSS | 4.x | Styling | Utility-first, rapid development, excellent with shadcn/ui |
| React Router | 7.x | Routing | Standard for SPA routing, built-in auth patterns with Outlet/Navigate |
| Fastify | 5.x | Backend framework | 20-30% faster than Express, TypeScript-native, modern plugin architecture |
| PostgreSQL | 18.x | Database | ACID compliance, excellent for user/session data, battle-tested security |
| bcrypt | 5.x | Password hashing | Industry standard, salt rounds configurable, 10-12 rounds recommended |
| jsonwebtoken | 9.x | JWT handling | Standard JWT library for Node.js, widely adopted |
| Docker Compose | 2.x | Orchestration | Official Docker tool, self-hoster friendly, single-command deployment |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | 5.x | Client state | Lightweight state management for access tokens in memory |
| React Hook Form | 7.x | Form handling | Minimal re-renders, excellent validation, smaller than Formik |
| Zod | 3.x | Schema validation | Type-safe validation, pairs with React Hook Form |
| zxcvbn | 4.x | Password strength | Dropbox's strength estimator, better than regex rules |
| @fastify/cors | 10.x | CORS handling | Official Fastify CORS plugin |
| @fastify/jwt | 9.x | JWT for Fastify | Official JWT plugin with decorator pattern |
| pg | 8.x | PostgreSQL client | Standard Node.js PostgreSQL driver |
| next-themes | 0.4.x | Theme management | System preference detection, no flash, Next.js agnostic despite name |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fastify | Express 4.x | Express has larger ecosystem but slower, less TypeScript-native |
| PostgreSQL | MongoDB | NoSQL flexibility but worse for relational auth data, less mature RBAC |
| shadcn/ui | Material UI | MUI has more components but heavier bundle, less customization control |
| Vite | Create React App | CRA deprecated, Vite is successor with better performance |
| Docker Compose | Kubernetes | K8s overkill for single-instance self-hosting, higher complexity |

**Installation:**

Frontend:
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npx shadcn@latest init
npm install react-router zustand zod react-hook-form @hookform/resolvers zxcvbn next-themes
```

Backend:
```bash
mkdir backend && cd backend
npm init -y
npm install fastify @fastify/cors @fastify/jwt pg bcrypt dotenv
npm install -D @types/node @types/bcrypt @types/pg typescript tsx
```

## Architecture Patterns

### Recommended Project Structure
```
.
├── docker-compose.yml           # Orchestration
├── .env.example                 # Template for configuration
├── frontend/
│   ├── Dockerfile              # Multi-stage React build
│   ├── nginx.conf              # Production serving + API proxy
│   ├── src/
│   │   ├── components/         # shadcn/ui components go here
│   │   │   └── ui/             # Base UI components
│   │   ├── contexts/           # AuthContext, ThemeContext
│   │   ├── hooks/              # useAuth, useTheme custom hooks
│   │   ├── lib/                # Utils, API client
│   │   ├── pages/              # Route components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── routes/             # Router configuration
│   │   └── App.tsx
│   └── package.json
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── routes/             # API route handlers
│   │   │   └── auth.ts         # POST /auth/signup, /auth/login, /auth/refresh
│   │   ├── plugins/            # Fastify plugins (jwt, cors, db)
│   │   ├── services/           # Business logic (auth service)
│   │   ├── db/                 # Database connection, migrations
│   │   └── server.ts           # Entry point
│   └── package.json
└── postgres/
    └── init.sql                # Initial schema
```

### Pattern 1: JWT Auth with HttpOnly Refresh Tokens
**What:** Short-lived access tokens (15 min) stored in memory, long-lived refresh tokens (7 days) in HttpOnly cookies with sliding window.

**When to use:** Always for web authentication where XSS is a concern and persistent sessions are required.

**Example:**
```typescript
// Backend: Fastify refresh endpoint
// Source: Multiple 2026 security guides on JWT storage
app.post('/auth/refresh', async (request, reply) => {
  const refreshToken = request.cookies.refreshToken;

  try {
    const decoded = app.jwt.verify(refreshToken);
    const newAccessToken = app.jwt.sign(
      { userId: decoded.userId },
      { expiresIn: '15m' }
    );

    // Sliding window: issue new refresh token
    const newRefreshToken = app.jwt.sign(
      { userId: decoded.userId },
      { expiresIn: '7d' }
    );

    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return { accessToken: newAccessToken };
  } catch (err) {
    reply.code(401).send({ error: 'Invalid refresh token' });
  }
});
```

```typescript
// Frontend: Auth context with in-memory token storage
// Source: Kent C Dodds auth patterns + 2026 Zustand patterns
import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,

  login: async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send cookies
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    set({ accessToken: data.accessToken, user: data.user });
  },

  logout: () => {
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    set({ accessToken: null, user: null });
  },

  refreshAccessToken: async () => {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      set({ accessToken: data.accessToken });
    } else {
      get().logout();
    }
  }
}));
```

### Pattern 2: Protected Routes with React Router 7
**What:** Route wrapper that checks authentication before rendering, redirects to login if unauthenticated.

**When to use:** Any route that requires logged-in user (dashboard, settings, etc).

**Example:**
```typescript
// Source: React Router 7 official patterns
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from './stores/auth';

function ProtectedRoute() {
  const { accessToken, user } = useAuthStore();

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// In router config
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/settings', element: <SettingsPage /> }
    ]
  }
]);
```

### Pattern 3: System-Aware Dark Mode
**What:** Theme defaults to OS preference, persists user override, smooth transitions.

**When to use:** Always for modern apps, expected UX in 2026.

**Example:**
```typescript
// Source: next-themes documentation
import { ThemeProvider } from 'next-themes';

// In App.tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <Router />
</ThemeProvider>

// Theme toggle component
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
```

```css
/* Tailwind config for dark mode */
/* Source: Tailwind v4 + shadcn/ui patterns */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* ... other variables */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... other variables */
  }
}

* {
  transition: background-color 200ms ease, color 200ms ease;
}
```

### Pattern 4: Docker Compose with Health Checks
**What:** Services use `depends_on` with `condition: service_healthy` to enforce startup order based on actual readiness.

**When to use:** Always for multi-container apps where services depend on databases/APIs being ready.

**Example:**
```yaml
# Source: Docker official documentation 2026
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  backend:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
        restart: true
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 10s
      timeout: 3s
      retries: 3

  frontend:
    build: ./frontend
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "80:80"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:80"]
      interval: 30s
      timeout: 3s

volumes:
  postgres_data:
```

### Anti-Patterns to Avoid
- **Storing access tokens in localStorage:** Vulnerable to XSS attacks. Use in-memory storage (Zustand/Context) instead.
- **Using `depends_on` without health checks:** Services start but aren't ready, causing connection failures. Always use `condition: service_healthy`.
- **Hardcoding secrets in docker-compose.yml:** Use environment variables and .env files, never commit secrets.
- **Not implementing token refresh:** Users get logged out every 15 minutes. Implement automatic refresh on 401 responses.
- **Using bind mounts for database data:** Data can be corrupted on Windows/Mac. Use named volumes (`postgres_data:`).
- **Forgetting CORS credentials flag:** Cookies won't be sent cross-origin. Set `credentials: 'include'` in fetch and `credentials: true` in CORS config.
- **Mounting PostgreSQL volume at `/var/lib/postgresql`:** Data won't persist. Must mount at `/var/lib/postgresql/data`.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password strength checking | Regex rules (uppercase, number, symbol) | zxcvbn library | Handles dictionary attacks, common patterns, l33tspeak; Dropbox-tested on millions of passwords |
| Email validation | Complex regex | Simple format check + domain verification | Email RFCs are 1000+ pages; validate with backend service, just check basic format client-side |
| Form validation | Manual error state | React Hook Form + Zod | Handles re-renders, error messages, touched state, async validation without boilerplate |
| JWT token refresh logic | Manual 401 handling in every component | Axios/Fetch interceptors | Centralized retry logic, avoids "thundering herd" when multiple requests fail simultaneously |
| Dark mode implementation | Manual localStorage + CSS classes | next-themes or similar | Handles system preference, SSR flash prevention, smooth transitions, edge cases |
| CORS configuration | Setting headers manually | @fastify/cors or cors package | Handles preflight, credentials, wildcards, security edge cases correctly |
| Database connection pooling | Single connections | pg.Pool | Prevents connection exhaustion, handles reconnects, connection limits |

**Key insight:** Security and UX libraries are battle-tested against edge cases you haven't considered. Custom solutions miss attacks (password strength), degrade UX (form validation re-renders), or create bugs (CORS preflight failures). The cost of dependencies is negligible compared to security incidents.

## Common Pitfalls

### Pitfall 1: The Thundering Herd - Multiple Simultaneous Token Refreshes
**What goes wrong:** When access token expires and user has multiple tabs or components making simultaneous API calls, each triggers a refresh request. This creates race conditions and can invalidate tokens before other requests complete.

**Why it happens:** No coordination between concurrent API calls when detecting 401 Unauthorized responses.

**How to avoid:** Implement a single in-flight refresh promise that all requests wait for.

**Warning signs:** Users randomly logged out, "Invalid token" errors appearing intermittently, multiple `/auth/refresh` requests in network tab.

```typescript
// Solution: Axios interceptor with single refresh promise
let refreshPromise: Promise<string> | null = null;

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        })
          .then(res => res.json())
          .then(data => data.accessToken)
          .finally(() => { refreshPromise = null; });
      }

      const newToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return axios(originalRequest);
    }

    return Promise.reject(error);
  }
);
```

### Pitfall 2: CORS Credentials Not Configured
**What goes wrong:** Frontend makes requests to backend, but cookies (refresh tokens) aren't sent even though backend allows CORS. Login appears to work but refresh fails silently.

**Why it happens:** Both client AND server must opt-in to credentials. Setting CORS origin isn't enough.

**How to avoid:** Set `credentials: 'include'` in fetch and `credentials: true` in CORS middleware.

**Warning signs:** Refresh token is `undefined` in backend logs, auth works in Postman but not browser, cookies visible in DevTools but not sent in requests.

```typescript
// Backend (Fastify)
app.register(cors, {
  origin: 'http://localhost:5173', // Dev server
  credentials: true, // REQUIRED for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

// Frontend
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  credentials: 'include', // REQUIRED to send cookies
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

### Pitfall 3: Docker Health Check Tool Not Installed
**What goes wrong:** Health check runs `curl` or `wget` but tool isn't in container image. Docker marks container as unhealthy but doesn't clearly indicate why.

**Why it happens:** Alpine-based images (postgres:18-alpine, node:alpine) don't include curl/wget by default.

**How to avoid:** Use tools that exist in the base image or install in Dockerfile. For PostgreSQL use `pg_isready`, for Node install `wget` in build step.

**Warning signs:** Container shows as "unhealthy" in `docker ps`, no clear error in logs, health check command looks correct.

```dockerfile
# Wrong: Alpine doesn't have curl
FROM node:20-alpine
HEALTHCHECK CMD curl -f http://localhost:3000/health || exit 1

# Right: Install wget or use node itself
FROM node:20-alpine
RUN apk add --no-cache wget
HEALTHCHECK CMD wget --spider -q http://localhost:3000/health || exit 1

# Better: Use Node to check
FROM node:20-alpine
HEALTHCHECK CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

### Pitfall 4: PostgreSQL Volume Mounted at Wrong Path
**What goes wrong:** Database data isn't persisted between container restarts. Users disappear, sessions lost.

**Why it happens:** Mounting volume at `/var/lib/postgresql` instead of `/var/lib/postgresql/data`. PostgreSQL stores data in the `data` subdirectory.

**How to avoid:** Always mount at `/var/lib/postgresql/data` for PostgreSQL containers.

**Warning signs:** Database starts empty after `docker-compose down && docker-compose up`, volume exists but contains no data.

```yaml
# Wrong
volumes:
  - postgres_data:/var/lib/postgresql

# Right
volumes:
  - postgres_data:/var/lib/postgresql/data
```

### Pitfall 5: Environment Variables Not Prefixed with VITE_ in React
**What goes wrong:** Environment variables defined in .env aren't accessible in frontend code (`import.meta.env.MY_VAR` is undefined).

**Why it happens:** Vite only exposes variables prefixed with `VITE_` to prevent accidentally leaking server secrets to client bundle.

**How to avoid:** Prefix all client-side env vars with `VITE_`.

**Warning signs:** `import.meta.env.VITE_API_URL` is undefined, variables work in Docker but not Vite dev server.

```bash
# Wrong (.env)
API_URL=http://localhost:3000

# Right (.env)
VITE_API_URL=http://localhost:3000
```

```typescript
// Usage in code
const apiUrl = import.meta.env.VITE_API_URL;
```

### Pitfall 6: No Sliding Window on Session Refresh
**What goes wrong:** Users actively using the app get logged out exactly 7 days after login, even mid-session.

**Why it happens:** Refresh token has fixed expiry, not updated on each refresh.

**How to avoid:** Issue a new refresh token with reset expiry on each successful refresh (sliding window pattern).

**Warning signs:** Active users complain about getting logged out unexpectedly, happens exactly N days after signup.

```typescript
// Wrong: Reuse same refresh token
app.post('/auth/refresh', async (request, reply) => {
  const token = request.cookies.refreshToken;
  const decoded = app.jwt.verify(token);
  const newAccessToken = app.jwt.sign({ userId: decoded.userId }, { expiresIn: '15m' });
  return { accessToken: newAccessToken }; // Same refresh token, will expire on schedule
});

// Right: Issue new refresh token (sliding window)
app.post('/auth/refresh', async (request, reply) => {
  const token = request.cookies.refreshToken;
  const decoded = app.jwt.verify(token);

  const newAccessToken = app.jwt.sign({ userId: decoded.userId }, { expiresIn: '15m' });
  const newRefreshToken = app.jwt.sign({ userId: decoded.userId }, { expiresIn: '7d' });

  reply.setCookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return { accessToken: newAccessToken };
});
```

## Code Examples

Verified patterns from official sources:

### Password Hashing with bcrypt
```typescript
// Source: bcrypt npm documentation + security best practices 2026
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // 10-12 for standard security, 12-16 for high security

// Signup
async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

// Login
async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Usage in route
app.post('/auth/signup', async (request, reply) => {
  const { email, password } = request.body;
  const hashedPassword = await hashPassword(password);

  // Store in database
  await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
    [email, hashedPassword]
  );

  // Auto-login after signup
  const accessToken = app.jwt.sign({ email }, { expiresIn: '15m' });
  const refreshToken = app.jwt.sign({ email }, { expiresIn: '7d' });

  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return { accessToken, user: { email } };
});
```

### Password Strength Meter with zxcvbn
```typescript
// Source: zxcvbn documentation + React patterns
import { useState, useEffect } from 'react';
import zxcvbn from 'zxcvbn';

function PasswordInput() {
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState<number>(0);

  useEffect(() => {
    if (password) {
      const result = zxcvbn(password);
      setStrength(result.score); // 0-4
    } else {
      setStrength(0);
    }
  }, [password]);

  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  return (
    <div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-3 py-2 border rounded"
      />
      {password && (
        <div className="mt-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`h-1 flex-1 rounded ${
                  level <= strength ? strengthColors[strength] : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm mt-1">{strengthLabels[strength]}</p>
        </div>
      )}
    </div>
  );
}
```

### Environment Variable Configuration
```bash
# .env.example - committed to git as template
# Database
DB_USER=chatapp
DB_PASSWORD=CHANGE_ME_IN_PRODUCTION
DB_NAME=chatapp

# JWT
JWT_SECRET=CHANGE_ME_USE_LONG_RANDOM_STRING
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend (must be prefixed with VITE_)
VITE_API_URL=http://localhost:3000
```

```yaml
# docker-compose.yml - uses .env variables
# Source: Docker Compose official documentation
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      JWT_ACCESS_EXPIRY: ${JWT_ACCESS_EXPIRY}
      JWT_REFRESH_EXPIRY: ${JWT_REFRESH_EXPIRY}
      NODE_ENV: production

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: ${VITE_API_URL}
```

```dockerfile
# Frontend Dockerfile with build args
# Source: Docker multi-stage build best practices
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build args become env vars during build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### React Hook Form with Zod Validation
```typescript
// Source: React Hook Form + Zod official examples
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    // Call API
    await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input {...register('email')} type="email" placeholder="Email" />
        {errors.email && <p className="text-red-500">{errors.email.message}</p>}
      </div>
      <div>
        <input {...register('password')} type="password" placeholder="Password" />
        {errors.password && <p className="text-red-500">{errors.password.message}</p>}
      </div>
      <button type="submit">Log In</button>
    </form>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Create React App | Vite | 2023 | CRA officially deprecated, Vite is 10-100x faster in dev |
| JWT in localStorage | JWT in memory + refresh in HttpOnly cookie | 2020-2021 | Better XSS protection, refresh tokens isolated from scripts |
| Manual dark mode | System preference detection | 2019-2020 | Respects OS setting, better UX |
| Express | Fastify or modern alternatives | 2020+ | 20-30% better performance, TypeScript-native |
| depends_on without conditions | depends_on with service_healthy | Docker Compose v2 (2020) | Proper orchestration, no race conditions |
| Redux for everything | Zustand/Jotai for client state, React Query for server | 2021-2023 | Less boilerplate, Redux Toolkit still common in enterprise |
| Material UI v4 | shadcn/ui + Radix + Tailwind | 2023-2024 | Full control, copy-paste, smaller bundles |
| Session cookies (server state) | JWT stateless auth | 2015-2018 | Scalability for APIs, easier for SPAs |
| Symmetric JWT signing (HS256) | Asymmetric (RS256) for distributed | 2016+ | Better for microservices, public key verification |

**Deprecated/outdated:**
- **Create React App:** Officially deprecated March 2023, use Vite or Next.js
- **localStorage for tokens:** Security best practices shifted to in-memory storage post-2020
- **Manual CORS header setting:** Use middleware packages, manual setup misses preflight edge cases
- **Redux without Redux Toolkit:** Too much boilerplate, RTK is official way if using Redux
- **Class components:** Hooks are standard since React 16.8 (2019), classes for legacy only

## Open Questions

Things that couldn't be fully resolved:

1. **Email confirmation flow implementation details**
   - What we know: Basic pattern is send verification email with token, user clicks link, backend marks email as verified
   - What's unclear: Best library for sending emails in self-hosted context (no Sendgrid/AWS SES assumption), whether to block login before verification or allow with warning
   - Recommendation: Research email solutions in Phase 2 (messaging) when email infrastructure is needed anyway. For Phase 1, allow login without verification but add `email_verified` column to schema for future use

2. **Production vs development Docker Compose split**
   - What we know: Best practice is separate `docker-compose.yml` (base) and `docker-compose.override.yml` (dev) or `docker-compose.prod.yml` (production)
   - What's unclear: Whether Phase 1 needs both or just production config since self-hosters deploy production
   - Recommendation: Start with single production-focused `docker-compose.yml`. Developers can run services locally without Docker (npm run dev) for development workflow

3. **Nginx vs Traefik for reverse proxy**
   - What we know: Nginx is simpler for single-instance, Traefik has better Docker integration and automatic SSL
   - What's unclear: Whether self-hosters prefer simplicity (Nginx) or automation (Traefik with Let's Encrypt)
   - Recommendation: Use Nginx for Phase 1 simplicity. Document Traefik as alternative in docs for users who want automatic HTTPS

4. **Database migration strategy**
   - What we know: Need initial schema for users table, but migrations typically use tools like Prisma, TypeORM, or raw SQL files
   - What's unclear: Best migration approach for self-hosted app where users update by pulling new code
   - Recommendation: Start with single `init.sql` in postgres/ directory for Phase 1. Evaluate migration tools in Phase 2 when schema changes become frequent

## Sources

### Primary (HIGH confidence)
- Docker Compose Official Documentation - https://docs.docker.com/compose - Networking, health checks, environment variables
- Fastify Official Documentation - https://fastify.dev - Framework features, plugins
- shadcn/ui Official Site - https://ui.shadcn.com - Component library, Tailwind v4 support, React 19 compatibility
- React Router Official Documentation - Protected routes patterns, Outlet/Navigate API
- bcrypt npm package - Password hashing, salt rounds recommendations
- PostgreSQL Docker Hub Official Image - Volume mounting, health checks

### Secondary (MEDIUM confidence)
- [Docker Best Practices 2026 - Thinksys](https://thinksys.com/devops/docker-best-practices/)
- [Best Practices Around Production Ready Web Apps with Docker Compose - Nick Janetakis](https://nickjanetakis.com/blog/best-practices-around-production-ready-web-apps-with-docker-compose)
- [JWT Authentication in React - Permify](https://permify.co/post/jwt-authentication-in-react/)
- [Advanced JWT Session Management in React - Medium](https://dhruvpvx.medium.com/advanced-jwt-session-management-in-react-and-react-native-69f475581181)
- [JWT Storage 101 - WorkOS](https://workos.com/blog/secure-jwt-storage)
- [JWT Storage in React: Local Storage vs Cookies - CyberSierra](https://cybersierra.co/blog/react-jwt-storage-guide/)
- [14 Best React UI Component Libraries in 2026 - Untitled UI](https://www.untitledui.com/blog/react-component-libraries)
- [Complete Guide to Setting Up React with TypeScript and Vite (2026) - Medium](https://medium.com/@robinviktorsson/complete-guide-to-setting-up-react-with-typescript-and-vite-2025-468f6556aaf2)
- [Docker Compose Health Checks Made Easy - Medium](https://medium.com/@cbaah123/docker-compose-health-checks-made-easy-a-practical-guide-3a340571b88e)
- [How to Use Docker Compose depends_on with Health Checks - OneUpTime](https://oneuptime.com/blog/post/2026-01-16-docker-compose-depends-on-healthcheck/view)
- [Password hashing in Node.js with bcrypt - LogRocket](https://blog.logrocket.com/password-hashing-node-js-bcrypt/)
- [Protected Routes and Authentication with React Router - ui.dev](https://ui.dev/react-router-protected-routes-authentication)
- [React Router 7: Private Routes - Robin Wieruch](https://www.robinwieruch.de/react-router-private-routes/)
- [Create a Light and Dark Mode Theme Toggle in React - Jeff Szuc](https://jeffszuc.com/posts/articles/theme-toggle)
- [Authentication in React Applications - Kent C Dodds](https://kentcdodds.com/blog/authentication-in-react-applications)
- [CORS setup Node.js React - CodingDeft](https://www.codingdeft.com/posts/nodejs-react-cors-error/)
- [Docker Volumes and Persistent Storage - Medium](https://medium.com/@jonas.granlund/docker-volumes-and-persistent-storage-the-complete-guide-71a100875b6c)
- [Email Validation Best Practices - Colin Hacks](https://colinhacks.com/essays/reasonable-email-regex)

### Tertiary (LOW confidence)
- Various Stack Overflow discussions on JWT refresh patterns (patterns verified against official docs)
- Community tutorials on React authentication (cross-referenced with Kent C Dodds patterns)
- Blog posts on Docker Compose networking (verified against Docker official documentation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified through official documentation, npm stats, and Context7 where available. Versions current as of January 2026.
- Architecture: HIGH - Patterns verified through official documentation (Docker, React Router, Fastify) and widely-adopted community patterns (Kent C Dodds auth, JWT security guides).
- Pitfalls: MEDIUM-HIGH - Based on common issues documented in official issue trackers, security guides, and verified through cross-referencing multiple sources. Specific pitfalls like "thundering herd" and CORS credentials are well-documented patterns.

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days) - Stack is relatively stable, but check for security advisories on bcrypt, jsonwebtoken, and framework updates before implementation
