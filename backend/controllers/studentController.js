const User = require('../models/User');
const Student = require('../models/Student');
const Allocation = require('../models/Allocation');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Complaint = require('../models/Complaint');
const Visitor = require('../models/Visitor');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination, buildSort } = require('../utils/helpers');
const { syncRoomOccupancy } = require('../services/roomService');

const USER_FIELDS = 'name email phone avatar isActive createdAt';

const buildStudentFilter = async (req) => {
  const { q, hostel, status, year, course, gender } = req.query;
  const filter = {};

  if (req.user.role === 'warden') {
    const wardenHostel = req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel;
    filter.hostel = wardenHostel || null;
  } else if (hostel) {
    filter.hostel = hostel;
  }

  if (status) filter.status = status;
  if (year) filter.year = Number(year);
  if (gender) filter.gender = gender;
  if (course) filter.course = new RegExp(escapeRegex(course), 'i');

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ role: 'student', $or: [{ name: regex }, { email: regex }] }).select('_id');
    filter.$or = [
      { rollNo: regex },
      { course: regex },
      { department: regex },
      { guardianName: regex },
      { user: { $in: users.map((user) => user._id) } },
    ];
  }

  return filter;
};

const listStudents = asyncHandler(async (req, res) => {
  const filter = await buildStudentFilter(req);
  const { page, limit, skip } = buildPagination(req.query);
  const sort = buildSort(req.query.sortBy, req.query.order, '-createdAt');

  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate('user', USER_FIELDS)
      .populate('hostel', 'name code type')
      .populate('room', 'roomNumber floor type')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Student.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: students,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('user', USER_FIELDS)
    .populate('hostel', 'name code type')
    .populate('room', 'roomNumber floor type capacity');

  if (!student) throw new ApiError(404, 'Student not found.');

  if (
    req.user.role === 'warden' &&
    String(student.hostel?._id || student.hostel) !== String(req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel)
  ) {
    throw new ApiError(403, 'This student is not in your assigned hostel.');
  }
  if (req.user.role === 'student' && String(student._id) !== String(req.studentProfile?._id)) {
    throw new ApiError(403, 'You can only view your own profile.');
  }

  const [currentAllocation, feeSummary, attendanceSummary] = await Promise.all([
    Allocation.findOne({ student: student._id, status: 'active' }).populate('hostel room'),
    Fee.aggregate([
      { $match: { student: student._id } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          paid: { $sum: '$paidAmount' },
        },
      },
    ]),
    Attendance.aggregate([
      { $match: { student: student._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      ...student.toObject(),
      currentAllocation,
      feeSummary: { total: feeSummary[0]?.total || 0, paid: feeSummary[0]?.paid || 0 },
      attendanceSummary,
    },
  });
});

const createStudent = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    rollNo,
    course,
    department,
    year,
    semester,
    gender,
    dateOfBirth,
    bloodGroup,
    guardianName,
    guardianPhone,
    guardianEmail,
    address,
    city,
    state,
    pincode,
    admissionDate,
    status,
    notes,
  } = req.body;

  const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existingUser) throw new ApiError(409, 'A user with this email already exists.');

  const existingRoll = await Student.findOne({ rollNo: String(rollNo).toUpperCase().trim() });
  if (existingRoll) throw new ApiError(409, 'A student with this roll number already exists.');

  const user = await User.create({
    name,
    email,
    password: password || process.env.SEED_PASSWORD || 'Password@123',
    phone,
    role: 'student',
  });

  try {
    const student = await Student.create({
      user: user._id,
      rollNo,
      course,
      department,
      year,
      semester,
      gender,
      dateOfBirth: dateOfBirth || null,
      bloodGroup,
      guardianName,
      guardianPhone,
      guardianEmail,
      address,
      city,
      state,
      pincode,
      admissionDate: admissionDate || Date.now(),
      status,
      notes,
    });

    const populated = await Student.findById(student._id).populate('user', USER_FIELDS);
    res.status(201).json({ success: true, message: 'Student created successfully.', data: populated });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }
});

const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found.');

  const user = await User.findById(student.user);
  if (!user) throw new ApiError(404, 'Linked user account not found.');

  const editable = [
    'rollNo',
    'course',
    'department',
    'year',
    'semester',
    'gender',
    'dateOfBirth',
    'bloodGroup',
    'guardianName',
    'guardianPhone',
    'guardianEmail',
    'address',
    'city',
    'state',
    'pincode',
    'admissionDate',
    'status',
    'notes',
  ];

  editable.forEach((field) => {
    if (req.body[field] !== undefined) student[field] = req.body[field];
  });

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
  if (req.body.email !== undefined) {
    const duplicate = await User.findOne({ email: req.body.email, _id: { $ne: user._id } });
    if (duplicate) throw new ApiError(409, 'This email is already in use.');
    user.email = req.body.email;
  }
  if (student.isModified('rollNo')) {
    const duplicateRoll = await Student.findOne({ rollNo: student.rollNo, _id: { $ne: student._id } });
    if (duplicateRoll) throw new ApiError(409, 'This roll number is already in use.');
  }

  await Promise.all([user.save(), student.save()]);

  const populated = await Student.findById(student._id)
    .populate('user', USER_FIELDS)
    .populate('hostel', 'name code type')
    .populate('room', 'roomNumber floor type');

  res.json({ success: true, message: 'Student updated successfully.', data: populated });
});

const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found.');

  const activeAllocation = await Allocation.findOne({ student: student._id, status: 'active' });
  if (activeAllocation) {
    activeAllocation.status = 'vacated';
    activeAllocation.vacatedAt = new Date();
    activeAllocation.vacateReason = 'Student record deleted';
    await activeAllocation.save();
    await syncRoomOccupancy(activeAllocation.room);
  }

  await Promise.all([
    Fee.deleteMany({ student: student._id }),
    Payment.deleteMany({ student: student._id }),
    Attendance.deleteMany({ student: student._id }),
    Complaint.deleteMany({ student: student._id }),
    Visitor.deleteMany({ student: student._id }),
    Allocation.deleteMany({ student: student._id }),
    User.findByIdAndDelete(student.user),
  ]);
  await student.deleteOne();

  res.json({ success: true, message: 'Student and all related records deleted.' });
});

module.exports = { listStudents, getStudent, createStudent, updateStudent, deleteStudent };
