const asyncHandler = require('../utils/asyncHandler');
const {
  getAdminDashboard,
  getWardenDashboard,
  getStudentDashboard,
} = require('../services/dashboardService');

const getDashboard = asyncHandler(async (req, res) => {
  let data;
  if (req.user.role === 'admin') {
    data = await getAdminDashboard();
  } else if (req.user.role === 'warden') {
    data = await getWardenDashboard(req.wardenProfile?.hostel?._id || req.wardenProfile?.hostel);
  } else {
    data = await getStudentDashboard(req.studentProfile);
  }

  res.json({ success: true, data });
});

module.exports = { getDashboard };
