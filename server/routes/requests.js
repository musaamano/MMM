const router = require('express').Router();
const crypto = require('crypto');
const QRCode = require('qrcode');
const Request = require('../models/Request');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Notification = require('../models/Notification');
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

// Notify a specific user by username
const notifyUser = async (username, notif) => {
  if (!username) return;
  const user = await User.findOne({ username }).select('_id');
  if (user) await notify([{ ...notif, recipientId: user._id }]);
};

// Notify a specific user by user id
const notifyUserById = async (userId, notif) => {
  if (!userId) return;
  await notify([{ ...notif, recipientId: userId }]);
};

// Notify requester robustly (username first, then name fallback)
const notifyRequester = async (requestDoc, notif) => {
  if (!requestDoc) return;
  if (requestDoc.requesterUsername) {
    await notifyUser(requestDoc.requesterUsername, notif);
    return;
  }
  if (requestDoc.requester) {
    const requesterRecord = await User.findOne({ name: requestDoc.requester }).select('_id');
    if (requesterRecord) {
      await notifyUserById(requesterRecord._id, notif);
    }
  }
};

// GET /api/requests
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.requesterUsername) filter.requesterUsername = req.query.requesterUsername;

    const requests = await Request.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/requests
router.post('/', authMiddleware, async (req, res) => {
  try {
    const request = new Request(req.body);
    await request.save();
    // Notify ADMIN and TRANSPORT on new trip request
    await notify([
      { recipientRole: 'ADMIN',     title: 'New Trip Request', message: `${req.body.requester} requested a trip to ${req.body.destination}`, type: 'trip', refId: request._id.toString() },
      { recipientRole: 'TRANSPORT', title: 'New Trip Request', message: `${req.body.requester} requested a trip to ${req.body.destination}`, type: 'trip', refId: request._id.toString() },
    ]);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/requests/:id/start
router.put('/:id/start', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'DRIVER', 'TRANSPORT', 'ADMIN', 'GATE_OFFICER')) return;
    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      { status: 'in-progress', startedAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Request not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/requests/:id/complete
router.put('/:id/complete', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'DRIVER', 'TRANSPORT', 'ADMIN')) return;
    // Free up the vehicle
    const request = await Request.findById(req.params.id);
    if (request?.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(request.assignedVehicleId, { status: 'available' });
    }
    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Request not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/requests/:id/assign
router.put('/:id/assign', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'TRANSPORT', 'ADMIN')) return;
    const { vehicleId } = req.body;

    // Find the vehicle and mark it in-use
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (vehicle.status !== 'available') return res.status(400).json({ message: 'Vehicle is not available' });

    vehicle.status = 'in-use';
    await vehicle.save();

    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      {
        status: 'assigned',
        assignedVehicle: `${vehicle.model} (${vehicle.plateNumber})`,
        assignedVehicleId: vehicleId,
        assignedDriver: vehicle.assignedDriverName || '',
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Request not found' });

    // Notify ADMIN that the trip is awaiting their final approval
    await notify([{ recipientRole: 'ADMIN', title: 'Trip Assigned', message: `Transport Office assigned a vehicle for ${updated.requester}'s trip to ${updated.destination}. Awaiting approval.`, type: 'trip', refId: updated._id.toString() }]);

    // Notify the user (requester)
    await notifyRequester(updated, {
      title: 'Vehicle Assigned',
      message: `Transport Office has assigned a vehicle (${updated.assignedVehicle}) for your trip to ${updated.destination}. Awaiting Admin approval.`,
      type: 'trip',
      refId: updated._id.toString(),
    });

    // Notify the assigned driver using the vehicle's linked driver user id
    if (vehicle.assignedDriver) {
      await notifyUserById(vehicle.assignedDriver, {
        title: 'Trip Assigned',
        message: `You have been assigned to drive ${updated.requester} to ${updated.destination}. Awaiting Admin approval.`,
        type: 'trip',
        refId: updated._id.toString(),
      });
    } else if (updated.assignedDriver) {
      // Backward-compatible fallback for legacy records where only name exists
      const assignedDriverRecord = await User.findOne({ name: updated.assignedDriver, role: 'DRIVER' }).select('_id');
      if (assignedDriverRecord) {
        await notifyUserById(assignedDriverRecord._id, {
          title: 'Trip Assigned',
          message: `You have been assigned to drive ${updated.requester} to ${updated.destination}. Awaiting Admin approval.`,
          type: 'trip',
          refId: updated._id.toString(),
        });
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/requests/:id/approve
router.put('/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'ADMIN')) return;
    const { approvedBy } = req.body;

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'approved';
    request.approvedBy = approvedBy || 'Admin';

    // Generate QR token on approval
    if (!request.qrGenerated) {
      const qrToken = crypto.randomBytes(20).toString('hex');
      request.qrToken = qrToken;
      request.qrGenerated = true;
    }

    const updated = await request.save();

    // Notify the specific requester that trip was approved
    await notifyRequester(updated, {
      title: 'Trip Approved ✅',
      message: `Your trip to ${updated.destination} on ${updated.date} has been approved. Vehicle: ${updated.assignedVehicle}. Driver: ${updated.assignedDriver || 'TBD'}`,
      type: 'trip', refId: updated._id.toString(),
    });
    // Also notify TRANSPORT for their records
    await notify([{ recipientRole: 'TRANSPORT', title: 'Trip Approved', message: `Admin approved the assigned trip to ${updated.destination} for ${updated.requester}.`, type: 'trip', refId: updated._id.toString() }]);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/requests/:id/reject
router.put('/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'TRANSPORT', 'ADMIN')) return;
    const { rejectionReason } = req.body;
    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Request not found' });
    await notifyRequester(updated, {
      title: 'Trip Rejected ❌',
      message: `Your trip to ${updated.destination} was rejected. Reason: ${rejectionReason || 'N/A'}`,
      type: 'trip', refId: updated._id.toString(),
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/requests/:id  (generic update)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'ADMIN')) return;
    const updated = await Request.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Request not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/requests/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'ADMIN')) return;
    await Request.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/requests/:id/qr — get QR code image for approved trip
router.get('/:id/qr', authMiddleware, async (req, res) => {
  try {
    const trip = await Request.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    if (trip.status !== 'approved' && trip.status !== 'in-progress') {
      return res.status(400).json({ message: 'Trip is not approved yet' });
    }

    // Generate token if not already done
    if (!trip.qrToken) {
      trip.qrToken = crypto.randomBytes(20).toString('hex');
      trip.qrGenerated = true;
      await trip.save();
    }

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/gate/scan/${trip.qrToken}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    });

    res.json({
      qrCode: qrDataUrl,
      token: trip.qrToken,
      verifyUrl,
      trip: {
        destination: trip.destination,
        date: trip.date,
        assignedVehicle: trip.assignedVehicle,
        assignedDriver: trip.assignedDriver,
        status: trip.status,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/requests/:id/cancel — admin cancels an approved/in-progress trip
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    if (!requireRole(req, res, 'ADMIN')) return;
    const { reason } = req.body;
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Free up the vehicle if assigned
    if (request.assignedVehicleId) {
      await Vehicle.findByIdAndUpdate(request.assignedVehicleId, { status: 'available' });
    }

    const updated = await Request.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason || 'Cancelled by Admin' },
      { new: true }
    );

    // Notify the requester
    await notifyRequester(updated, {
      title: 'Trip Cancelled ⚠️',
      message: `Your trip to ${updated.destination} on ${updated.date} has been cancelled by Admin. ${reason ? 'Reason: ' + reason : ''}`,
      type: 'trip', refId: updated._id.toString(),
    });
    // Notify transport
    await notify([{
      recipientRole: 'TRANSPORT', title: 'Trip Cancelled by Admin',
      message: `Admin cancelled the trip to ${updated.destination} for ${updated.requester}. Vehicle has been freed.`,
      type: 'trip', refId: updated._id.toString(),
    }]);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
