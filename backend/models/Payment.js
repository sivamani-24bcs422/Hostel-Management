const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    fee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fee',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'netbanking', 'bank_transfer'],
      default: 'upi',
    },
    transactionId: {
      type: String,
      default: '',
      trim: true,
    },
    receiptNo: {
      type: String,
      unique: true,
      required: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
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
    status: {
      type: String,
      enum: ['success', 'refunded'],
      default: 'success',
    },
  },
  { timestamps: true }
);

paymentSchema.index({ paidAt: -1 });
paymentSchema.index({ student: 1, paidAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
