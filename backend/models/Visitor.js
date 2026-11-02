const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
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
    visitorName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    relation: {
      type: String,
      default: 'Family',
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    visitDate: {
      type: Date,
      default: Date.now,
    },
    checkIn: {
      type: Date,
      default: Date.now,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    idProof: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['checked_in', 'checked_out'],
      default: 'checked_in',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

visitorSchema.index({ hostel: 1, checkIn: -1 });

module.exports = mongoose.model('Visitor', visitorSchema);
