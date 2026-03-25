# Sendia Dashboard - Quick Start Deployment

## One-time Setup (from VPS terminal)

```bash
# 1. Clone the repository
cd /opt
git clone https://github.com/omniapro-bit/sendia-dashboard.git
cd sendia-dashboard

# 2. Create production environment file
cp .env.prod.example .env.prod
# Edit with your actual Supabase keys and API base URL
nano .env.prod

# 3. Make deploy script executable
chmod +x deploy.sh

# 4. Run deployment
./deploy.sh
```

## For Future Deployments

```bash
cd /opt/sendia-dashboard
./deploy.sh
```

That's it! The script handles:
- Git pull
- Docker build
- Container restart
- Health checks
- Log verification

## After First Deploy

Update your Caddy reverse proxy to point to the container:

Edit `/opt/n8n/Caddyfile`:
```
app.getsendia.com {
  reverse_proxy sendia-dashboard:3001
}
```

Reload Caddy:
```bash
docker exec n8n-caddy-1 caddy reload -c /etc/caddy/Caddyfile
```

## Verify It Works

```bash
# Check container is running
docker ps -f name=sendia-dashboard

# Check it's healthy
docker inspect sendia-dashboard | grep -A 5 Health

# Test the health endpoint
curl http://localhost:3001/health

# Test from public URL
curl https://app.getsendia.com
```

## Troubleshooting

```bash
# View logs
docker logs sendia-dashboard

# Follow logs in real-time
docker logs -f sendia-dashboard

# Check environment variables loaded
docker exec sendia-dashboard env | grep NEXT_PUBLIC

# Test container connectivity
docker exec sendia-dashboard curl http://localhost:3001/
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting and advanced topics.
