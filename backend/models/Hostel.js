const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hostel name is required'],
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['boys', 'girls', 'co-ed'],
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: { type: String, default: '', trim: true },
    totalFloors: { type: Number, default: 1, min: 1 },
    capacity: {
      type: Number,
      default: 0,
      min: 0,
    },
    facilities: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

hostelSchema.virtual('warden', {
  ref: 'Warden',
  localField: '_id',
  foreignField: 'hostel',
  justOne: true,
});

module.exports = mongoose.model('Hostel', hostelSchema);
