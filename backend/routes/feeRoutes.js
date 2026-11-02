const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const {
  listFees,
  getFee,
  createFee,
  updateFee,
  deleteFee,
  generateFees,
  feeSummary,
} = require('../controllers/feeController');

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'warden', 'student'), listFees);
router.get('/summary', authorize('admin', 'warden', 'student'), feeSummary);
router.post('/generate', authorize('admin'), generateFees);
router.post('/', authorize('admin'), validators.createFee, validate, createFee);
router.get('/:id', authorize('admin', 'warden', 'student'), getFee);
router.put('/:id', authorize('admin'), updateFee);
router.delete('/:id', authorize('admin'), deleteFee);

module.exports = router;
