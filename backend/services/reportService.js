const Student = require('../models/Student');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Complaint = require('../models/Complaint');
const { round2, dateRangeFilter } = require('../utils/helpers');

const getReportOverview = async ({ from, to }) => {
  const paymentRange = dateRangeFilter(from, to, 'paidAt');
  const feeRange = dateRangeFilter(from, to, 'dueDate');
  const attendanceRange = dateRangeFilter(from, to, 'date');
  const complaintRange = dateRangeFilter(from, to, 'createdAt');

  const [
    totalStudents,
    activeAllocations,
    totalBedsRow,
    feeSummary,
    paymentSummary,
    attendanceRows,
    complaintStatusRows,
    complaintCategoryRows,
    studentsByYear,
    genderRows,
    hostels,
    roomStats,
    occupancyStats,
    studentStats,
    hostelFeeStats,
    hostelPaymentStats,
  ] = await Promise.all([
    Student.countDocuments({ status: 'active' }),
    Allocation.countDocuments({ status: 'active' }),
    Room.aggregate([{ $group: { _id: null, total: { $sum: '$capacity' } } }]),
    Fee.aggregate([
      { $match: feeRange },
      { $group: { _id: null, billed: { $sum: '$amount' }, paid: { $sum: '$paidAmount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'success', ...paymentRange } },
      { $group: { _id: null, collected: { $sum: '$amount' } } },
    ]),
    Attendance.aggregate([
      { $match: attendanceRange },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: complaintRange },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: complaintRange },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    Student.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$year', count: { $sum: 1 } } }]),
    Student.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$gender', count: { $sum: 1 } } }]),
    Hostel.find().select('name code type').sort('name'),
    Room.aggregate([
      { $group: { _id: '$hostel', totalRooms: { $sum: 1 }, totalBeds: { $sum: '$capacity' } } },
    ]),
    Allocation.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$hostel', occupied: { $sum: 1 } } },
    ]),
    Student.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$hostel', students: { $sum: 1 } } }]),
    Fee.aggregate([
      { $match: { status: { $ne: 'paid' } } },
      { $group: { _id: '$hostel', pending: { $sum: { $subtract: ['$amount', '$paidAmount'] } } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: '$hostel', revenue: { $sum: '$amount' } } },
    ]),
  ]);

  const feeRow = feeSummary[0] || { billed: 0, paid: 0 };
  const billed = round2(feeRow.billed);
  const paidOnFees = round2(feeRow.paid);
  const pending = round2(Math.max(0, billed - paidOnFees));
  const attendance = { present: 0, absent: 0, late: 0, leave: 0 };
  attendanceRows.forEach((row) => {
    attendance[row._id] = row.count;
  });
  const totalAttendance = Object.values(attendance).reduce((sum, value) => sum + value, 0);
  const attendanceRate = totalAttendance
    ? Math.round(((attendance.present + attendance.late) / totalAttendance) * 100)
    : 0;

  const complaintStatus = { open: 0, in_progress: 0, resolved: 0, rejected: 0 };
  complaintStatusRows.forEach((row) => {
    complaintStatus[row._id] = row.count;
  });
  const totalComplaints = Object.values(complaintStatus).reduce((sum, value) => sum + value, 0);

  const roomMap = Object.fromEntries(roomStats.map((row) => [String(row._id), row]));
  const occupancyMap = Object.fromEntries(occupancyStats.map((row) => [String(row._id), row.occupied]));
  const studentMap = Object.fromEntries(studentStats.map((row) => [String(row._id), row.students]));
  const feeMap = Object.fromEntries(hostelFeeStats.map((row) => [String(row._id), round2(row.pending)]));
  const paymentMap = Object.fromEntries(hostelPaymentStats.map((row) => [String(row._id), round2(row.revenue)]));

  const hostelPerformance = hostels.map((hostel) => {
    const totalBeds = roomMap[String(hostel._id)]?.totalBeds || 0;
    const occupied = occupancyMap[String(hostel._id)] || 0;
    return {
      id: hostel._id,
      name: hostel.name,
      code: hostel.code,
      type: hostel.type,
      students: studentMap[String(hostel._id)] || 0,
      totalRooms: roomMap[String(hostel._id)]?.totalRooms || 0,
      totalBeds,
      occupied,
      available: Math.max(0, totalBeds - occupied),
      occupancyRate: totalBeds ? Math.round((occupied / totalBeds) * 100) : 0,
      pendingFees: feeMap[String(hostel._id)] || 0,
      revenue: paymentMap[String(hostel._id)] || 0,
    };
  });

  const totalBeds = totalBedsRow[0]?.total || 0;

  const monthlyRevenue = await Payment.aggregate([
    {
      $match: {
        status: 'success',
        paidAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
        collected: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return {
    cards: {
      totalStudents,
      activeAllocations,
      totalBeds,
      availableBeds: Math.max(0, totalBeds - activeAllocations),
      occupancyRate: totalBeds ? Math.round((activeAllocations / totalBeds) * 100) : 0,
      billed,
      collected: round2(paymentSummary[0]?.collected || 0),
      pending,
      attendanceRate,
      openComplaints: complaintStatus.open + complaintStatus.in_progress,
      resolvedComplaints: complaintStatus.resolved,
      totalComplaints,
      resolutionRate: totalComplaints ? Math.round((complaintStatus.resolved / totalComplaints) * 100) : 0,
    },
    charts: {
      monthlyRevenue: monthlyRevenue.map((row) => ({
        month: `${row._id.year}-${String(row._id.month).padStart(2, '0')}`,
        collected: round2(row.collected),
      })),
      feeByStatus: [
        { status: 'paid', count: billed ? round2(paidOnFees) : 0 },
        { status: 'pending', count: pending },
      ],
      attendance: Object.entries(attendance).map(([status, count]) => ({ status, count })),
      complaintStatus: Object.entries(complaintStatus).map(([status, count]) => ({ status, count })),
      complaintsByCategory: complaintCategoryRows.map((row) => ({ category: row._id, count: row.count })),
      studentsByYear: studentsByYear
        .map((row) => ({ year: `Year ${row._id}`, count: row.count }))
        .sort((a, b) => a.year.localeCompare(b.year)),
      gender: genderRows.map((row) => ({ gender: row._id, count: row.count })),
      hostelPerformance,
    },
  };
};

module.exports = { getReportOverview };
