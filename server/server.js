const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Allowed origins: localhost (dev), local network, onrender.com deployments,
// and any explicitly configured FRONTEND_URL
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);

    if (
      ALLOWED_ORIGINS.includes(origin) ||
      origin.endsWith('.onrender.com') ||          // allow all Render deployments
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('http://172.')
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/requests',  require('./routes/requests'));
app.use('/api/vehicles',  require('./routes/vehicles'));
app.use('/api/drivers',   require('./routes/drivers'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/complaints',require('./routes/complaints'));
app.use('/api/fuel',          require('./routes/fuel'));
app.use('/api/fuel-requests', require('./routes/fuelRequests'));
app.use('/api/fuel-inventory', require('./routes/fuelInventory'));
app.use('/api/contact',   require('./routes/contact'));
app.use('/api/driver',    require('./routes/driverPortal'));
app.use('/api/security',  require('./routes/security'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/notifications', require('./routes/notifications'));

// ─── Scheduled Jobs ───────────────────────────────────────
require('./jobs/dailyMaintenanceReport')();

// Root endpoint — confirms the backend is running
app.get('/', (req, res) => {
  res.json({ success: true, message: 'HU-VMS Backend is running' });
});


app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
  res.json({ status: 'ok', db: dbStatus });
});

const PORT = process.env.PORT || 4000;

// Start the HTTP server immediately so Render's health check passes
// regardless of the MongoDB connection state.
app.listen(PORT, '0.0.0.0', () =>
  console.log(`Server running on port ${PORT}`)
);

// Connect to MongoDB separately — server stays up even if this fails.
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Retry after 5 seconds instead of crashing
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

connectDB();
