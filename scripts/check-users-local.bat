@echo off
REM Script to check users in local Gia Phả database
REM Usage: check-users-local.bat

echo 🔍 Checking users in local Gia Phả database...

REM Check if Docker is running
docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running
    echo Start Docker Desktop first
    pause
    exit /b 1
)

REM Check if containers are running
docker compose ps 2>nul | findstr /i "up" >nul
if errorlevel 1 (
    echo ❌ Containers are not running
    echo Start containers: docker compose up -d
    pause
    exit /b 1
)

REM Get server container
for /f "tokens=*" %%i in ('docker compose ps -q server 2^>nul') do set SERVER_CONTAINER=%%i

if "%SERVER_CONTAINER%"=="" (
    echo ❌ Server container not found
    pause
    exit /b 1
)

echo 📦 Server container: %SERVER_CONTAINER%
echo 🔗 Connecting to database...

REM Execute MongoDB query
docker exec -it %SERVER_CONTAINER% node -e "const mongoose = require('mongoose'); const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/giapha'; console.log('Connecting to:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true }).then(async () => { console.log('✅ Connected to MongoDB'); const db = mongoose.connection.db; const collections = await db.listCollections().toArray(); console.log('\n📚 Collections:'); collections.forEach(col => console.log('  -', col.name)); const usersCollection = db.collection('users'); const userCount = await usersCollection.countDocuments(); console.log(`\n👥 Total users: ${userCount}`); if (userCount > 0) { console.log('\n📋 User list:'); const users = await usersCollection.find({}, { projection: { username: 1, email: 1, role: 1, createdAt: 1, lastLogin: 1 } }).sort({ createdAt: -1 }).limit(20).toArray(); users.forEach((user, index) => { console.log(`${index + 1}. ${user.username || 'No username'} (${user.email || 'No email'})`); console.log(`   Role: ${user.role || 'user'} | Created: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}`); if (user.lastLogin) { console.log(`   Last login: ${new Date(user.lastLogin).toLocaleString()}`); } console.log(''); }); if (userCount > 20) { console.log(`... and ${userCount - 20} more users`); } } process.exit(0); }).catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });"

echo.
echo 📋 Management commands:
echo   docker compose logs -f server    # View server logs
echo   docker compose exec server bash  # Access server container

pause