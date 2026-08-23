const { z } = require('zod');
const EventPlan = require('../models/EventPlan');
const PlanningItem = require('../models/PlanningItem');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const buildTree = require('../utils/buildTree');

const createPlanSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  category: z.string().optional(),
  isTemplate: z.boolean().optional()
});

const getPlans = asyncHandler(async (req, res) => {
  const plans = await EventPlan.find({}).sort({ updatedAt: -1 });
  return res.status(200).json({
    success: true,
    data: plans
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
    }
  });
});

const updatePlan = asyncHandler(async (req, res) => {
  const plan = await EventPlan.findById(req.params.id);
  if (!plan) {
    throw new ApiError(404, 'PLAN_NOT_FOUND', 'Event plan not found');
  }

  const { title, description, category, isTemplate } = req.body;
  if (title) plan.title = title;
  if (description !== undefined) plan.description = description;
  if (category) plan.category = category;
  if (isTemplate !== undefined) plan.isTemplate = isTemplate;

  await plan.save();

  return res.status(200).json({
    success: true,
    data: plan,
    message: 'Event plan updated'
  });
});

const deletePlan = asyncHandler(async (req, res) => {
  const plan = await EventPlan.findById(req.params.id);
  if (!plan) {
    throw new ApiError(404, 'PLAN_NOT_FOUND', 'Event plan not found');
  }

  await EventPlan.findByIdAndDelete(req.params.id);
  await PlanningItem.deleteMany({ planId: req.params.id, scope: 'PLAN' });

  return res.status(200).json({
    success: true,
    message: 'Event plan and associated items deleted'
  });
});

const copyFromLibrary = asyncHandler(async (req, res) => {
  const planId = req.params.id;
  const { libraryItemId } = req.body;

  const plan = await EventPlan.findById(planId);
  if (!plan) {
    throw new ApiError(404, 'PLAN_NOT_FOUND', 'Event plan not found');
  }

  const libRoot = await PlanningItem.findById(libraryItemId);
  if (!libRoot || libRoot.scope !== 'LIBRARY') {
    throw new ApiError(404, 'NOT_FOUND', 'Library item not found');
  }

  // Find all items in this library branch
  const pathRegex = new RegExp(`,${libRoot._id},`);
  const libBranch = await PlanningItem.find({
    $or: [{ _id: libRoot._id }, { path: pathRegex }]
  }).sort({ level: 1, order: 1 });

  const idMap = new Map();
  const createdPlanItems = [];

  for (const libItem of libBranch) {
    const parentPlanId = libItem.parentId ? idMap.get(String(libItem.parentId)) : null;

    const pItem = new PlanningItem({
      title: libItem.title,
      description: libItem.description,
      parentId: parentPlanId || null,
      planId: plan._id,
      scope: 'PLAN',
      path: ',',
      level: libItem.level,
      order: libItem.order,
      sourceLibraryItemId: libItem._id,
      createdBy: req.user._id
    });

    const parentPath = parentPlanId ? (await PlanningItem.findById(parentPlanId)).path : ',';
    pItem.path = `${parentPath}${pItem._id},`;
    await pItem.save();

    idMap.set(String(libItem._id), pItem._id);
    createdPlanItems.push(pItem);
  }

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
