const Visitor = require('../models/Visitor');
const Student = require('../models/Student');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination, buildSort, dateRangeFilter } = require('../utils/helpers');

const populateVisitor = (query) =>
  query
    .populate({ path: 'student', populate: { path: 'user', select: 'name email phone' } })
    .populate('hostel', 'name code')
    .populate('recordedBy', 'name role');

const buildFilter = async (req) => {
  const { q, hostel, status, from, to } = req.query;
  const filter = { ...dateRangeFilter(from, to, 'visitDate') };

  if (req.user.role === 'warden') {
    filter.hostel = req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel || null;
  } else if (hostel) {
    filter.hostel = hostel;
  }

  if (status) filter.status = status;

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ name: regex }).select('_id');
    const students = await Student.find({
      $or: [{ rollNo: regex }, { user: { $in: users.map((user) => user._id) } }],
    }).select('_id');
    filter.$or = [
      { visitorName: regex },
      { phone: regex },
      { relation: regex },
      { student: { $in: students.map((item) => item._id) } },
    ];
  }

  return filter;
};

const listVisitors = asyncHandler(async (req, res) => {
  const filter = await buildFilter(req);
  const { page, limit, skip } = buildPagination(req.query);
  const sort = buildSort(req.query.sortBy, req.query.order, '-checkIn');

  const [visitors, total, checkedIn] = await Promise.all([
    populateVisitor(Visitor.find(filter)).sort(sort).skip(skip).limit(limit),
    Visitor.countDocuments(filter),
    Visitor.countDocuments({ ...filter, status: 'checked_in' }),
  ]);

  res.json({
    success: true,
    data: visitors,
    summary: { checkedIn, total },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const createVisitor = asyncHandler(async (req, res) => {
  const { student: studentId, visitorName, phone, relation, purpose, visitDate, checkIn, idProof, notes } = req.body;

  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found.');
  if (!student.hostel) throw new ApiError(400, 'This student has no active hostel allocation.');

  if (
    req.user.role === 'warden' &&
    String(student.hostel) !== String(req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel)
  ) {
    throw new ApiError(403, 'You can only record visitors for your assigned hostel.');
  }

  const visitor = await Visitor.create({
    student: student._id,
    hostel: student.hostel,
    visitorName,
    phone,
    relation,
    purpose,
    visitDate: visitDate || new Date(),
    checkIn: checkIn || new Date(),
    idProof,
    notes,
    recordedBy: req.user._id,
  });

  const populated = await populateVisitor(Visitor.findById(visitor._id));
  res.status(201).json({ success: true, message: 'Visitor recorded successfully.', data: populated });
});

const updateVisitor = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw new ApiError(404, 'Visitor not found.');

  if (
    req.user.role === 'warden' &&
    String(visitor.hostel) !== String(req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel)
  ) {
    throw new ApiError(403, 'This visitor is outside your assigned hostel.');
  }

  const fields = ['visitorName', 'phone', 'relation', 'purpose', 'visitDate', 'checkIn', 'idProof', 'notes'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) visitor[field] = req.body[field];
  });

  await visitor.save();
  const populated = await populateVisitor(Visitor.findById(visitor._id));
  res.json({ success: true, message: 'Visitor updated successfully.', data: populated });
});

const checkoutVisitor = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw new ApiError(404, 'Visitor not found.');
  if (visitor.status === 'checked_out') throw new ApiError(400, 'This visitor has already checked out.');

  if (
    req.user.role === 'warden' &&
    String(visitor.hostel) !== String(req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel)
  ) {
    throw new ApiError(403, 'This visitor is outside your assigned hostel.');
  }

  visitor.status = 'checked_out';
  visitor.checkOut = new Date();
  await visitor.save();

  const populated = await populateVisitor(Visitor.findById(visitor._id));
  res.json({ success: true, message: 'Visitor checked out successfully.', data: populated });
});

const deleteVisitor = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw new ApiError(404, 'Visitor not found.');
  await visitor.deleteOne();
  res.json({ success: true, message: 'Visitor record deleted.' });
});

module.exports = { listVisitors, createVisitor, updateVisitor, checkoutVisitor, deleteVisitor };
