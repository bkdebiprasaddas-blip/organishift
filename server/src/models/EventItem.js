const mongoose = require('mongoose');

const eventItemSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
      index: true
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventItem',
      default: null
    },
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
      minlength: [1, 'Title must be at least 1 character'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    path: {
      type: String,
      required: true,
      default: ','
    },
    level: {
      type: Number,
      required: true,
      default: 0
    },
    order: {
      type: Number,
      default: 0
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'],
      default: 'NOT_STARTED'
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    dueDate: {
      type: Date,
      default: null,
      index: true
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    sourcePlanningItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanningItem',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
eventItemSchema.index({ eventId: 1, level: 1, order: 1 });
eventItemSchema.index({ dueDate: 1, status: 1 });

const EventItem = mongoose.model('EventItem', eventItemSchema);
module.exports = EventItem;
