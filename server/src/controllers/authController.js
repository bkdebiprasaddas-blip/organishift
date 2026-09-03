const { z } = require('zod');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required')
});

// Pre-computed dummy hash for timing-safe unknown-user responses (SV-L8)
const DUMMY_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email: email.toLowerCase() });
  
  // SV-L8: dummy bcrypt compare for unknown users to equalize timing
  const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
  const isMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !user.isActive || !isMatch) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return res.status(200).json({
    success: true,
    data: {
      token,
      user
    },
    message: 'Logged in successfully'
  });
});

const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user,
    message: 'User profile retrieved'
  });
});

module.exports = {
  login,
  getMe
};
