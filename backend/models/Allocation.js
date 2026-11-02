const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    bedNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    allocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    allocatedAt: {
      type: Date,
      default: Date.now,
    },
    vacatedAt: {
      type: Date,
      default: null,
    },
    vacateReason: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'vacated'],
      default: 'active',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

allocationSchema.index(
  { student: 1 },
  { unique: true, partialFilterExpression: { status: 'active' }, name: 'one_active_allocation_per_student' }
);
allocationSchema.index(
  { room: 1, bedNumber: 1 },
  { unique: true, partialFilterExpression: { status: 'active' }, name: 'one_active_student_per_bed' }
);
allocationSchema.index({ hostel: 1, status: 1 });

module.exports = mongoose.model('Allocation', allocationSchema);
