const mongoose = require('mongoose');

const fuelRequestSchema = new mongoose.Schema(
  {
    driver:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverName:       { type: String, required: true },
    vehicle:          { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    vehicleType:      { type: String, default: '' },
    vehiclePlate:     String,
    vehicleModel:     String,
    fuelType:         { type: String, enum: ['Diesel', 'Petrol'], required: true },
    requestedLiters:  { type: Number, required: true },
    destination:      { type: String, required: true },
    purpose:          String,
    odometer:         { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'cancelled', 'dispensed', 'confirmed'],
      default: 'pending',
    },
    // Transport officer fills these on approval
    permittedLiters:  Number,
    approvedBy:       String,
    approvedAt:       Date,
    approvalKey:      String,
    rejectionReason:  String,
    cancelledAt:      Date,
    // Fuel station fills this on dispense
    dispensedLiters:  Number,
    dispensedBy:      String,
    dispensedAt:      Date,
    // Driver confirms receipt
    confirmedAt:      Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('FuelRequest', fuelRequestSchema);
