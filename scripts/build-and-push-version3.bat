@echo off
echo 🛠 Building and pushing Docker images to Docker Hub with version3 tag...

cd /d "%~dp0\.."

echo 📦 Building server image...
docker build --no-cache -t vutheviet/giapha5:server-version3 ./server
if %ERRORLEVEL% neq 0 (
    echo ❌ Server build failed
    pause
    exit /b 1
)

echo 📦 Building web image...
docker build --no-cache -t vutheviet/giapha5:web-version3 ./web
if %ERRORLEVEL% neq 0 (
    echo ❌ Web build failed
    pause
    exit /b 1
)

echo 🚀 Pushing server image to Docker Hub...
docker push vutheviet/giapha5:server-version3
if %ERRORLEVEL% neq 0 (
    echo ❌ Push server failed. Make sure you're logged in: docker login
    pause
    exit /b 1
)

echo 🚀 Pushing web image to Docker Hub...
docker push vutheviet/giapha5:web-version3
if %ERRORLEVEL% neq 0 (
    echo ❌ Push web failed. Make sure you're logged in: docker login
    pause
    exit /b 1
)

echo.
echo ✅ Successfully pushed to Docker Hub!
echo 📦 Images:
echo   - vutheviet/giapha5:server-version3
echo   - vutheviet/giapha5:web-version3
echo.
echo 🔗 View at: https://hub.docker.com/repository/docker/vutheviet/giapha5/general
echo.
pause