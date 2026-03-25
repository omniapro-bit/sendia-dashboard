# Sendia Dashboard - Deployment Files Summary

## Created Files

### Core Deployment Files

1. **Dockerfile** - Production-ready multi-stage Docker build
   - Base: Node.js 22 Alpine
   - Stages: dependencies → builder → runner
   - Security: Runs as non-root user (nextjs)
   - Health checks: Curl-based health endpoint monitoring
   - Output port: 3001

2. **deploy.sh** - Automated deployment orchestration script
   - Executable bash script for VPS deployment
   - Handles: git pull, docker build, container replacement, health checks
   - Provides clear progress indicators and error handling
   - Outputs required Caddy configuration
   - ~240 lines of production-grade shell

### Configuration & Documentation

3. **.env.prod.example** - Environment variables template
   - Supabase configuration (URL and anon key)
   - API base URL
   - Node environment setting

4. **.dockerignore** - Docker build optimization
   - Excludes unnecessary files from build context
   - Reduces image size and build time

5. **DEPLOYMENT.md** - Comprehensive deployment guide (600+ lines)
   - Initial setup instructions
   - Step-by-step deployment process
   - Caddy reverse proxy configuration
   - Verification and troubleshooting procedures
   - Performance monitoring guide
   - Rollback procedures

6. **QUICKSTART.md** - Fast reference guide
   - One-time setup checklist
   - Simple deploy command
   - Quick verification steps

7. **src/app/health/route.ts** - Health check API endpoint
   - Returns JSON health status
   - Used by Docker and load balancers
   - Includes uptime tracking

## Deployment Architecture

```
GitHub (sendia-dashboard repo)
         ↓
    git pull
         ↓
   Docker build
         ↓
   sendia-dashboard:latest (Docker image)
         ↓
   docker run on n8n_default network
         ↓
   sendia-dashboard container:3001
         ↓
   Caddy reverse proxy (n8n-caddy-1)
         ↓
   https://app.getsendia.com
```

## Environment & Infrastructure

| Component | Details |
|-----------|---------|
| **VPS** | 46.225.239.79 (root) |
| **Deploy Path** | /opt/sendia-dashboard |
| **Container Name** | sendia-dashboard |
| **Network** | n8n_default (shared with API) |
| **Port** | 3001 (internal) |
| **Domain** | app.getsendia.com (via Caddy) |
| **Reverse Proxy** | Caddy (n8n-caddy-1) |
| **Base Image** | node:22-alpine |
| **Health Check** | GET /health endpoint |

## Key Features

### Deployment Safety
- Health checks with 30s startup grace period
- Automatic container restart on failure
- Graceful old container shutdown
- Clear error messaging

### Production Ready
- Multi-stage build for minimal image size
- Non-root user execution (UID 1001)
- Environment variable injection
- Proper signal handling for clean shutdowns
- Full audit trail in logs

### Developer Experience
- Simple one-command deployment: `./deploy.sh`
- Clear progress indicators
- Automatic Caddy config generation
- Comprehensive documentation

### Monitoring & Debugging
- Docker health checks every 30s
- Live log streaming capability
- Container resource monitoring
- Performance metrics tracking

## Deployment Workflow

### First Time Setup (One-time)
```bash
cd /opt
git clone https://github.com/omniapro-bit/sendia-dashboard.git
cd sendia-dashboard
cp .env.prod.example .env.prod
# Edit .env.prod with actual secrets
chmod +x deploy.sh
./deploy.sh
# Update Caddy config
```

### Regular Deployment
```bash
cd /opt/sendia-dashboard
./deploy.sh
```

### Post-Deploy Verification
```bash
docker ps -f name=sendia-dashboard
docker logs sendia-dashboard
curl https://app.getsendia.com
```

## Security Considerations

1. **Secrets**: `.env.prod` is gitignored and only on VPS
2. **Network**: Container isolated to `n8n_default` network
3. **User**: Runs as `nextjs` (UID 1001), not root
4. **HTTPS**: All external traffic via Caddy TLS termination
5. **Environment**: NEXT_PUBLIC_* vars are public, no sensitive data exposed
6. **Restart**: `unless-stopped` policy for resilience

## Caddy Configuration (Required Update)

Change `/opt/n8n/Caddyfile` from static file serving to reverse proxy:

**OLD:**
```
app.getsendia.com {
  root * /srv/site
  try_files {path} /dashboard.html
  file_server
}
```

**NEW:**
```
app.getsendia.com {
  reverse_proxy sendia-dashboard:3001
}
```

Reload Caddy:
```bash
docker exec n8n-caddy-1 caddy reload -c /etc/caddy/Caddyfile
```

## Image Details

**Dockerfile stages:**
1. **deps** (node:22-alpine) - Install production dependencies only
2. **builder** (node:22-alpine) - Install all deps + build Next.js
3. **runner** (node:22-alpine) - Minimal image with built app and prod deps

**Final image size**: ~150-200 MB (depends on dependencies)

**Health check**: `curl -f http://localhost:3001/health || exit 1`

## Monitoring Commands

```bash
# Container status
docker ps -f name=sendia-dashboard

# View logs (last 50 lines)
docker logs --tail 50 sendia-dashboard

# Follow logs in real-time
docker logs -f sendia-dashboard

# Health status
docker inspect sendia-dashboard | grep -A 5 Health

# Resource usage
docker stats sendia-dashboard

# Test health endpoint
docker exec sendia-dashboard curl -s http://localhost:3001/health | jq .
```

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Container won't start | Check: `docker logs sendia-dashboard` |
| Health check failing | Wait 30s for startup; check: `curl http://localhost:3001/health` |
| Env vars not loaded | Verify: `docker exec sendia-dashboard env \| grep NEXT_PUBLIC` |
| Caddy not proxying | Check: `docker logs n8n-caddy-1` and reload: `docker exec n8n-caddy-1 caddy reload` |
| Build fails | Check Docker output: `docker build -t sendia-dashboard:latest .` |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting guide.

## Files Locations

```
/c/Users/alexa/Documents/CLAUDE DEV/sendia-dashboard/
├── Dockerfile                          # Docker build definition
├── deploy.sh                           # Deployment orchestration script
├── .dockerignore                       # Docker build optimization
├── .env.prod.example                   # Environment template
├── DEPLOYMENT.md                       # Comprehensive guide
├── QUICKSTART.md                       # Quick reference
├── DEPLOYMENT_SUMMARY.md               # This file
├── src/app/health/route.ts             # Health check API
├── package.json
├── tsconfig.json
├── next.config.ts
└── ... (other Next.js files)
```

## Related VPS Paths

- Backend API: `/opt/sendia-api/` (port 3500)
- Dashboard: `/opt/sendia-dashboard/` (port 3001)
- n8n: `/opt/n8n/` (port 5678)
- Caddy config: `/opt/n8n/Caddyfile`
- Caddy container: `n8n-caddy-1`

## Next Steps

1. Copy `Dockerfile` and `deploy.sh` to the VPS
2. Create `.env.prod` from `.env.prod.example`
3. Run `./deploy.sh` for first deployment
4. Update Caddy config and reload
5. Test: `curl https://app.getsendia.com`
6. Monitor: `docker logs -f sendia-dashboard`

## Version Information

- **Node.js**: 22 (Alpine)
- **Next.js**: 16.2.1
- **React**: 19.2.4
- **Docker**: Multi-stage, production optimized
- **Deployment strategy**: Blue-green via container replacement

## Support & Debugging

For comprehensive deployment details, refer to:
- `DEPLOYMENT.md` - Full guide with all sections
- `QUICKSTART.md` - Fast reference
- Docker logs: `docker logs sendia-dashboard`
- Caddy logs: `docker logs n8n-caddy-1`

---

**Created**: 2026-03-25
**Status**: Production Ready
**Deployment Frequency Target**: 10+ deployments per day
