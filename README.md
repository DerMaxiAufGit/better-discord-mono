# Self-Hosted Communication Platform

A self-hostable, end-to-end encrypted communication platform for messaging and calls. Own your server, your data, your rules.

## Features

### Current (Phase 1)
- **User Authentication**: Secure signup and login with JWT tokens
- **Session Persistence**: Stay logged in across browser restarts (7-day refresh tokens)
- **Theme Support**: Light and dark mode with system preference detection
- **Docker Deployment**: One-command deployment with Docker Compose
- **Security**: Bcrypt password hashing, httpOnly cookies, CORS protection

### Coming Soon
- **E2E Encrypted Messaging**: Private 1:1 messaging (Phase 2)
- **Voice/Video Calls**: P2P WebRTC calls with screen sharing (Phase 3)
- **Production Polish**: Mobile responsiveness, error handling, UX refinements (Phase 4)

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- 2GB RAM minimum
- Ports 80 and 3000 available

### Deploy in 3 Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd better-discord-mono
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and change JWT_SECRET and DB_PASSWORD
   ```

3. **Start the application**
   ```bash
   docker compose up -d
   ```

   Wait 60 seconds for health checks, then visit **http://localhost**

For detailed instructions, see [docs/SETUP.md](docs/SETUP.md)

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
│Next │  │ Backend │
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

This project is in active development. Phase 1 (Foundation & Deployment) is complete.

**What's Working:**
- Full authentication flow (signup, login, logout, session persistence)
- Theme toggle with persistence
- Docker-based deployment
- Protected routes and auth guards

**What's Coming:**
- E2E encrypted 1:1 messaging
- P2P voice and video calls
- Screen sharing
- Mobile-responsive UI

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
