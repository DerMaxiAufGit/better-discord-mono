# Setup Guide

This guide walks you through deploying the self-hosted communication platform using Docker Compose.

## Prerequisites

Before starting, ensure you have:

- **Docker** 20.10+ installed ([Get Docker](https://docs.docker.com/get-docker/))
- **Docker Compose** 2.0+ installed (included with Docker Desktop)
- **2GB RAM** minimum (4GB recommended)
- **Available Ports**:
  - Port 80 (frontend/nginx)
  - Port 3000 (backend API)

### Verify Docker Installation

```bash
docker --version
docker compose version
```

You should see version numbers for both commands.

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd better-discord-mono
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

**CRITICAL**: Edit `.env` and set these values:

```bash
# Generate a secure JWT secret (64+ characters recommended)
openssl rand -base64 64

# Generate a TURN secret (required for TURN auth)
openssl rand -hex 32

# Then update .env:
JWT_SECRET=<paste-generated-secret-here>
DB_PASSWORD=<choose-strong-database-password>
CORS_ORIGIN=http://localhost,http://127.0.0.1
TURN_SECRET=<paste-generated-turn-secret-here>
TURN_REALM=localhost
TURN_HOST=localhost
```

`CORS_ORIGIN` is required when backend runs in production mode. If it is empty, backend startup fails fast.

**Security Warning**: Never commit `.env` to version control. The `.gitignore` already excludes it.

For detailed configuration options, see [CONFIGURATION.md](CONFIGURATION.md)

### 3. Start the Application

```bash
docker compose up -d
```

This command will:
1. Pull required Docker images (postgres, node)
2. Build the backend and frontend containers
3. Initialize the PostgreSQL database
4. Start all services with health checks

**Expected output:**
```
[+] Running 5/5
 ✔ Network better-discord-mono_default    Created
 ✔ Container better-discord-mono-postgres-1   Started
 ✔ Container better-discord-mono-backend-1    Started
 ✔ Container better-discord-mono-frontend-1   Started
 ✔ Container better-discord-mono-coturn-1     Started
```

### 4. Wait for Health Checks

The application uses health checks to ensure services start in the correct order:
- PostgreSQL must be ready before backend starts
- Backend API must be healthy before frontend starts

**Wait 60 seconds** after `docker compose up -d` for all health checks to pass.

Check service health status:

```bash
docker compose ps
```

All services should show `healthy` in the STATUS column:

```
NAME                               STATUS
better-discord-mono-postgres-1     Up (healthy)
better-discord-mono-backend-1      Up (healthy)
better-discord-mono-frontend-1     Up (healthy)
better-discord-mono-coturn-1       Up
```

Note: `coturn` may show `unhealthy` if TURN env values are missing or invalid.

### 5. Access the Application

Open your browser and navigate to:

```
http://localhost
```

You should see the login page. Click "Sign up" to create your first account.

## Verification Steps

### Test Authentication Flow

1. **Sign Up**:
   - Navigate to http://localhost/signup
   - Enter email and password (8+ chars, mixed case, number required)
   - Watch password strength meter
   - Submit form
   - Verify redirect to dashboard

2. **Session Persistence**:
   - Refresh the page (F5 or Ctrl+R)
   - Verify you're still logged in
   - Close browser completely
   - Reopen and visit http://localhost
   - Verify you're still logged in (7-day session)

3. **Theme Toggle**:
   - Click sun/moon icon in sidebar
   - Verify theme switches between light and dark
   - Refresh page
   - Verify theme persists

4. **Logout**:
   - Click "Logout" in sidebar
   - Verify redirect to login page
   - Try accessing http://localhost/dashboard
   - Verify redirect back to login (protected route)

5. **Login**:
   - Enter your credentials
   - Verify successful login and redirect to dashboard

## Troubleshooting

### Services Not Starting

**Problem**: `docker compose ps` shows services as "unhealthy" or "starting"

**Solution**:
```bash
# Check logs for specific service
docker compose logs postgres
docker compose logs backend
docker compose logs frontend

# Common issue: Database not ready yet
# Wait 60 seconds, then check again
docker compose ps
```

### Port Already in Use

**Problem**: Error message "port is already allocated"

**Solution**:
```bash
# Check what's using the port
# On Linux/Mac:
sudo lsof -i :80
sudo lsof -i :3000

# On Windows:
netstat -ano | findstr :80
netstat -ano | findstr :3000

# Stop the conflicting service or change ports in docker-compose.yml
```

### Cannot Connect to Database

**Problem**: Backend logs show "Connection refused" or "database does not exist"

**Solution**:
```bash
# Restart services to reinitialize database
docker compose down -v  # WARNING: Deletes all data
docker compose up -d

# Wait 60 seconds for initialization
```

### 502 Bad Gateway

**Problem**: Browser shows "502 Bad Gateway" error

**Solution**:
```bash
# Backend service likely not healthy yet
docker compose ps  # Check backend status
docker compose logs backend  # Check for errors

# If backend shows errors, rebuild:
docker compose down
docker compose up --build -d
```

### Frontend Shows Connection Error

**Problem**: Frontend loads but API calls fail

**Solution**:
1. Verify `VITE_API_URL=/api` in `.env`
2. Check backend is running: `curl http://localhost:3000/health`
3. Restart services: `docker compose restart`

## Updating the Application

To update to the latest version:

```bash
# Pull latest code
git pull origin main

# Rebuild and restart containers
docker compose down
docker compose up --build -d

# Wait 60 seconds for health checks
docker compose ps
```

**Note**: Database data persists in Docker volumes. To start fresh:

```bash
docker compose down -v  # WARNING: Deletes all user data
docker compose up -d
```

## Stopping the Application

### Temporary Stop (preserves data)

```bash
docker compose stop
```

### Complete Shutdown (preserves data)

```bash
docker compose down
```

### Complete Removal (deletes all data)

```bash
docker compose down -v  # Removes volumes with database data
```

## Production Deployment Notes

For production deployments:

1. **Use HTTPS**: Add SSL/TLS certificates to nginx configuration
2. **Change Default Secrets**: Generate new JWT_SECRET, DB_PASSWORD, and TURN_SECRET
3. **Backup Database**: Set up automated PostgreSQL backups
4. **Resource Limits**: Configure container memory/CPU limits in docker-compose.yml
5. **Monitoring**: Add logging and monitoring solutions
6. **Firewall**: Restrict port 3000 to localhost only (nginx proxy handles external traffic)
7. **Set Explicit Origins/Relay**: Configure CORS_ORIGIN, TURN_REALM, and TURN_HOST for your domain

See [CONFIGURATION.md](CONFIGURATION.md) for production environment variable recommendations.

## Next Steps

- Read [CONFIGURATION.md](CONFIGURATION.md) to understand all configuration options
- Read [DEVELOPMENT.md](DEVELOPMENT.md) if you want to contribute or develop locally
- Start using the application and create user accounts

## Getting Help

If you encounter issues not covered here:
1. Check the logs: `docker compose logs`
2. Search existing issues on GitHub
3. Open a new issue with logs and steps to reproduce
