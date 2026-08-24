const { z } = require('zod');
const planningService = require('../services/planningService');
const PlanningItem = require('../models/PlanningItem');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const createItemSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  parentId: z.string().nullable().optional(),
  planId: z.string().nullable().optional(),
  scope: z.enum(['LIBRARY', 'PLAN']),
  order: z.number().optional()
});

const updateItemSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  order: z.number().optional()
});

const getItems = asyncHandler(async (req, res) => {
  const tree = await planningService.getTree(req.query);
  return res.status(200).json({
    success: true,
    data: tree
  });
});

const createItem = asyncHandler(async (req, res) => {
  const parsed = createItemSchema.parse(req.body);
  const item = await planningService.createItem(parsed, req.user._id);
  return res.status(201).json({
    success: true,
    data: item,
    message: 'Planning item created successfully'
  });
});

const getItemById = asyncHandler(async (req, res) => {
  const item = await PlanningItem.findById(req.params.id);
  if (!item) {
    throw new ApiError(404, 'NOT_FOUND', 'Planning item not found');
  }
  return res.status(200).json({
    success: true,
    data: item
  });
});

const updateItem = asyncHandler(async (req, res) => {
  const parsed = updateItemSchema.parse(req.body);
  const item = await PlanningItem.findById(req.params.id);
  if (!item) {
    throw new ApiError(404, 'NOT_FOUND', 'Planning item not found');
  }

  if (parsed.title !== undefined) item.title = parsed.title;
  if (parsed.description !== undefined) item.description = parsed.description;
  if (parsed.order !== undefined) item.order = parsed.order;

  await item.save();

  return res.status(200).json({
    success: true,
    data: item,
    message: 'Planning item updated'
  });
});

const moveItem = asyncHandler(async (req, res) => {
  const { newParentId } = req.body;
  const item = await planningService.moveItem(req.params.id, newParentId);
  return res.status(200).json({
    success: true,
    data: item,
    message: 'Planning item moved successfully'
  });
});

const deleteItem = asyncHandler(async (req, res) => {
  const result = await planningService.deleteSubtree(req.params.id);
  return res.status(200).json({
    success: true,
    data: result,
    message: `Deleted item and ${result.deletedCount - 1} descendants`
  });
});

module.exports = {
  getItems,
  createItem,
  getItemById,
  updateItem,
  moveItem,
  deleteItem
};
