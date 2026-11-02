const Allocation = require('../models/Allocation');
const Student = require('../models/Student');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination, buildSort } = require('../utils/helpers');
const { syncRoomOccupancy } = require('../services/roomService');

const populateAllocation = (query) =>
  query
    .populate({ path: 'student', populate: { path: 'user', select: 'name email phone avatar' } })
    .populate('hostel', 'name code type')
    .populate('room', 'roomNumber floor type capacity rent')
    .populate('allocatedBy', 'name role');

const listAllocations = asyncHandler(async (req, res) => {
  const { q, hostel, status, room, student } = req.query;
  const filter = {};

  if (req.user.role === 'warden') {
    filter.hostel = req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel || null;
  } else if (hostel) {
    filter.hostel = hostel;
  }

  if (status) filter.status = status;
  if (room) filter.room = room;
  if (student) filter.student = student;

  if (req.user.role === 'student') {
    filter.student = req.studentProfile?._id || null;
  }

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ name: regex }).select('_id');
    const students = await Student.find({
      $or: [{ rollNo: regex }, { user: { $in: users.map((user) => user._id) } }],
    }).select('_id');
    filter.student = { $in: students.map((item) => item._id) };
  }

  const { page, limit, skip } = buildPagination(req.query);
  const sort = buildSort(req.query.sortBy, req.query.order, '-allocatedAt');

  const [allocations, total] = await Promise.all([
    populateAllocation(Allocation.find(filter)).sort(sort).skip(skip).limit(limit),
    Allocation.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: allocations,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getMyAllocation = asyncHandler(async (req, res) => {
  if (req.user.role !== 'student' || !req.studentProfile) {
    throw new ApiError(400, 'Only students have a personal allocation.');
  }
  const allocation = await populateAllocation(
    Allocation.findOne({ student: req.studentProfile._id, status: 'active' })
  );
  res.json({ success: true, data: allocation });
});

const allocateRoom = asyncHandler(async (req, res) => {
  const { student: studentId, room: roomId, bedNumber, notes } = req.body;

  const student = await Student.findById(studentId).populate('user', 'name email');
  if (!student) throw new ApiError(404, 'Student not found.');
  if (student.status !== 'active') throw new ApiError(400, 'Only active students can be allocated a room.');

  const existing = await Allocation.findOne({ student: student._id, status: 'active' });
  if (existing) {
    throw new ApiError(409, `${student.user?.name || 'This student'} already has an active room allocation. Vacate it first.`);
  }

  const room = await Room.findById(roomId).populate('hostel', 'name code type status');
  if (!room) throw new ApiError(404, 'Room not found.');
  if (!room.hostel || room.hostel.status === 'inactive') throw new ApiError(400, 'The selected hostel is inactive.');
  if (room.status === 'maintenance') throw new ApiError(400, 'This room is under maintenance.');
  if (room.hostel.type === 'boys' && student.gender === 'female') {
    throw new ApiError(400, 'A female student cannot be allocated to a boys hostel.');
  }
  if (room.hostel.type === 'girls' && student.gender === 'male') {
    throw new ApiError(400, 'A male student cannot be allocated to a girls hostel.');
  }

  const bed = Number(bedNumber);
  if (!Number.isInteger(bed) || bed < 1 || bed > room.capacity) {
    throw new ApiError(400, `Bed number must be between 1 and ${room.capacity}.`);
  }

  const bedTaken = await Allocation.findOne({ room: room._id, bedNumber: bed, status: 'active' });
  if (bedTaken) throw new ApiError(409, `Bed ${bed} in room ${room.roomNumber} is already occupied.`);

  if (room.occupied >= room.capacity) throw new ApiError(400, 'This room is already full.');

  let allocation;
  try {
    allocation = await Allocation.create({
      student: student._id,
      hostel: room.hostel._id,
      room: room._id,
      bedNumber: bed,
      allocatedBy: req.user._id,
      notes,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'This student or bed already has an active allocation.');
    }
    throw error;
  }

  student.hostel = room.hostel._id;
  student.room = room._id;
  await student.save();
  await syncRoomOccupancy(room._id);

  const populated = await populateAllocation(Allocation.findById(allocation._id));
  res.status(201).json({ success: true, message: 'Room allocated successfully.', data: populated });
});

const vacateRoom = asyncHandler(async (req, res) => {
  const allocation = await Allocation.findById(req.params.id).populate('room').populate('student');
  if (!allocation) throw new ApiError(404, 'Allocation not found.');
  if (allocation.status !== 'active') throw new ApiError(400, 'This allocation has already been vacated.');

  allocation.status = 'vacated';
  allocation.vacatedAt = new Date();
  allocation.vacateReason = req.body.reason || 'Vacated by administrator';
  await allocation.save();

  await Student.findByIdAndUpdate(allocation.student._id, { hostel: null, room: null });
  await syncRoomOccupancy(allocation.room._id);

  const populated = await populateAllocation(Allocation.findById(allocation._id));
  res.json({ success: true, message: 'Room vacated successfully.', data: populated });
});

module.exports = { listAllocations, getMyAllocation, allocateRoom, vacateRoom };
