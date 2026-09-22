const mongoose = require('mongoose');

const eventPlanSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Plan title is required'],
      trim: true,
      minlength: [3, 'Plan title must be at least 3 characters'],
      maxlength: [120, 'Plan title cannot exceed 120 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    isTemplate: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const EventPlan = mongoose.model('EventPlan', eventPlanSchema);
module.exports = EventPlan;
