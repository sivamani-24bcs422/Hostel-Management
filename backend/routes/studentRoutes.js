const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'warden'), listStudents);
router.get('/:id', authorize('admin', 'warden', 'student'), getStudent);
router.post('/', authorize('admin'), validators.createStudent, validate, createStudent);
router.put('/:id', authorize('admin'), validators.updateStudent, validate, updateStudent);
router.delete('/:id', authorize('admin'), deleteStudent);

module.exports = router;
