const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');
const { login, me, updateProfile, changePassword, logout } = require('../controllers/authController');

const router = express.Router();

router.post('/login', validators.login, validate, login);
router.get('/me', protect, me);
router.put('/profile', protect, validators.updateProfile, validate, updateProfile);
router.put('/password', protect, validators.changePassword, validate, changePassword);
router.post('/logout', protect, logout);

module.exports = router;
