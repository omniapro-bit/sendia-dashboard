#!/bin/bash
set -euo pipefail

# Sendia Dashboard Deployment Script
# Deploys Next.js 15 dashboard to Docker container on VPS
# Usage: ./deploy.sh
# Run this script from the dashboard directory on the VPS

DEPLOY_DIR="/opt/sendia-dashboard"
CONTAINER_NAME="sendia-dashboard"
IMAGE_NAME="sendia-dashboard:latest"
IMAGE_PREV="sendia-dashboard:previous"
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

# Rollback helper — called on health check failure
rollback() {
    echo ""
    echo "=========================================="
    echo "ROLLBACK: health check failed — restoring :previous image"
    echo "=========================================="
    if docker image inspect "$IMAGE_PREV" >/dev/null 2>&1; then
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm   "$CONTAINER_NAME" 2>/dev/null || true
        set -a
        source "$ENV_FILE"
        set +a
        docker run -d \
            --name "$CONTAINER_NAME" \
            --network "$NETWORK" \
            -p "127.0.0.1:${PORT}:${PORT}" \
            -e "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" \
            -e "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
            -e "NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}" \
            -e "NODE_ENV=production" \
            --restart unless-stopped \
            --health-cmd="curl -f http://localhost:${PORT}/health || exit 1" \
            --health-interval=30s \
            --health-timeout=10s \
            --health-start-period=30s \
            --health-retries=3 \
            "$IMAGE_PREV"
        echo "Rollback container started from $IMAGE_PREV"
        docker logs --tail 20 "$CONTAINER_NAME"
    else
        echo "No :previous image available — manual intervention required"
        docker logs "$CONTAINER_NAME" 2>/dev/null || true
    fi
    exit 1
}

# Step 1: Pull latest code from Git
echo "[1/7] Pulling latest code from GitHub..."
cd "$DEPLOY_DIR"
git pull origin main || git pull origin master || git pull
echo "✓ Git pull completed"
echo ""

# Step 2: Tag current image as :previous (enables rollback if new deploy fails)
echo "[2/7] Tagging current image as :previous..."
if docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    docker tag "$IMAGE_NAME" "$IMAGE_PREV"
    echo "✓ Current image saved as $IMAGE_PREV"
else
    echo "No existing image found — skipping tag"
fi
echo ""

# Step 3: Build Docker image
echo "[3/7] Building Docker image..."
docker build -t "$IMAGE_NAME" .
echo "✓ Docker image built: $IMAGE_NAME"
echo ""

# Step 4: Stop and remove old container
echo "[4/7] Stopping and removing old container..."
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm   "$CONTAINER_NAME" 2>/dev/null || true
    echo "✓ Old container removed"
else
    echo "No existing container found"
fi
echo ""

# Step 5: Load environment variables and start new container
echo "[5/7] Starting new container..."
set -a
source "$ENV_FILE"
set +a

docker run -d \
    --name "$CONTAINER_NAME" \
    --network "$NETWORK" \
    -p "127.0.0.1:${PORT}:${PORT}" \
    -e "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" \
    -e "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -e "NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}" \
    -e "NODE_ENV=production" \
    --restart unless-stopped \
    --health-cmd="curl -f http://localhost:${PORT}/health || exit 1" \
    --health-interval=30s \
    --health-timeout=10s \
    --health-start-period=30s \
    --health-retries=3 \
    "$IMAGE_NAME"

CONTAINER_ID=$(docker ps -q -f name="$CONTAINER_NAME")
echo "✓ Container started: $CONTAINER_ID"
echo ""

# Step 6: Wait for container to be healthy
echo "[6/7] Waiting for container to be healthy..."
RETRY_COUNT=0
MAX_RETRIES=90
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "none")
    if [ "$HEALTH" = "healthy" ]; then
        echo "✓ Container is healthy"
        break
    elif [ "$HEALTH" = "unhealthy" ]; then
        echo "ERROR: Container health check failed"
        docker logs "$CONTAINER_NAME"
        rollback
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "WARNING: Health check timed out after ${MAX_RETRIES}s — attempting manual check..."
    RESPONSE=$(docker exec "$CONTAINER_NAME" curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT} || echo "000")
    if [ "$RESPONSE" != "000" ] && [ "$RESPONSE" != "500" ]; then
        echo "✓ Container appears to be responding (HTTP $RESPONSE)"
    else
        echo "ERROR: Container not responding after ${MAX_RETRIES}s"
        docker logs "$CONTAINER_NAME"
        rollback
    fi
fi
echo ""

# Step 7: Verify deployment
echo "[7/7] Verifying deployment..."
docker ps -f "name=$CONTAINER_NAME"
echo ""
echo "=========================================="
echo "✓ Deployment successful!"
echo "=========================================="
echo ""
echo "Container is running on 127.0.0.1:${PORT} (loopback only)"
echo "Access via: http://localhost:${PORT} (internal)"
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
