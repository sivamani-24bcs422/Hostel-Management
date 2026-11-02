const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: Number,
      default: 1,
      min: 0,
    },
    type: {
      type: String,
      enum: ['single', 'double', 'triple', 'quad'],
      default: 'double',
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    occupied: {
      type: Number,
      default: 0,
      min: 0,
    },
    rent: {
      type: Number,
      default: 0,
      min: 0,
    },
    facilities: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['available', 'partial', 'full', 'maintenance'],
      default: 'available',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

roomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hostel: 1, status: 1 });

module.exports = mongoose.model('Room', roomSchema);
