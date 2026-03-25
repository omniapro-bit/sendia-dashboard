#!/bin/bash
set -euo pipefail

# Sendia Dashboard Deployment Script
# Deploys Next.js 15 dashboard to Docker container on VPS
# Usage: ./deploy.sh
# Run this script from the dashboard directory on the VPS

DEPLOY_DIR="/opt/sendia-dashboard"
CONTAINER_NAME="sendia-dashboard"
IMAGE_NAME="sendia-dashboard:latest"
PORT="3001"
NETWORK="n8n_default"
ENV_FILE="${DEPLOY_DIR}/.env.prod"

echo "=========================================="
echo "Sendia Dashboard Deployment Script"
echo "=========================================="
echo "Deploy dir: $DEPLOY_DIR"
echo "Container: $CONTAINER_NAME"
echo "Port: $PORT"
echo ""

# Verify environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: Environment file not found at $ENV_FILE"
    echo "Please create .env.prod with required variables:"
    echo "  NEXT_PUBLIC_SUPABASE_URL"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  NEXT_PUBLIC_API_BASE"
    exit 1
fi

# Step 1: Pull latest code from Git
echo "[1/6] Pulling latest code from GitHub..."
cd "$DEPLOY_DIR"
git pull origin main || git pull origin master || git pull
echo "✓ Git pull completed"
echo ""

# Step 2: Build Docker image
echo "[2/6] Building Docker image..."
docker build -t "$IMAGE_NAME" .
echo "✓ Docker image built: $IMAGE_NAME"
echo ""

# Step 3: Stop and remove old container
echo "[3/6] Stopping and removing old container..."
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    echo "✓ Old container removed"
else
    echo "ℹ No existing container found"
fi
echo ""

# Step 4: Load environment variables and start new container
echo "[4/6] Starting new container..."
set -a
source "$ENV_FILE"
set +a

docker run -d \
    --name "$CONTAINER_NAME" \
    --network "$NETWORK" \
    -p "3001:3001" \
    -e "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" \
    -e "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -e "NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}" \
    -e "NODE_ENV=production" \
    --restart unless-stopped \
    --health-cmd="curl -f http://localhost:3001/health || exit 1" \
    --health-interval=30s \
    --health-timeout=10s \
    --health-start-period=5s \
    --health-retries=3 \
    "$IMAGE_NAME"

CONTAINER_ID=$(docker ps -q -f name="$CONTAINER_NAME")
echo "✓ Container started: $CONTAINER_ID"
echo ""

# Step 5: Wait for container to be healthy
echo "[5/6] Waiting for container to be healthy..."
RETRY_COUNT=0
MAX_RETRIES=30
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "none")
    if [ "$HEALTH" = "healthy" ]; then
        echo "✓ Container is healthy"
        break
    elif [ "$HEALTH" = "unhealthy" ]; then
        echo "ERROR: Container health check failed"
        docker logs "$CONTAINER_NAME"
        exit 1
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "WARNING: Health check timeout. Checking manually..."
    RESPONSE=$(docker exec "$CONTAINER_NAME" curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 || echo "000")
    if [ "$RESPONSE" != "000" ] && [ "$RESPONSE" != "500" ]; then
        echo "✓ Container appears to be responding"
    else
        echo "ERROR: Container not responding after ${MAX_RETRIES}s"
        docker logs "$CONTAINER_NAME"
        exit 1
    fi
fi
echo ""

# Step 6: Verify deployment
echo "[6/6] Verifying deployment..."
docker ps -f "name=$CONTAINER_NAME"
echo ""
echo "=========================================="
echo "✓ Deployment successful!"
echo "=========================================="
echo ""
echo "Container is running on port 3001"
echo "Access via: http://localhost:3001 (internal)"
echo "Public via: https://app.getsendia.com (proxied by Caddy)"
echo ""

# Display Caddy configuration update reminder
echo "=========================================="
echo "NGINX/Caddy Configuration"
echo "=========================================="
echo ""
echo "Update your Caddy reverse proxy config to:"
echo ""
echo "app.getsendia.com {"
echo "  reverse_proxy sendia-dashboard:3001"
echo "}"
echo ""
echo "Add this to /opt/n8n/Caddyfile and reload Caddy:"
echo "  docker exec n8n-caddy-1 caddy reload -c /etc/caddy/Caddyfile"
echo ""
echo "OR if using standalone Caddy:"
echo "  systemctl reload caddy"
echo ""

# Display logs tail
echo "=========================================="
echo "Container Logs (last 20 lines):"
echo "=========================================="
docker logs --tail 20 "$CONTAINER_NAME"
echo ""
echo "To view full logs: docker logs -f $CONTAINER_NAME"
echo ""
