const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const {
  listVisitors,
  createVisitor,
  updateVisitor,
  checkoutVisitor,
  deleteVisitor,
} = require('../controllers/visitorController');

const router = express.Router();

router.use(protect, authorize('admin', 'warden'));

router.get('/', listVisitors);
router.post('/', validators.createVisitor, validate, createVisitor);
router.put('/:id/checkout', checkoutVisitor);
router.put('/:id', updateVisitor);
router.delete('/:id', authorize('admin'), deleteVisitor);

module.exports = router;
