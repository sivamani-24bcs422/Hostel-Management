const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const {
  listWardens,
  getWarden,
  createWarden,
  updateWarden,
  deleteWarden,
} = require('../controllers/wardenController');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/', listWardens);
router.get('/:id', getWarden);
router.post('/', validators.createWarden, validate, createWarden);
router.put('/:id', updateWarden);
router.delete('/:id', deleteWarden);

module.exports = router;
