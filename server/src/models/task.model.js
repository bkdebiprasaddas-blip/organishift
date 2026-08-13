const mongoose = require('mongoose');
const { TASK_STATUS, TASK_PRIORITY } = require('../utils/enums');

const taskSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: Object.values(TASK_STATUS), default: TASK_STATUS.TODO },
    priority: { type: String, enum: Object.values(TASK_PRIORITY), default: TASK_PRIORITY.MEDIUM },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    dueDate: { type: Date },
    completedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

taskSchema.index({ status: 1 });
taskSchema.index({ eventId: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
