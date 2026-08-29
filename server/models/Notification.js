const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: { type: String }, // e.g. 'ADMIN', 'TRANSPORT', 'FUEL_OFFICER', 'MAINTENANCE_OFFICER', 'DRIVER'
    recipientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // specific user (optional)
    title:         { type: String, required: true },
    message:       { type: String, required: true },
    type:          { type: String, enum: ['trip', 'fuel', 'maintenance', 'general'], default: 'general' },
    refId:         { type: String }, // related document id
    read:          { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
