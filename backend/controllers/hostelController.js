const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const Warden = require('../models/Warden');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination, buildSort } = require('../utils/helpers');

const attachStats = async (hostels, scopedHostelId = null) => {
  const ids = hostels.map((hostel) => hostel._id);
  const roomMatch = scopedHostelId ? { hostel: scopedHostelId } : { hostel: { $in: ids } };
  const allocationMatch = scopedHostelId ? { hostel: scopedHostelId, status: 'active' } : { hostel: { $in: ids }, status: 'active' };

  const [roomStats, occupiedStats, wardens] = await Promise.all([
    Room.aggregate([
      { $match: roomMatch },
      {
        $group: {
          _id: '$hostel',
          totalRooms: { $sum: 1 },
          totalBeds: { $sum: '$capacity' },
        },
      },
    ]),
    Allocation.aggregate([
      { $match: allocationMatch },
      { $group: { _id: '$hostel', occupiedBeds: { $sum: 1 } } },
    ]),
    Warden.find({ hostel: { $in: ids }, status: 'active' }).populate('user', 'name email phone'),
  ]);

  const roomMap = Object.fromEntries(roomStats.map((item) => [String(item._id), item]));
  const occupiedMap = Object.fromEntries(occupiedStats.map((item) => [String(item._id), item.occupiedBeds]));
  const wardenMap = Object.fromEntries(wardens.map((item) => [String(item.hostel), item]));

  return hostels.map((hostel) => {
    const plain = hostel.toObject();
    const stats = roomMap[String(hostel._id)];
    const totalBeds = stats?.totalBeds || 0;
    const occupiedBeds = occupiedMap[String(hostel._id)] || 0;
    return {
      ...plain,
      warden: wardenMap[String(hostel._id)] || null,
      stats: {
        totalRooms: stats?.totalRooms || 0,
        totalBeds,
        occupiedBeds,
        availableBeds: Math.max(0, totalBeds - occupiedBeds),
        occupancyRate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      },
    };
  });
};

const listHostels = asyncHandler(async (req, res) => {
  const { q, status, type } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;

  if (req.user.role === 'warden') {
    filter._id = req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel || null;
  }

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: regex }, { code: regex }, { city: regex }, { address: regex }];
  }

  const { page, limit, skip } = buildPagination(req.query);
  const sort = buildSort(req.query.sortBy, req.query.order, '-createdAt');

  const [hostels, total] = await Promise.all([
    Hostel.find(filter).sort(sort).skip(skip).limit(limit),
    Hostel.countDocuments(filter),
  ]);

  const data = await attachStats(hostels, req.user.role === 'warden' ? hostels[0]?._id : null);
  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);
  if (!hostel) throw new ApiError(404, 'Hostel not found.');
  if (
    req.user.role === 'warden' &&
    String(hostel._id) !== String(req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel)
  ) {
    throw new ApiError(403, 'You can only view your assigned hostel.');
  }
  const [data] = await attachStats([hostel], req.user.role === 'warden' ? hostel._id : null);
  const rooms = await Room.find({ hostel: hostel._id }).sort('roomNumber');
  res.json({ success: true, data: { ...data, rooms } });
});

const createHostel = asyncHandler(async (req, res) => {
  const { name, code, type, address, city, totalFloors, facilities, description, status } = req.body;

  const existing = await Hostel.findOne({ code: String(code).toUpperCase().trim() });
  if (existing) throw new ApiError(409, 'A hostel with this code already exists.');

  const hostel = await Hostel.create({
    name,
    code,
    type,
    address,
    city,
    totalFloors,
    facilities: facilities || [],
    description,
    status,
    capacity: 0,
  });

  res.status(201).json({ success: true, message: 'Hostel created successfully.', data: hostel });
});

const updateHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);
  if (!hostel) throw new ApiError(404, 'Hostel not found.');

  const fields = ['name', 'code', 'type', 'address', 'city', 'totalFloors', 'facilities', 'description', 'status'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) hostel[field] = req.body[field];
  });

  await hostel.save();
  const [data] = await attachStats([hostel]);
  res.json({ success: true, message: 'Hostel updated successfully.', data });
});

const deleteHostel = asyncHandler(async (req, res) => {
  const hostel = await Hostel.findById(req.params.id);
  if (!hostel) throw new ApiError(404, 'Hostel not found.');

  const rooms = await Room.countDocuments({ hostel: hostel._id });
  if (rooms > 0) {
    throw new ApiError(400, `This hostel has ${rooms} room(s). Remove the rooms before deleting the hostel.`);
  }

  await Hostel.findByIdAndDelete(hostel._id);
  res.json({ success: true, message: 'Hostel deleted successfully.' });
});

module.exports = { listHostels, getHostel, createHostel, updateHostel, deleteHostel };
