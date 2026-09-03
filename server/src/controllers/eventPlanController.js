const { z } = require('zod');
const EventPlan = require('../models/EventPlan');
const PlanningItem = require('../models/PlanningItem');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const buildTree = require('../utils/buildTree');
const eventPlanService = require('../services/eventPlanService');

const createPlanSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  category: z.string().max(60).optional(),
  isTemplate: z.boolean().optional()
});

const updatePlanSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(60).optional(),
  isTemplate: z.boolean().optional()
});

const getPlans = asyncHandler(async (req, res) => {
  const plans = await EventPlan.find({}).sort({ updatedAt: -1 });
  return res.status(200).json({
    success: true,
    data: plans,
    message: 'Event plans retrieved'
  });
});

const createPlan = asyncHandler(async (req, res) => {
  const parsed = createPlanSchema.parse(req.body);
  const plan = new EventPlan({
    title: parsed.title,
    description: parsed.description || '',
    category: parsed.category || 'General',
    isTemplate: parsed.isTemplate || false,
    createdBy: req.user._id
  });
  await plan.save();

  return res.status(201).json({
    success: true,
    data: plan,
    message: 'Event plan created'
  });
});

const getPlanById = asyncHandler(async (req, res) => {
  const plan = await EventPlan.findById(req.params.id);
  if (!plan) {
    throw new ApiError(404, 'PLAN_NOT_FOUND', 'Event plan not found');
  }

  const items = await PlanningItem.find({ planId: plan._id, scope: 'PLAN' }).sort({ level: 1, order: 1 });
  const tree = buildTree(items);

  return res.status(200).json({
    success: true,
    data: {
      plan,
      tree
    },
    message: 'Event plan retrieved'
  });
});

const updatePlan = asyncHandler(async (req, res) => {
  const parsed = updatePlanSchema.parse(req.body);
  const plan = await EventPlan.findById(req.params.id);
  if (!plan) {
    throw new ApiError(404, 'PLAN_NOT_FOUND', 'Event plan not found');
  }

  if (parsed.title !== undefined) plan.title = parsed.title;
  if (parsed.description !== undefined) plan.description = parsed.description;
  if (parsed.category !== undefined) plan.category = parsed.category;
  if (parsed.isTemplate !== undefined) plan.isTemplate = parsed.isTemplate;

  await plan.save();

  return res.status(200).json({
    success: true,
    data: plan,
    message: 'Event plan updated'
  });
});

const deletePlan = asyncHandler(async (req, res) => {
  await eventPlanService.deletePlanCascade(req.params.id);

  return res.status(200).json({
    success: true,
    message: 'Event plan and associated items deleted'
  });
});

const copyFromLibrary = asyncHandler(async (req, res) => {
  const { libraryItemId } = req.body;
  if (!libraryItemId || typeof libraryItemId !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'libraryItemId is required');
  }

  const createdPlanItems = await eventPlanService.copyFromLibrary(
    req.params.id,
    libraryItemId,
    req.user._id
  );

  return res.status(201).json({
    success: true,
    data: {
      copiedCount: createdPlanItems.length
    },
    message: `Copied ${createdPlanItems.length} items from library into plan`
  });
});

module.exports = {
  getPlans,
  createPlan,
  getPlanById,
  updatePlan,
  deletePlan,
  copyFromLibrary
};
