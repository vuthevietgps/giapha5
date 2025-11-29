#!/bin/bash

# Quick fix script to add MongoDB URI to existing deployment
echo "🔧 Adding MongoDB URI to passport24h deployment..."

APP_DIR="/opt/websites/sites/giapha"
cd "$APP_DIR"

# Check if deployment exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ No deployment found at $APP_DIR"
    exit 1
fi

echo "📝 Adding MongoDB URI to server container..."

# Create backup
sudo cp docker-compose.yml docker-compose.yml.backup

# Add MongoDB URI using sed
sudo sed -i '/NODE_ENV: production/a\      MONGODB_URI: "mongodb+srv://allinoneuser:Viet686868@allinone.cniws0g.mongodb.net/giapha?retryWrites=true&w=majority&appName=allinone"' docker-compose.yml

echo "🔄 Restarting server container..."
sudo docker-compose restart server

echo "⏳ Waiting for server to start..."
sleep 10

echo "🧪 Testing server health..."
curl -I http://localhost:8084/api || echo "Server not responding yet"

echo ""
echo "✅ MongoDB URI added successfully!"
echo ""
echo "📋 Check server status:"
echo "  docker-compose logs -f server"
echo "  docker-compose ps"
echo ""
echo "🌐 Test login at: https://passport24h.shop"