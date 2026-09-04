const { z } = require('zod');
const planningService = require('../services/planningService');
const PlanningItem = require('../models/PlanningItem');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const createItemSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  operationalNotes: z.string().max(2000).optional(),
  nodeType: z.enum(['FOLDER', 'TASK', 'MILESTONE']).optional(),
  tags: z.array(z.string()).optional(),
  checklist: z.array(z.object({
    text: z.string(),
    completed: z.boolean().optional()
  })).optional(),
  parentId: z.string().nullable().optional(),
  planId: z.string().nullable().optional(),
  scope: z.enum(['LIBRARY', 'PLAN']),
  order: z.number().optional()
});

const updateItemSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  operationalNotes: z.string().max(2000).optional(),
  nodeType: z.enum(['FOLDER', 'TASK', 'MILESTONE']).optional(),
  tags: z.array(z.string()).optional(),
  checklist: z.array(z.object({
    text: z.string(),
    completed: z.boolean().optional()
  })).optional(),
  order: z.number().optional()
});

const getItems = asyncHandler(async (req, res) => {
  const tree = await planningService.getTree(req.query);
  return res.status(200).json({
    success: true,
    data: tree,
    message: 'Planning items retrieved'
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
     data: item,
     message: 'Planning item retrieved'
   });
 });

const updateItem = asyncHandler(async (req, res) => {
  const parsed = updateItemSchema.parse(req.body);
  const item = await planningService.updateItem(req.params.id, parsed);
  return res.status(200).json({
    success: true,
    data: item,
    message: 'Planning item updated'
  });
});

const moveItem = asyncHandler(async (req, res) => {
  // SV-L6: validate body — newParentId required (missing -> 400, not silent move-to-root)
  const schema = z.object({
    newParentId: z.string().nullable()
  });
  const parsed = schema.parse(req.body);
  const item = await planningService.moveItem(req.params.id, parsed.newParentId);
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
