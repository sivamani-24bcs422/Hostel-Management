const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const {
  listAllocations,
  getMyAllocation,
  allocateRoom,
  vacateRoom,
} = require('../controllers/allocationController');

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'warden', 'student'), listAllocations);
router.get('/my', authorize('student'), getMyAllocation);
router.post('/', authorize('admin'), validators.allocateRoom, validate, allocateRoom);
router.put('/:id/vacate', authorize('admin'), vacateRoom);

module.exports = router;
