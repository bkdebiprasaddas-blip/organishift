const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// SV-M8: shared guard — throws if `user` is currently the last active admin.
// No-op when `user` isn't an active admin (nothing would be removed).
async function assertNotLastActiveAdmin(user, message) {
  if (user.role !== 'ADMIN' || !user.isActive) return;
  const adminCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
  if (adminCount <= 1) {
    throw new ApiError(409, 'VALIDATION_ERROR', message);
  }
}

class UserService {
  async updateUser(userId, patch, requestingUser) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found');
    }

    // SV-M8: prevent self-demotion/deactivation
    if (String(userId) === String(requestingUser._id)) {
      if (patch.role && patch.role !== user.role) {
        throw new ApiError(409, 'VALIDATION_ERROR', 'Cannot change your own role');
      }
      if (patch.isActive === false) {
        throw new ApiError(409, 'VALIDATION_ERROR', 'Cannot deactivate yourself');
      }
    }

    // SV-M8: prevent removing the last active admin
    if (patch.role && patch.role !== 'ADMIN') {
      await assertNotLastActiveAdmin(user, 'Cannot demote the last active admin');
    }
    if (patch.isActive === false) {
      await assertNotLastActiveAdmin(user, 'Cannot deactivate the last active admin');
    }

    if (patch.name) user.name = patch.name;
    if (patch.role) user.role = patch.role;
    if (patch.isActive !== undefined) user.isActive = patch.isActive;

    await user.save();
    return user;
  }

  // Soft-deactivates a user (isActive = false) — does not delete the record.
  async deactivateUser(userId, requestingUser) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found');
    }

    // SV-M8: prevent self-deactivation
    if (String(userId) === String(requestingUser._id)) {
      throw new ApiError(409, 'VALIDATION_ERROR', 'Cannot deactivate yourself');
    }

    // SV-M8: prevent removing the last active admin
    await assertNotLastActiveAdmin(user, 'Cannot deactivate the last active admin');

    user.isActive = false;
    await user.save();
    return user;
  }
}

module.exports = new UserService();
