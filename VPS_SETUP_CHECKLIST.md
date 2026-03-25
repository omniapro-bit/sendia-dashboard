# VPS Setup Checklist for Sendia Dashboard

Complete this checklist to prepare the VPS for dashboard deployment.

## Prerequisites (One-time)

### VPS Access
- [ ] SSH access to root@46.225.239.79
- [ ] SSH key configured locally
- [ ] Verify connection: `ssh root@46.225.239.79`

### VPS Services Running
- [ ] Docker installed: `docker --version`
- [ ] Docker Compose installed: `docker-compose --version`
- [ ] Caddy container running: `docker ps | grep caddy`
- [ ] n8n network exists: `docker network ls | grep n8n_default`

## Repository Setup

### Clone Dashboard Repository
```bash
cd /opt
git clone https://github.com/omniapro-bit/sendia-dashboard.git
cd sendia-dashboard
```

- [ ] Directory created: `/opt/sendia-dashboard/`
- [ ] Git repository initialized
- [ ] Main branch checked out
- [ ] Verify files exist:
  - [ ] `Dockerfile`
  - [ ] `deploy.sh`
  - [ ] `package.json`
  - [ ] `src/app/` directory
  - [ ] `.env.prod.example`

### Configure Git Credentials (if private repo)
```bash
# If GitHub PAT is configured globally, no additional setup needed
git config --global credential.helper store
# Or verify it's already set up for the VPS
```

- [ ] GitHub access configured
- [ ] Can pull from private repository
- [ ] Test: `git pull` successfully updates code

## Environment Configuration

### Create .env.prod File
```bash
cp /opt/sendia-dashboard/.env.prod.example /opt/sendia-dashboard/.env.prod
```

- [ ] `.env.prod` file created
- [ ] File location: `/opt/sendia-dashboard/.env.prod`
- [ ] File is NOT gitignored (verify with `git status`)

### Set Environment Variables
Edit `.env.prod` with actual values:

```bash
nano /opt/sendia-dashboard/.env.prod
```

```
NEXT_PUBLIC_SUPABASE_URL=https://mhfuellvcjtlyehldqja.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ACTUAL_ANON_KEY]
NEXT_PUBLIC_API_BASE=https://api.getsendia.com
```

- [ ] NEXT_PUBLIC_SUPABASE_URL is set
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY is set (real key, not example)
- [ ] NEXT_PUBLIC_API_BASE is set to `https://api.getsendia.com`
- [ ] File is readable by docker: `cat /opt/sendia-dashboard/.env.prod`

### Verify Environment File
```bash
source /opt/sendia-dashboard/.env.prod
echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "API Base: $NEXT_PUBLIC_API_BASE"
```

- [ ] All variables load without errors
- [ ] Values are correct

## Deploy Script Setup

### Make Script Executable
```bash
chmod +x /opt/sendia-dashboard/deploy.sh
```

- [ ] deploy.sh is executable: `ls -la /opt/sendia-dashboard/deploy.sh` shows `rwx`
- [ ] Verify script content: `head -5 /opt/sendia-dashboard/deploy.sh`

### Test Script Permissions
```bash
/opt/sendia-dashboard/deploy.sh --help 2>&1 | head -5
# Should show script output (or error about missing env var, not permission error)
```

- [ ] Script can be executed without permission errors

## Network Prerequisites

### Verify Docker Network
```bash
docker network ls | grep n8n_default
docker network inspect n8n_default
```

- [ ] n8n_default network exists
- [ ] Network can be inspected without errors
- [ ] Note: sendia-api container should already be on this network

### Verify Port Availability
```bash
netstat -tuln | grep 3001
docker ps -a --format '{{.Names}}' | xargs -I {} docker port {} 2>/dev/null | grep 3001
```

- [ ] Port 3001 is not in use
- [ ] No other container using port 3001
- [ ] Note: This is the internal container port, Caddy reverse proxy handles external

## First Deployment Test

### Run Deploy Script
```bash
cd /opt/sendia-dashboard
./deploy.sh
```

- [ ] Script completes without critical errors
- [ ] Container is created and started
- [ ] Health checks pass (see "healthy" status)
- [ ] Logs show no errors

### Verify Container Created
```bash
docker ps -f name=sendia-dashboard
```

- [ ] Container is running: `STATUS` shows "Up X seconds"
- [ ] Container name is `sendia-dashboard`
- [ ] Port mapping shows `3001:3001`

### Check Container Health
```bash
docker inspect sendia-dashboard | grep -A 5 Health
```

- [ ] Status is "healthy"
- [ ] No recent failures in log

### Test Health Endpoint
```bash
docker exec sendia-dashboard curl -s http://localhost:3001/health | head -10
```

- [ ] Returns valid JSON response
- [ ] Status is "healthy"
- [ ] No errors

### View Logs
```bash
docker logs sendia-dashboard | tail -20
```

- [ ] No error messages
- [ ] Shows "Ready in" or similar Next.js startup message
- [ ] No "ECONNREFUSED" or "EADDRINUSE" errors

## Caddy Reverse Proxy Configuration

### Update Caddyfile
Edit `/opt/n8n/Caddyfile`:

```bash
nano /opt/n8n/Caddyfile
```

**Replace the `app.getsendia.com` block** with:
```
app.getsendia.com {
  reverse_proxy sendia-dashboard:3001
}
```

- [ ] Old static file serving block is removed/commented
- [ ] New reverse proxy block added
- [ ] File saved without syntax errors

### Test Caddyfile Syntax
```bash
docker exec n8n-caddy-1 caddy validate -c /etc/caddy/Caddyfile
```

- [ ] Validation succeeds: "Valid configuration"
- [ ] No syntax errors

### Reload Caddy
```bash
docker exec n8n-caddy-1 caddy reload -c /etc/caddy/Caddyfile
```

- [ ] Reload succeeds without errors
- [ ] See success message from Caddy

### Verify Caddy Configuration
```bash
docker logs n8n-caddy-1 | tail -10
```

- [ ] No error messages about sendia-dashboard
- [ ] Should show "WARNING: No servers defined for" can be ignored if proxy is running

## Public Access Verification

### Test via curl from VPS
```bash
curl -I https://app.getsendia.com
```

- [ ] HTTP 200 or 30x response (not 502/503)
- [ ] Headers show content from Next.js (not Caddy static files)
- [ ] Should see "Content-Type: text/html" or similar

### Test via curl from Local Machine
```bash
curl -I https://app.getsendia.com
```

- [ ] HTTP 200 response from external network
- [ ] Same result as VPS-based test

### Test with Browser
```
Visit: https://app.getsendia.com
```

- [ ] Page loads without timeout
- [ ] No 502 Bad Gateway or similar errors
- [ ] Can see Supabase login/auth UI
- [ ] No blank white page (would indicate build issue)

### Monitor Real-time Requests
```bash
docker logs -f n8n-caddy-1 | grep "app.getsendia.com"
docker logs -f sendia-dashboard
```

- [ ] See HTTP requests in Caddy logs
- [ ] See corresponding logs in dashboard container
- [ ] No 500 errors in dashboard logs

## Post-Deployment Checks

### Container Monitoring
```bash
docker stats sendia-dashboard --no-stream
```

- [ ] Memory usage < 500 MB
- [ ] CPU usage reasonable (not constantly high)
- [ ] No errors in output

### Log Analysis
```bash
docker logs --since 1m sendia-dashboard | grep -i error
```

- [ ] No errors in recent logs
- [ ] All startup messages are informational

### Health Check Status
```bash
docker inspect sendia-dashboard --format='{{json .State.Health}}' | jq
```

- [ ] Status is "healthy"
- [ ] FailingStreak is 0
- [ ] SuccessCount is > 0

## Documentation & Runbooks

- [ ] All team members have access to:
  - [ ] `QUICKSTART.md` for regular deployments
  - [ ] `DEPLOYMENT.md` for detailed procedures
  - [ ] `DEPLOYMENT_REFERENCE.md` for quick commands
  - [ ] This checklist for future setups

- [ ] Updated internal documentation with:
  - [ ] Dashboard deployment procedure
  - [ ] VPS infrastructure diagram
  - [ ] Emergency contacts
  - [ ] Rollback procedures

## Emergency Procedures

### Test Rollback Scenario
```bash
# Practice stopping container
docker stop sendia-dashboard
docker ps | grep sendia-dashboard

# Practice restarting
docker start sendia-dashboard
docker logs sendia-dashboard | tail -5
```

- [ ] Can successfully stop container
- [ ] Can successfully start container
- [ ] Container recovers properly

### Test Restart Policy
```bash
# Kill container to test auto-restart
docker kill sendia-dashboard

# Wait 5 seconds
sleep 5

# Verify auto-restarted
docker ps -f name=sendia-dashboard
```

- [ ] Container auto-restarts after being killed
- [ ] Restart policy working ("unless-stopped")

### Test Health Check Recovery
```bash
# Note the health status
docker inspect sendia-dashboard | grep -A 5 Health

# Container should maintain healthy status
# If it goes unhealthy, it will auto-restart after 3 failures
```

- [ ] Understand health check behavior
- [ ] Know how to check status

## Maintenance Schedule

- [ ] Set monthly review of deployment logs
- [ ] Plan quarterly update check
- [ ] Schedule Caddy certificate renewal verification (automatic with Let's Encrypt)
- [ ] Plan Docker image cleanup (old images)

## Sign-Off

- [ ] Setup completed by: __________________ Date: __________
- [ ] Verified by: _________________________ Date: __________
- [ ] Documentation reviewed: _____________ Date: __________

## Notes

```
VPS: root@46.225.239.79
Dashboard: /opt/sendia-dashboard
Container: sendia-dashboard:latest
Port: 3001 (internal) → 443 (public via Caddy)
URL: https://app.getsendia.com
Health endpoint: http://localhost:3001/health (internal)
Caddy config: /opt/n8n/Caddyfile
Network: n8n_default
```

---

**Created**: 2026-03-25
**Purpose**: One-time setup verification
**Review**: As needed for new deployments
