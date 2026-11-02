const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { overview, exportReport } = require('../controllers/reportController');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/overview', overview);
router.get('/export/:type', exportReport);

module.exports = router;
