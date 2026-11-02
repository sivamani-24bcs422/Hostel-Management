const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema(
  {
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['hostel_rent', 'mess', 'security_deposit', 'fine', 'maintenance', 'other'],
      default: 'hostel_rent',
    },
    academicYear: {
      type: String,
      default: () => `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    },
    period: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue'],
      default: 'pending',
    },
    dueDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

feeSchema.virtual('balance').get(function balance() {
  return Math.max(0, Math.round((this.amount - this.paidAmount) * 100) / 100);
});

feeSchema.index({ student: 1, status: 1 });
feeSchema.index({ status: 1, dueDate: 1 });
feeSchema.index({ period: 1, type: 1 });

module.exports = mongoose.model('Fee', feeSchema);
