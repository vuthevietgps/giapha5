#!/bin/bash

# Script to check users in Gia Phả database
# Usage: ./check-users.sh

SITE_NAME="giapha"
APP_DIR="/opt/websites/sites/${SITE_NAME}"

echo "🔍 Checking users in Gia Phả database..."

# Check if deployment exists
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Deployment not found at $APP_DIR"
    echo "Run deploy script first: ./deploy-passport24h.sh"
    exit 1
fi

cd "$APP_DIR"

# Check if containers are running
if ! docker compose ps | grep -q "Up"; then
    echo "❌ Containers are not running"
    echo "Start containers: docker compose up -d"
    exit 1
fi

# Get server container ID
SERVER_CONTAINER=$(docker compose ps -q server 2>/dev/null || docker-compose ps -q server 2>/dev/null)

if [ -z "$SERVER_CONTAINER" ]; then
    echo "❌ Server container not found"
    exit 1
fi

echo "📦 Server container: $SERVER_CONTAINER"
echo "🔗 Connecting to database..."

# Execute MongoDB query to list users
docker exec -it "$SERVER_CONTAINER" node -e "
const mongoose = require('mongoose');

// Get MongoDB URI from environment or use default
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/giapha';

console.log('Connecting to:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📚 Collections:');
    collections.forEach(col => console.log('  -', col.name));
    
    // Check users collection
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(\`\n👥 Total users: \${userCount}\`);
    
    if (userCount > 0) {
        console.log('\n📋 User list:');
        const users = await usersCollection.find({}, {
            projection: { 
                username: 1, 
                email: 1, 
                role: 1, 
                createdAt: 1,
                lastLogin: 1 
            }
        }).sort({ createdAt: -1 }).limit(20).toArray();
        
        users.forEach((user, index) => {
            console.log(\`\${index + 1}. \${user.username || 'No username'} (\${user.email || 'No email'})\`);
            console.log(\`   Role: \${user.role || 'user'} | Created: \${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}\`);
            if (user.lastLogin) {
                console.log(\`   Last login: \${new Date(user.lastLogin).toLocaleString()}\`);
            }
            console.log('');
        });
        
        if (userCount > 20) {
            console.log(\`... and \${userCount - 20} more users\`);
        }
    }
    
    process.exit(0);
}).catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
});
" || echo "❌ Failed to query database"

echo ""
echo "📋 Management commands:"
echo "  cd $APP_DIR && docker compose logs -f server    # View server logs"
echo "  cd $APP_DIR && docker compose exec server bash  # Access server container"