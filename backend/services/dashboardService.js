const Student = require('../models/Student');
const Warden = require('../models/Warden');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Complaint = require('../models/Complaint');
const Announcement = require('../models/Announcement');
const Visitor = require('../models/Visitor');
const { round2 } = require('../utils/helpers');

const monthKeys = (count = 6) => {
  const keys = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push({
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
    });
  }
  return keys;
};

const getAttendanceTrend = async (match, days = 7) => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const rows = await Attendance.aggregate([
    { $match: { ...match, date: { $gte: start } } },
    { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } },
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
      label: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      present,
      absent,
      late,
      leave,
      total,
      rate: total ? Math.round(((present + late) / total) * 100) : 0,
    });
  }
  return trend;
};

const getOccupancyByHostel = async (hostelFilter) => {
  const match = hostelFilter ? { hostel: hostelFilter } : {};
  const [hostels, roomStats, allocationStats] = await Promise.all([
    Hostel.find(hostelFilter ? { _id: hostelFilter } : {}).select('name code type').sort('name'),
    Room.aggregate([
      { $match: match },
      { $group: { _id: '$hostel', totalRooms: { $sum: 1 }, totalBeds: { $sum: '$capacity' } } },
    ]),
    Allocation.aggregate([
      { $match: { ...match, status: 'active' } },
      { $group: { _id: '$hostel', occupied: { $sum: 1 } } },
    ]),
  ]);

  const roomMap = Object.fromEntries(roomStats.map((item) => [String(item._id), item]));
  const allocationMap = Object.fromEntries(allocationStats.map((item) => [String(item._id), item.occupied]));

  return hostels.map((hostel) => {
    const totalBeds = roomMap[String(hostel._id)]?.totalBeds || 0;
    const occupied = allocationMap[String(hostel._id)] || 0;
    return {
      id: hostel._id,
      name: hostel.name,
      code: hostel.code,
      type: hostel.type,
      totalRooms: roomMap[String(hostel._id)]?.totalRooms || 0,
      capacity: totalBeds,
      occupied,
      available: Math.max(0, totalBeds - occupied),
      rate: totalBeds ? Math.round((occupied / totalBeds) * 100) : 0,
    };
  });
};

const getFeeChart = async (hostelFilter, studentFilter) => {
  const keys = monthKeys(6);
  const start = new Date(`${keys[0].key}-01T00:00:00.000Z`);
  const match = {};
  if (hostelFilter) match.hostel = hostelFilter;
  if (studentFilter) match.student = studentFilter;

  const [paymentRows, feeRows] = await Promise.all([
    Payment.aggregate([
      { $match: { ...match, status: 'success', paidAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
          collected: { $sum: '$amount' },
        },
      },
    ]),
    Fee.aggregate([
      { $match: { ...match, dueDate: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: '$dueDate' }, month: { $month: '$dueDate' } },
          billed: { $sum: '$amount' },
          paid: { $sum: '$paidAmount' },
        },
      },
    ]),
  ]);

  return keys.map(({ key, label }) => {
    const [year, month] = key.split('-').map(Number);
    const payment = paymentRows.find((row) => row._id.year === year && row._id.month === month);
    const fee = feeRows.find((row) => row._id.year === year && row._id.month === month);
    return {
      month: label,
      collected: round2(payment?.collected || 0),
      billed: round2(fee?.billed || 0),
      pending: round2((fee?.billed || 0) - (fee?.paid || 0)),
    };
  });
};

const getStatsForScope = async (hostelFilter) => {
  const studentFilter = { status: 'active' };
  const hostelQuery = {};
  if (hostelFilter) {
    studentFilter.hostel = hostelFilter;
    hostelQuery._id = hostelFilter;
  }

  const [
    totalStudents,
    totalWardens,
    totalHostels,
    totalRooms,
    bedStats,
    occupiedBeds,
    pendingFeeRow,
    revenueRow,
    pendingComplaints,
    todayAttendance,
    visitorCount,
  ] = await Promise.all([
    Student.countDocuments(studentFilter),
    Warden.countDocuments({ status: 'active', ...(hostelFilter ? { hostel: hostelFilter } : {}) }),
    Hostel.countDocuments(hostelQuery),
    Room.countDocuments(hostelFilter ? { hostel: hostelFilter } : {}),
    Room.aggregate([
      { $match: hostelFilter ? { hostel: hostelFilter } : {} },
      { $group: { _id: null, totalBeds: { $sum: '$capacity' } } },
    ]),
    Allocation.countDocuments({ status: 'active', ...(hostelFilter ? { hostel: hostelFilter } : {}) }),
    Fee.aggregate([
      { $match: { status: { $ne: 'paid' }, ...(hostelFilter ? { hostel: hostelFilter } : {}) } },
      { $group: { _id: null, pending: { $sum: { $subtract: ['$amount', '$paidAmount'] } } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'success', ...(hostelFilter ? { hostel: hostelFilter } : {}) } },
      { $group: { _id: null, revenue: { $sum: '$amount' } } },
    ]),
    Complaint.countDocuments({ status: { $in: ['open', 'in_progress'] }, ...(hostelFilter ? { hostel: hostelFilter } : {}) }),
    (() => {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      return Attendance.aggregate([
        {
          $match: {
            date: start,
            ...(hostelFilter ? { hostel: hostelFilter } : {}),
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
    })(),
    (() => {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      return Visitor.countDocuments({ checkIn: { $gte: start }, ...(hostelFilter ? { hostel: hostelFilter } : {}) });
    })(),
  ]);

  const totalBeds = bedStats[0]?.totalBeds || 0;
  const allowedHostels = await Hostel.find(hostelQuery).select('_id');
  const facilityFeeRow = await Fee.aggregate([
    {
      $match: {
        ...(hostelFilter ? { hostel: hostelFilter } : {}),
      },
    },
    { $group: { _id: null, billed: { $sum: '$amount' }, paid: { $sum: '$paidAmount' } } },
  ]);

  const attendanceCounts = { present: 0, absent: 0, late: 0, leave: 0 };
  todayAttendance.forEach((row) => {
    attendanceCounts[row._id] = row.count;
  });
  const markedToday = Object.values(attendanceCounts).reduce((sum, value) => sum + value, 0);

  return {
    totalStudents,
    totalWardens,
    totalHostels: allowedHostels.length,
    totalRooms,
    totalBeds,
    occupiedBeds,
    availableBeds: Math.max(0, totalBeds - occupiedBeds),
    pendingFees: round2(pendingFeeRow[0]?.pending || 0),
    totalRevenue: round2(revenueRow[0]?.revenue || 0),
    pendingComplaints,
    visitorsToday: visitorCount,
    presentToday: attendanceCounts.present + attendanceCounts.late,
    absentToday: attendanceCounts.absent,
    attendanceRate: markedToday ? Math.round(((attendanceCounts.present + attendanceCounts.late) / markedToday) * 100) : 0,
    occupancyRate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    collectionRate: facilityFeeRow[0]?.billed
      ? Math.round((facilityFeeRow[0].paid / facilityFeeRow[0].billed) * 100)
      : 0,
    billedFees: round2(facilityFeeRow[0]?.billed || 0),
    paidFees: round2(facilityFeeRow[0]?.paid || 0),
  };
};

const getAdminDashboard = async () => {
  await Fee.updateMany({ status: 'pending', dueDate: { $lt: new Date() } }, { $set: { status: 'overdue' } });

  const [stats, occupancyByHostel, feeCollection, attendanceTrend, complaintStats, roomStatus, recentPayments, recentComplaints, recentAnnouncements] =
    await Promise.all([
      getStatsForScope(),
      getOccupancyByHostel(),
      getFeeChart(),
      getAttendanceTrend({}),
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Room.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.find({ status: 'success' })
        .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
        .sort('-paidAt')
        .limit(5),
      Complaint.find()
        .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
        .populate('hostel', 'name code')
        .sort('-createdAt')
        .limit(5),
      Announcement.find({ isActive: true }).populate('publishedBy', 'name role').sort('-createdAt').limit(4),
    ]);

  return {
    role: 'admin',
    stats,
    charts: {
      occupancyByHostel,
      feeCollection,
      attendanceTrend,
      complaintStats: complaintStats.map((row) => ({ status: row._id, count: row.count })),
      roomStatus: roomStatus.map((row) => ({ status: row._id, count: row.count })),
    },
    recent: { payments: recentPayments, complaints: recentComplaints, announcements: recentAnnouncements },
  };
};

const getWardenDashboard = async (hostelId) => {
  if (!hostelId) {
    return {
      role: 'warden',
      stats: {},
      charts: { occupancyByHostel: [], feeCollection: [], attendanceTrend: [], complaintStats: [], roomStatus: [] },
      recent: { payments: [], complaints: [], announcements: [] },
      warning: 'You have not been assigned to a hostel yet. Contact an administrator.',
    };
  }

  await Fee.updateMany(
    { hostel: hostelId, status: 'pending', dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue' } }
  );

  const [stats, occupancyByHostel, feeCollection, attendanceTrend, complaintStats, roomStatus, recentComplaints, recentAnnouncements, recentPayments] =
    await Promise.all([
      getStatsForScope(hostelId),
      getOccupancyByHostel(hostelId),
      getFeeChart(hostelId),
      getAttendanceTrend({ hostel: hostelId }),
      Complaint.aggregate([{ $match: { hostel: hostelId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Room.aggregate([{ $match: { hostel: hostelId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.find({ hostel: hostelId })
        .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
        .sort('-createdAt')
        .limit(5),
      Announcement.find({
        isActive: true,
        $or: [{ audience: 'all' }, { audience: 'students' }, { audience: 'hostel', hostel: hostelId }],
      })
        .populate('publishedBy', 'name role')
        .sort('-createdAt')
        .limit(4),
      Payment.find({ hostel: hostelId, status: 'success' })
        .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
        .sort('-paidAt')
        .limit(5),
    ]);

  return {
    role: 'warden',
    stats,
    charts: {
      occupancyByHostel,
      feeCollection,
      attendanceTrend,
      complaintStats: complaintStats.map((row) => ({ status: row._id, count: row.count })),
      roomStatus: roomStatus.map((row) => ({ status: row._id, count: row.count })),
    },
    recent: { payments: recentPayments, complaints: recentComplaints, announcements: recentAnnouncements },
  };
};

const getStudentDashboard = async (student) => {
  if (!student) {
    return { role: 'student', stats: {}, charts: {}, recent: {}, warning: 'Student profile not found.' };
  }

  const [allocation, feeRows, paymentRows, attendanceStats, complaintStats, announcements, payments, feeBreakdown] =
    await Promise.all([
      Allocation.findOne({ student: student._id, status: 'active' })
        .populate('hostel', 'name code type')
        .populate('room', 'roomNumber floor type rent capacity')
        .populate('allocatedBy', 'name'),
      Fee.aggregate([
        { $match: { student: student._id } },
        {
          $group: {
            _id: null,
            billed: { $sum: '$amount' },
            paid: { $sum: '$paidAmount' },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { student: student._id, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Attendance.aggregate([
        { $match: { student: student._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([{ $match: { student: student._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Announcement.find({
        isActive: true,
        $and: [
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
          {
            $or: [
              { audience: 'all' },
              { audience: 'students' },
              ...(student.hostel
                ? [{ audience: 'hostel', hostel: student.hostel._id || student.hostel }]
                : []),
            ],
          },
        ],
      })
        .populate('publishedBy', 'name role')
        .sort('-createdAt')
        .limit(4),
      Payment.find({ student: student._id, status: 'success' })
        .populate('fee', 'title type period')
        .sort('-paidAt')
        .limit(5),
      Fee.aggregate([
        { $match: { student: student._id } },
        { $group: { _id: '$type', billed: { $sum: '$amount' }, paid: { $sum: '$paidAmount' } } },
      ]),
    ]);

  const counts = { present: 0, absent: 0, late: 0, leave: 0 };
  attendanceStats.forEach((row) => {
    counts[row._id] = row.count;
  });
  const totalAttendance = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const billed = feeRows[0]?.billed || 0;
  const paidOnFees = feeRows[0]?.paid || 0;

  const complaintCounts = { open: 0, in_progress: 0, resolved: 0, rejected: 0 };
  complaintStats.forEach((row) => {
    complaintCounts[row._id] = row.count;
  });

  return {
    role: 'student',
    stats: {
      totalHostels: student.hostel ? 1 : 0,
      totalRooms: allocation?.room ? 1 : 0,
      pendingFees: round2(Math.max(0, billed - paidOnFees)),
      totalRevenue: round2(paymentRows[0]?.total || 0),
      paidFees: round2(paidOnFees),
      billedFees: round2(billed),
      pendingComplaints: complaintCounts.open + complaintCounts.in_progress,
      attendanceRate: totalAttendance ? Math.round(((counts.present + counts.late) / totalAttendance) * 100) : 0,
      presentDays: counts.present,
      absentDays: counts.absent,
      leaveDays: counts.leave,
      totalStudents: 0,
      totalWardens: 0,
      totalBeds: allocation?.room?.capacity || 0,
      occupiedBeds: allocation ? 1 : 0,
      availableBeds: 0,
      collectionRate: billed ? Math.round((paidOnFees / billed) * 100) : 0,
      occupancyRate: allocation ? 100 : 0,
    },
    allocation,
    charts: {
      occupancyByHostel: [],
      feeCollection: await getFeeChart(null, student._id),
      attendanceTrend: await getAttendanceTrend({ student: student._id }),
      complaintStats: Object.entries(complaintCounts).map(([status, count]) => ({ status, count })),
      feeBreakdown: feeBreakdown.map((row) => ({
        type: row._id,
        billed: round2(row.billed),
        paid: round2(row.paid),
      })),
    },
    recent: { payments, complaints: [], announcements },
  };
};

module.exports = { getAdminDashboard, getWardenDashboard, getStudentDashboard, getAttendanceTrend };
