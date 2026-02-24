# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Fastify API (TypeScript), auth, WebSocket, and data access.
- `frontend/`: React app (TypeScript) with Zustand stores and UI components.
- `postgres/`: DB init SQL.
- `docs/`: setup, development, and configuration guides.
- `docker-compose.yml`: primary runtime entrypoint.

## Build, Test, and Development Commands
- `docker compose up -d --build`: rebuild and restart all services.
- `docker compose up -d --build backend`: rebuild backend only.
- `docker compose up -d --build frontend`: rebuild frontend only.
- `npm run build` (in `backend/`): TypeScript compile for the API.
- `npm run build` (in `frontend/`): TypeScript + Vite production build.

This repo is Docker-first; run services via Compose instead of local node servers.

## Coding Style & Naming Conventions
- TypeScript throughout; prefer explicit types at module boundaries.
- 2-space indentation (match existing files).
- React components use `PascalCase`; hooks use `useX` naming.
- Backend routes/services use `camelCase` exports.
- No formatter/linter is enforced; keep changes consistent with nearby code.

## Testing Guidelines
- No dedicated test suite currently.
- Use `npm run build` in `backend/` and `frontend/` as the primary verification step.
- Name future tests by feature (e.g., `auth.test.ts`).

## Commit & Pull Request Guidelines
- Keep commit messages short and scoped (e.g., `security: harden auth and ws transport`).
- PRs should include:
  - Summary bullets
  - Test plan with commands run
  - Screenshots only if UI changes

## Security & Configuration Tips
- Copy `.env.example` to `.env` and set secrets (never commit `.env`).
- In production, set `JWT_SECRET` to a strong value and define `CORS_ORIGIN`.
- Prefer `VITE_API_URL=/api` when using the nginx proxy.

## Agent-Specific Instructions
- After any frontend or backend change, rebuild containers:
  - `docker compose up -d --build frontend`
  - `docker compose up -d --build backend`
  - or `docker compose up -d --build`
- Always provide the freshly rebuilt container after changes.
