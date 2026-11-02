const Announcement = require('../models/Announcement');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination, buildSort } = require('../utils/helpers');

const listAnnouncements = asyncHandler(async (req, res) => {
  const { q, audience, priority, isActive } = req.query;
  const filter = {};

  if (req.user.role === 'admin') {
    if (isActive !== undefined) filter.isActive = isActive === 'true';
  } else {
    filter.isActive = true;
    filter.$and = [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }];

    const roleAudience = req.user.role === 'student' ? 'students' : 'wardens';
    const hostelId =
      req.user.role === 'student'
        ? req.studentProfile?.hostel?._id || req.studentProfile?.hostel
        : req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel;

    filter.$and.push({
      $or: [
        { audience: 'all' },
        { audience: roleAudience },
        ...(hostelId ? [{ audience: 'hostel', hostel: hostelId }] : []),
      ],
    });
  }

  if (audience) filter.audience = audience;
  if (priority) filter.priority = priority;

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$and = [...(filter.$and || []), { $or: [{ title: regex }, { content: regex }] }];
  }

  const { page, limit, skip } = buildPagination(req.query);
  const sort = buildSort(req.query.sortBy, req.query.order, '-createdAt');

  const [announcements, total] = await Promise.all([
    Announcement.find(filter)
      .populate('hostel', 'name code')
      .populate('publishedBy', 'name role')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Announcement.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: announcements,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content, audience, hostel, priority, expiresAt } = req.body;

  if (req.user.role === 'warden') {
    if (!['students', 'hostel'].includes(audience)) {
      throw new ApiError(403, 'Wardens can publish to students or their own hostel only.');
    }
  }

  const announcement = await Announcement.create({
    title,
    content,
    audience,
    hostel: audience === 'hostel' ? (req.user.role === 'warden' ? req.wardenProfile?.hostel : hostel) : null,
    priority,
    expiresAt: expiresAt || null,
    publishedBy: req.user._id,
  });

  const populated = await Announcement.findById(announcement._id)
    .populate('hostel', 'name code')
    .populate('publishedBy', 'name role');

  res.status(201).json({ success: true, message: 'Announcement published successfully.', data: populated });
});

const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw new ApiError(404, 'Announcement not found.');

  if (req.user.role === 'warden' && String(announcement.publishedBy) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only edit announcements you published.');
  }

  if (req.user.role === 'warden' && req.body.audience && !['students', 'hostel'].includes(req.body.audience)) {
    throw new ApiError(403, 'Wardens can publish to students or their own hostel only.');
  }

  const fields = ['title', 'content', 'audience', 'priority', 'expiresAt', 'isActive'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) announcement[field] = req.body[field];
  });

  if (announcement.audience === 'hostel') {
    announcement.hostel = req.user.role === 'warden' ? req.wardenProfile?.hostel : req.body.hostel || announcement.hostel;
  } else {
    announcement.hostel = null;
  }

  await announcement.save();
  const populated = await Announcement.findById(announcement._id)
    .populate('hostel', 'name code')
    .populate('publishedBy', 'name role');

  res.json({ success: true, message: 'Announcement updated successfully.', data: populated });
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw new ApiError(404, 'Announcement not found.');

  if (req.user.role === 'warden' && String(announcement.publishedBy) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only delete announcements you published.');
  }

  await announcement.deleteOne();
  res.json({ success: true, message: 'Announcement deleted successfully.' });
});

module.exports = { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement };
