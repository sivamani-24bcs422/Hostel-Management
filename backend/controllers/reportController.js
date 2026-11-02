const Student = require('../models/Student');
const Warden = require('../models/Warden');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Complaint = require('../models/Complaint');
const Visitor = require('../models/Visitor');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getReportOverview } = require('../services/reportService');
const { toCsv, sendCsv, dateRangeFilter } = require('../utils/helpers');

const overview = asyncHandler(async (req, res) => {
  const data = await getReportOverview({ from: req.query.from, to: req.query.to });
  res.json({ success: true, data });
});

const studentName = (student) => student?.user?.name || '';

const exportReport = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { from, to } = req.query;
  const stamp = new Date().toISOString().slice(0, 10);
  let headers;
  let rows;

  switch (type) {
    case 'students': {
      const students = await Student.find()
        .populate('user', 'name email phone isActive')
        .populate('hostel', 'name code')
        .populate('room', 'roomNumber')
        .sort('rollNo');
      headers = ['Roll No', 'Name', 'Email', 'Phone', 'Course', 'Department', 'Year', 'Gender', 'Hostel', 'Room', 'Guardian', 'Guardian Phone', 'Status', 'Admission Date'];
      rows = students.map((item) => [
        item.rollNo,
        studentName(item),
        item.user?.email,
        item.user?.phone,
        item.course,
        item.department,
        item.year,
        item.gender,
        item.hostel?.name,
        item.room?.roomNumber,
        item.guardianName,
        item.guardianPhone,
        item.status,
        item.admissionDate ? new Date(item.admissionDate).toLocaleDateString('en-IN') : '',
      ]);
      break;
    }
    case 'wardens': {
      const wardens = await Warden.find().populate('user', 'name email phone isActive').populate('hostel', 'name code').sort('employeeId');
      headers = ['Employee ID', 'Name', 'Email', 'Phone', 'Hostel', 'Designation', 'Qualification', 'Gender', 'Joining Date', 'Status'];
      rows = wardens.map((item) => [
        item.employeeId,
        studentName(item),
        item.user?.email,
        item.user?.phone,
        item.hostel?.name,
        item.designation,
        item.qualification,
        item.gender,
        item.joiningDate ? new Date(item.joiningDate).toLocaleDateString('en-IN') : '',
        item.status,
      ]);
      break;
    }
    case 'hostels': {
      const hostels = await Hostel.find().sort('name');
      headers = ['Name', 'Code', 'Type', 'Address', 'City', 'Floors', 'Capacity', 'Status', 'Facilities'];
      rows = hostels.map((item) => [item.name, item.code, item.type, item.address, item.city, item.totalFloors, item.capacity, item.status, (item.facilities || []).join('; ')]);
      break;
    }
    case 'rooms': {
      const rooms = await Room.find().populate('hostel', 'name code').sort('roomNumber');
      headers = ['Hostel', 'Room', 'Floor', 'Type', 'Capacity', 'Occupied', 'Available', 'Monthly Rent', 'Status'];
      rows = rooms.map((item) => [
        item.hostel?.name,
        item.roomNumber,
        item.floor,
        item.type,
        item.capacity,
        item.occupied,
        Math.max(0, item.capacity - item.occupied),
        item.rent,
        item.status,
      ]);
      break;
    }
    case 'allocations': {
      const allocations = await Allocation.find({ ...dateRangeFilter(from, to, 'allocatedAt') })
        .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
        .populate('hostel', 'name code')
        .populate('room', 'roomNumber')
        .populate('allocatedBy', 'name')
        .sort('-allocatedAt');
      headers = ['Student', 'Roll No', 'Hostel', 'Room', 'Bed', 'Allocated At', 'Vacated At', 'Status', 'Reason', 'Allocated By'];
      rows = allocations.map((item) => [
        studentName(item.student),
        item.student?.rollNo,
        item.hostel?.name,
        item.room?.roomNumber,
        item.bedNumber,
        new Date(item.allocatedAt).toLocaleString('en-IN'),
        item.vacatedAt ? new Date(item.vacatedAt).toLocaleString('en-IN') : '',
        item.status,
        item.vacateReason,
        item.allocatedBy?.name,
      ]);
      break;
    }
    case 'fees': {
      const fees = await Fee.find({ ...dateRangeFilter(from, to, 'dueDate') })
        .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
        .populate('hostel', 'name code')
        .sort('-dueDate');
      headers = ['Student', 'Roll No', 'Hostel', 'Title', 'Type', 'Period', 'Academic Year', 'Amount', 'Paid', 'Balance', 'Due Date', 'Status'];
      rows = fees.map((item) => [
        studentName(item.student),
        item.student?.rollNo,
        item.hostel?.name,
        item.title,
        item.type,
        item.period,
        item.academicYear,
        item.amount,
        item.paidAmount,
        Math.max(0, item.amount - item.paidAmount),
        new Date(item.dueDate).toLocaleDateString('en-IN'),
        item.status,
      ]);
      break;
    }
    case 'payments': {
      const payments = await Payment.find({ ...dateRangeFilter(from, to, 'paidAt') })
        .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
        .populate('fee', 'title type period')
        .populate('recordedBy', 'name')
        .sort('-paidAt');
      headers = ['Receipt No', 'Student', 'Roll No', 'Fee', 'Period', 'Amount', 'Method', 'Transaction ID', 'Paid At', 'Recorded By', 'Status'];
      rows = payments.map((item) => [
        item.receiptNo,
        studentName(item.student),
        item.student?.rollNo,
        item.fee?.title,
        item.fee?.period,
        item.amount,
        item.method,
        item.transactionId,
        new Date(item.paidAt).toLocaleString('en-IN'),
        item.recordedBy?.name,
        item.status,
      ]);
      break;
    }
    case 'attendance': {
      const records = await Attendance.find({ ...dateRangeFilter(from, to, 'date') })
        .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
        .populate('hostel', 'name code')
        .populate('markedBy', 'name')
        .sort('-date');
      headers = ['Date', 'Student', 'Roll No', 'Hostel', 'Status', 'Note', 'Marked By'];
      rows = records.map((item) => [
        new Date(item.date).toLocaleDateString('en-IN'),
        studentName(item.student),
        item.student?.rollNo,
        item.hostel?.name,
        item.status,
        item.note,
        item.markedBy?.name,
      ]);
      break;
    }
    case 'complaints': {
      const complaints = await Complaint.find({ ...dateRangeFilter(from, to, 'createdAt') })
        .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
        .populate('hostel', 'name code')
        .populate('assignedTo', 'name')
        .sort('-createdAt');
      headers = ['Date', 'Student', 'Roll No', 'Hostel', 'Category', 'Title', 'Priority', 'Status', 'Assigned To', 'Resolution'];
      rows = complaints.map((item) => [
        new Date(item.createdAt).toLocaleString('en-IN'),
        studentName(item.student),
        item.student?.rollNo,
        item.hostel?.name,
        item.category,
        item.title,
        item.priority,
        item.status,
        item.assignedTo?.name,
        item.resolutionNote,
      ]);
      break;
    }
    case 'visitors': {
      const visitors = await Visitor.find({ ...dateRangeFilter(from, to, 'visitDate') })
        .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
        .populate('hostel', 'name code')
        .sort('-visitDate');
      headers = ['Visitor', 'Phone', 'Relation', 'Student', 'Roll No', 'Hostel', 'Purpose', 'Visit Date', 'Check In', 'Check Out', 'Status', 'ID Proof'];
      rows = visitors.map((item) => [
        item.visitorName,
        item.phone,
        item.relation,
        studentName(item.student),
        item.student?.rollNo,
        item.hostel?.name,
        item.purpose,
        new Date(item.visitDate).toLocaleString('en-IN'),
        item.checkIn ? new Date(item.checkIn).toLocaleString('en-IN') : '',
        item.checkOut ? new Date(item.checkOut).toLocaleString('en-IN') : '',
        item.status,
        item.idProof,
      ]);
      break;
    }
    default:
      throw new ApiError(400, 'Unknown report type. Use students, wardens, hostels, rooms, allocations, fees, payments, attendance, complaints, or visitors.');
  }

  const csv = toCsv(headers, rows);
  sendCsv(res, `${type}-report-${stamp}.csv`, csv);
});

module.exports = { overview, exportReport };
