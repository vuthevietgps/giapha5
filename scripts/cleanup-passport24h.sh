#!/bin/bash
set -euo pipefail

# Cleanup script for passport24h deployment
echo "🧹 Cleaning up passport24h containers and folders..."

# Stop and remove all passport24h related containers
echo "Stopping containers..."
docker stop passport24h-web passport24h-server 2>/dev/null || echo "New containers not running"
docker stop passport24h-shop-server-1 passport24h-shop-mongo-1 2>/dev/null || echo "Old containers not running"

echo "Removing containers..."
docker rm passport24h-web passport24h-server 2>/dev/null || echo "New containers not found"
docker rm passport24h-shop-server-1 passport24h-shop-mongo-1 2>/dev/null || echo "Old containers not found"

# Remove networks if not in use
echo "Cleaning networks..."
docker network rm passport24h_default 2>/dev/null || echo "passport24h_default network not found"
docker network rm passport24h-shop_default 2>/dev/null || echo "passport24h-shop_default network not found"

# Remove old deployment folders
echo "Removing old folders..."
sudo rm -rf /opt/websites/sites/passport24h-shop 2>/dev/null || echo "passport24h-shop folder not found"
sudo rm -rf /opt/websites/sites/giapha 2>/dev/null || echo "giapha folder not found"
sudo rm -rf /opt/websites/sites/passport24h 2>/dev/null || echo "passport24h folder not found"

# Clean up unused Docker images (optional)
echo "Cleaning unused images..."
docker image prune -f || true

echo ""
echo "📋 Current running containers:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "✅ Cleanup completed!"
echo "Ready for fresh deployment: sudo ./deploy-passport24h.sh"