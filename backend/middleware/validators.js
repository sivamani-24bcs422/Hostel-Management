const { body } = require('express-validator');

const email = body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail();
const password = body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters');

const login = [email, body('password').notEmpty().withMessage('Password is required')];

const changePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

const updateProfile = [
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('Phone is too long'),
];

const createStudent = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Student name is required'),
  email,
  body('password').optional({ values: 'falsy' }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('rollNo').trim().notEmpty().withMessage('Roll number is required'),
  body('course').trim().notEmpty().withMessage('Course is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Select a valid gender'),
  body('year').optional().isInt({ min: 1, max: 6 }).withMessage('Year must be between 1 and 6'),
  body('guardianName').trim().notEmpty().withMessage('Guardian name is required'),
  body('guardianPhone').trim().notEmpty().withMessage('Guardian phone is required'),
];

const updateStudent = [
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
  body('email').optional().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('rollNo').optional().trim().notEmpty().withMessage('Roll number cannot be empty'),
  body('year').optional().isInt({ min: 1, max: 6 }).withMessage('Year must be between 1 and 6'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Select a valid gender'),
];

const createWarden = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Warden name is required'),
  email,
  body('password').optional({ values: 'falsy' }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('employeeId').trim().notEmpty().withMessage('Employee ID is required'),
  body('hostel').optional({ values: 'falsy' }).isMongoId().withMessage('Select a valid hostel'),
];

const createHostel = [
  body('name').trim().notEmpty().withMessage('Hostel name is required'),
  body('code').trim().notEmpty().withMessage('Hostel code is required'),
  body('type').isIn(['boys', 'girls', 'co-ed']).withMessage('Select a valid hostel type'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('totalFloors').optional().isInt({ min: 1 }).withMessage('Total floors must be at least 1'),
];

const createRoom = [
  body('hostel').isMongoId().withMessage('Select a valid hostel'),
  body('roomNumber').trim().notEmpty().withMessage('Room number is required'),
  body('capacity').isInt({ min: 1, max: 8 }).withMessage('Capacity must be between 1 and 8'),
  body('rent').optional().isFloat({ min: 0 }).withMessage('Rent must be a positive number'),
  body('type').optional().isIn(['single', 'double', 'triple', 'quad']).withMessage('Select a valid room type'),
];

const allocateRoom = [
  body('student').isMongoId().withMessage('Select a valid student'),
  body('room').isMongoId().withMessage('Select a valid room'),
  body('bedNumber').isInt({ min: 1 }).withMessage('Select a valid bed'),
];

const createFee = [
  body('student').isMongoId().withMessage('Select a valid student'),
  body('title').trim().notEmpty().withMessage('Fee title is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
  body('dueDate').isISO8601().withMessage('Select a valid due date'),
  body('type').optional().isIn(['hostel_rent', 'mess', 'security_deposit', 'fine', 'maintenance', 'other']),
];

const recordPayment = [
  body('fee').isMongoId().withMessage('Select a valid fee'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
  body('method').isIn(['cash', 'upi', 'card', 'netbanking', 'bank_transfer']).withMessage('Select a valid payment method'),
];

const markAttendance = [
  body('date').isISO8601().withMessage('A valid attendance date is required'),
  body('records').isArray({ min: 1 }).withMessage('At least one attendance record is required'),
  body('records.*.student').isMongoId().withMessage('Invalid student in attendance records'),
  body('records.*.status').isIn(['present', 'absent', 'late', 'leave']).withMessage('Invalid attendance status'),
];

const createComplaint = [
  body('title').trim().isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('category').optional().isIn(['maintenance', 'cleanliness', 'food', 'security', 'wifi', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
];

const createVisitor = [
  body('student').isMongoId().withMessage('Select a valid student'),
  body('visitorName').trim().notEmpty().withMessage('Visitor name is required'),
  body('phone').trim().notEmpty().withMessage('Visitor phone is required'),
  body('purpose').trim().notEmpty().withMessage('Purpose of visit is required'),
];

const createAnnouncement = [
  body('title').trim().isLength({ min: 3, max: 150 }).withMessage('Title must be 3-150 characters'),
  body('content').trim().isLength({ min: 5 }).withMessage('Announcement content is required'),
  body('audience').isIn(['all', 'students', 'wardens', 'hostel']).withMessage('Select a valid audience'),
  body('priority').optional().isIn(['normal', 'high', 'urgent']),
];

module.exports = {
  login,
  changePassword,
  updateProfile,
  createStudent,
  updateStudent,
  createWarden,
  createHostel,
  createRoom,
  allocateRoom,
  createFee,
  recordPayment,
  markAttendance,
  createComplaint,
  createVisitor,
  createAnnouncement,
};
