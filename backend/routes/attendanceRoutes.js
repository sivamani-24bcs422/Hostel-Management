const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const {
  listAttendance,
  bulkMark,
  deleteAttendance,
  attendanceTrend,
} = require('../controllers/attendanceController');

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'warden', 'student'), listAttendance);
router.get('/trend', authorize('admin', 'warden', 'student'), attendanceTrend);
router.post('/bulk', authorize('admin', 'warden'), validators.markAttendance, validate, bulkMark);
router.delete('/:id', authorize('admin', 'warden'), deleteAttendance);

module.exports = router;
