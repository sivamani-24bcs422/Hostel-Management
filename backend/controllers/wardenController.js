const User = require('../models/User');
const Warden = require('../models/Warden');
const Hostel = require('../models/Hostel');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination, buildSort } = require('../utils/helpers');

const USER_FIELDS = 'name email phone avatar isActive createdAt';

const listWardens = asyncHandler(async (req, res) => {
  const { q, hostel, status } = req.query;
  const filter = {};
  if (hostel) filter.hostel = hostel;
  if (status) filter.status = status;

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ role: 'warden', $or: [{ name: regex }, { email: regex }] }).select('_id');
    filter.$or = [{ employeeId: regex }, { designation: regex }, { user: { $in: users.map((user) => user._id) } }];
  }

  const { page, limit, skip } = buildPagination(req.query);
  const sort = buildSort(req.query.sortBy, req.query.order, '-createdAt');

  const [wardens, total] = await Promise.all([
    Warden.find(filter)
      .populate('user', USER_FIELDS)
      .populate('hostel', 'name code type')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Warden.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: wardens,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getWarden = asyncHandler(async (req, res) => {
  const warden = await Warden.findById(req.params.id)
    .populate('user', USER_FIELDS)
    .populate('hostel', 'name code type');
  if (!warden) throw new ApiError(404, 'Warden not found.');
  res.json({ success: true, data: warden });
});

const createWarden = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    employeeId,
    hostel,
    designation,
    qualification,
    gender,
    joiningDate,
    status,
    address,
  } = req.body;

  const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existingUser) throw new ApiError(409, 'A user with this email already exists.');

  const existingEmployee = await Warden.findOne({ employeeId: String(employeeId).toUpperCase().trim() });
  if (existingEmployee) throw new ApiError(409, 'A warden with this employee ID already exists.');

  if (hostel) {
    const hostelExists = await Hostel.findById(hostel);
    if (!hostelExists) throw new ApiError(404, 'Selected hostel not found.');
  }

  const user = await User.create({
    name,
    email,
    password: password || process.env.SEED_PASSWORD || 'Password@123',
    phone,
    role: 'warden',
  });

  try {
    const warden = await Warden.create({
      user: user._id,
      employeeId,
      hostel: hostel || null,
      designation,
      qualification,
      gender,
      joiningDate: joiningDate || Date.now(),
      status,
      address,
    });

    const populated = await Warden.findById(warden._id)
      .populate('user', USER_FIELDS)
      .populate('hostel', 'name code type');
    res.status(201).json({ success: true, message: 'Warden created successfully.', data: populated });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }
});

const updateWarden = asyncHandler(async (req, res) => {
  const warden = await Warden.findById(req.params.id);
  if (!warden) throw new ApiError(404, 'Warden not found.');

  const user = await User.findById(warden.user);
  if (!user) throw new ApiError(404, 'Linked user account not found.');

  const editable = ['employeeId', 'hostel', 'designation', 'qualification', 'gender', 'joiningDate', 'status', 'address'];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) warden[field] = req.body[field] || (field === 'hostel' ? null : req.body[field]);
  });

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
  if (req.body.email !== undefined) {
    const duplicate = await User.findOne({ email: req.body.email, _id: { $ne: user._id } });
    if (duplicate) throw new ApiError(409, 'This email is already in use.');
    user.email = req.body.email;
  }
  if (req.body.hostel) {
    const hostelExists = await Hostel.findById(req.body.hostel);
    if (!hostelExists) throw new ApiError(404, 'Selected hostel not found.');
  }

  await Promise.all([user.save(), warden.save()]);

  const populated = await Warden.findById(warden._id)
    .populate('user', USER_FIELDS)
    .populate('hostel', 'name code type');

  res.json({ success: true, message: 'Warden updated successfully.', data: populated });
});

const deleteWarden = asyncHandler(async (req, res) => {
  const warden = await Warden.findById(req.params.id);
  if (!warden) throw new ApiError(404, 'Warden not found.');

  await Promise.all([User.findByIdAndDelete(warden.user), warden.deleteOne()]);
  res.json({ success: true, message: 'Warden deleted successfully.' });
});

module.exports = { listWardens, getWarden, createWarden, updateWarden, deleteWarden };
