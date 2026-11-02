const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Warden = require('../models/Warden');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized. Please log in.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Account is inactive or no longer exists.');
  }

  req.user = user;

  if (user.role === 'student') {
    req.studentProfile = await Student.findOne({ user: user._id }).populate('hostel', 'name code type').populate('room', 'roomNumber');
  }

  if (user.role === 'warden') {
    req.wardenProfile = await Warden.findOne({ user: user._id }).populate('hostel', 'name code type');
  }

  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action.'));
  }
  next();
};

const scopeToWardenHostel = (req) => {
  if (req.user.role === 'warden') {
    return req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel || null;
  }
  return null;
};

module.exports = { protect, authorize, scopeToWardenHostel };
