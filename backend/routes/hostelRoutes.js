const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const {
  listHostels,
  getHostel,
  createHostel,
  updateHostel,
  deleteHostel,
} = require('../controllers/hostelController');

const router = express.Router();

router.use(protect, authorize('admin', 'warden'));

router.get('/', listHostels);
router.get('/:id', getHostel);
router.post('/', authorize('admin'), validators.createHostel, validate, createHostel);
router.put('/:id', authorize('admin'), updateHostel);
router.delete('/:id', authorize('admin'), deleteHostel);

module.exports = router;
