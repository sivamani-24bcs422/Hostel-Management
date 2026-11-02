const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const { listRooms, getRoom, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');

const router = express.Router();

router.use(protect, authorize('admin', 'warden'));

router.get('/', listRooms);
router.get('/:id', getRoom);
router.post('/', authorize('admin'), validators.createRoom, validate, createRoom);
router.put('/:id', authorize('admin'), updateRoom);
router.delete('/:id', authorize('admin'), deleteRoom);

module.exports = router;
