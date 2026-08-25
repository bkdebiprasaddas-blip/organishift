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
    nodeType: {
      type: String,
      enum: ['FOLDER', 'TASK', 'MILESTONE'],
      default: 'TASK'
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },
    operationalNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Operational notes cannot exceed 2000 characters'],
      default: ''
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 30
    }],
    checklist: [{
      text: { type: String, required: true, trim: true },
      completed: { type: Boolean, default: false }
    }],
    comments: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: { type: String, default: 'User' },
      text: { type: String, required: true, trim: true },
      createdAt: { type: Date, default: Date.now }
    }],
    attachments: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: Date.now }
    }],
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
