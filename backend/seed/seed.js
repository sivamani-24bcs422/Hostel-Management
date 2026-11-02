/* eslint-disable no-console */
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Student = require('../models/Student');
const Warden = require('../models/Warden');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Complaint = require('../models/Complaint');
const Visitor = require('../models/Visitor');
const Announcement = require('../models/Announcement');

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const atUtc = (date) => {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
};
const daysAgo = (days) => new Date(now.getTime() - days * DAY);
const monthStart = (offset) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
const monthLabel = (offset) =>
  monthStart(offset).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const periodKey = (offset) => {
  const date = monthStart(offset);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const names = [
  'Aarav Sharma', 'Vivaan Mehta', 'Aditya Verma', 'Rohan Kapoor', 'Arjun Malhotra', 'Kabir Singh',
  'Ishaan Nair', 'Dev Patel', 'Siddharth Rao', 'Yash Gupta', 'Rishabh Jain', 'Aryan Chawla',
  'Karan Deshmukh', 'Nikhil Joshi', 'Om Prakash', 'Harsh Vardhan', 'Mohit Bansal', 'Rahul Yadav',
  'Sameer Khan', 'Tanmay Bhatt', 'Uday Kulkarni', 'Varun Reddy', 'Pranav Iyer', 'Ansh Sethi',
  'Aditi Sharma', 'Aanya Verma', 'Diya Patel', 'Ishita Nair', 'Kavya Menon', 'Meera Joshi',
  'Nisha Rao', 'Ojaswini Deshmukh', 'Priya Kapoor', 'Riya Malhotra', 'Saanvi Gupta', 'Tanvi Bansal',
  'Trisha Jain', 'Urvi Chawla', 'Vaishnavi Kulkarni', 'Zara Khan', 'Anushka Reddy', 'Neha Iyer',
  'Aarohi Sethi', 'Kiara Singh', 'Rhea Mehta', 'Advait Bhatt', 'Reyansh Yadav', 'Dhruv Nair',
];

const courses = [
  { course: 'B.Tech Computer Science', department: 'CSE', code: 'CSE' },
  { course: 'B.Tech Electronics', department: 'ECE', code: 'ECE' },
  { course: 'B.Tech Mechanical', department: 'ME', code: 'ME' },
  { course: 'B.Tech Civil', department: 'CE', code: 'CE' },
  { course: 'BBA', department: 'Management', code: 'BBA' },
  { course: 'B.Sc Data Science', department: 'Science', code: 'BSC' },
];

const bloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B+', 'O+'];
const guardianFirstNames = ['Rajesh', 'Sunita', 'Anil', 'Kavita', 'Vijay', 'Rekha', 'Sanjay', 'Poonam'];
const cities = ['Pune', 'Mumbai', 'Nashik', 'Nagpur', 'Delhi', 'Jaipur', 'Hyderabad', 'Bengaluru'];

async function seed() {
  await connectDB();
  console.log('Clearing existing HostelHub collections...');

  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Warden.deleteMany({}),
    Hostel.deleteMany({}),
    Room.deleteMany({}),
    Allocation.deleteMany({}),
    Fee.deleteMany({}),
    Payment.deleteMany({}),
    Attendance.deleteMany({}),
    Complaint.deleteMany({}),
    Visitor.deleteMany({}),
    Announcement.deleteMany({}),
  ]);

  await Promise.all([
    User.syncIndexes(), Student.syncIndexes(), Warden.syncIndexes(), Hostel.syncIndexes(),
    Room.syncIndexes(), Allocation.syncIndexes(), Fee.syncIndexes(), Payment.syncIndexes(),
    Attendance.syncIndexes(), Complaint.syncIndexes(), Visitor.syncIndexes(), Announcement.syncIndexes(),
  ]);

  const [adminHash, wardenHash, studentHash, commonHash] = await Promise.all([
    bcrypt.hash('Admin@123', 10),
    bcrypt.hash('Warden@123', 10),
    bcrypt.hash('Student@123', 10),
    bcrypt.hash(process.env.SEED_PASSWORD || 'Password@123', 10),
  ]);

  const adminId = new mongoose.Types.ObjectId();
  const adminUser = {
    _id: adminId,
    name: 'Ananya Deshmukh',
    email: 'admin@hostelhub.com',
    password: adminHash,
    role: 'admin',
    phone: '+91 98220 11001',
    isActive: true,
    lastLogin: daysAgo(0),
  };

  const hostelSeeds = [
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Aryabhatta Boys Hostel',
      code: 'ABH',
      type: 'boys',
      address: 'Plot 12, University Campus, Kothrud',
      city: 'Pune',
      totalFloors: 3,
      facilities: ['High-speed Wi-Fi', 'Mess', 'Laundry', 'Gym', '24x7 Security', 'CCTV'],
      description: 'A vibrant boys hostel with modern study lounges and a fully equipped fitness centre.',
      status: 'active',
      capacity: 0,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Kalpana Chawla Girls Hostel',
      code: 'KCG',
      type: 'girls',
      address: 'Plot 18, University Campus, Kothrud',
      city: 'Pune',
      totalFloors: 3,
      facilities: ['High-speed Wi-Fi', 'Mess', 'Laundry', 'Common Room', '24x7 Security', 'CCTV'],
      description: 'Secure and welcoming girls hostel with dedicated wardens and wellness facilities.',
      status: 'active',
      capacity: 0,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Ramanujan International House',
      code: 'RIH',
      type: 'co-ed',
      address: 'Plot 24, North Campus, Baner',
      city: 'Pune',
      totalFloors: 3,
      facilities: ['High-speed Wi-Fi', 'Cafeteria', 'Laundry', 'Study Pods', '24x7 Security'],
      description: 'A co-ed residence for international and research students with premium amenities.',
      status: 'active',
      capacity: 0,
    },
  ];

  const wardenSeeds = [
    {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      name: 'Vikram Rathore',
      email: 'warden@hostelhub.com',
      password: wardenHash,
      phone: '+91 98220 22001',
      employeeId: 'WDN-001',
      hostel: hostelSeeds[0]._id,
      designation: 'Senior Hostel Warden',
      qualification: 'M.A. Public Administration',
      gender: 'male',
      joiningDate: daysAgo(820),
      status: 'active',
      address: 'Staff Quarters, University Campus, Pune',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      name: 'Meera Nair',
      email: 'meera.warden@hostelhub.com',
      password: commonHash,
      phone: '+91 98220 22002',
      employeeId: 'WDN-002',
      hostel: hostelSeeds[1]._id,
      designation: 'Hostel Warden',
      qualification: 'M.Sc. Psychology',
      gender: 'female',
      joiningDate: daysAgo(610),
      status: 'active',
      address: 'Staff Quarters, University Campus, Pune',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      name: 'Suresh Patil',
      email: 'suresh.warden@hostelhub.com',
      password: commonHash,
      phone: '+91 98220 22003',
      employeeId: 'WDN-003',
      hostel: hostelSeeds[2]._id,
      designation: 'Assistant Warden',
      qualification: 'B.Com, Hospitality',
      gender: 'male',
      joiningDate: daysAgo(390),
      status: 'active',
      address: 'Staff Quarters, North Campus, Pune',
    },
  ];

  await User.insertMany([
    adminUser,
    ...wardenSeeds.map((warden) => ({
      _id: warden.user,
      name: warden.name,
      email: warden.email,
      password: warden.password,
      role: 'warden',
      phone: warden.phone,
      isActive: true,
      lastLogin: daysAgo(1),
    })),
  ]);
  await Hostel.insertMany(hostelSeeds);

  const roomSeeds = [];
  for (const hostel of hostelSeeds) {
    for (let floor = 1; floor <= 3; floor += 1) {
      const roomLayout = [
        { suffix: '1', type: 'single', capacity: 1, rent: 5500 },
        { suffix: '2', type: 'double', capacity: 2, rent: 4200 },
        { suffix: '3', type: 'triple', capacity: 3, rent: 3200 },
        { suffix: '4', type: 'triple', capacity: 3, rent: 3200 },
      ];
      for (const layout of roomLayout) {
        roomSeeds.push({
          _id: new mongoose.Types.ObjectId(),
          hostel: hostel._id,
          roomNumber: `${floor}0${layout.suffix}`,
          floor,
          type: layout.type,
          capacity: layout.capacity,
          occupied: 0,
          rent: layout.rent,
          facilities: ['Attached bathroom', 'Study table', 'Wardrobe', 'Ceiling fan'],
          status: 'available',
        });
      }
    }
  }
  await Room.insertMany(roomSeeds);

  const studentUsers = [];
  const studentSeeds = [];

  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    const [firstName, lastName] = name.split(' ');
    const male = i < 24 || i >= 45;
    const course = courses[i % courses.length];
    const hostelIndex = i < 24 ? 0 : i < 44 ? 1 : 2;
    const hostel = hostelSeeds[hostelIndex];
    const email = i === 0 ? 'student@hostelhub.com' : `${firstName}.${lastName}${i + 1}@student.hostelhub.com`.toLowerCase();
    const userId = new mongoose.Types.ObjectId();

    studentUsers.push({
      _id: userId,
      name,
      email,
      password: i === 0 ? studentHash : commonHash,
      role: 'student',
      phone: `+91 98765 ${String(10000 + i).slice(-5)}`,
      isActive: true,
      lastLogin: daysAgo(i % 5),
    });

    studentSeeds.push({
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      rollNo: `2026${course.code}${String(i + 1).padStart(3, '0')}`,
      course: course.course,
      department: course.department,
      year: (i % 4) + 1,
      semester: `Semester ${((i % 4) + 1) * 2}`,
      gender: male ? 'male' : 'female',
      dateOfBirth: new Date(Date.UTC(2004 + (i % 4), i % 12, ((i * 7) % 27) + 1)),
      bloodGroup: bloodGroups[i % bloodGroups.length],
      guardianName: `${guardianFirstNames[i % guardianFirstNames.length]} ${lastName}`,
      guardianPhone: `+91 99887 ${String(20000 + i).slice(-5)}`,
      guardianEmail: `${guardianFirstNames[i % guardianFirstNames.length].toLowerCase()}.${lastName}@gmail.com`.toLowerCase(),
      address: `${10 + (i % 80)}, ${['Sunrise Residency', 'Green Park', 'Lake View Apartments', 'Shivaji Nagar'][i % 4]}`,
      city: cities[i % cities.length],
      state: ['Maharashtra', 'Delhi', 'Rajasthan', 'Telangana', 'Karnataka'][i % 5],
      pincode: `4110${String(i % 90).padStart(2, '0')}`,
      admissionDate: new Date(Date.UTC(2026 - (i % 4), 6, 15)),
      hostel: hostel._id,
      room: null,
      status: 'active',
      notes: i === 0 ? 'Demo student account' : '',
    });
  }

  await User.insertMany(studentUsers);
  await Student.insertMany(studentSeeds);

  const roomBuckets = {};
  for (const room of roomSeeds) {
    const key = String(room.hostel);
    if (!roomBuckets[key]) roomBuckets[key] = [];
    roomBuckets[key].push(room);
  }

  const allocations = [];
  const roomOccupied = {};
  const bedCursor = {};

  for (const student of studentSeeds) {
    const rooms = roomBuckets[String(student.hostel)];
    let assignedRoom = null;
    let bedNumber = null;
    for (const room of rooms) {
      const taken = roomOccupied[String(room._id)] || 0;
      if (taken < room.capacity) {
        assignedRoom = room;
        roomOccupied[String(room._id)] = taken + 1;
        bedCursor[String(room._id)] = taken + 1;
        bedNumber = taken + 1;
        break;
      }
    }
    if (!assignedRoom) continue;

    student.room = assignedRoom._id;
    allocations.push({
      student: student._id,
      hostel: student.hostel,
      room: assignedRoom._id,
      bedNumber,
      allocatedBy: adminId,
      allocatedAt: daysAgo(30 + (allocations.length % 40)),
      status: 'active',
      notes: 'Seeded allocation',
    });
  }

  await Allocation.insertMany(allocations);
  await Student.bulkWrite(
    studentSeeds.map((student) => ({
      updateOne: { filter: { _id: student._id }, update: { $set: { hostel: student.hostel, room: student.room } } },
    }))
  );
  await Room.bulkWrite(
    roomSeeds.map((room) => {
      const occupied = roomOccupied[String(room._id)] || 0;
      return {
        updateOne: {
          filter: { _id: room._id },
          update: {
            $set: {
              occupied,
              status: occupied === 0 ? 'available' : occupied >= room.capacity ? 'full' : 'partial',
            },
          },
        },
      };
    })
  );
  await Hostel.bulkWrite(
    hostelSeeds.map((hostel) => {
      const capacity = roomSeeds
        .filter((room) => String(room.hostel) === String(hostel._id))
        .reduce((sum, room) => sum + room.capacity, 0);
      return { updateOne: { filter: { _id: hostel._id }, update: { $set: { capacity } } } };
    })
  );

  await Warden.insertMany(
    wardenSeeds.map(({ name, email, password, ...warden }) => warden)
  );

  const feeDocs = [];
  const paymentPlans = [];
  let receiptCounter = 1;

  const receiptNo = (date) => {
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const value = `RCPT-${stamp}-${String(receiptCounter).padStart(4, '0')}`;
    receiptCounter += 1;
    return value;
  };

  studentSeeds.forEach((student, index) => {
    const room = roomSeeds.find((item) => String(item._id) === String(student.room));
    const rent = room?.rent || 3500;

    for (let offset = 5; offset >= 0; offset -= 1) {
      const dueDate = offset === 0 ? new Date(now.getTime() + 10 * DAY) : new Date(monthStart(offset).getTime() + 4 * DAY);
      let amount = rent;
      let paidAmount = 0;
      let status = 'pending';

      if (offset >= 2) {
        if (offset === 2 && index % 7 === 0) {
          status = 'overdue';
          paidAmount = 0;
        } else {
          paidAmount = amount;
          status = 'paid';
        }
      } else if (offset === 1) {
        if (index % 9 === 0) {
          status = 'overdue';
          paidAmount = 0;
        } else if (index % 11 === 0) {
          paidAmount = Math.round(amount / 2);
          status = 'partial';
        } else {
          paidAmount = amount;
          status = 'paid';
        }
      } else {
        if (index % 5 === 0) {
          paidAmount = amount;
          status = 'paid';
        } else if (index % 5 === 1) {
          paidAmount = Math.round(amount / 2);
          status = 'partial';
        } else {
          status = 'pending';
          paidAmount = 0;
        }
      }

      const fee = {
        student: student._id,
        hostel: student.hostel,
        title: `${monthLabel(offset)} Hostel Rent`,
        type: 'hostel_rent',
        academicYear: '2026-2027',
        period: periodKey(offset),
        amount,
        paidAmount,
        status,
        dueDate,
        description: 'Monthly hostel accommodation charges',
        createdBy: adminId,
        createdAt: offset === 0 ? daysAgo(8) : new Date(monthStart(offset).getTime() - 4 * DAY),
        updatedAt: new Date(),
      };
      feeDocs.push(fee);

      if (paidAmount > 0) {
        const paidAt = offset === 0
          ? new Date(now.getTime() - 2 * DAY)
          : new Date(Math.min(now.getTime(), dueDate.getTime() + ((index % 4) - 2) * DAY));
        paymentPlans.push({
          feeIndex: feeDocs.length - 1,
          amount: paidAmount,
          method: ['upi', 'card', 'netbanking', 'cash'][index % 4],
          transactionId: `TXN${String(900000 + feeDocs.length)}`,
          receiptNo: receiptNo(paidAt),
          paidAt,
          student: student._id,
          hostel: student.hostel,
          recordedBy: adminId,
          status: 'success',
        });
      }
    }

    const messDue = new Date(now.getTime() + 5 * DAY);
    const messAmount = 2400;
    let messPaid = 0;
    let messStatus = 'pending';
    if (index % 3 === 0) {
      messPaid = messAmount;
      messStatus = 'paid';
    } else if (index % 4 === 0) {
      messPaid = 1200;
      messStatus = 'partial';
    }
    feeDocs.push({
      student: student._id,
      hostel: student.hostel,
      title: `Mess Charges - ${monthLabel(0)}`,
      type: 'mess',
      academicYear: '2026-2027',
      period: periodKey(0),
      amount: messAmount,
      paidAmount: messPaid,
      status: messStatus,
      dueDate: messDue,
      description: 'Monthly mess and dining charges',
      createdBy: adminId,
      createdAt: daysAgo(6),
      updatedAt: new Date(),
    });
    if (messPaid > 0) {
      const paidAt = daysAgo(1);
      paymentPlans.push({
        feeIndex: feeDocs.length - 1,
        amount: messPaid,
        method: 'upi',
        transactionId: `MESS${String(800000 + index)}`,
        receiptNo: receiptNo(paidAt),
        paidAt,
        student: student._id,
        hostel: student.hostel,
        recordedBy: adminId,
        status: 'success',
      });
    }
  });

  const insertedFees = await Fee.insertMany(feeDocs, { timestamps: false });
  const paymentDocs = paymentPlans.map((plan) => ({
    fee: insertedFees[plan.feeIndex]._id,
    student: plan.student,
    hostel: plan.hostel,
    amount: plan.amount,
    method: plan.method,
    transactionId: plan.transactionId,
    receiptNo: plan.receiptNo,
    paidAt: plan.paidAt,
    recordedBy: plan.recordedBy,
    status: plan.status,
    createdAt: plan.paidAt,
    updatedAt: plan.paidAt,
  }));
  await Payment.insertMany(paymentDocs);

  const wardenByHostel = Object.fromEntries(wardenSeeds.map((warden) => [String(warden.hostel), warden._id]));
  const attendanceDocs = [];
  for (let dayOffset = 13; dayOffset >= 0; dayOffset -= 1) {
    const date = atUtc(daysAgo(dayOffset));
    if (date.getUTCDay() === 0) continue;
    studentSeeds.forEach((student, index) => {
      const marker = (index * 13 + dayOffset * 7 + (index % 3) * 5) % 100;
      const status = marker < 4 ? 'absent' : marker < 8 ? 'leave' : marker < 15 ? 'late' : 'present';
      attendanceDocs.push({
        student: student._id,
        hostel: student.hostel,
        date,
        status,
        markedBy: wardenByHostel[String(student.hostel)] || adminId,
        note: status === 'leave' ? 'Approved leave' : '',
        createdAt: date,
        updatedAt: date,
      });
    });
  }
  await Attendance.insertMany(attendanceDocs, { timestamps: false });

  const complaintSeeds = [
    ['Leaking tap in washroom', 'maintenance', 'The washroom tap has been leaking continuously since yesterday. Water is pooling near the door.', 'high'],
    ['Wi-Fi speed is very slow', 'wifi', 'Internet speed drops below 1 Mbps in the evening. Unable to attend online classes.', 'high'],
    ['Room not cleaned for three days', 'cleanliness', 'Housekeeping has not visited our room this week. Dustbins are overflowing.', 'medium'],
    ['Mess food quality issue', 'food', 'Dinner served yesterday was undercooked and cold. Please review the kitchen process.', 'high'],
    ['Corridor light not working', 'maintenance', 'The tube light near room 203 is flickering and makes it difficult to walk at night.', 'medium'],
    ['Unauthorized entry at night', 'security', 'The main gate was left unattended after 11 PM. Requesting stricter security checks.', 'high'],
    ['Broken study chair', 'maintenance', 'One of the study chairs in room 302 has a broken backrest.', 'low'],
    ['Hot water unavailable', 'maintenance', 'Geyser on the second floor has not been working for two days.', 'medium'],
    ['Noise from common room', 'other', 'Loud music from the common room continues after quiet hours.', 'low'],
    ['Dirty corridor bins', 'cleanliness', 'Corridor waste bins were not emptied during the weekend.', 'medium'],
    ['Request for extra mattress', 'other', 'The mattress provided is torn and needs replacement.', 'low'],
    ['Cockroaches in pantry', 'cleanliness', 'Pantry area needs pest control treatment urgently.', 'high'],
    ['Slow internet in reading room', 'wifi', 'Wi-Fi keeps disconnecting in the reading room during exam preparation.', 'medium'],
    ['Window latch broken', 'maintenance', 'The window latch is broken and does not close properly.', 'medium'],
  ];
  const complaintStatuses = ['open', 'in_progress', 'resolved', 'open', 'resolved', 'in_progress', 'rejected', 'resolved', 'open', 'in_progress', 'resolved', 'open', 'resolved', 'in_progress'];
  const complaintDocs = complaintSeeds.map(([title, category, description, priority], index) => {
    const student = studentSeeds[(index * 3 + 1) % studentSeeds.length];
    const status = complaintStatuses[index];
    const createdAt = daysAgo((index * 2) % 27);
    const wardenId = wardenByHostel[String(student.hostel)] || adminId;
    return {
      student: student._id,
      hostel: student.hostel,
      room: student.room,
      category,
      title,
      description,
      priority,
      status,
      assignedTo: status === 'open' ? null : wardenId,
      resolutionNote: status === 'resolved' ? 'Issue inspected and resolved by the hostel maintenance team.' : status === 'rejected' ? 'Issue could not be verified after inspection.' : '',
      resolvedBy: status === 'resolved' || status === 'rejected' ? wardenId : null,
      resolvedAt: status === 'resolved' || status === 'rejected' ? new Date(createdAt.getTime() + 2 * DAY) : null,
      createdAt,
      updatedAt: status === 'resolved' ? new Date(createdAt.getTime() + 2 * DAY) : createdAt,
    };
  });
  await Complaint.insertMany(complaintDocs, { timestamps: false });

  const visitorNames = [
    ['Ramesh Sharma', 'Father'], ['Sunita Sharma', 'Mother'], ['Ajay Mehta', 'Uncle'],
    ['Neha Verma', 'Sister'], ['Pooja Kapoor', 'Cousin'], ['Rahul Nair', 'Brother'],
    ['Kavita Patel', 'Mother'], ['Anil Rao', 'Father'], ['Sneha Gupta', 'Friend'],
    ['Vikram Joshi', 'Uncle'], ['Meena Khan', 'Aunt'], ['Arun Iyer', 'Father'],
  ];
  const visitorDocs = visitorNames.map(([visitorName, relation], index) => {
    const student = studentSeeds[(index * 4 + 2) % studentSeeds.length];
    const isToday = index >= 10;
    const checkIn = isToday ? new Date(now.getTime() - (index - 9) * 60 * 60 * 1000) : daysAgo(index + 1);
    return {
      student: student._id,
      hostel: student.hostel,
      visitorName,
      phone: `+91 97654 ${String(30000 + index).slice(-5)}`,
      relation,
      purpose: ['Family visit', 'Dropping essentials', 'Weekend visit', 'Medical checkup'][index % 4],
      visitDate: checkIn,
      checkIn,
      checkOut: isToday ? null : new Date(checkIn.getTime() + 2 * 60 * 60 * 1000),
      idProof: `AADHAAR-${String(7000 + index)}`,
      status: isToday ? 'checked_in' : 'checked_out',
      recordedBy: wardenByHostel[String(student.hostel)] || adminId,
      notes: '',
      createdAt: checkIn,
      updatedAt: checkIn,
    };
  });
  await Visitor.insertMany(visitorDocs, { timestamps: false });

  const announcementDocs = [
    {
      title: 'Hostel fee payment window is now open',
      content: 'The portal is accepting hostel and mess fee payments for the current semester. Please clear outstanding dues before the 15th to avoid a late fee.',
      audience: 'students',
      priority: 'high',
      publishedBy: adminId,
      createdAt: daysAgo(2),
      expiresAt: new Date(now.getTime() + 30 * DAY),
    },
    {
      title: 'Scheduled water tank cleaning',
      content: 'Water supply in Aryabhatta Boys Hostel will be paused from 10 AM to 1 PM this Saturday for annual tank cleaning. Please store water in advance.',
      audience: 'hostel',
      hostel: hostelSeeds[0]._id,
      priority: 'urgent',
      publishedBy: wardenSeeds[0].user,
      createdAt: daysAgo(1),
      expiresAt: new Date(now.getTime() + 7 * DAY),
    },
    {
      title: 'Monthly wardens coordination meeting',
      content: 'All hostel wardens are requested to join the monthly review meeting in the administrative conference room on Friday at 4 PM.',
      audience: 'wardens',
      priority: 'normal',
      publishedBy: adminId,
      createdAt: daysAgo(4),
      expiresAt: new Date(now.getTime() + 12 * DAY),
    },
    {
      title: 'Cultural night registrations open',
      content: 'Register your performance for the Kalpana Chawla Hostel cultural night at the warden office before Thursday. Solo and group entries are welcome.',
      audience: 'hostel',
      hostel: hostelSeeds[1]._id,
      priority: 'normal',
      publishedBy: wardenSeeds[1].user,
      createdAt: daysAgo(3),
      expiresAt: new Date(now.getTime() + 20 * DAY),
    },
    {
      title: 'Updated mess timings',
      content: 'From next Monday, dinner will be served from 7:30 PM to 9:30 PM across all hostels. Breakfast and lunch timings remain unchanged.',
      audience: 'all',
      priority: 'normal',
      publishedBy: adminId,
      createdAt: daysAgo(6),
      expiresAt: new Date(now.getTime() + 45 * DAY),
    },
    {
      title: 'Fire safety drill on Sunday',
      content: 'A mandatory fire safety drill will be conducted in Ramanujan International House at 9 AM on Sunday. All residents must participate.',
      audience: 'hostel',
      hostel: hostelSeeds[2]._id,
      priority: 'high',
      publishedBy: wardenSeeds[2].user,
      createdAt: daysAgo(5),
      expiresAt: new Date(now.getTime() + 10 * DAY),
    },
  ];
  await Announcement.insertMany(announcementDocs, { timestamps: false });

  console.log('\nHostelHub demo data created successfully.');
  console.log('------------------------------------------------');
  console.log('Admin    : admin@hostelhub.com     / Admin@123');
  console.log('Warden   : warden@hostelhub.com    / Warden@123');
  console.log('Student  : student@hostelhub.com   / Student@123');
  console.log('------------------------------------------------');
  console.log(`Hostels: ${hostelSeeds.length}, Rooms: ${roomSeeds.length}, Students: ${studentSeeds.length}`);
  console.log(`Allocations: ${allocations.length}, Fees: ${feeDocs.length}, Payments: ${paymentDocs.length}`);
  console.log(`Attendance: ${attendanceDocs.length}, Complaints: ${complaintDocs.length}, Visitors: ${visitorDocs.length}`);
  console.log('------------------------------------------------\n');

  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
