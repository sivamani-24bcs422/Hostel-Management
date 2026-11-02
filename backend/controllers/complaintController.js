const Complaint = require('../models/Complaint');
const Student = require('../models/Student');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination, buildSort } = require('../utils/helpers');

const populateComplaint = (query) =>
  query
    .populate({ path: 'student', populate: { path: 'user', select: 'name email phone' } })
    .populate('hostel', 'name code')
    .populate('room', 'roomNumber floor')
    .populate('assignedTo', 'name role')
    .populate('resolvedBy', 'name role');

const buildFilter = async (req) => {
  const { q, hostel, status, priority, category, student } = req.query;
  const filter = {};

  if (req.user.role === 'student') filter.student = req.studentProfile?._id || null;
  else if (req.user.role === 'warden') filter.hostel = req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel || null;
  else if (hostel) filter.hostel = hostel;

  if (student) filter.student = student;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ name: regex }).select('_id');
    const students = await Student.find({
      $or: [{ rollNo: regex }, { user: { $in: users.map((user) => user._id) } }],
    }).select('_id');
    filter.$or = [
      { title: regex },
      { description: regex },
      { student: { $in: students.map((item) => item._id) } },
    ];
  }

  return filter;
};

const listComplaints = asyncHandler(async (req, res) => {
  const filter = await buildFilter(req);
  const { page, limit, skip } = buildPagination(req.query);
  const sort = buildSort(req.query.sortBy, req.query.order, '-createdAt');

  const [complaints, total, stats] = await Promise.all([
    populateComplaint(Complaint.find(filter)).sort(sort).skip(skip).limit(limit),
    Complaint.countDocuments(filter),
    Complaint.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const byStatus = { open: 0, in_progress: 0, resolved: 0, rejected: 0 };
  stats.forEach((item) => {
    byStatus[item._id] = item.count;
  });

  res.json({
    success: true,
    data: complaints,
    summary: byStatus,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await populateComplaint(Complaint.findById(req.params.id));
  if (!complaint) throw new ApiError(404, 'Complaint not found.');

  if (req.user.role === 'student' && String(complaint.student?._id) !== String(req.studentProfile?._id)) {
    throw new ApiError(403, 'You can only view your own complaints.');
  }
  if (
    req.user.role === 'warden' &&
    String(complaint.hostel?._id || complaint.hostel) !== String(req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel)
  ) {
    throw new ApiError(403, 'This complaint is outside your assigned hostel.');
  }

  res.json({ success: true, data: complaint });
});

const createComplaint = asyncHandler(async (req, res) => {
  const student = req.studentProfile;
  if (!student) throw new ApiError(400, 'Only students can submit complaints.');

  const { title, description, category, priority } = req.body;
  const complaint = await Complaint.create({
    student: student._id,
    hostel: student.hostel?._id || student.hostel || null,
    room: student.room?._id || student.room || null,
    title,
    description,
    category,
    priority,
    status: 'open',
  });

  const populated = await populateComplaint(Complaint.findById(complaint._id));
  res.status(201).json({ success: true, message: 'Complaint submitted successfully.', data: populated });
});

const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found.');

  if (
    req.user.role === 'warden' &&
    String(complaint.hostel) !== String(req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel)
  ) {
    throw new ApiError(403, 'This complaint is outside your assigned hostel.');
  }

  if (req.body.status) {
    const allowed = ['open', 'in_progress', 'resolved', 'rejected'];
    if (!allowed.includes(req.body.status)) throw new ApiError(400, 'Invalid complaint status.');
    complaint.status = req.body.status;
    if (req.body.status === 'in_progress' && !complaint.assignedTo) {
      complaint.assignedTo = req.user._id;
    }
    if (req.body.status === 'resolved' || req.body.status === 'rejected') {
      complaint.resolvedAt = new Date();
      complaint.resolvedBy = req.user._id;
      if (req.body.resolutionNote !== undefined) complaint.resolutionNote = req.body.resolutionNote;
    }
  }

  if (req.body.priority) complaint.priority = req.body.priority;
  if (req.body.category) complaint.category = req.body.category;
  if (req.body.resolutionNote !== undefined) complaint.resolutionNote = req.body.resolutionNote;
  if (req.body.assignedTo !== undefined) complaint.assignedTo = req.body.assignedTo || null;
  if (req.body.title) complaint.title = req.body.title;
  if (req.body.description) complaint.description = req.body.description;

  await complaint.save();
  const populated = await populateComplaint(Complaint.findById(complaint._id));
  res.json({ success: true, message: 'Complaint updated successfully.', data: populated });
});

const deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found.');

  if (req.user.role === 'student') {
    if (String(complaint.student) !== String(req.studentProfile?._id)) {
      throw new ApiError(403, 'You can only delete your own complaint.');
    }
    if (complaint.status !== 'open') {
      throw new ApiError(400, 'Only open complaints can be deleted.');
    }
  }

  await complaint.deleteOne();
  res.json({ success: true, message: 'Complaint deleted successfully.' });
});

module.exports = { listComplaints, getComplaint, createComplaint, updateComplaint, deleteComplaint };
