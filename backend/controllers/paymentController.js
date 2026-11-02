const Payment = require('../models/Payment');
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, buildPagination, buildSort, round2, dateRangeFilter } = require('../utils/helpers');
const generateReceipt = require('../utils/receipt');

const populatePayment = (query) =>
  query
    .populate('fee', 'title type amount paidAmount period dueDate status')
    .populate({ path: 'student', populate: { path: 'user', select: 'name email phone' } })
    .populate('recordedBy', 'name role');

const buildPaymentFilter = async (req) => {
  const { q, method, student, from, to } = req.query;
  const filter = { ...dateRangeFilter(from, to, 'paidAt') };

  if (req.user.role === 'student') {
    filter.student = req.studentProfile?._id || null;
  } else if (req.user.role === 'warden') {
    const students = await Student.find({
      hostel: req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel || null,
    }).select('_id');
    filter.student = { $in: students.map((item) => item._id) };
  }

  if (student) filter.student = student;
  if (method) filter.method = method;

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ name: regex }).select('_id');
    const students = await Student.find({
      $or: [{ rollNo: regex }, { user: { $in: users.map((user) => user._id) } }],
    }).select('_id');
    filter.$or = [
      { receiptNo: regex },
      { transactionId: regex },
      { student: { $in: students.map((item) => item._id) } },
    ];
  }

  return filter;
};

const listPayments = asyncHandler(async (req, res) => {
  const filter = await buildPaymentFilter(req);
  const { page, limit, skip } = buildPagination(req.query);
  const sort = buildSort(req.query.sortBy, req.query.order, '-paidAt');

  const [payments, total, totals] = await Promise.all([
    populatePayment(Payment.find(filter)).sort(sort).skip(skip).limit(limit),
    Payment.countDocuments(filter),
    Payment.aggregate([
      { $match: { ...filter, status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    success: true,
    data: payments,
    summary: { totalCollected: round2(totals[0]?.total || 0) },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getPayment = asyncHandler(async (req, res) => {
  const payment = await populatePayment(Payment.findById(req.params.id));
  if (!payment) throw new ApiError(404, 'Payment not found.');

  if (req.user.role === 'student' && String(payment.student?._id) !== String(req.studentProfile?._id)) {
    throw new ApiError(403, 'You can only view your own payments.');
  }

  res.json({ success: true, data: payment });
});

const recordPayment = asyncHandler(async (req, res) => {
  const { fee: feeId, amount, method, transactionId, paidAt, notes } = req.body;

  const fee = await Fee.findById(feeId).populate('student');
  if (!fee) throw new ApiError(404, 'Fee not found.');

  const amountValue = round2(amount);
  const balance = round2(fee.amount - fee.paidAmount);
  if (amountValue <= 0) throw new ApiError(400, 'Payment amount must be greater than zero.');
  if (amountValue > balance) {
    throw new ApiError(400, `Payment exceeds the outstanding balance of Rs. ${balance.toLocaleString('en-IN')}.`);
  }

  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const receiptNo = `RCPT-${datePart}-${String(Date.now()).slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;

  const payment = await Payment.create({
    fee: fee._id,
    student: fee.student._id,
    hostel: fee.hostel || fee.student.hostel || null,
    amount: amountValue,
    method,
    transactionId,
    receiptNo,
    paidAt: paidAt || now,
    recordedBy: req.user._id,
    notes,
    status: 'success',
  });

  fee.paidAmount = round2(fee.paidAmount + amountValue);
  if (fee.paidAmount >= fee.amount) fee.status = 'paid';
  else fee.status = 'partial';
  await fee.save();

  const populated = await populatePayment(Payment.findById(payment._id));
  res.status(201).json({
    success: true,
    message: `Payment recorded. Receipt ${receiptNo} generated.`,
    data: populated,
  });
});

const downloadReceipt = asyncHandler(async (req, res) => {
  const payment = await populatePayment(Payment.findById(req.params.id));
  if (!payment) throw new ApiError(404, 'Payment not found.');

  if (req.user.role === 'student' && String(payment.student?._id) !== String(req.studentProfile?._id)) {
    throw new ApiError(403, 'You can only download your own receipts.');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${payment.receiptNo}.pdf"`);
  generateReceipt(payment).pipe(res);
});

module.exports = { listPayments, getPayment, recordPayment, downloadReceipt };
