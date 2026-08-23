const { z } = require('zod');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required')
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.isActive) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
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
    data: req.user
  });
});

module.exports = {
  login,
  getMe
};
