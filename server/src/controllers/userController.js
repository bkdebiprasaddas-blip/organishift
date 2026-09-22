const { z } = require('zod');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');

const createUserSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).optional()
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).optional(),
  isActive: z.boolean().optional()
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true }).select('-passwordHash').sort({ name: 1 });
  return res.status(200).json({
    success: true,
    data: users,
    message: 'Users retrieved'
  });
});

const createUser = asyncHandler(async (req, res) => {
  const parsed = createUserSchema.parse(req.body);
  const existing = await User.findOne({ email: parsed.email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'DUPLICATE_RESOURCE', 'A user with that email already exists');
  }

  const user = new User({
    name: parsed.name,
    email: parsed.email,
    passwordHash: parsed.password,
    role: parsed.role || 'MEMBER',
    createdBy: req.user._id
  });

  await user.save();

  return res.status(201).json({
    success: true,
    data: user,
    message: 'User created successfully'
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }
  return res.status(200).json({
    success: true,
    data: user,
    message: 'User retrieved'
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const parsed = updateUserSchema.parse(req.body);
  const user = await userService.updateUser(req.params.id, parsed, req.user);
  return res.status(200).json({
    success: true,
    data: user,
    message: 'User updated successfully'
  });
});

const deactivateUser = asyncHandler(async (req, res) => {
  await userService.deactivateUser(req.params.id, req.user);
  return res.status(200).json({
    success: true,
    message: 'User deactivated successfully'
  });
});

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deactivateUser
};
