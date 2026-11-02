const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const Allocation = require('../models/Allocation');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination, buildSort } = require('../utils/helpers');
const { syncHostelCapacity } = require('../services/roomService');

const listRooms = asyncHandler(async (req, res) => {
  const { q, hostel, status, type, floor } = req.query;
  const filter = {};

  if (req.user.role === 'warden') {
    filter.hostel = req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel || null;
  } else if (hostel) {
    filter.hostel = hostel;
  }

  if (status) filter.status = status;
  if (type) filter.type = type;
  if (floor) filter.floor = Number(floor);
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.roomNumber = regex;
  }

  const { page, limit, skip } = buildPagination(req.query);
  const sort = buildSort(req.query.sortBy, req.query.order, 'roomNumber');

  const [rooms, total] = await Promise.all([
    Room.find(filter)
      .populate('hostel', 'name code type gender')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Room.countDocuments(filter),
  ]);

  const data = rooms.map((room) => ({
    ...room.toObject(),
    availableBeds: Math.max(0, room.capacity - room.occupied),
  }));

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate('hostel', 'name code type');
  if (!room) throw new ApiError(404, 'Room not found.');
  if (
    req.user.role === 'warden' &&
    String(room.hostel?._id || room.hostel) !== String(req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel)
  ) {
    throw new ApiError(403, 'This room is not in your assigned hostel.');
  }

  const allocations = await Allocation.find({ room: room._id, status: 'active' }).populate({
    path: 'student',
    populate: { path: 'user', select: 'name email phone' },
  });

  res.json({ success: true, data: { ...room.toObject(), allocations } });
});

const createRoom = asyncHandler(async (req, res) => {
  const { hostel, roomNumber, floor, type, capacity, rent, facilities, status, notes } = req.body;

  const hostelExists = await Hostel.findById(hostel);
  if (!hostelExists) throw new ApiError(404, 'Hostel not found.');

  const duplicate = await Room.findOne({ hostel, roomNumber: String(roomNumber).trim() });
  if (duplicate) throw new ApiError(409, 'This room number already exists in the selected hostel.');

  const room = await Room.create({
    hostel,
    roomNumber,
    floor,
    type,
    capacity,
    rent,
    facilities: facilities || [],
    status: status === 'maintenance' ? 'maintenance' : 'available',
    notes,
    occupied: 0,
  });

  await syncHostelCapacity(hostel);
  const populated = await Room.findById(room._id).populate('hostel', 'name code type');
  res.status(201).json({ success: true, message: 'Room created successfully.', data: populated });
});

const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found.');

  if (req.body.hostel && String(req.body.hostel) !== String(room.hostel)) {
    const hostelExists = await Hostel.findById(req.body.hostel);
    if (!hostelExists) throw new ApiError(404, 'Hostel not found.');
    if (room.occupied > 0) throw new ApiError(400, 'Vacate the room before moving it to another hostel.');
  }

  if (req.body.roomNumber && req.body.roomNumber !== room.roomNumber) {
    const duplicate = await Room.findOne({
      hostel: req.body.hostel || room.hostel,
      roomNumber: req.body.roomNumber,
      _id: { $ne: room._id },
    });
    if (duplicate) throw new ApiError(409, 'This room number already exists in the selected hostel.');
  }

  if (req.body.capacity !== undefined && Number(req.body.capacity) < room.occupied) {
    throw new ApiError(400, `Capacity cannot be less than the ${room.occupied} currently occupied bed(s).`);
  }

  const previousHostel = room.hostel;
  const fields = ['hostel', 'roomNumber', 'floor', 'type', 'capacity', 'rent', 'facilities', 'notes'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) room[field] = req.body[field];
  });

  if (req.body.status === 'maintenance' && room.occupied > 0) {
    throw new ApiError(400, 'An occupied room cannot be put under maintenance.');
  }
  if (req.body.status) room.status = req.body.status;

  await room.save();

  if (room.status !== 'maintenance') {
    if (room.occupied === 0) room.status = 'available';
    else if (room.occupied >= room.capacity) room.status = 'full';
    else room.status = 'partial';
    await room.save();
  }

  await syncHostelCapacity(previousHostel);
  if (String(previousHostel) !== String(room.hostel)) await syncHostelCapacity(room.hostel);

  const populated = await Room.findById(room._id).populate('hostel', 'name code type');
  res.json({ success: true, message: 'Room updated successfully.', data: populated });
});

const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found.');

  const activeAllocations = await Allocation.countDocuments({ room: room._id, status: 'active' });
  if (activeAllocations > 0) {
    throw new ApiError(400, `This room has ${activeAllocations} active allocation(s). Vacate them first.`);
  }

  const hostelId = room.hostel;
  await Allocation.deleteMany({ room: room._id });
  await room.deleteOne();
  await syncHostelCapacity(hostelId);

  res.json({ success: true, message: 'Room deleted successfully.' });
});

module.exports = { listRooms, getRoom, createRoom, updateRoom, deleteRoom };
