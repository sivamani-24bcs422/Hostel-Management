const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Warden = require('../models/Warden');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const getProfile = async (user) => {
  if (user.role === 'student') {
    return Student.findOne({ user: user._id })
      .populate('hostel', 'name code type')
      .populate('room', 'roomNumber floor type');
  }
  if (user.role === 'warden') {
    return Warden.findOne({ user: user._id }).populate('hostel', 'name code type');
  }
  return null;
};

const buildSession = async (user) => {
  const profile = await getProfile(user);
  return {
    token: signToken(user._id),
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    },
    profile,
  };
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'Your account is inactive. Please contact the administrator.');
  }

  if (user.role === 'student') {
    const student = await Student.findOne({ user: user._id });
    if (!student || student.status === 'inactive') {
      throw new ApiError(403, 'Your student account is not active.');
    }
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const session = await buildSession(user);
  res.json({ success: true, message: 'Welcome back!', data: session });
});

const me = asyncHandler(async (req, res) => {
  const profile = await getProfile(req.user);
  res.json({
    success: true,
    data: {
      user: req.user,
      profile,
    },
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;
  const user = await User.findById(req.user._id);

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  res.json({ success: true, message: 'Profile updated successfully.', data: user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully.' });
});

const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = { login, me, updateProfile, changePassword, logout };
