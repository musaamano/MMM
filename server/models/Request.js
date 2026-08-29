const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    requester: { type: String, required: true },
    requesterUsername: { type: String, default: '' },
    department: { type: String, required: true },
    destination: { type: String, required: true },
    purpose: String,
    date: { type: String, required: true },
    returnDate: String,
    passengers: { type: Number, required: true },
    priority: {
      type: String,
      enum: ['emergency', 'high', 'normal', 'low'],
      default: 'normal',
    },
    vehicleType: String,
    specialRequirements: String,
    status: {
      type: String,
      enum: ['pending', 'assigned', 'approved', 'rejected', 'in-progress', 'completed'],
      default: 'pending',
    },
    assignedVehicle: String,
    assignedVehicleId: String,
    assignedDriver: String,
    approvedBy: String,
    rejectionReason: String,
    startedAt: Date,
    completedAt: Date,
    // QR Code fields
    qrToken:     { type: String, unique: true, sparse: true },
    qrGenerated: { type: Boolean, default: false },
    qrUsed:      { type: Boolean, default: false },
    qrUsedAt:    Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Request', requestSchema);
