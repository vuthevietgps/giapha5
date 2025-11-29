#!/bin/bash
set -euo pipefail

# Cleanup script for old giapha containers
echo "🧹 Cleaning up old giapha containers..."

# Stop and remove old giapha containers
echo "Stopping old containers..."
docker stop giapha-server-1 giapha-web-1 2>/dev/null || echo "Old containers not running"
docker rm giapha-server-1 giapha-web-1 2>/dev/null || echo "Old containers not found"

# Remove old network if exists and not in use
echo "Checking old networks..."
docker network rm giapha_default 2>/dev/null || echo "Old network not found or in use"

# List remaining containers
echo ""
echo "📋 Current running containers:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "✅ Clean completed!"
echo "Now run: sudo ./deploy-passport24h.sh"