@echo off
REM Build and push Docker images to Docker Hub with version4 tag
REM Usage: build-and-push-version4.bat

echo 🚀 Building and pushing Docker images to Docker Hub (version4)...

REM Check if Docker is running
docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running
    echo Start Docker Desktop first
    pause
    exit /b 1
)

REM Navigate to project root
cd /d "%~dp0.."

echo 📦 Building server image with MongoDB Atlas connection...
docker build --no-cache -t vutheviet/giapha5:server-version4 ./server
if errorlevel 1 (
    echo ❌ Server build failed
    pause
    exit /b 1
)

echo 📦 Building web image...
docker build --no-cache -t vutheviet/giapha5:web-version4 ./web
if errorlevel 1 (
    echo ❌ Web build failed
    pause
    exit /b 1
)

echo 🔑 Logging into Docker Hub...
docker login
if errorlevel 1 (
    echo ❌ Docker Hub login failed
    pause
    exit /b 1
)

echo ⬆️ Pushing server image...
docker push vutheviet/giapha5:server-version4
if errorlevel 1 (
    echo ❌ Server push failed
    pause
    exit /b 1
)

echo ⬆️ Pushing web image...
docker push vutheviet/giapha5:web-version4
if errorlevel 1 (
    echo ❌ Web push failed
    pause
    exit /b 1
)

echo.
echo ✅ Successfully pushed to Docker Hub!
echo 📦 Images:
echo   - vutheviet/giapha5:server-version4
echo   - vutheviet/giapha5:web-version4
echo.
echo 📋 Next steps:
echo 1. Update deploy-passport24h.sh to use version4 images
echo 2. Deploy to production server
echo.

pause