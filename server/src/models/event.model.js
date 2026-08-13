const mongoose = require('mongoose');
const { EVENT_STATUS } = require('../utils/enums');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: Object.values(EVENT_STATUS), default: EVENT_STATUS.DRAFT },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

eventSchema.index({ status: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ startDate: 1 });

module.exports = mongoose.model('Event', eventSchema);
