const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../utils/enums');

const list = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const size = Math.min(Math.max(parseInt(req.query.size, 10) || 20, 1), 100);

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: escapeRegExp(req.query.search), $options: 'i' } },
      { email: { $regex: escapeRegExp(req.query.search), $options: 'i' } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * size).limit(size),
    User.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: { users, pagination: { page, size, total, pages: Math.ceil(total / size) } }
  });
});

const create = asyncHandler(async (req, res) => {
  const { name, email, password, role = ROLES.USER, isActive = true } = req.body;
  const cleanEmail = String(email).toLowerCase().trim();
  const exists = await User.findOne({ email: cleanEmail });
  if (exists) {
    throw new ApiError(409, 'Email already registered');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: String(name).trim(),
    email: cleanEmail,
    passwordHash,
    role,
    isActive
  });
  res.status(201).json({ success: true, data: { user } });
});

const update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const patch = {};
  if (req.body.role !== undefined) {
    patch.role = req.body.role;
  }
  if (req.body.isActive !== undefined) {
    patch.isActive = req.body.isActive === true || req.body.isActive === 'true';
  }

  // Never deactivate the only active admin.
  if (user.role === ROLES.ADMIN && patch.isActive === false) {
    const activeAdmins = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });
    if (activeAdmins <= 1) {
      throw new ApiError(400, 'Cannot deactivate the only active admin');
    }
  }

  const updated = await User.findByIdAndUpdate(user._id, patch, { new: true });
  res.status(200).json({ success: true, data: { user: updated } });
});

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { list, create, update };
