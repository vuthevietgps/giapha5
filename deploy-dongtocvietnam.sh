#!/bin/bash

# Deploy Gia Phả Version 7 to dongtocvietnam.com
# Server: 192.168.100.237
# Usage: ./deploy-dongtocvietnam.sh

DOMAIN="dongtocvietnam.com"
BACKEND_PORT="3000"
FRONTEND_PORT="8091"
CONTAINER_NAME="dongtocvietnam-com"
MONGODB_URI=""  # Will be prompted

echo "🚀 Deploying Gia Phả Version 7 to $DOMAIN..."
echo "📍 Server: 192.168.100.237"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo"
    exit 1
fi

# Prompt for MongoDB URI
echo "📝 MongoDB Configuration"
echo "Enter MongoDB Atlas URI (or press Enter to use default):"
read -p "MONGODB_URI: " user_mongodb_uri

if [ -z "$user_mongodb_uri" ]; then
    echo "⚠️  No MongoDB URI provided. You'll need to set it manually later."
    MONGODB_URI="mongodb://localhost:27017/giapha"
else
    MONGODB_URI="$user_mongodb_uri"
fi

# 1. Create directory structure
echo ""
echo "📁 Creating directory structure..."
cd /opt/websites
mkdir -p sites/$CONTAINER_NAME
cd sites/$CONTAINER_NAME

# 2. Create .env file
echo "📝 Creating .env file..."
cat > .env <<EOF
# MongoDB Atlas Connection String
MONGODB_URI=$MONGODB_URI
NODE_ENV=production
PORT=3000
EOF

# 3. Create docker-compose.yml
echo "📝 Creating docker-compose.yml..."
cat > docker-compose.yml <<'EOF'
version: '3.9'

services:
  backend:
    image: vutheviet/giapha5:server-version7
    container_name: dongtocvietnam-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - MONGODB_URI=${MONGODB_URI}
      - NODE_ENV=production
    volumes:
      - uploads-data:/app/uploads
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks:
      - giapha-network
      - traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dongtocvietnam-api.rule=Host(`dongtocvietnam.com`) && PathPrefix(`/api`, `/uploads`)"
      - "traefik.http.routers.dongtocvietnam-api.entrypoints=websecure"
      - "traefik.http.services.dongtocvietnam-api.loadbalancer.server.port=3000"
      - "traefik.http.routers.dongtocvietnam-api-http.rule=Host(`dongtocvietnam.com`) && PathPrefix(`/api`, `/uploads`)"
      - "traefik.http.routers.dongtocvietnam-api-http.entrypoints=web"
      - "traefik.http.routers.dongtocvietnam-api-http.middlewares=redirect-to-https"

  frontend:
    image: vutheviet/giapha5:web-version7
    container_name: dongtocvietnam-frontend
    restart: unless-stopped
    ports:
      - "8090:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - giapha-network
      - traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dongtocvietnam-web.rule=Host(`dongtocvietnam.com`) || Host(`www.dongtocvietnam.com`)"
      - "traefik.http.routers.dongtocvietnam-web.entrypoints=websecure"
      - "traefik.http.services.dongtocvietnam-web.loadbalancer.server.port=80"
      - "traefik.http.routers.dongtocvietnam-web-http.rule=Host(`dongtocvietnam.com`) || Host(`www.dongtocvietnam.com`)"
      - "traefik.http.routers.dongtocvietnam-web-http.entrypoints=web"
      - "traefik.http.routers.dongtocvietnam-web-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"

volumes:
  uploads-data:

networks:
  giapha-network:
    driver: bridge
  traefik-network:
    external: true
EOF

# 4. Set permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data .

# 5. Pull Docker images
echo "📦 Pulling Docker images from Docker Hub..."
docker pull vutheviet/giapha5:server-version7
docker pull vutheviet/giapha5:web-version7

# 6. Start containers
echo "🚀 Starting containers..."
docker-compose up -d

# 7. Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# 8. Check container status
echo ""
echo "📊 Container Status:"
docker-compose ps

# 9. Add to Cloudflare Tunnel config
echo ""
echo "📝 Adding to Cloudflare Tunnel config..."
if [ -f /etc/cloudflared/config.yml ]; then
    # Backup current config
    cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml.backup

    # Check if domain already exists in config
    if grep -q "dongtocvietnam.com" /etc/cloudflared/config.yml; then
        echo "⚠️  Domain already exists in tunnel config. Skipping..."
    else
        # Add new ingress rules before the catch-all rule
        sed -i "/- service: http_status:404/i\\
  - hostname: dongtocvietnam.com\\
    service: http://127.0.0.1:8091\\
    originRequest:\\
      noTLSVerify: true\\
      connectTimeout: 30s\\
      tlsTimeout: 30s\\
  - hostname: www.dongtocvietnam.com\\
    service: http://127.0.0.1:8091\\
    originRequest:\\
      noTLSVerify: true\\
      connectTimeout: 30s\\
      tlsTimeout: 30s" /etc/cloudflared/config.yml

        echo "✅ Added to tunnel config"
        
        # Restart cloudflared
        echo "🔄 Restarting Cloudflare Tunnel..."
        systemctl restart cloudflared
        sleep 5
        
        echo "📋 Cloudflare Tunnel Status:"
        systemctl status cloudflared --no-pager -l
    fi
else
    echo "⚠️  Cloudflare Tunnel config not found at /etc/cloudflared/config.yml"
    echo "    You'll need to configure it manually."
fi

# 10. Test endpoints
echo ""
echo "🧪 Testing endpoints..."
echo "Backend API:"
curl -I http://localhost:3000/api 2>/dev/null | head -n 1 || echo "❌ Backend not responding"
echo ""
echo "Frontend:"
curl -I http://localhost:8090 2>/dev/null | head -n 1 || echo "❌ Frontend not responding"

# 11. Show logs
echo ""
echo "📜 Recent logs:"
docker-compose logs --tail=20

# Summary
echo ""
echo "================================================================"
echo "  ✅ DEPLOYMENT COMPLETED!"
echo "================================================================"
echo ""
echo "📦 Containers:"
echo "   • dongtocvietnam-backend  (port 3000)"
echo "   • dongtocvietnam-frontend (port 8090)"
echo ""
echo "🌐 Domain: https://dongtocvietnam.com"
echo "🔌 Local access:"
echo "   • Frontend: http://192.168.100.237:8090"
echo "   • Backend:  http://192.168.100.237:3000/api"
echo ""
echo "📁 Location: /opt/websites/sites/$CONTAINER_NAME"
echo ""
echo "📋 Next steps:"
echo "1. Configure DNS in Cloudflare:"
echo "   • Go to: https://dash.cloudflare.com"
echo "   • Add domain: dongtocvietnam.com"
echo "   • Create CNAME records:"
echo "     @ → [your-tunnel-id].cfargotunnel.com"
echo "     www → [your-tunnel-id].cfargotunnel.com"
echo ""
echo "2. Verify Cloudflare Tunnel:"
echo "   sudo systemctl status cloudflared"
echo "   sudo journalctl -u cloudflared -f"
echo ""
echo "3. Test the website:"
echo "   curl -I https://dongtocvietnam.com"
echo ""
echo "🔧 Useful commands:"
echo "   cd /opt/websites/sites/$CONTAINER_NAME"
echo "   sudo docker-compose logs -f              # View logs"
echo "   sudo docker-compose ps                   # Check status"
echo "   sudo docker-compose restart              # Restart"
echo "   sudo docker-compose down                 # Stop"
echo "   sudo docker-compose up -d                # Start"
echo ""
echo "💾 MongoDB URI: $(echo $MONGODB_URI | sed 's/:[^@]*@/:***@/')"
echo ""
echo "================================================================"
