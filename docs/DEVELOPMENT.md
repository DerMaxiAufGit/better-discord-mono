# Development Guide

This guide covers setting up a local development environment for contributing to the project or developing new features.

## Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **npm** 10+ (comes with Node.js)
- **PostgreSQL** 14+ (if not using Docker)
- **Git** for version control

### Optional (Recommended)

- **Docker & Docker Compose** - For running PostgreSQL without local installation
- **VS Code** or another TypeScript-aware editor

## Project Structure

```
better-discord-mono/
├── backend/               # Fastify API server
│   ├── src/
│   │   ├── index.ts       # Entry point
│   │   ├── db.ts          # Database connection
│   │   ├── auth/          # Authentication service & routes
│   │   └── types.ts       # Shared TypeScript types
│   ├── package.json
│   └── tsconfig.json
├── frontend/              # React application
│   ├── src/
│   │   ├── App.tsx        # Root component
│   │   ├── main.tsx       # Entry point
│   │   ├── stores/        # Zustand state management
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── routes/        # Routing configuration
│   │   └── lib/           # Utilities & API client
│   ├── package.json
│   └── vite.config.ts
├── postgres/
│   └── init.sql           # Database schema
├── docker-compose.yml     # Production deployment
├── .env.example           # Environment template
└── docs/                  # Documentation
```

## Setup Options

Choose one of these setup methods based on your preference:

### Option A: Docker for Database + Local Dev Servers (Recommended)

**Advantages**: Isolated database, no PostgreSQL installation needed, matches production environment

1. **Start only the database with Docker**:
   ```bash
   docker compose up -d postgres
   ```

2. **Install dependencies**:
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure environment**:
   ```bash
   # In project root
   cp .env.example .env.dev

   # Edit .env.dev:
   DB_USER=chatapp
   DB_PASSWORD=CHANGE_ME_IN_PRODUCTION
   DB_NAME=chatapp
   JWT_SECRET=dev_secret_for_local_testing
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   VITE_API_URL=http://localhost:3000
   ```

4. **Run backend**:
   ```bash
   cd backend
   # Load environment variables and start
   export $(cat ../.env.dev | xargs) && npm run dev
   ```

5. **Run frontend** (in separate terminal):
   ```bash
   cd frontend
   export $(cat ../.env.dev | xargs) && npm run dev
   ```

6. **Access**:
   - Frontend: http://localhost:5173 (Vite dev server)
   - Backend API: http://localhost:3000
   - Database: localhost:5432

### Option B: Full Docker Compose

**Advantages**: Matches production exactly, minimal local setup

```bash
# Build and run everything
docker compose up --build

# Access frontend at http://localhost
```

For code changes with hot reload in Docker, you need to mount volumes. See "Docker Development Mode" section below.

### Option C: Fully Local (No Docker)

**Advantages**: Maximum control, fastest hot reload

1. **Install PostgreSQL locally**:
   - [macOS](https://www.postgresql.org/download/macosx/)
   - [Windows](https://www.postgresql.org/download/windows/)
   - [Linux](https://www.postgresql.org/download/linux/)

2. **Create database**:
   ```bash
   psql -U postgres
   CREATE DATABASE chatapp;
   CREATE USER chatapp WITH PASSWORD 'CHANGE_ME_IN_PRODUCTION';
   GRANT ALL PRIVILEGES ON DATABASE chatapp TO chatapp;
   \q
   ```

3. **Initialize schema**:
   ```bash
   psql -U chatapp -d chatapp -f postgres/init.sql
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env.dev

   # Edit .env.dev:
   DATABASE_URL=postgres://chatapp:CHANGE_ME_IN_PRODUCTION@localhost:5432/chatapp
   JWT_SECRET=dev_secret_for_local_testing
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   VITE_API_URL=http://localhost:3000
   ```

5. **Install and run** (same as Option A steps 2, 4, 5)

## Development Workflow

### Running Backend (Development Mode)

```bash
cd backend
npm run dev
```

This starts the Fastify server with:
- Hot reload on file changes (tsx watch)
- TypeScript type checking
- Verbose logging
- CORS enabled for localhost:5173

Backend runs on **http://localhost:3000**

Available endpoints:
- `GET /health` - Health check
- `POST /auth/signup` - Create account
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Running Frontend (Development Mode)

```bash
cd frontend
npm run dev
```

This starts the Vite dev server with:
- Hot Module Replacement (HMR)
- Fast TypeScript compilation
- Instant updates on file changes

Frontend runs on **http://localhost:5173**

### Making Changes

#### Backend Changes

1. Edit files in `backend/src/`
2. Server auto-reloads on save
3. Check terminal for TypeScript errors
4. Test with curl or frontend

Example: Add new route
```typescript
// backend/src/auth/routes.ts
fastify.get('/auth/test', async (request, reply) => {
  return { message: 'Test endpoint' };
});
```

#### Frontend Changes

1. Edit files in `frontend/src/`
2. Browser auto-refreshes on save
3. Check browser console for errors
4. Check terminal for TypeScript errors

Example: Add new component
```tsx
// frontend/src/components/TestComponent.tsx
export function TestComponent() {
  return <div>Test Component</div>;
}
```

#### Database Schema Changes

1. Edit `postgres/init.sql`
2. Recreate database:
   ```bash
   # If using Docker:
   docker compose down -v
   docker compose up -d postgres

   # If using local PostgreSQL:
   dropdb -U chatapp chatapp
   createdb -U chatapp chatapp
   psql -U chatapp -d chatapp -f postgres/init.sql
   ```
3. Restart backend

### Testing Changes

#### Manual Testing

1. Start backend and frontend
2. Open http://localhost:5173
3. Test authentication flow:
   - Sign up with test account
   - Log in
   - Verify session persistence (refresh page)
   - Test theme toggle
   - Log out

#### API Testing with curl

```bash
# Health check
curl http://localhost:3000/health

# Signup
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"Test1234"}'

# Get current user (requires access token from login response)
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <access-token-from-login>"
```

## Code Quality

### TypeScript Type Checking

```bash
# Backend
cd backend
npx tsc --noEmit

# Frontend
cd frontend
npx tsc --noEmit
```

### Linting (if configured)

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

### Building for Production

```bash
# Backend
cd backend
npm run build
# Output: backend/dist/

# Frontend
cd frontend
npm run build
# Output: frontend/dist/
```

## Docker Development Mode

To use Docker with hot reload (mount local code):

Create `docker-compose.dev.yml`:

```yaml
services:
  backend:
    volumes:
      - ./backend/src:/app/src
      - ./backend/package.json:/app/package.json
    command: npm run dev

  frontend:
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/package.json:/app/package.json
    command: npm run dev
```

Run with:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Debugging

### Backend Debugging

Add breakpoints using:
```typescript
debugger; // JavaScript breakpoint
console.log('Debug:', variable); // Basic logging
```

Or use VS Code launch configuration (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

### Frontend Debugging

Use browser DevTools:
- **Chrome**: F12 → Sources tab
- **Firefox**: F12 → Debugger tab

React DevTools extension recommended: [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### Database Debugging

Connect to PostgreSQL:
```bash
# If using Docker:
docker compose exec postgres psql -U chatapp -d chatapp

# If using local PostgreSQL:
psql -U chatapp -d chatapp
```

Useful queries:
```sql
-- View all users
SELECT id, email, created_at FROM users;

-- View refresh tokens
SELECT user_id, token_hash, expires_at FROM refresh_tokens;

-- Clear all data
TRUNCATE users CASCADE;
```

## Common Issues

### Port Already in Use

**Problem**: "Port 3000 is already in use"

**Solution**:
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or change port in backend/src/index.ts
```

### Database Connection Failed

**Problem**: Backend can't connect to PostgreSQL

**Solution**:
- Check PostgreSQL is running: `docker compose ps` or `pg_isready`
- Verify `DATABASE_URL` in environment
- Check credentials match between `.env` and database

### CORS Errors

**Problem**: Frontend can't call backend API

**Solution**:
- Backend CORS is configured for `http://localhost:5173`
- If using different frontend port, update `backend/src/index.ts`:
  ```typescript
  fastify.register(cors, {
    origin: 'http://localhost:YOUR_PORT',
    credentials: true,
  });
  ```

### TypeScript Errors

**Problem**: "Cannot find module" or type errors

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript version matches
npx tsc --version
```

### Hot Reload Not Working

**Problem**: Changes don't trigger reload

**Solution**:
- Check file is saved
- Restart dev server
- Check terminal for errors
- Verify file is in watched directory (`src/`)

## Contributing

### Before Committing

1. **Type check**:
   ```bash
   cd backend && npx tsc --noEmit
   cd frontend && npx tsc --noEmit
   ```

2. **Test manually**: Verify auth flow works

3. **Build succeeds**:
   ```bash
   docker compose build
   ```

### Commit Guidelines

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Reference issue numbers if applicable
- Keep commits atomic (one logical change per commit)

### Pull Request Checklist

- [ ] Code type checks without errors
- [ ] Application builds successfully
- [ ] Manual testing completed
- [ ] Documentation updated (if adding features)
- [ ] Commit messages follow conventions

## Environment Variables Reference

For local development, use these in `.env.dev`:

```bash
# Database (if using Docker postgres)
DB_USER=chatapp
DB_PASSWORD=CHANGE_ME_IN_PRODUCTION
DB_NAME=chatapp

# Database (if using local postgres)
DATABASE_URL=postgres://chatapp:password@localhost:5432/chatapp

# JWT (use simple secrets for dev)
JWT_SECRET=dev_secret_for_local_testing_not_for_production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Frontend (point to local backend)
VITE_API_URL=http://localhost:3000
```

## Next Steps

- Read [SETUP.md](SETUP.md) for production deployment
- Read [CONFIGURATION.md](CONFIGURATION.md) for detailed configuration options
- Check project [ROADMAP](../.planning/ROADMAP.md) for upcoming features
- Join development discussions on GitHub

## Getting Help

- **Documentation issues**: Check docs/ folder first
- **Development questions**: Open GitHub Discussion
- **Bugs**: Open GitHub Issue with reproduction steps
- **Feature ideas**: Open GitHub Discussion first
