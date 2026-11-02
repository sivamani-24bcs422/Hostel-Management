/* eslint-disable no-console */
/**
 * End-to-end smoke test for the HostelHub API.
 *
 * Requires the backend to be running (default http://localhost:3000).
 * Creates a temporary student + fee + payment + attendance + complaint +
 * visitor + announcement, exercises the main flows, then cleans everything up.
 *
 * Usage:
 *   npm run test:smoke
 *   API_URL=http://localhost:3000/api node test/smoke.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

let passed = 0;
let failed = 0;
const failures = [];
const cleanupTasks = [];

const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`,
};

function pass(name, detail = '') {
  passed += 1;
  console.log(`${colors.green('PASS')} ${name}${detail ? colors.dim(` — ${detail}`) : ''}`);
}

function fail(name, detail = '') {
  failed += 1;
  failures.push({ name, detail });
  console.log(`${colors.red('FAIL')} ${name}${detail ? colors.dim(` — ${detail}`) : ''}`);
}

function check(name, condition, detail = '') {
  if (condition) pass(name, detail);
  else fail(name, detail);
  return Boolean(condition);
}

function section(title) {
  console.log(`\n${colors.cyan(`▸ ${title}`)}`);
}

async function request(path, { method = 'GET', token, body, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (raw) return response;

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { response, data };
}

async function expectStatus(name, path, expectedStatus, options = {}) {
  const { response, data } = await request(path, options);
  const ok = response.status === expectedStatus;
  check(
    name,
    ok,
    ok ? `HTTP ${response.status}` : `expected ${expectedStatus}, got ${response.status} ${JSON.stringify(data).slice(0, 300)}`
  );
  return data;
}

const login = async (email, password, label) => {
  const { response, data } = await request('/auth/login', { method: 'POST', body: { email, password } });
  if (!response.ok || !data?.data?.token) {
    throw new Error(`Unable to log in as ${label}: ${response.status} ${JSON.stringify(data)}`);
  }
  pass(`Login as ${label}`);
  return data.data;
};

const main = async () => {
  console.log(colors.yellow(`HostelHub API smoke test → ${BASE_URL}`));
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  const created = {
    primaryStudent: null,
    secondaryStudent: null,
    allocation: null,
    fee: null,
    payments: [],
    complaint: null,
    visitor: null,
    announcement: null,
  };

  section('Health & authentication');
  const health = await expectStatus('Health endpoint responds', '/health', 200);
  check('Health payload is successful', health?.success === true);

  const admin = await login('admin@hostelhub.com', 'Admin@123', 'admin');
  const warden = await login('warden@hostelhub.com', 'Warden@123', 'warden');
  const student = await login('student@hostelhub.com', 'Student@123', 'student');
  check('Admin role is admin', admin.user.role === 'admin', admin.user.email);
  check('Warden role is warden', warden.user.role === 'warden', warden.user.email);
  check('Student role is student', student.user.role === 'student', student.user.email);

  const me = await expectStatus('GET /auth/me returns session', '/auth/me', 200, { token: admin.token });
  check('Session includes admin user', me?.data?.user?.email === admin.user.email);

  const unauth = await expectStatus('Unauthenticated dashboard is rejected', '/dashboard', 401);
  check('Unauthenticated response is not successful', unauth?.success === false);

  section('Role-based access control');
  await expectStatus('Student cannot list all students', '/students', 403, { token: student.token });
  await expectStatus('Student cannot open reports', '/reports/overview', 403, { token: student.token });
  await expectStatus('Warden cannot create students', '/students', 403, {
    token: warden.token,
    method: 'POST',
    body: {},
  });
  await expectStatus('Warden cannot publish announcements to everyone', '/announcements', 403, {
    token: warden.token,
    method: 'POST',
    body: { title: 'Blocked announcement', content: 'This should not be created.', audience: 'all' },
  });
  await expectStatus('Warden cannot delete visitors', '/visitors/000000000000000000000000', 403, {
    token: warden.token,
    method: 'DELETE',
  });

  section('Dashboards');
  const adminDashboard = await expectStatus('Admin dashboard loads', '/dashboard', 200, { token: admin.token });
  check('Admin dashboard returns stats', Boolean(adminDashboard?.data?.stats || adminDashboard?.data?.totals));
  const wardenDashboard = await expectStatus('Warden dashboard loads', '/dashboard', 200, { token: warden.token });
  check('Warden dashboard returns payload', Boolean(wardenDashboard?.data));
  const studentDashboard = await expectStatus('Student dashboard loads', '/dashboard', 200, { token: student.token });
  check('Student dashboard returns payload', Boolean(studentDashboard?.data));

  section('Students & rooms');
  await expectStatus('Hostels list loads', '/hostels?limit=50', 200, { token: admin.token });
  const roomsData = await expectStatus('Rooms list loads', '/rooms?limit=200', 200, { token: admin.token });
  const rooms = roomsData?.data || [];
  const wardenHostelId = warden.profile?.hostel?._id || warden.profile?.hostel;
  const availableRooms = rooms.filter(
    (item) =>
      item.availableBeds > 0 &&
      item.status !== 'maintenance' &&
      ['boys', 'co-ed'].includes(item.hostel?.type)
  );
  const room =
    availableRooms.find((item) => String(item.hostel?._id) === String(wardenHostelId)) ||
    availableRooms[0];
  check('A room with a free bed is available', Boolean(room), room ? `${room.hostel?.name} / ${room.roomNumber}` : 'none found');
  const roomHostelId = room?.hostel?._id;
  const roomBelongsToWarden = String(roomHostelId) === String(wardenHostelId);

  const activeAllocations = await expectStatus(
    'Active allocations for the chosen room load',
    `/allocations?room=${room?._id}&status=active&limit=200`,
    200,
    { token: admin.token }
  );
  const usedBeds = new Set((activeAllocations?.data || []).map((item) => item.bedNumber));
  let freeBed = 1;
  while (usedBeds.has(freeBed)) freeBed += 1;
  check('A free bed number was found', freeBed <= (room?.capacity || 0), `bed ${freeBed}`);

  const studentPayload = {
    name: `Smoke Test ${stamp}`,
    email: `smoke.${stamp}@example.com`,
    password: 'Smoke@123',
    phone: '9876500001',
    rollNo: `SMK${stamp}`.toUpperCase(),
    course: 'B.Tech Computer Science',
    department: 'CSE',
    year: 2,
    gender: 'male',
    guardianName: 'Smoke Guardian',
    guardianPhone: '9876500002',
    address: '1 Test Street',
    city: 'Pune',
    state: 'Maharashtra',
    admissionDate: new Date().toISOString(),
  };

  const studentCreate = await request('/students', { method: 'POST', token: admin.token, body: studentPayload });
  if (!studentCreate.response.ok) {
    throw new Error(`Unable to create smoke-test student: ${studentCreate.response.status} ${JSON.stringify(studentCreate.data)}`);
  }
  created.primaryStudent = studentCreate.data.data;
  cleanupTasks.push(async () => {
    if (created.primaryStudent?._id) {
      await request(`/students/${created.primaryStudent._id}`, { method: 'DELETE', token: admin.token });
    }
  });
  pass('Create student', `HTTP ${studentCreate.response.status}`);

  const secondPayload = {
    ...studentPayload,
    name: `Smoke Second ${stamp}`,
    email: `smoke.second.${stamp}@example.com`,
    rollNo: `SMK2${stamp}`.toUpperCase(),
  };
  const secondCreate = await request('/students', { method: 'POST', token: admin.token, body: secondPayload });
  check('Create second student for conflict test', secondCreate.response.status === 201);
  created.secondaryStudent = secondCreate.data?.data;
  cleanupTasks.push(async () => {
    if (created.secondaryStudent?._id) {
      await request(`/students/${created.secondaryStudent._id}`, { method: 'DELETE', token: admin.token });
    }
  });

  await expectStatus(
    'Update student',
    `/students/${created.primaryStudent._id}`,
    200,
    { token: admin.token, method: 'PUT', body: { year: 3, city: 'Mumbai' } }
  );

  const studentLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: studentPayload.email, password: studentPayload.password },
  });
  check('New student account can log in', studentLogin.response.ok, `HTTP ${studentLogin.response.status}`);
  const newStudentToken = studentLogin.data?.data?.token;
  check('New student profile is linked', studentLogin.data?.data?.profile?._id === created.primaryStudent._id);

  await expectStatus(
    'New student can view own profile',
    `/students/${created.primaryStudent._id}`,
    200,
    { token: newStudentToken }
  );
  await expectStatus(
    'New student cannot view another student',
    `/students/${student.profile?._id}`,
    403,
    { token: newStudentToken }
  );

  section('Allocations & occupancy');
  const roomBefore = await expectStatus('Room snapshot before allocation', `/rooms/${room._id}`, 200, { token: admin.token });
  const allocated = await request('/allocations', {
    method: 'POST',
    token: admin.token,
    body: { student: created.primaryStudent._id, room: room._id, bedNumber: freeBed, notes: 'Smoke test allocation' },
  });
  check('Allocate room', allocated.response.status === 201, `HTTP ${allocated.response.status}`);
  created.allocation = allocated.data?.data;
  check('Allocation references the student', created.allocation?.student?._id === created.primaryStudent._id);

  const roomAfter = await expectStatus('Room snapshot after allocation', `/rooms/${room._id}`, 200, { token: admin.token });
  check(
    'Room occupancy increased',
    roomAfter?.data?.occupied === (roomBefore?.data?.occupied || 0) + 1,
    `${roomBefore?.data?.occupied} → ${roomAfter?.data?.occupied}`
  );

  await expectStatus('Duplicate active allocation is blocked', '/allocations', 409, {
    token: admin.token,
    method: 'POST',
    body: { student: created.primaryStudent._id, room: room._id, bedNumber: freeBed },
  });
  await expectStatus('Already-occupied bed is blocked for another student', '/allocations', 409, {
    token: admin.token,
    method: 'POST',
    body: { student: created.secondaryStudent._id, room: room._id, bedNumber: freeBed },
  });

  const myAllocation = await expectStatus('Student sees own allocation', '/allocations/my', 200, {
    token: newStudentToken,
  });
  check('Own allocation is active', myAllocation?.data?.status === 'active');

  section('Fees, payments & PDF receipt');
  const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const feeCreate = await request('/fees', {
    method: 'POST',
    token: admin.token,
    body: {
      student: created.primaryStudent._id,
      title: 'Smoke Test Hostel Rent',
      type: 'hostel_rent',
      academicYear: '2026-2027',
      period: '2026-11',
      amount: 5000,
      dueDate,
      description: 'Fee created by the smoke test',
    },
  });
  check('Create fee', feeCreate.response.status === 201, `HTTP ${feeCreate.response.status}`);
  created.fee = feeCreate.data?.data;

  const partialPayment = await request('/payments', {
    method: 'POST',
    token: admin.token,
    body: {
      fee: created.fee?._id,
      amount: 2000,
      method: 'upi',
      transactionId: `SMOKE-UPI-${stamp}`,
      notes: 'Smoke test partial payment',
    },
  });
  check('Record partial payment', partialPayment.response.status === 201, `HTTP ${partialPayment.response.status}`);
  if (partialPayment.data?.data?._id) created.payments.push(partialPayment.data.data._id);

  await expectStatus('Overpayment is rejected', '/payments', 400, {
    token: admin.token,
    method: 'POST',
    body: { fee: created.fee?._id, amount: 4000, method: 'cash' },
  });

  const finalPayment = await request('/payments', {
    method: 'POST',
    token: admin.token,
    body: {
      fee: created.fee?._id,
      amount: 3000,
      method: 'cash',
      notes: 'Smoke test final payment',
    },
  });
  check('Record final payment', finalPayment.response.status === 201, `HTTP ${finalPayment.response.status}`);
  if (finalPayment.data?.data?._id) created.payments.push(finalPayment.data.data._id);

  const feeAfter = await expectStatus('Fee detail after payments', `/fees/${created.fee?._id}`, 200, {
    token: admin.token,
  });
  check('Fee is fully paid', feeAfter?.data?.status === 'paid', `status=${feeAfter?.data?.status}`);
  check('Fee tracks both payments', (feeAfter?.data?.payments || []).length === 2);

  const feeList = await expectStatus('Fee list loads with summary', '/fees?limit=5', 200, { token: admin.token });
  check('Fee summary is present', typeof feeList?.summary?.billed === 'number');
  await expectStatus('Student sees own fees', '/fees', 200, { token: newStudentToken });

  const paymentId = partialPayment.data?.data?._id;
  const receipt = await request(`/payments/${paymentId}/receipt`, { token: admin.token, raw: true });
  const receiptBuffer = Buffer.from(await receipt.arrayBuffer());
  check('PDF receipt downloads', receipt.status === 200, `HTTP ${receipt.status}`);
  check(
    'Receipt is a valid PDF',
    (receipt.headers.get('content-type') || '').includes('application/pdf') &&
      receiptBuffer.subarray(0, 4).toString() === '%PDF',
    `${receiptBuffer.length} bytes`
  );

  const paymentsList = await expectStatus('Payments list loads', '/payments?limit=10', 200, { token: admin.token });
  check('Payments summary is present', typeof paymentsList?.summary?.totalCollected === 'number');
  const studentPayments = await expectStatus('Student sees own payments', '/payments?limit=50', 200, {
    token: newStudentToken,
  });
  check(
    'Student payment scoping returns only own records',
    (studentPayments?.data || []).every(
      (payment) => String(payment.student?._id) === String(created.primaryStudent._id)
    )
  );

  await expectStatus('Fee with payments cannot be deleted', `/fees/${created.fee?._id}`, 400, {
    token: admin.token,
    method: 'DELETE',
  });

  section('Attendance');
  const attendanceDate = new Date().toISOString().slice(0, 10);
  await expectStatus('Bulk mark attendance', '/attendance/bulk', 200, {
    token: admin.token,
    method: 'POST',
    body: {
      date: attendanceDate,
      records: [{ student: created.primaryStudent._id, status: 'present', note: 'Smoke test' }],
    },
  });
  const attendanceList = await expectStatus(
    'Attendance list filters by student',
    `/attendance?student=${created.primaryStudent._id}&limit=10`,
    200,
    { token: admin.token }
  );
  check('Attendance record was stored', (attendanceList?.data || []).length >= 1);
  const trend = await expectStatus('Attendance trend loads', '/attendance/trend?days=7', 200, {
    token: warden.token,
  });
  check('Trend returns 7 days', (trend?.data || []).length === 7);
  await expectStatus('Student sees own attendance', '/attendance', 200, { token: newStudentToken });

  section('Complaints');
  const complaintCreate = await request('/complaints', {
    method: 'POST',
    token: newStudentToken,
    body: {
      title: 'Smoke test complaint',
      description: 'This complaint was created by the automated smoke test.',
      category: 'wifi',
      priority: 'medium',
    },
  });
  check('Student creates complaint', complaintCreate.response.status === 201, `HTTP ${complaintCreate.response.status}`);
  created.complaint = complaintCreate.data?.data;

  const resolved = await expectStatus(
    'Complaint is resolved',
    `/complaints/${created.complaint?._id}`,
    200,
    roomBelongsToWarden
      ? {
          token: warden.token,
          method: 'PUT',
          body: { status: 'resolved', resolutionNote: 'Resolved during smoke test' },
        }
      : {
          token: admin.token,
          method: 'PUT',
          body: { status: 'resolved', resolutionNote: 'Resolved during smoke test' },
        }
  );
  check('Complaint status is resolved', resolved?.data?.status === 'resolved');
  await expectStatus('Admin lists complaints', '/complaints?limit=5', 200, { token: admin.token });

  section('Visitors');
  const visitorCreate = await request('/visitors', {
    method: 'POST',
    token: admin.token,
    body: {
      student: created.primaryStudent._id,
      visitorName: 'Smoke Visitor',
      phone: '9876500003',
      relation: 'Parent',
      purpose: 'Smoke test visit',
      idProof: 'Aadhaar 0000-0000-0000',
    },
  });
  check('Create visitor', visitorCreate.response.status === 201, `HTTP ${visitorCreate.response.status}`);
  created.visitor = visitorCreate.data?.data;

  const checkout = await expectStatus('Check out visitor', `/visitors/${created.visitor?._id}/checkout`, 200, {
    token: warden.token,
    method: 'PUT',
  });
  check('Visitor is checked out', checkout?.data?.status === 'checked_out');
  await expectStatus('Visitor record deletes', `/visitors/${created.visitor?._id}`, 200, {
    token: admin.token,
    method: 'DELETE',
  });
  created.visitor = null;

  section('Announcements');
  const announcementCreate = await request('/announcements', {
    method: 'POST',
    token: admin.token,
    body: {
      title: `Smoke test announcement ${stamp}`,
      content: 'Automated smoke test announcement content.',
      audience: 'all',
      priority: 'normal',
    },
  });
  check('Admin publishes announcement', announcementCreate.response.status === 201, `HTTP ${announcementCreate.response.status}`);
  created.announcement = announcementCreate.data?.data;

  await expectStatus('Update announcement', `/announcements/${created.announcement?._id}`, 200, {
    token: admin.token,
    method: 'PUT',
    body: { title: `Updated smoke test announcement ${stamp}`, priority: 'high' },
  });
  const studentAnnouncements = await expectStatus('Student sees announcements', '/announcements?limit=10', 200, {
    token: newStudentToken,
  });
  check(
    'Announcement is visible to students',
    (studentAnnouncements?.data || []).some((item) => item._id === created.announcement?._id)
  );

  section('Reports & CSV exports');
  const overview = await expectStatus('Report overview loads', '/reports/overview', 200, { token: admin.token });
  check('Report overview contains occupancy data', Boolean(overview?.data?.occupancy || overview?.data));

  const reportTypes = ['students', 'wardens', 'hostels', 'rooms', 'allocations', 'fees', 'payments', 'attendance', 'complaints', 'visitors'];
  for (const type of reportTypes) {
    const exportResponse = await request(`/reports/export/${type}`, { token: admin.token, raw: true });
    const text = await exportResponse.text();
    const contentType = exportResponse.headers.get('content-type') || '';
    check(
      `CSV export: ${type}`,
      exportResponse.status === 200 && contentType.includes('text/csv') && text.length > 0,
      `HTTP ${exportResponse.status}, ${text.length} chars`
    );
  }

  section('Vacate & cleanup');
  const vacated = await expectStatus('Vacate allocation', `/allocations/${created.allocation?._id}/vacate`, 200, {
    token: admin.token,
    method: 'PUT',
    body: { reason: 'Smoke test finished' },
  });
  check('Allocation status is vacated', vacated?.data?.status === 'vacated');

  const roomFinal = await expectStatus('Room snapshot after vacate', `/rooms/${room._id}`, 200, { token: admin.token });
  check(
    'Room occupancy restored',
    roomFinal?.data?.occupied === (roomBefore?.data?.occupied || 0),
    `${roomAfter?.data?.occupied} → ${roomFinal?.data?.occupied}`
  );

  const deleteAnnouncement = await request(`/announcements/${created.announcement?._id}`, {
    method: 'DELETE',
    token: admin.token,
  });
  check('Delete announcement', deleteAnnouncement.response.status === 200);
  created.announcement = null;

  const deleteStudent = await request(`/students/${created.primaryStudent?._id}`, {
    method: 'DELETE',
    token: admin.token,
  });
  check('Delete student (cascades related records)', deleteStudent.response.status === 200);
  created.primaryStudent = null;

  await expectStatus('Deleted student returns 404', `/students/${studentCreate.data.data._id}`, 404, {
    token: admin.token,
  });
  await expectStatus('Cascaded fee is deleted', `/fees/${created.fee?._id}`, 404, { token: admin.token });
  await expectStatus('Cascaded payment is deleted', `/payments/${paymentId}`, 404, { token: admin.token });

  if (created.secondaryStudent?._id) {
    const deleteSecond = await request(`/students/${created.secondaryStudent._id}`, {
      method: 'DELETE',
      token: admin.token,
    });
    check('Delete second student', deleteSecond.response.status === 200);
    created.secondaryStudent = null;
  }
};

const run = async () => {
  try {
    await main();
  } catch (error) {
    fail('Unexpected smoke test error', error.message);
  } finally {
    for (const task of cleanupTasks.reverse()) {
      try {
        await task();
      } catch {
        // Best-effort cleanup.
      }
    }

    const total = passed + failed;
    console.log(`\n${colors.cyan('─'.repeat(60))}`);
    console.log(`${colors.green(`${passed} passed`)} / ${colors.red(`${failed} failed`)} / ${total} checks`);
    if (failures.length) {
      console.log(colors.red('\nFailures:'));
      failures.forEach((item) => console.log(`  • ${item.name}${item.detail ? ` — ${item.detail}` : ''}`));
    }
    console.log(colors.cyan('─'.repeat(60)));
    process.exit(failed ? 1 : 0);
  }
};

run();
