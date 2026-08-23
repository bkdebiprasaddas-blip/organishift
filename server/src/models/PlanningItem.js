const mongoose = require('mongoose');

const planningItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title must be at least 1 character'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanningItem',
      default: null,
      index: true
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventPlan',
      default: null,
      index: true
    },
    scope: {
      type: String,
      enum: ['LIBRARY', 'PLAN'],
      required: [true, 'Scope is required'],
      index: true
    },
    path: {
      type: String,
      required: true,
      default: ',',
      index: true
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
    sourceLibraryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanningItem',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    }
  },
  {
    timestamps: true
  }
);

// Compound index for plan ordering
planningItemSchema.index({ planId: 1, level: 1, order: 1 });

const PlanningItem = mongoose.model('PlanningItem', planningItemSchema);
module.exports = PlanningItem;
