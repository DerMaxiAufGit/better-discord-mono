# Configuration Guide

This document describes all environment variables and configuration options for the self-hosted communication platform.

## Environment Variables

All configuration is done via the `.env` file in the project root. Copy `.env.example` to `.env` and customize as needed.

### Database Configuration

#### `DB_USER`
- **Description**: PostgreSQL database username
- **Default**: `chatapp`
- **Required**: Yes
- **Production Notes**: Can keep default value if using Docker (database is isolated)

#### `DB_PASSWORD`
- **Description**: PostgreSQL database password
- **Default**: `CHANGE_ME_IN_PRODUCTION`
- **Required**: Yes
- **Production Notes**: **MUST CHANGE** for production deployments
- **Recommendation**: Use 32+ character random string
- **Generate**: `openssl rand -base64 32`

#### `DB_NAME`
- **Description**: PostgreSQL database name
- **Default**: `chatapp`
- **Required**: Yes
- **Production Notes**: Can keep default value if running single instance

### JWT Configuration

The application uses JSON Web Tokens (JWT) for authentication with a dual-token strategy:
- **Access tokens**: Short-lived (15 minutes), stored in localStorage
- **Refresh tokens**: Long-lived (7 days), stored in httpOnly cookies

#### `JWT_SECRET`
- **Description**: Secret key used to sign and verify JWT tokens
- **Default**: `CHANGE_ME_USE_LONG_RANDOM_STRING`
- **Required**: Yes
- **Security**: **CRITICAL** - Must be changed for production
- **Recommendation**: Use 64+ character random string for maximum security
- **Generate**: `openssl rand -base64 64`
- **Warning**: Changing this value will invalidate all existing user sessions

#### `JWT_ACCESS_EXPIRY`
- **Description**: Lifetime of access tokens
- **Default**: `15m` (15 minutes)
- **Format**: Use format like `15m`, `1h`, `30s` (minutes, hours, seconds)
- **Recommended Range**: 5m to 30m
- **Production Notes**:
  - Shorter = more secure (tokens expire faster)
  - Longer = fewer refresh requests (better performance)
  - 15m is a good security/UX balance

#### `JWT_REFRESH_EXPIRY`
- **Description**: Lifetime of refresh tokens (sliding window)
- **Default**: `7d` (7 days)
- **Format**: Use format like `7d`, `24h`, `30d` (days, hours)
- **Recommended Range**: 7d to 30d
- **Production Notes**:
  - Active users stay logged in indefinitely (sliding window)
  - Inactive users are logged out after this period
  - 7d means users must interact at least weekly

### Frontend Configuration

#### `VITE_API_URL`
- **Description**: API endpoint URL for frontend to connect to backend
- **Default**: `/api` (for Docker Compose with nginx proxy)
- **Required**: Yes
- **Options**:
  - `/api` - For production Docker deployment (nginx proxies /api to backend)
  - `http://localhost:3000` - For local development (direct backend connection)
- **Production Notes**: Keep as `/api` when using docker-compose.yml
- **Development Notes**: Change to `http://localhost:3000` when running frontend/backend separately

## Configuration Examples

### Development Environment

```bash
# .env for local development
DB_USER=chatapp
DB_PASSWORD=dev_password_123
DB_NAME=chatapp

JWT_SECRET=dev_secret_not_for_production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

VITE_API_URL=http://localhost:3000
```

### Production Environment

```bash
# .env for production deployment
DB_USER=chatapp
DB_PASSWORD=<generate-with-openssl-rand-base64-32>
DB_NAME=chatapp

JWT_SECRET=<generate-with-openssl-rand-base64-64>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

VITE_API_URL=/api
```

## Docker Compose Configuration

The `docker-compose.yml` file uses environment variables from `.env` to configure services.

### Service Ports

By default:
- **Frontend (nginx)**: Port 80
- **Backend (Fastify)**: Port 3000 (exposed to host)
- **PostgreSQL**: Port 5432 (internal only, not exposed to host)

To change ports, edit `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Change 8080 to desired port

  backend:
    ports:
      - "4000:3000"  # Change 4000 to desired port
```

**Important**: If you change the backend port, also update `VITE_API_URL` if using direct connection.

### Health Checks

Services use health checks to ensure proper startup order:

1. **PostgreSQL**: Checks `pg_isready` every 10s
2. **Backend**: Checks `/health` endpoint every 10s
3. **Frontend**: Checks nginx every 30s

Health check intervals and timeouts can be adjusted in `docker-compose.yml`.

### Resource Limits

By default, no resource limits are set. For production, add limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          memory: 256M
```

## Security Best Practices

### Required for Production

1. **Change all default secrets**:
   - Generate new `JWT_SECRET` (64+ chars)
   - Generate new `DB_PASSWORD` (32+ chars)

2. **Use HTTPS**:
   - Configure SSL/TLS certificates in nginx
   - Never serve over plain HTTP in production

3. **Firewall Configuration**:
   - Only expose port 80/443 (nginx)
   - Keep port 3000 (backend) and 5432 (postgres) internal
   - Consider using Docker network isolation

### Recommended for Production

1. **Token Expiry**:
   - Keep `JWT_ACCESS_EXPIRY` at 15m or less
   - Set `JWT_REFRESH_EXPIRY` based on your security requirements

2. **Database Backups**:
   - Set up automated PostgreSQL backups
   - Store backups in secure, separate location

3. **Monitoring**:
   - Configure logging for all services
   - Set up alerts for service health failures

4. **Updates**:
   - Regularly update Docker images
   - Keep dependencies up to date

## Environment Variable Security

### Do NOT Commit

The `.env` file contains secrets and should **NEVER** be committed to version control.

Verify it's in `.gitignore`:
```bash
grep "^\.env$" .gitignore
```

### Backup Safely

When backing up your deployment:
- Store `.env` in secure password manager or encrypted storage
- Never include `.env` in public backups or repositories

### Rotating Secrets

To rotate `JWT_SECRET` (requires all users to log in again):

1. Stop the application: `docker compose down`
2. Generate new secret: `openssl rand -base64 64`
3. Update `JWT_SECRET` in `.env`
4. Start application: `docker compose up -d`
5. All users must log in again (existing sessions invalid)

To rotate `DB_PASSWORD`:

1. Stop the application: `docker compose down -v` (WARNING: deletes database)
2. Update `DB_PASSWORD` in `.env`
3. Start application: `docker compose up -d`
4. Database will reinitialize with new password

## Troubleshooting Configuration Issues

### Environment Variables Not Loading

**Symptom**: Application uses default values instead of `.env` values

**Solution**:
- Ensure `.env` is in project root (same directory as `docker-compose.yml`)
- Check file is named exactly `.env` (not `.env.txt`)
- Restart containers: `docker compose down && docker compose up -d`

### JWT Token Errors

**Symptom**: "Invalid token" or "Token verification failed" errors

**Solution**:
- Verify `JWT_SECRET` is the same in `.env` and backend container
- Check `JWT_SECRET` doesn't contain spaces or special characters that need escaping
- Restart backend: `docker compose restart backend`

### Database Connection Failed

**Symptom**: Backend logs show "Connection refused" or authentication errors

**Solution**:
- Verify `DB_USER`, `DB_PASSWORD`, and `DB_NAME` match in `.env`
- Check PostgreSQL container is healthy: `docker compose ps`
- View PostgreSQL logs: `docker compose logs postgres`

### Frontend API Connection Failed

**Symptom**: Frontend shows "Network Error" or can't reach backend

**Solution**:
- Verify `VITE_API_URL=/api` in `.env`
- Rebuild frontend (URL is baked into build): `docker compose up --build frontend`
- Check nginx is proxying correctly: `docker compose logs frontend`

## Advanced Configuration

### Custom Domain

To use a custom domain:

1. Point your domain's DNS to your server's IP
2. Configure nginx with your domain in `frontend/nginx.conf`
3. Set up SSL certificates (Let's Encrypt recommended)
4. Update `VITE_API_URL` to use your domain if needed

### Reverse Proxy (Cloudflare, etc.)

If using an external reverse proxy:

1. Configure proxy to forward to port 80
2. Enable WebSocket support (required for future messaging features)
3. Ensure `X-Forwarded-*` headers are preserved
4. Consider using port 443 for HTTPS at proxy level

### Multiple Instances

To run multiple instances on one server:

1. Copy project to separate directories
2. Change ports in each instance's `docker-compose.yml`
3. Use separate `.env` files with different secrets
4. Consider separate PostgreSQL instances for data isolation

## Next Steps

- Return to [SETUP.md](SETUP.md) for deployment instructions
- See [DEVELOPMENT.md](DEVELOPMENT.md) for local development configuration
