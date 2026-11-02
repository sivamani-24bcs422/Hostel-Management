const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'warden', 'student'), listAnnouncements);
router.post('/', authorize('admin', 'warden'), validators.createAnnouncement, validate, createAnnouncement);
router.put('/:id', authorize('admin', 'warden'), updateAnnouncement);
router.delete('/:id', authorize('admin', 'warden'), deleteAnnouncement);

module.exports = router;
