const Allocation = require('../models/Allocation');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');

const syncRoomOccupancy = async (roomId) => {
  const room = await Room.findById(roomId);
  if (!room) return null;

  const occupied = await Allocation.countDocuments({ room: roomId, status: 'active' });
  room.occupied = occupied;

  if (room.status !== 'maintenance') {
    if (occupied === 0) room.status = 'available';
    else if (occupied >= room.capacity) room.status = 'full';
    else room.status = 'partial';
  }

  await room.save();

  const totalBeds = await Room.aggregate([
    { $match: { hostel: room.hostel } },
    { $group: { _id: null, total: { $sum: '$capacity' } } },
  ]);

  await Hostel.findByIdAndUpdate(room.hostel, { capacity: totalBeds[0]?.total || 0 });
  return room;
};

const syncHostelCapacity = async (hostelId) => {
  const result = await Room.aggregate([
    { $match: { hostel: hostelId } },
    { $group: { _id: null, total: { $sum: '$capacity' } } },
  ]);
  await Hostel.findByIdAndUpdate(hostelId, { capacity: result[0]?.total || 0 });
};

module.exports = { syncRoomOccupancy, syncHostelCapacity };
