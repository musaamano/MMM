const mongoose = require('mongoose');

// Auto-detect high priority keywords
const HIGH_PRIORITY_KEYWORDS = ['brake', 'engine', 'fire', 'accident', 'steering', 'fuel leak', 'transmission'];

const maintenanceIssueSchema = new mongoose.Schema({
  vehicleId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  vehiclePlate: { type: String, required: true },
  reportedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reporterName: String,
  issue:        { type: String, required: true },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'in-progress', 'completed'],
    default: 'pending',
  },
  rejectionReason: String,
  approvedBy:   String,
  approvedAt:   Date,
  completedAt:  Date,
  expectedWaitHours: Number,
  expectedCompletionAt: Date,
  estimatedCost: Number,
  actualCost:   Number,
  errorFaced:   String,
  repairActions: String,
  vehicleStatusAfter: { type: String, enum: ['active', 'under maintenance'] },
  partsUsed:    [{ partName: String, quantity: Number, cost: Number }],
  notes:        String,
  images:       [String], // base64 images
  autoFlagged:  { type: Boolean, default: false }, // flagged by keyword detection
}, { timestamps: true });

// Auto-detect priority from keywords before save
maintenanceIssueSchema.pre('save', function (next) {
  const issueLower = this.issue.toLowerCase();
  const isHighPriority = HIGH_PRIORITY_KEYWORDS.some(kw => issueLower.includes(kw));
  if (isHighPriority && this.priority !== 'Critical') {
    this.priority = 'High';
    this.autoFlagged = true;
  }
  next();
});

module.exports = mongoose.model('MaintenanceIssue', maintenanceIssueSchema);
