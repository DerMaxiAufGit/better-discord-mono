# Self-Hosted Communication Platform

A self-hostable, end-to-end encrypted communication platform for messaging and calls. Own your server, your data, your rules.

## Features

### Current State (as of February 24, 2026)
- **Authentication & Sessions**: Signup/login, JWT auth, refresh tokens, protected routes
- **Messaging**: End-to-end encrypted direct messaging with real-time delivery and reconnect handling
- **Calls**: WebRTC voice and video calling with TURN integration support
- **Groups & Social Layer**: Group messaging, friend requests, presence, avatars, user blocking
- **Interaction & Media**: Typing indicators, message reactions, message search, file uploads
- **Deployment**: Docker Compose stack with frontend, backend, Postgres, and coturn services

### About-To-Be Plans (Roadmap-Aligned)
- **v2.0.0 Advanced Features (planned)**:
  - Voice channels (group calls)
  - Screen sharing
  - Push notifications
  - Desktop app (Electron)
  - Mobile app (React Native)

## Install (Docker)

### Prerequisites
- Docker and Docker Compose installed
- 2GB RAM minimum
- Ports 80 and 3000 available (backend port can be changed via `BACKEND_PORT`)

### Deploy in 4 Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd better-discord-mono
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and change at minimum:
   # - DB_PASSWORD
   # - JWT_SECRET
   # - CORS_ORIGIN
   # - TURN_SECRET (for WebRTC)
   # - TURN_REALM
   # - TURN_HOST
   ```

3. **Start the application**
   ```bash
   docker compose up -d
   ```

4. **Open the app**
   Wait ~60 seconds for health checks, then visit **http://localhost**

For detailed instructions, see [docs/SETUP.md](docs/SETUP.md)

### Database Setup
- The database runs as a Postgres container and is initialized automatically from `postgres/init.sql`.
- DB credentials come from `.env` (`DB_USER`, `DB_PASSWORD`, `DB_NAME`).
- Data is persisted in the Docker volume `postgres_data`.

**Reset the database (erases all data):**
```bash
docker compose down -v
docker compose up -d
```

### Ports
- Frontend: `http://localhost` (port 80)
- Backend API: `http://localhost:3000` (change with `BACKEND_PORT`)

## Documentation

- **[Setup Guide](docs/SETUP.md)** - Step-by-step deployment instructions
- **[Configuration](docs/CONFIGURATION.md)** - Environment variables and settings
- **[Development](docs/DEVELOPMENT.md)** - Local development setup

## Architecture

```
┌─────────────┐
│   Nginx     │  Port 80 (Frontend + API proxy)
└──────┬──────┘
       │
   ┌───┴────┐
   │        │
┌──▼──┐  ┌──▼──────┐
│React│  │ Fastify │  Port 3000 (API)
│ Vite│  │ Backend │
└─────┘  └────┬────┘
              │
         ┌────▼────────┐
         │ PostgreSQL  │
         │   18-alpine │
         └─────────────┘
```

### Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Fastify, TypeScript, PostgreSQL, JWT authentication
- **Database**: PostgreSQL 18
- **Deployment**: Docker Compose, Nginx reverse proxy

## Security Features

- **Password Security**: bcrypt with 12 salt rounds
- **Token Strategy**: Short-lived access tokens (15m), long-lived refresh tokens (7d)
- **Cookie Protection**: httpOnly, sameSite strict flags
- **XSS Protection**: Refresh tokens never accessible to JavaScript
- **User Enumeration Prevention**: Generic error messages for login failures

## Project Status

This project is in active development.

**What's Working:**
- v1.0.0 **Foundation & Core Features**: completed
- v1.1.0 **Enhanced Communication**: completed
- v1.2.0 **Social Features**: currently in progress/stabilization

**What's Coming:**
- v2.0.0 **Advanced Features**:
  - Voice channels (group calls)
  - Screen sharing
  - Push notifications
  - Desktop app (Electron)
  - Mobile app (React Native)

## Development

To set up a local development environment (without Docker), see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## License

[Add license information]

## Contributing

[Add contribution guidelines]

## Support

For issues and questions:
- **Documentation**: Check docs/ folder
- **Issues**: [GitHub Issues]
- **Discussions**: [GitHub Discussions]

---

**Core Value**: Own your communication. Your server, your data, your rules. Privacy through self-hosting and E2E encryption.
