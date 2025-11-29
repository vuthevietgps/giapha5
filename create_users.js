// Create initial users for Gia Pha system
db = db.getSiblingDB('giapha');

// Super Admin password: SuperAdmin@123
// Admin password: Admin@123
// Hashed với bcrypt rounds=10

db.users.insertMany([
  {
    email: 'superadmin@giapha.system',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    name: 'Super Admin',
    role: 'SUPER_ADMIN',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    email: 'admin1@giapha.test',
    password: '$2a$10$YQmbFXqK5W3Qp.d0hT8hDO8vR7wGXxLHe1qSqCqNlF7HzQX8qZ8Eq',
    name: 'Admin 1',
    role: 'ADMIN_DONG_HO',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    email: 'admin2@giapha.test',
    password: '$2a$10$YQmbFXqK5W3Qp.d0hT8hDO8vR7wGXxLHe1qSqCqNlF7HzQX8qZ8Eq',
    name: 'Admin 2',
    role: 'ADMIN_DONG_HO',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    email: 'admin3@giapha.test',
    password: '$2a$10$YQmbFXqK5W3Qp.d0hT8hDO8vR7wGXxLHe1qSqCqNlF7HzQX8qZ8Eq',
    name: 'Admin 3',
    role: 'ADMIN_DONG_HO',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('Created users:');
db.users.find({}, {email: 1, name: 1, role: 1, _id: 0}).forEach(printjson);
