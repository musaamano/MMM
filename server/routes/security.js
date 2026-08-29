const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const Request = require('../models/Request');
const Vehicle = require('../models/Vehicle');
const GateLog = require('../models/GateLog');
const IncidentReport = require('../models/IncidentReport');
const User = require('../models/User');
const tripDateOnly = (dateValue = '') => String(dateValue).slice(0, 10);
const hasRole = (req, ...roles) => roles.includes(req.user?.role);
const requireRole = (req, res, ...roles) => {
  if (!hasRole(req, ...roles)) {
    res.status(403).json({ message: 'Access denied' });
    return false;
  }
  return true;
};

// GET /api/security/verify/:plateNumber
router.get('/verify/:plateNumber', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'GATE_OFFICER', 'ADMIN', 'TRANSPORT')) return;
    const plate = req.params.plateNumber.toUpperCase().trim();

    // Find vehicle in DB
    const vehicle = await Vehicle.findOne({ plateNumber: { $regex: new RegExp(`^${plate}$`, 'i') } });

    // Find today's trip for this vehicle (any status)
    const today = new Date().toISOString().slice(0, 10);
    const trip = await Request.findOne({
      assignedVehicle: { $regex: new RegExp(plate, 'i') },
      date: { $regex: new RegExp(`^${today}`) },
    }).sort({ updatedAt: -1 });

    // Also check if there's any future scheduled trip
    const scheduledTrip = await Request.findOne({
      assignedVehicle: { $regex: new RegExp(plate, 'i') },
      date: { $gte: today },
      status: { $in: ['pending', 'assigned', 'approved'] },
    }).sort({ date: 1 });

    // Find all trips for this vehicle (history)
    const tripHistory = await Request.find({
      assignedVehicle: { $regex: new RegExp(plate, 'i') },
    }).sort({ createdAt: -1 }).limit(5).select('destination date status requester assignedDriver');

    // Find driver linked to this vehicle
    const Driver = require('../models/Driver');
    const driver = vehicle
      ? await Driver.findOne({ assignedVehiclePlate: { $regex: new RegExp(plate, 'i') } })
      : null;

    // Find last gate log for this plate
    const lastLog = await GateLog.findOne({ plateNumber: plate }).sort({ createdAt: -1 });

    // Build response
    const vehicleInfo = vehicle ? {
      plateNumber:   vehicle.plateNumber,
      model:         vehicle.model,
      type:          vehicle.type,
      capacity:      vehicle.capacity,
      fuelLevel:     vehicle.fuelLevel,
      mileage:       vehicle.mileage,
      status:        vehicle.status,
      fuelType:      vehicle.fuelType,
      year:          vehicle.year,
      color:         vehicle.color,
      department:    vehicle.department,
      lastMaintenance: vehicle.lastMaintenance,
    } : null;

    const driverInfo = driver ? {
      name:          driver.name,
      phone:         driver.phone,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,
      status:        driver.status,
      rating:        driver.rating,
      totalTrips:    driver.totalTrips,
    } : null;

    // Determine authorization status based on trip status
    let status = 'unauthorized';
    let message = '';
    let tripStatusDetail = null;

    if (!vehicle && !trip && !scheduledTrip) {
      message = 'Vehicle not registered in the system';
    } else if (!trip && !scheduledTrip) {
      message = 'No trip scheduled for this vehicle today or upcoming';
      status = 'no-trip';
    } else if (trip) {
      switch (trip.status) {
        case 'approved':
        case 'in-progress':
        case 'started':
          status = 'authorized';
          message = 'Trip approved by Transport Officer — vehicle is authorized';
          break;
        case 'pending':
          status = 'pending';
          message = 'Trip is PENDING — not yet approved by Transport Officer';
          break;
        case 'rejected':
          status = 'rejected';
          message = `Trip was REJECTED by Transport Officer${trip.rejectionReason ? ': ' + trip.rejectionReason : ''}`;
          break;
        case 'completed':
          status = 'completed';
          message = 'Trip already completed today';
          break;
        default:
          message = `Trip status: ${trip.status}`;
      }
      tripStatusDetail = trip.status;
    } else if (scheduledTrip) {
      status = scheduledTrip.status === 'approved' ? 'authorized' : 'pending';
      message = scheduledTrip.status === 'approved'
        ? `Upcoming approved trip on ${scheduledTrip.date}`
        : `Upcoming trip on ${scheduledTrip.date} — pending approval`;
    }

    // Check if currently inside campus
    const insideCampus = lastLog && lastLog.direction === 'entry' && !lastLog.exitTime;

    return res.json({
      status,
      message,
      plateNumber: plate,
      authorized: status === 'authorized',
      tripStatusDetail,
      insideCampus,
      vehicle: vehicleInfo,
      driver: driverInfo,
      trip: trip ? {
        _id:             trip._id,
        destination:     trip.destination,
        date:            trip.date,
        status:          trip.status,
        requester:       trip.requester,
        department:      trip.department,
        assignedDriver:  trip.assignedDriver,
        passengers:      trip.passengers,
        purpose:         trip.purpose,
        rejectionReason: trip.rejectionReason,
        approvedAt:      trip.updatedAt,
      } : null,
      scheduledTrip: scheduledTrip && !trip ? {
        destination:   scheduledTrip.destination,
        date:          scheduledTrip.date,
        status:        scheduledTrip.status,
        assignedDriver: scheduledTrip.assignedDriver,
      } : null,
      tripHistory,
      lastGateActivity: lastLog ? {
        direction: lastLog.direction,
        time:      lastLog.entryTime,
        officer:   lastLog.officer,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/security/checkin
router.post('/checkin', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'GATE_OFFICER', 'ADMIN')) return;
    const { plateNumber, driverName, vehicleModel, tripId, remarks } = req.body;
    const officer = req.user.name || 'Gate Officer';

    const log = new GateLog({
      plateNumber: plateNumber.toUpperCase(),
      driverName,
      vehicleModel,
      direction: 'entry',
      status: 'approved',
      tripId,
      officer,
      remarks,
      entryTime: new Date(),
    });
    await log.save();
    res.status(201).json({ message: 'Check-in recorded', log });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/security/checkout
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'GATE_OFFICER', 'ADMIN')) return;
    const { plateNumber, remarks } = req.body;
    const plate = plateNumber.toUpperCase();

    const log = await GateLog.findOne({
      plateNumber: plate,
      direction: 'entry',
      exitTime: null,
    }).sort({ entryTime: -1 });

    if (!log) {
      // Create a new exit log
      const exitLog = new GateLog({
        plateNumber: plate,
        direction: 'exit',
        status: 'approved',
        officer: req.user.name || 'Gate Officer',
        remarks,
        exitTime: new Date(),
      });
      await exitLog.save();
      return res.json({ message: 'Check-out recorded', log: exitLog });
    }

    log.exitTime = new Date();
    log.remarks = remarks || log.remarks;
    await log.save();
    res.json({ message: 'Check-out recorded', log });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/security/logs
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'GATE_OFFICER', 'ADMIN', 'TRANSPORT')) return;
    const { date, status, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end   = new Date(date); end.setHours(23, 59, 59, 999);
      filter.entryTime = { $gte: start, $lte: end };
    }
    const logs = await GateLog.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/security/report — incident report
router.post('/report', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'GATE_OFFICER', 'ADMIN')) return;
    const { plateNumber, description, incidentType, severity, image } = req.body;
    const report = new IncidentReport({
      plateNumber,
      description,
      incidentType,
      severity,
      image,
      reportedBy: req.user.name || 'Gate Officer',
    });
    await report.save();
    res.status(201).json({ message: 'Incident reported', report });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/security/reports
router.get('/reports', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'GATE_OFFICER', 'ADMIN')) return;
    const reports = await IncidentReport.find().sort({ createdAt: -1 }).limit(50);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/security/verify-trip/:token — verify by QR token
router.get('/verify-trip/:token', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'GATE_OFFICER', 'ADMIN')) return;
    const trip = await Request.findOne({ qrToken: req.params.token });

    if (!trip) {
      return res.json({ status: 'denied', message: 'Invalid QR code — trip not found' });
    }

    if (trip.status === 'rejected') {
      return res.json({ status: 'denied', message: 'Trip was rejected by Transport Officer' });
    }

    if (trip.status === 'pending' || trip.status === 'assigned') {
      return res.json({ status: 'denied', message: 'Trip not yet approved by Admin' });
    }

    if (trip.status === 'completed') {
      return res.json({ status: 'denied', message: 'QR already used — trip completed' });
    }

    if (!['approved', 'in-progress'].includes(trip.status)) {
      return res.json({ status: 'denied', message: `Trip is not authorized for exit (status: ${trip.status})` });
    }

    if (trip.qrUsed) {
      return res.json({ status: 'denied', message: `QR already scanned at ${new Date(trip.qrUsedAt).toLocaleString()}` });
    }

    // Check if trip date is today or future
    const today = new Date().toISOString().slice(0, 10);
    const tripDate = tripDateOnly(trip.date);
    if (tripDate < today) {
      return res.json({ status: 'denied', message: `Trip expired — was scheduled for ${trip.date}` });
    }

    // Check if late (trip date is today but past reasonable time)
    const isLate = tripDate === today && new Date().getHours() > 20;

    // Mark QR as used
    trip.qrUsed = true;
    trip.qrUsedAt = new Date();
    if (trip.status !== 'in-progress') {
      trip.status = 'in-progress';
      trip.startedAt = new Date();
    }
    await trip.save();

    // Auto create gate log for trip exit
    const GateLog = require('../models/GateLog');
    await new GateLog({
      plateNumber: trip.assignedVehicle?.match(/\(([^)]+)\)/)?.[1] || trip.assignedVehicle || 'QR-SCAN',
      driverName: trip.assignedDriver,
      direction: 'exit',
      status: 'approved',
      tripId: trip._id,
      officer: req.user.name || 'Gate Officer',
      remarks: `QR scan verified (Trip Start/Exit)${isLate ? ' — LATE' : ''}`,
      exitTime: new Date(),
    }).save();

    return res.json({
      status: 'approved',
      message: isLate ? 'Access Granted — but vehicle is LATE' : 'Access Granted',
      isLate,
      trip: {
        _id:            trip._id,
        destination:    trip.destination,
        date:           trip.date,
        assignedVehicle: trip.assignedVehicle,
        assignedDriver: trip.assignedDriver,
        requester:      trip.requester,
        department:     trip.department,
        passengers:     trip.passengers,
        purpose:        trip.purpose,
        approvedBy:     trip.approvedBy,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/security/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'GATE_OFFICER', 'ADMIN', 'TRANSPORT')) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const [todayLogs, unauthorized, active, incidents] = await Promise.all([
      GateLog.countDocuments({ entryTime: { $gte: today, $lt: tomorrow } }),
      GateLog.countDocuments({ status: 'unauthorized', entryTime: { $gte: today, $lt: tomorrow } }),
      GateLog.countDocuments({ direction: 'entry', exitTime: null, entryTime: { $gte: today } }),
      IncidentReport.countDocuments({ status: 'open' }),
    ]);

    res.json({ todayCheckins: todayLogs, unauthorized, activeInside: active, openIncidents: incidents });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
