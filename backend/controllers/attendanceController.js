const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination, buildSort } = require('../utils/helpers');

const normalizeDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, 'A valid attendance date is required.');
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const buildFilter = async (req) => {
  const { q, hostel, status, student, date, month } = req.query;
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
  if (date) filter.date = normalizeDate(date);
  if (month) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) throw new ApiError(400, 'Invalid month. Use YYYY-MM.');
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    filter.date = { $gte: start, $lt: end };
  }

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ name: regex }).select('_id');
    const students = await Student.find({
      $or: [{ rollNo: regex }, { user: { $in: users.map((user) => user._id) } }],
    }).select('_id');
    filter.student = { $in: students.map((item) => item._id) };
  }

  return filter;
};

const listAttendance = asyncHandler(async (req, res) => {
  const filter = await buildFilter(req);
  const { page, limit, skip } = buildPagination(req.query);
  const sort = buildSort(req.query.sortBy, req.query.order, '-date');

  const [records, total, summary] = await Promise.all([
    Attendance.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('hostel', 'name code')
      .populate('markedBy', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Attendance.countDocuments(filter),
    Attendance.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const counts = { present: 0, absent: 0, late: 0, leave: 0 };
  summary.forEach((item) => {
    counts[item._id] = item.count;
  });
  const totalMarked = Object.values(counts).reduce((sum, value) => sum + value, 0);

  res.json({
    success: true,
    data: records,
    summary: {
      ...counts,
      total: totalMarked,
      rate: totalMarked ? Math.round(((counts.present + counts.late) / totalMarked) * 100) : 0,
    },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const bulkMark = asyncHandler(async (req, res) => {
  const { date, records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, 'At least one attendance record is required.');
  }
  if (records.length > 500) throw new ApiError(400, 'Maximum 500 records can be marked at once.');

  const attendanceDate = normalizeDate(date);
  const studentIds = records.map((record) => record.student);
  const students = await Student.find({ _id: { $in: studentIds } });
  const studentMap = Object.fromEntries(students.map((student) => [String(student._id), student]));

  const wardenHostel = req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel;
  const validStatuses = ['present', 'absent', 'late', 'leave'];

  const operations = [];
  for (const record of records) {
    const student = studentMap[String(record.student)];
    if (!student) throw new ApiError(404, `Student ${record.student} not found.`);
    if (!student.hostel) throw new ApiError(400, `${student.rollNo} has no active room allocation.`);
    if (req.user.role === 'warden' && String(student.hostel) !== String(wardenHostel)) {
      throw new ApiError(403, 'You can only mark attendance for students in your assigned hostel.');
    }
    if (!validStatuses.includes(record.status)) {
      throw new ApiError(400, `Invalid attendance status: ${record.status}`);
    }

    operations.push({
      updateOne: {
        filter: { student: student._id, date: attendanceDate },
        update: {
          $set: {
            hostel: student.hostel,
            status: record.status,
            markedBy: req.user._id,
            note: record.note || '',
          },
        },
        upsert: true,
      },
    });
  }

  const result = await Attendance.bulkWrite(operations);
  res.json({
    success: true,
    message: `Attendance saved for ${records.length} student(s).`,
    data: {
      matched: result.matchedCount || 0,
      modified: result.modifiedCount || 0,
      upserted: result.upsertedCount || 0,
    },
  });
});

const deleteAttendance = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) throw new ApiError(404, 'Attendance record not found.');

  if (
    req.user.role === 'warden' &&
    String(record.hostel) !== String(req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel)
  ) {
    throw new ApiError(403, 'This record is outside your assigned hostel.');
  }

  await record.deleteOne();
  res.json({ success: true, message: 'Attendance record deleted.' });
});

const attendanceTrend = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 30);
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const match = { date: { $gte: start } };
  if (req.user.role === 'student') match.student = req.studentProfile?._id;
  else if (req.user.role === 'warden') match.hostel = req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel;
  else if (req.query.hostel) match.hostel = req.query.hostel;

  const rows = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: { date: '$date', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  const trend = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    const dayRows = rows.filter((row) => new Date(row._id.date).toISOString().slice(0, 10) === key);
    const get = (status) => dayRows.find((row) => row._id.status === status)?.count || 0;
    const present = get('present');
    const absent = get('absent');
    const late = get('late');
    const leave = get('leave');
    const total = present + absent + late + leave;
    trend.push({
      date: key,
      present,
      absent,
      late,
      leave,
      total,
      rate: total ? Math.round(((present + late) / total) * 100) : 0,
    });
  }

  res.json({ success: true, data: trend });
});

module.exports = { listAttendance, bulkMark, deleteAttendance, attendanceTrend };
