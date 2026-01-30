# Project Instructions

## Development Workflow

**IMPORTANT:** This project runs in Docker containers. After making any code changes to frontend or backend, you MUST rebuild and restart the container:

```bash
# For frontend changes
docker compose up -d --build frontend

# For backend changes
docker compose up -d --build backend

# For both
docker compose up -d --build
```

Always provide the freshly rebuilt container to the user after making changes - do not wait for them to ask.
