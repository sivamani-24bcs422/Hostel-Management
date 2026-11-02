const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const {
  listComplaints,
  getComplaint,
  createComplaint,
  updateComplaint,
  deleteComplaint,
} = require('../controllers/complaintController');

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'warden', 'student'), listComplaints);
router.get('/:id', authorize('admin', 'warden', 'student'), getComplaint);
router.post('/', authorize('student'), validators.createComplaint, validate, createComplaint);
router.put('/:id', authorize('admin', 'warden'), updateComplaint);
router.delete('/:id', authorize('admin', 'warden', 'student'), deleteComplaint);

module.exports = router;
