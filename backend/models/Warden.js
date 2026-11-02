const mongoose = require('mongoose');

const wardenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      default: null,
    },
    designation: {
      type: String,
      default: 'Hostel Warden',
      trim: true,
    },
    qualification: {
      type: String,
      default: '',
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male',
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    address: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

wardenSchema.index({ hostel: 1, status: 1 });

module.exports = mongoose.model('Warden', wardenSchema);
