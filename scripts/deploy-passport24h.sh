#!/bin/bash
set -euo pipefail

# Simple deploy script for Gia Phả (version4)
# Usage: ./deploy-passport24h.sh

DOMAIN="passport24h.shop"
PORT="8084"
SITE_NAME="passport24h"
APP_DIR="/opt/websites/sites/${SITE_NAME}"
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
SCRIPT_NAME=$(basename "$0")
SERVER_IMAGE="vutheviet/giapha5:server-version4"
WEB_IMAGE="vutheviet/giapha5:web-version4"

echo "🚀 Deploying $DOMAIN on port $PORT..."
echo "📍 Script: $SCRIPT_NAME | Target: $APP_DIR"

# 1. Clean previous deployments
echo "🧹 Cleaning up old deployments..."

# Stop old passport24h-shop containers
if [ -d "/opt/websites/sites/passport24h-shop" ]; then
  echo "Removing old passport24h-shop deployment..."
  (cd "/opt/websites/sites/passport24h-shop" && (docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true)) || true
  sudo rm -rf "/opt/websites/sites/passport24h-shop" || true
fi

# Stop old giapha containers  
if [ -d "/opt/websites/sites/giapha" ]; then
  echo "Removing old giapha deployment..."
  (cd "/opt/websites/sites/giapha" && (docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true)) || true
  sudo rm -rf "/opt/websites/sites/giapha" || true
fi

# Clean current deployment if exists
if [ -d "$APP_DIR" ]; then
  echo "🧹 Removing current deployment at $APP_DIR";
  if [ -f "$COMPOSE_FILE" ]; then
    (cd "$APP_DIR" && (docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true)) || true
  fi
  sudo rm -rf "$APP_DIR" || true
fi

# 2. Create directory
sudo mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "📦 Using Docker Hub images: $SERVER_IMAGE, $WEB_IMAGE"

# 3. Create docker-compose.yml
sudo tee docker-compose.yml > /dev/null <<EOF
name: passport24h

services:
  server:
    image: ${SERVER_IMAGE}
    container_name: passport24h-server
    restart: unless-stopped
    environment:
      PORT: 3000
      NODE_ENV: production
      MONGODB_URI: "mongodb+srv://allinoneuser:Viet686868@allinone.cniws0g.mongodb.net/giapha?retryWrites=true&w=majority&appName=allinone"
    volumes:
      - ./uploads:/app/uploads

  web:
    image: ${WEB_IMAGE}
    container_name: passport24h-web
    restart: unless-stopped
    depends_on:
      - server
    ports:
      - "${PORT}:80"
    volumes:
      - ./downloads:/usr/share/nginx/html/downloads
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${SITE_NAME}.rule=Host(\`${DOMAIN}\`) || Host(\`www.${DOMAIN}\`)"
      - "traefik.http.routers.${SITE_NAME}.entrypoints=websecure"
      - "traefik.http.routers.${SITE_NAME}.tls=true"
      - "traefik.http.services.${SITE_NAME}.loadbalancer.server.port=80"
      - "traefik.http.routers.${SITE_NAME}-http.rule=Host(\`${DOMAIN}\`) || Host(\`www.${DOMAIN}\`)"
      - "traefik.http.routers.${SITE_NAME}-http.entrypoints=web"
      - "traefik.http.routers.${SITE_NAME}-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
    networks:
      - default        # cần chung network với server để DNS 'server' hoạt động
      - traefik-network # để Traefik thấy service

networks:
  traefik-network:
    external: true
EOF

# 4. Create data directories
sudo mkdir -p uploads downloads
sudo chown -R www-data:www-data . || true

# 5. Start stack
echo "📦 Starting containers..."
if docker compose version >/dev/null 2>&1; then
  docker compose up -d
else
  docker-compose up -d
fi

# 6. Add to cloudflared tunnel (if config exists)
if [ -f /etc/cloudflared/config.yml ]; then
  echo "📝 Adding domain to cloudflared tunnel config..."
  sudo sed -i "/- service: http_status:404/i\\
  - hostname: ${DOMAIN}\\
    service: http://127.0.0.1:${PORT}\\
    originRequest:\\
      noTLSVerify: true\\
      connectTimeout: 30s\\
      tlsTimeout: 30s\\
  - hostname: www.${DOMAIN}\\
    service: http://127.0.0.1:${PORT}\\
    originRequest:\\
      noTLSVerify: true\\
      connectTimeout: 30s\\
      tlsTimeout: 30s" /etc/cloudflared/config.yml || true
  sudo systemctl restart cloudflared || true
fi

# 7. Basic test
echo "🧪 Testing after short wait..."
sleep 8
curl -I http://localhost:${PORT} || true

echo ""
echo "✅ Deploy completed!"
echo "🌐 Domain: https://${DOMAIN}"
echo "🔌 Port: ${PORT}"
echo "📦 Images: vutheviet/giapha5:server-version4, web-version4"
echo "📁 Downloads folder: ${APP_DIR}/downloads (served at /downloads)"
echo ""
echo "📋 Next steps:"
echo "1. Add ${DOMAIN} & www.${DOMAIN} to Cloudflare (if using)."
echo "2. Create CNAME records pointing to your tunnel." 
echo "3. Upload APK: ${APP_DIR}/downloads/giapha-android.apk"
echo "4. Upload IPA: ${APP_DIR}/downloads/giapha-ios.ipa"
echo "5. Test: curl -I https://${DOMAIN}" 
echo ""
echo "Management (run from anywhere):" 
echo "  cd ${APP_DIR} && docker-compose ps"
echo "  cd ${APP_DIR} && docker-compose logs -f web"
echo "  cd ${APP_DIR} && docker-compose logs -f server"
echo "  cd ${APP_DIR} && docker-compose restart server"
echo "  cd ${APP_DIR} && docker-compose down"
echo ""
echo "Or use container names directly:"
echo "  docker logs -f passport24h-server"
echo "  docker logs -f passport24h-web"
echo "  docker restart passport24h-server"
echo ""
echo "Container names:"
echo "  - passport24h-server (Backend API)"
echo "  - passport24h-web (Frontend Nginx)"
