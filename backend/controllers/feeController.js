const Fee = require('../models/Fee');
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination, buildSort, round2 } = require('../utils/helpers');

const resolveStatus = (fee) => {
  if (fee.paidAmount >= fee.amount && fee.amount > 0) return 'paid';
  if (fee.paidAmount > 0) return 'partial';
  return new Date(fee.dueDate) < new Date() ? 'overdue' : 'pending';
};

const refreshOverdueFees = async () => {
  await Fee.updateMany(
    { status: 'pending', dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue' } }
  );
};

const buildFeeFilter = async (req) => {
  const { q, hostel, status, type, student, academicYear, period } = req.query;
  const filter = {};

  if (req.user.role === 'student') {
    filter.student = req.studentProfile?._id || null;
  } else if (req.user.role === 'warden') {
    filter.hostel = req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel || null;
  } else if (hostel) {
    filter.hostel = hostel;
  }

  if (student) filter.student = student;
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (academicYear) filter.academicYear = academicYear;
  if (period) filter.period = period;

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ name: regex }).select('_id');
    const students = await Student.find({
      $or: [{ rollNo: regex }, { user: { $in: users.map((user) => user._id) } }],
    }).select('_id');
    filter.$or = [{ title: regex }, { period: regex }, { student: { $in: students.map((item) => item._id) } }];
  }

  return filter;
};

const listFees = asyncHandler(async (req, res) => {
  await refreshOverdueFees();
  const filter = await buildFeeFilter(req);
  const { page, limit, skip } = buildPagination(req.query);
  const sort = buildSort(req.query.sortBy, req.query.order, '-createdAt');

  const [fees, total, totals] = await Promise.all([
    Fee.find(filter)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email phone' },
      })
      .populate('hostel', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Fee.countDocuments(filter),
    Fee.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          billed: { $sum: '$amount' },
          paid: { $sum: '$paidAmount' },
        },
      },
    ]),
  ]);

  const data = fees.map((fee) => ({ ...fee.toObject(), balance: Math.max(0, round2(fee.amount - fee.paidAmount)) }));

  res.json({
    success: true,
    data,
    summary: {
      billed: round2(totals[0]?.billed || 0),
      paid: round2(totals[0]?.paid || 0),
      pending: round2((totals[0]?.billed || 0) - (totals[0]?.paid || 0)),
    },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id)
    .populate({ path: 'student', populate: { path: 'user', select: 'name email phone' } })
    .populate('hostel', 'name code');
  if (!fee) throw new ApiError(404, 'Fee not found.');

  if (req.user.role === 'student' && String(fee.student?._id) !== String(req.studentProfile?._id)) {
    throw new ApiError(403, 'You can only view your own fees.');
  }
  if (
    req.user.role === 'warden' &&
    String(fee.hostel?._id || fee.hostel) !== String(req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel)
  ) {
    throw new ApiError(403, 'This fee is outside your assigned hostel.');
  }

  const payments = await Payment.find({ fee: fee._id, status: 'success' }).sort('-paidAt').populate('recordedBy', 'name');
  res.json({ success: true, data: { ...fee.toObject(), balance: Math.max(0, round2(fee.amount - fee.paidAmount)), payments } });
});

const createFee = asyncHandler(async (req, res) => {
  const { student: studentId, title, type, academicYear, period, amount, dueDate, description } = req.body;

  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found.');

  const fee = await Fee.create({
    student: student._id,
    hostel: student.hostel || null,
    title,
    type,
    academicYear,
    period,
    amount,
    dueDate,
    description,
    status: new Date(dueDate) < new Date() ? 'overdue' : 'pending',
    createdBy: req.user._id,
  });

  const populated = await Fee.findById(fee._id)
    .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
    .populate('hostel', 'name code');

  res.status(201).json({ success: true, message: 'Fee created successfully.', data: populated });
});

const updateFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) throw new ApiError(404, 'Fee not found.');

  const fields = ['title', 'type', 'academicYear', 'period', 'amount', 'dueDate', 'description'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) fee[field] = req.body[field];
  });

  if (fee.amount < fee.paidAmount) {
    throw new ApiError(400, 'Fee amount cannot be less than the amount already paid.');
  }

  fee.status = resolveStatus(fee);
  await fee.save();

  const populated = await Fee.findById(fee._id)
    .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
    .populate('hostel', 'name code');

  res.json({ success: true, message: 'Fee updated successfully.', data: populated });
});

const deleteFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) throw new ApiError(404, 'Fee not found.');

  const payments = await Payment.countDocuments({ fee: fee._id, status: 'success' });
  if (payments > 0) {
    throw new ApiError(400, 'This fee has recorded payments and cannot be deleted.');
  }

  await fee.deleteOne();
  res.json({ success: true, message: 'Fee deleted successfully.' });
});

const generateFees = asyncHandler(async (req, res) => {
  const {
    title = 'Monthly Hostel Rent',
    type = 'hostel_rent',
    amount,
    dueDate,
    academicYear,
    period = '',
    hostel,
  } = req.body;

  const studentFilter = { status: 'active' };
  if (hostel) studentFilter.hostel = hostel;
  if (req.user.role === 'warden') {
    studentFilter.hostel = req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel;
  }

  const students = await Student.find(studentFilter).populate('room', 'rent');
  if (!students.length) throw new ApiError(400, 'No active students match the selection.');

  const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const periodValue = period || `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`;
  const yearValue = academicYear || `${due.getFullYear()}-${due.getFullYear() + 1}`;

  const existing = await Fee.find({
    student: { $in: students.map((student) => student._id) },
    title,
    type,
    period: periodValue,
  }).select('student');
  const existingIds = new Set(existing.map((fee) => String(fee.student)));

  const docs = [];
  for (const student of students) {
    if (existingIds.has(String(student._id))) continue;
    const feeAmount = Number(amount) > 0 ? Number(amount) : Number(student.room?.rent || 0);
    if (!feeAmount) continue;
    docs.push({
      student: student._id,
      hostel: student.hostel || null,
      title,
      type,
      academicYear: yearValue,
      period: periodValue,
      amount: feeAmount,
      dueDate: due,
      status: due < new Date() ? 'overdue' : 'pending',
      createdBy: req.user._id,
      description: 'Automatically generated fee',
    });
  }

  if (!docs.length) {
    return res.json({ success: true, message: 'No new fees were generated. They may already exist.', data: { created: 0, skipped: students.length } });
  }

  await Fee.insertMany(docs);
  res.status(201).json({
    success: true,
    message: `${docs.length} fee record(s) generated successfully.`,
    data: { created: docs.length, skipped: students.length - docs.length },
  });
});

const feeSummary = asyncHandler(async (req, res) => {
  await refreshOverdueFees();
  const filter = await buildFeeFilter(req);
  const [summary, byType, byStatus] = await Promise.all([
    Fee.aggregate([
      { $match: filter },
      { $group: { _id: null, billed: { $sum: '$amount' }, paid: { $sum: '$paidAmount' } } },
    ]),
    Fee.aggregate([
      { $match: filter },
      { $group: { _id: '$type', billed: { $sum: '$amount' }, paid: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
    ]),
    Fee.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 }, balance: { $sum: { $subtract: ['$amount', '$paidAmount'] } } } }]),
  ]);

  res.json({
    success: true,
    data: {
      billed: round2(summary[0]?.billed || 0),
      paid: round2(summary[0]?.paid || 0),
      pending: round2((summary[0]?.billed || 0) - (summary[0]?.paid || 0)),
      byType,
      byStatus,
    },
  });
});

module.exports = { listFees, getFee, createFee, updateFee, deleteFee, generateFees, feeSummary };
