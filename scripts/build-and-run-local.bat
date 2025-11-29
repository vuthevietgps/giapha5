@echo off
echo 🛠 Building Docker images no-cache for local testing...

cd /d "%~dp0\.."

echo Building server image...
docker build --no-cache -t giapha5-server:local ./server
if %ERRORLEVEL% neq 0 (
    echo ❌ Server build failed
    pause
    exit /b 1
)

echo Building web image...
docker build --no-cache -t giapha5-web:local ./web
if %ERRORLEVEL% neq 0 (
    echo ❌ Web build failed
    pause
    exit /b 1
)

echo 📦 Creating docker-compose.yml for local testing...
mkdir temp-deploy 2>nul
cd temp-deploy

(
echo services:
echo   server:
echo     image: giapha5-server:local
echo     restart: unless-stopped
echo     environment:
echo       MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/giapha"
echo       PORT: 3000
echo       NODE_ENV: production
echo     volumes:
echo       - ./uploads:/app/uploads
echo.
echo   web:
echo     image: giapha5-web:local
echo     restart: unless-stopped
echo     depends_on:
echo       - server
echo     ports:
echo       - "8084:80"
echo     volumes:
echo       - ./downloads:/usr/share/nginx/html/downloads
echo.
echo networks:
echo   default:
) > docker-compose.yml

mkdir uploads downloads 2>nul

echo 🚀 Starting containers...
docker compose up -d
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to start containers
    pause
    exit /b 1
)

echo.
echo ✅ Local deployment completed!
echo 🌐 Access: http://localhost:8084
echo 📋 Management commands:
echo   docker compose ps
echo   docker compose logs -f web
echo   docker compose logs -f server
echo   docker compose down
echo.
echo Press any key to open in browser...
pause >nul
start http://localhost:8084