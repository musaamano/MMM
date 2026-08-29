/**
 * seed-safe.js — Safe production seeding script.
 *
 * UNLIKE seed.js, this script does NOT delete existing data.
 * It only creates users that do not already exist (checked by username).
 *
 * Usage (against Atlas):
 *   MONGO_URI="mongodb+srv://user:pass@cluster/hu-vms" node seed-safe.js
 *
 * Or with .env file:
 *   node seed-safe.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const usersToCreate = [
  { name: 'Admin User',          username: 'admin',       email: 'admin@haramaya.edu.et',       role: 'ADMIN',               department: 'Administration',       employeeId: 'HU-ADM-001' },
  { name: 'Transport Officer',   username: 'transport',   email: 'transport@haramaya.edu.et',   role: 'TRANSPORT',           department: 'Transport Operations',  employeeId: 'HU-TO-001'  },
  { name: 'Abebe Kebede',        username: 'driver1',     email: 'driver1@haramaya.edu.et',     role: 'DRIVER',              department: 'Transport',             employeeId: 'HU-DRV-001' },
  { name: 'Chaltu Gemechu',      username: 'driver2',     email: 'driver2@haramaya.edu.et',     role: 'DRIVER',              department: 'Transport',             employeeId: 'HU-DRV-002' },
  { name: 'Fuel Officer',        username: 'fuel',        email: 'fuel@haramaya.edu.et',        role: 'FUEL_OFFICER',        department: 'Fuel Station',          employeeId: 'HU-FO-001'  },
  { name: 'Gate Officer',        username: 'gate',        email: 'gate@haramaya.edu.et',        role: 'GATE_OFFICER',        department: 'Security',              employeeId: 'HU-GO-001'  },
  { name: 'Regular User',        username: 'user1',       email: 'user1@haramaya.edu.et',       role: 'USER',                department: 'Research',              employeeId: 'HU-USR-001' },
  { name: 'Maintenance Officer', username: 'maintenance', email: 'maintenance@haramaya.edu.et', role: 'MAINTENANCE_OFFICER', department: 'Maintenance',           employeeId: 'HU-MO-001'  },
];

async function safeSeed() {
  if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI environment variable is not set.');
    console.error('Set it in server/.env or pass it directly:');
    console.error('  MONGO_URI="mongodb+srv://..." node seed-safe.js');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.\n');

  // Count existing users first
  const existingCount = await User.countDocuments();
  console.log(`Existing users in database: ${existingCount}`);

  const hashed = await bcrypt.hash('password123', 10);
  let created = 0;
  let skipped = 0;

  for (const u of usersToCreate) {
    const exists = await User.findOne({ username: u.username });
    if (exists) {
      console.log(`  SKIP (already exists): ${u.username}`);
      skipped++;
    } else {
      await User.create({ ...u, password: hashed });
      console.log(`  CREATED: ${u.username} (${u.role})`);
      created++;
    }
  }

  console.log(`\n✅ Done. Created: ${created}, Skipped: ${skipped}`);
  console.log('\nLogin credentials (password: password123):');
  usersToCreate.forEach(u =>
    console.log(`  ${u.role.padEnd(20)} → username: ${u.username}`)
  );

  await mongoose.disconnect();
}

safeSeed().catch(err => {
  console.error('Seed error:', err.message);
  process.exit(1);
});
