const router = require('express').Router();
const crypto = require('crypto');
const FuelRequest = require('../models/FuelRequest');
const FuelInventory = require('../models/FuelInventory');
const FuelLog = require('../models/FuelLog');
const Notification = require('../models/Notification');
const Request = require('../models/Request');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const notify = (docs) => Notification.insertMany(docs).catch(console.error);
const hasRole = (req, ...roles) => roles.includes(req.user?.role);
const requireRole = (req, res, ...roles) => {
  if (!hasRole(req, ...roles)) {
    res.status(403).json({ message: 'Access denied' });
    return false;
  }
  return true;
};

// GET /api/fuel-requests
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.driver) filter.driver = req.query.driver;
    const requests = await FuelRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Drop stale indexes once on startup
FuelRequest.collection.dropIndex('requestId_1').catch(() => {});

// POST /api/fuel-requests  (driver submits)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'DRIVER')) return;

    // Check driver has an active assigned trip
    const user = await User.findById(req.user.id).select('name');
    const driverName = user?.name || req.body.driverName;
    const activeTrip = await Request.findOne({
      $or: [
        { assignedDriver: driverName },
        { driverUsername: req.user.username },
      ],
      status: { $in: ['approved', 'in-progress', 'started'] },
    });

    if (!activeTrip) {
      return res.status(400).json({
        message: 'You can only request fuel when you have an active assigned trip.',
      });
    }

    const request = new FuelRequest({ ...req.body, driver: req.user.id });
    await request.save();
    // Notify ADMIN and FUEL_OFFICER simultaneously
    await notify([
      { recipientRole: 'ADMIN',        title: 'New Fuel Request', message: `${driverName} requested ${req.body.requestedLiters}L of ${req.body.fuelType} for ${req.body.destination} (Trip: ${activeTrip.destination})`, type: 'fuel', refId: request._id.toString() },
      { recipientRole: 'FUEL_OFFICER', title: 'New Fuel Request', message: `${driverName} requested ${req.body.requestedLiters}L of ${req.body.fuelType} — awaiting Admin approval`, type: 'fuel', refId: request._id.toString() },
    ]);
    res.status(201).json(request);
  } catch (err) {
    console.error('FuelRequest POST error:', err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: messages });
    }
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/fuel-requests/:id/approve  (admin approves with permitted liters)
router.put('/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'ADMIN')) return;
    const { permittedLiters, approvedBy } = req.body;
    if (!permittedLiters || permittedLiters <= 0)
      return res.status(400).json({ message: 'Permitted liters must be a positive number' });

    const approvalKey = crypto.randomBytes(3).toString('hex').toUpperCase();

    const updated = await FuelRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', permittedLiters, approvedBy, approvedAt: new Date(), approvalKey },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Fuel request not found' });

    // Notify driver and fuel station
    await notify([
      { recipientId: updated.driver, title: 'Fuel Request Approved', message: `Approved: ${permittedLiters}L of ${updated.fuelType}. Your approval key is ${approvalKey}. Show this key at the fuel station.`, type: 'fuel', refId: updated._id.toString() },
      { recipientRole: 'FUEL_OFFICER', title: 'Fuel Request Approved', message: `Dispense ${permittedLiters}L ${updated.fuelType} to ${updated.driverName}. Verify key: ${approvalKey}`, type: 'fuel', refId: updated._id.toString() },
    ]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/fuel-requests/:id/reject  (admin rejects and auto-cancels)
router.put('/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'ADMIN')) return;
    const { rejectionReason } = req.body;
    const updated = await FuelRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', rejectionReason, cancelledAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Fuel request not found' });
    // Notify driver and fuel station that request was cancelled
    await notify([
      { recipientId: updated.driver, title: 'Fuel Request Cancelled', message: `Your fuel request was cancelled by Admin. Reason: ${rejectionReason || 'N/A'}`, type: 'fuel', refId: updated._id.toString() },
      { recipientRole: 'FUEL_OFFICER', title: 'Fuel Request Cancelled', message: `Do not dispense fuel for ${updated.driverName}. Request cancelled by Admin.`, type: 'fuel', refId: updated._id.toString() },
    ]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/fuel-requests/:id/dispense  (fuel station dispenses)
router.put('/:id/dispense', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'FUEL_OFFICER')) return;
    const { dispensedLiters, dispensedBy, approvalKey } = req.body;
    const fuelReq = await FuelRequest.findById(req.params.id);
    if (!fuelReq) return res.status(404).json({ message: 'Fuel request not found' });
    if (fuelReq.status !== 'approved')
      return res.status(400).json({ message: 'Only approved requests can be dispensed' });
    if (!approvalKey || approvalKey.trim().toUpperCase() !== String(fuelReq.approvalKey || '').toUpperCase()) {
      return res.status(400).json({ message: 'Invalid approval key' });
    }
    if (dispensedLiters > fuelReq.permittedLiters)
      return res.status(400).json({ message: `Cannot dispense more than permitted: ${fuelReq.permittedLiters}L` });

    // Deduct from inventory
    const inv = await FuelInventory.findOne({ fuelType: fuelReq.fuelType });
    if (inv) {
      if (inv.available < dispensedLiters)
        return res.status(400).json({ message: `Not enough ${fuelReq.fuelType} in stock. Available: ${inv.available}L` });
      inv.available = inv.available - dispensedLiters;
      inv.updatedBy = dispensedBy;
      await inv.save();
    }

    const updated = await FuelRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'dispensed', dispensedLiters, dispensedBy, dispensedAt: new Date() },
      { new: true }
    );

    // Log transaction in system
    await FuelLog.create({
      driver: fuelReq.driver,
      vehicle: fuelReq.vehiclePlate || fuelReq.vehicleModel || fuelReq.vehicleType || 'N/A',
      fuelAmount: dispensedLiters,
      cost: 0,
      odometer: fuelReq.odometer || 0,
      notes: `Fuel dispensed by ${dispensedBy || 'Fuel Officer'} (request ${fuelReq._id})`,
    });

    await notify([
      { recipientId: updated.driver, title: 'Fuel Dispensed', message: `${dispensedLiters}L of ${updated.fuelType} was dispensed.`, type: 'fuel', refId: updated._id.toString() },
      { recipientRole: 'ADMIN', title: 'Fuel Dispensed', message: `${dispensedLiters}L dispensed to ${updated.driverName} (${updated.fuelType}).`, type: 'fuel', refId: updated._id.toString() },
    ]);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/fuel-requests/:id/confirm  (driver confirms receipt)
router.put('/:id/confirm', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'DRIVER')) return;
    const fuelReq = await FuelRequest.findById(req.params.id);
    if (!fuelReq) return res.status(404).json({ message: 'Fuel request not found' });
    if (fuelReq.status !== 'dispensed')
      return res.status(400).json({ message: 'Only dispensed requests can be confirmed' });

    const updated = await FuelRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed', confirmedAt: new Date() },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
