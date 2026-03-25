# Sendia Dashboard - Deployment Guide

This document describes how to deploy the Next.js 15 dashboard to the VPS.

## Files Overview

- **Dockerfile** - Multi-stage Docker build for Next.js 15 (deps, builder, runner)
- **deploy.sh** - Automated deployment script
- **.env.prod.example** - Environment variables template
- **.env.prod** - Actual production environment variables (gitignored, created on VPS)

## Prerequisites

### Local Development
- Node.js 22+ installed
- Git repository configured with GitHub PAT for private repos

### VPS Setup (46.225.239.79)
- Docker and Docker Compose installed
- Directory `/opt/sendia-dashboard/` exists
- Git repository cloned: `https://github.com/omniapro-bit/sendia-dashboard` (assuming private repo)
- `.env.prod` file created with production secrets
- Network `n8n_default` already exists (shared with API container)
- Caddy reverse proxy running in Docker

## Initial Setup on VPS

### 1. Clone Repository
```bash
cd /opt
git clone https://github.com/omniapro-bit/sendia-dashboard.git
cd sendia-dashboard
```

### 2. Create Environment File
```bash
# Copy the example and fill in actual values
cp .env.prod.example .env.prod

# Edit with production secrets
nano .env.prod
```

Required variables in `.env.prod`:
```
NEXT_PUBLIC_SUPABASE_URL=https://mhfuellvcjtlyehldqja.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<actual-anon-key>
NEXT_PUBLIC_API_BASE=https://api.getsendia.com
```

### 3. Set Permissions
```bash
chmod +x deploy.sh
```

## Deployment Process

### Quick Deploy
```bash
cd /opt/sendia-dashboard
./deploy.sh
```

This script will:
1. Pull latest code from GitHub (main or master branch)
2. Build Docker image from Dockerfile
3. Stop and remove old container
4. Start new container with environment variables
5. Perform health checks
6. Display logs and Caddy configuration reminder

### Manual Deployment (if needed)
```bash
cd /opt/sendia-dashboard

# Pull latest code
git pull

# Build image
docker build -t sendia-dashboard:latest .

# Stop old container
docker stop sendia-dashboard 2>/dev/null || true
docker rm sendia-dashboard 2>/dev/null || true

# Load env and start new container
set -a
source .env.prod
set +a

docker run -d \
  --name sendia-dashboard \
  --network n8n_default \
  -p 3001:3001 \
  -e NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -e NEXT_PUBLIC_API_BASE="$NEXT_PUBLIC_API_BASE" \
  -e NODE_ENV=production \
  --restart unless-stopped \
  sendia-dashboard:latest

# Check health
docker ps -f name=sendia-dashboard
docker logs -f sendia-dashboard
```

## Caddy Reverse Proxy Configuration

### Update Caddyfile

Edit `/opt/n8n/Caddyfile` and replace the `app.getsendia.com` block:

**OLD (static file serving):**
```
app.getsendia.com {
  root * /srv/site
  try_files {path} /dashboard.html
  file_server
}
```

**NEW (reverse proxy to Next.js container):**
```
app.getsendia.com {
  reverse_proxy sendia-dashboard:3001 {
    header_uri -Server
    header_down -X-Powered-By
    header_down -Server
  }
}
```

### Reload Caddy
```bash
# If Caddy is running in Docker (as part of n8n stack)
docker exec n8n-caddy-1 caddy reload -c /etc/caddy/Caddyfile

# Check Caddy logs
docker logs n8n-caddy-1
```

## Verification

### Check Container Status
```bash
# List running container
docker ps -f name=sendia-dashboard

# View health status
docker inspect sendia-dashboard | grep -A 5 Health

# Tail logs
docker logs -f sendia-dashboard
```

### Test Internal Connectivity
```bash
# From VPS shell
docker exec sendia-dashboard curl -s http://localhost:3001 | head -20

# Test health endpoint
docker exec sendia-dashboard curl -s http://localhost:3001/health
```

### Test Public Access
```bash
# From outside VPS
curl -I https://app.getsendia.com
curl https://app.getsendia.com | head -50
```

## Troubleshooting

### Container fails to start
```bash
# Check logs
docker logs sendia-dashboard

# Common issues:
# - Port 3001 already in use: docker ps -a | grep 3001
# - Network n8n_default doesn't exist: docker network ls
# - .env.prod file missing or malformed
```

### Health check failing
```bash
# Container is starting but not ready
# Wait 30-60 seconds for Next.js to boot

# Test manually
docker exec sendia-dashboard curl http://localhost:3001/
docker exec sendia-dashboard ps aux | grep next
```

### Supabase connection issues
```bash
# Check environment variables inside container
docker exec sendia-dashboard env | grep NEXT_PUBLIC

# Verify from browser console
# window.location.href for current URL
```

### Caddy not proxying correctly
```bash
# Test Caddy health
curl http://localhost:2019/health

# Check Caddy config syntax
docker exec n8n-caddy-1 caddy validate -c /etc/caddy/Caddyfile

# View Caddy access logs
docker logs n8n-caddy-1 | grep -i error
```

## Rollback

### To previous image
```bash
# List available images
docker images sendia-dashboard

# If previous image still exists:
docker stop sendia-dashboard
docker rm sendia-dashboard
docker run -d \
  --name sendia-dashboard \
  --network n8n_default \
  -p 3001:3001 \
  -e NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -e NEXT_PUBLIC_API_BASE="$NEXT_PUBLIC_API_BASE" \
  sendia-dashboard:<previous-tag>
```

### To previous code version
```bash
cd /opt/sendia-dashboard
git log --oneline | head -10
git checkout <commit-hash>
./deploy.sh
```

## Performance Monitoring

### Monitor container resource usage
```bash
docker stats sendia-dashboard
```

### Check for memory leaks
```bash
# Monitor over time
watch -n 5 'docker stats --no-stream sendia-dashboard'
```

### Review logs for errors
```bash
# Last 100 lines
docker logs --tail 100 sendia-dashboard

# Follow in real-time
docker logs -f sendia-dashboard

# Filter for errors
docker logs sendia-dashboard | grep -i error
```

## Environment Variables Reference

All `NEXT_PUBLIC_*` variables are exposed to the browser and should be considered public.

| Variable | Value | Type |
|----------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Public |
| `NEXT_PUBLIC_API_BASE` | Backend API base URL | Public |
| `NODE_ENV` | `production` | Internal |

## Security Best Practices

1. **Secrets Management**: Keep `.env.prod` outside version control (gitignored)
2. **Non-root User**: Container runs as `nextjs` user (UID 1001)
3. **Health Checks**: Enabled to auto-restart unhealthy containers
4. **Network Isolation**: Container on `n8n_default` network only
5. **Restart Policy**: `unless-stopped` for automatic recovery
6. **HTTPS Only**: Reverse proxy via Caddy (SSL/TLS termination)

## Logs and Debugging

### View deployment logs
```bash
# Last 50 lines
docker logs --tail 50 sendia-dashboard

# With timestamps
docker logs -t --tail 50 sendia-dashboard

# Since specific time
docker logs --since 2026-03-25T12:00:00 sendia-dashboard
```

### Check Next.js build output
```bash
# If build fails, check docker build output
docker build -t sendia-dashboard:latest . 2>&1 | tail -50
```

## Related Documentation

- Backend API deployment: `/opt/sendia-api/DEPLOYMENT.md`
- Caddy reverse proxy: `/opt/n8n/Caddyfile`
- Docker Compose setup: `/opt/n8n/docker-compose.yml`
