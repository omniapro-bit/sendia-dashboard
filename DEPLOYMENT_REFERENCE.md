# Sendia Dashboard - Deployment Reference Card

## Quick Commands

### First Deploy
```bash
cd /opt/sendia-dashboard
cp .env.prod.example .env.prod
nano .env.prod  # Add your Supabase keys
./deploy.sh
```

### Regular Deploy
```bash
cd /opt/sendia-dashboard && ./deploy.sh
```

### Monitor
```bash
docker logs -f sendia-dashboard
docker stats sendia-dashboard
docker inspect sendia-dashboard | grep -A 5 Health
```

### Test
```bash
curl http://localhost:3001/health
curl https://app.getsendia.com
```

---

## File Manifest

| File | Purpose | Size |
|------|---------|------|
| `Dockerfile` | Multi-stage Next.js build | 1.3K |
| `deploy.sh` | Deployment automation | 4.7K |
| `.dockerignore` | Build optimization | 344B |
| `.env.prod.example` | Config template | 580B |
| `src/app/health/route.ts` | Health endpoint | 850B |

---

## Deployment Flow (from deploy.sh)

```
┌─────────────────────────────────┐
│  1. Pull Latest Code            │
│  $ git pull origin main          │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  2. Build Docker Image          │
│  $ docker build -t ...          │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  3. Stop Old Container          │
│  $ docker stop ...              │
│  $ docker rm ...                │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  4. Load .env.prod & Run        │
│  $ docker run -d ...            │
│  -e NEXT_PUBLIC_*               │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  5. Health Check                │
│  GET /health (30s timeout)      │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  6. Verify & Report             │
│  Display logs & Caddy config    │
└─────────────────────────────────┘
```

---

## Docker Image Layers

```
sendia-dashboard:latest
├── Base: node:22-alpine
├── Stage 1 [deps]: Install prod dependencies
│   └── npm ci --only=production
├── Stage 2 [builder]: Build Next.js app
│   ├── npm ci (all deps)
│   └── npm run build
└── Stage 3 [runner]: Production image
    ├── Copy .next, node_modules, package.json
    ├── Create nextjs user (non-root)
    ├── Setup health check
    └── CMD: npm start -p 3001
```

---

## Environment Variables

**Passed at runtime from `.env.prod`:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://mhfuellvcjtlyehldqja.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_BASE=https://api.getsendia.com
NODE_ENV=production
```

**Accessed in app:**
```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
process.env.NEXT_PUBLIC_API_BASE
```

---

## Network & Ports

```
┌──────────────────────────────────────┐
│          Internet (HTTPS)            │
│     app.getsendia.com (Caddy)        │
└──────────────┬───────────────────────┘
               ↓
       ┌───────────────┐
       │  n8n-caddy-1  │ (port 80, 443)
       │  (reverse     │
       │   proxy)      │
       └───────────────┘
               ↓
    ┌──────────────────────┐
    │  n8n_default network │
    └──────────────────────┘
         ↓
    ┌──────────────────────┐
    │ sendia-dashboard:3001│
    │ (Next.js app)        │
    └──────────────────────┘
```

---

## Health Check Details

**Endpoint:** `GET /health`

**Location:** `src/app/health/route.ts`

**Response (Healthy 200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-25T10:30:00.000Z",
  "uptime": 120.5
}
```

**Response (Unhealthy 503):**
```json
{
  "status": "unhealthy",
  "error": "Error message",
  "timestamp": "2026-03-25T10:30:00.000Z"
}
```

**Docker Health Configuration:**
- Interval: 30 seconds
- Timeout: 10 seconds
- Startup grace: 5 seconds
- Retries: 3 failures to mark unhealthy

---

## Caddy Configuration Change

**Before (Static Files):**
```
app.getsendia.com {
  root * /srv/site
  try_files {path} /dashboard.html
  file_server
}
```

**After (Reverse Proxy):**
```
app.getsendia.com {
  reverse_proxy sendia-dashboard:3001
}
```

**Reload Command:**
```bash
docker exec n8n-caddy-1 caddy reload -c /etc/caddy/Caddyfile
```

---

## Key Metrics

| Metric | Value |
|--------|-------|
| **Base Image Size** | ~50 MB (node:22-alpine) |
| **Final Image Size** | ~150-200 MB |
| **Build Time** | 2-5 minutes (first), 1-2 min (subsequent with cache) |
| **Container Memory** | ~150-250 MB at idle |
| **Startup Time** | 5-15 seconds to healthy |
| **Port** | 3001 (internal) / 443 (Caddy) |
| **Health Check Period** | Every 30 seconds |

---

## Troubleshooting Matrix

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Container won't start | `docker logs sendia-dashboard` | Check build errors, .env.prod |
| Port conflict | `docker ps -a \| grep 3001` | Stop conflicting container |
| Health check fails | Wait 30s OR `curl http://localhost:3001/health` | Container may still be starting |
| Env vars missing | `docker exec sendia-dashboard env \| grep NEXT` | Verify .env.prod exists and is sourced |
| Caddy not proxying | `docker logs n8n-caddy-1` | Reload: `docker exec n8n-caddy-1 caddy reload` |
| Build too slow | Check `docker build -t ...` output | Large deps? Enable build cache |

---

## Security Checklist

- [x] Container runs as non-root user (nextjs)
- [x] Secrets in .env.prod (gitignored)
- [x] No hardcoded secrets in code
- [x] Health checks enabled
- [x] Network isolation (n8n_default only)
- [x] HTTPS via Caddy TLS termination
- [x] Auto-restart on failure
- [x] Proper signal handling

---

## Performance Checklist

- [x] Multi-stage Docker build
- [x] Alpine base image (small)
- [x] Production dependencies only in final image
- [x] Next.js build optimization
- [x] Health checks for auto-recovery
- [x] Restart policy for resilience
- [x] Stats monitoring available

---

## Standard Deployment Checklist

- [ ] Edit `.env.prod` with actual secrets
- [ ] Run `./deploy.sh`
- [ ] Verify health: `docker inspect sendia-dashboard | grep -A 5 Health`
- [ ] Check logs: `docker logs sendia-dashboard`
- [ ] Update Caddy config in `/opt/n8n/Caddyfile`
- [ ] Reload Caddy: `docker exec n8n-caddy-1 caddy reload`
- [ ] Test public URL: `curl https://app.getsendia.com`
- [ ] Monitor: `docker logs -f sendia-dashboard`

---

## Useful Docker Commands

```bash
# View running container
docker ps -f name=sendia-dashboard

# View all containers (including stopped)
docker ps -a -f name=sendia-dashboard

# View logs (last 50 lines)
docker logs --tail 50 sendia-dashboard

# Follow logs in real-time
docker logs -f sendia-dashboard

# View health status
docker inspect sendia-dashboard | grep -A 5 Health

# Check environment inside container
docker exec sendia-dashboard env | grep NEXT_PUBLIC

# Test health endpoint inside container
docker exec sendia-dashboard curl http://localhost:3001/health

# View resource usage
docker stats sendia-dashboard

# Enter container shell
docker exec -it sendia-dashboard sh

# Stop container
docker stop sendia-dashboard

# Remove container
docker rm sendia-dashboard

# View image details
docker images sendia-dashboard

# Remove old images
docker image prune -a
```

---

## VPS Directory Structure

```
/opt/
├── sendia-api/              # Backend API (port 3500)
│   ├── deploy.sh
│   ├── Dockerfile
│   └── .env.prod
├── sendia-dashboard/        # Next.js Dashboard (port 3001)
│   ├── deploy.sh
│   ├── Dockerfile
│   ├── .env.prod
│   └── src/app/health/route.ts
├── n8n/                     # n8n automation (port 5678)
│   ├── docker-compose.yml
│   └── Caddyfile            # Reverse proxy for all services
└── getsendia-site/          # Landing page (static)
```

---

## Support Resources

| Resource | Path |
|----------|------|
| Quick Start | `QUICKSTART.md` |
| Full Guide | `DEPLOYMENT.md` |
| Troubleshooting | `DEPLOYMENT.md` (Troubleshooting section) |
| This Reference | `DEPLOYMENT_REFERENCE.md` |

---

**Status**: Production Ready
**Last Updated**: 2026-03-25
**Next Review**: Monthly
