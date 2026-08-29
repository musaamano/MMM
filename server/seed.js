/**
 * Run once to seed initial users and sample data:
 *   node seed.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Vehicle = require('./models/Vehicle');
const Driver = require('./models/Driver');

const users = [
  { name: 'Admin User',         username: 'admin',        email: 'admin@haramaya.edu.et',        role: 'ADMIN',               department: 'Administration',      employeeId: 'HU-ADM-001' },
  { name: 'Transport Officer',  username: 'transport',    email: 'transport@haramaya.edu.et',    role: 'TRANSPORT',           department: 'Transport Operations', employeeId: 'HU-TO-001'  },
  { name: 'Abebe Kebede',       username: 'driver1',      email: 'driver1@haramaya.edu.et',      role: 'DRIVER',              department: 'Transport',            employeeId: 'HU-DRV-001' },
  { name: 'Chaltu Gemechu',     username: 'driver2',      email: 'driver2@haramaya.edu.et',      role: 'DRIVER',              department: 'Transport',            employeeId: 'HU-DRV-002' },
  { name: 'Fuel Officer',       username: 'fuel',         email: 'fuel@haramaya.edu.et',         role: 'FUEL_OFFICER',        department: 'Fuel Station',         employeeId: 'HU-FO-001'  },
  { name: 'Gate Officer',       username: 'gate',         email: 'gate@haramaya.edu.et',         role: 'GATE_OFFICER',        department: 'Security',             employeeId: 'HU-GO-001'  },
  { name: 'Regular User',       username: 'user1',        email: 'user1@haramaya.edu.et',        role: 'USER',                department: 'Research',             employeeId: 'HU-USR-001' },
  { name: 'Maintenance Officer',username: 'maintenance',  email: 'maintenance@haramaya.edu.et',  role: 'MAINTENANCE_OFFICER', department: 'Maintenance',          employeeId: 'HU-MO-001'  },
];

const vehicles = [
  { plateNumber: 'ET-AA-001', model: 'Toyota Coaster', type: 'minibus', capacity: 25, status: 'available', assignedDriverName: 'Abebe Kebede' },
  { plateNumber: 'ET-AA-002', model: 'Isuzu Bus',      type: 'bus',     capacity: 45, status: 'available', assignedDriverName: 'Chaltu Gemechu' },
  { plateNumber: 'ET-AA-003', model: 'Toyota Land Cruiser', type: 'car', capacity: 7, status: 'available', assignedDriverName: 'Abebe Kebede' },
  { plateNumber: 'ET-AA-004', model: 'Mitsubishi Rosa', type: 'minibus', capacity: 30, status: 'in-use',   assignedDriverName: 'Chaltu Gemechu' },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await User.deleteMany({});
  await Vehicle.deleteMany({});
  // Drop stale indexes (e.g. old vehicleId_1 from previous schema)
  try { await Vehicle.collection.dropIndex('vehicleId_1'); } catch (_) {}
  await Driver.deleteMany({});

  // Create users with hashed password "password123"
  const hashed = await bcrypt.hash('password123', 10);
  const createdUsers = await User.insertMany(
    users.map(u => ({ ...u, password: hashed }))
  );
  console.log(`Created ${createdUsers.length} users`);

  // Create vehicles
  const createdVehicles = await Vehicle.insertMany(vehicles);
  console.log(`Created ${createdVehicles.length} vehicles`);

  // Create drivers from driver users
  const driverUsers = createdUsers.filter(u => u.role === 'DRIVER');
  const drivers = driverUsers.map((u, i) => ({
    name: u.name,
    employeeId: u.employeeId,
    phone: `+251-911-00000${i + 1}`,
    licenseNumber: `ETH-LIC-00${i + 1}`,
    status: 'available',
    assignedVehiclePlate: createdVehicles[i]?.plateNumber || '',
  }));
  const createdDrivers = await Driver.insertMany(drivers);
  console.log(`Created ${createdDrivers.length} drivers`);

  console.log('\n✅ Seed complete!');
  console.log('Login credentials (all use password: password123):');
  users.forEach(u => console.log(`  ${u.role.padEnd(14)} → username: ${u.username}`));

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
