const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const {
  listPayments,
  getPayment,
  recordPayment,
  downloadReceipt,
} = require('../controllers/paymentController');

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'warden', 'student'), listPayments);
router.post('/', authorize('admin'), validators.recordPayment, validate, recordPayment);
router.get('/:id/receipt', authorize('admin', 'warden', 'student'), downloadReceipt);
router.get('/:id', authorize('admin', 'warden', 'student'), getPayment);

module.exports = router;
