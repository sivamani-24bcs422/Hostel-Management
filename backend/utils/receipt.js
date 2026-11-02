const PDFDocument = require('pdfkit');

const generateReceipt = (payment) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const fee = payment.fee || {};
  const student = payment.student || {};
  const user = student.user || {};

  doc.rect(0, 0, 595.28, 132).fill('#C29BEA');
  doc.fillColor('#241531').fontSize(25).font('Helvetica-Bold').text('HostelHub', 50, 46);
  doc.fillColor('#3D2B4F').fontSize(10).font('Helvetica').text('Premium hostel management', 50, 78);
  doc.fillColor('#241531').fontSize(18).font('Helvetica-Bold').text('PAYMENT RECEIPT', 350, 52, { width: 195, align: 'right' });
  doc.fillColor('#3D2B4F').fontSize(9).text(`Receipt: ${payment.receiptNo}`, 350, 82, { width: 195, align: 'right' });

  let y = 165;
  doc.fillColor('#6B5B7A').fontSize(9).font('Helvetica-Bold').text('BILLED TO', 50, y);
  doc.fillColor('#241531').fontSize(12).font('Helvetica-Bold').text(user.name || 'Student', 50, y + 16);
  doc.fillColor('#4B3A5A').fontSize(9).font('Helvetica');
  doc.text(user.email || '-', 50, y + 34);
  doc.text(student.rollNo ? `Roll no: ${student.rollNo}` : '-', 50, y + 48);
  doc.text(student.course || '-', 50, y + 62);

  doc.fillColor('#6B5B7A').fontSize(9).font('Helvetica-Bold').text('PAYMENT DETAILS', 330, y);
  doc.fillColor('#241531').fontSize(9).font('Helvetica');
  const details = [
    ['Date', new Date(payment.paidAt || payment.createdAt).toLocaleDateString('en-IN')],
    ['Method', String(payment.method || '').replace(/_/g, ' ').toUpperCase()],
    ['Transaction', payment.transactionId || 'N/A'],
    ['Recorded by', payment.recordedBy?.name || 'HostelHub'],
  ];
  details.forEach(([label, value], index) => {
    doc.fillColor('#6B5B7A').text(label, 330, y + 18 + index * 16);
    doc.fillColor('#241531').text(String(value), 420, y + 18 + index * 16, { width: 125, align: 'right' });
  });

  y = 280;
  doc.roundedRect(50, y, 495, 28, 6).fill('#F4EEFC');
  doc.fillColor('#3D2B4F').fontSize(9).font('Helvetica-Bold');
  doc.text('DESCRIPTION', 64, y + 10);
  doc.text('AMOUNT', 475, y + 10, { width: 55, align: 'right' });

  y += 28;
  doc.rect(50, y, 495, 42).fill('#FFFFFF').stroke('#E9E1F2');
  doc.fillColor('#241531').fontSize(10).font('Helvetica-Bold').text(fee.title || 'Hostel fee', 64, y + 9);
  doc.fillColor('#6B5B7A').fontSize(8).font('Helvetica').text(fee.academicYear ? `Academic year ${fee.academicYear}` : '', 64, y + 25);
  doc.fillColor('#241531').fontSize(11).font('Helvetica-Bold').text(`Rs. ${Number(payment.amount).toLocaleString('en-IN')}`, 455, y + 14, { width: 75, align: 'right' });

  y += 72;
  doc.fillColor('#6B5B7A').fontSize(9).font('Helvetica').text('Amount paid', 375, y);
  doc.fillColor('#241531').fontSize(10).font('Helvetica-Bold').text(`Rs. ${Number(payment.amount).toLocaleString('en-IN')}`, 455, y, { width: 75, align: 'right' });
  doc.moveTo(375, y + 22).lineTo(530, y + 22).stroke('#E9E1F2');
  doc.fillColor('#C29BEA').fontSize(12).font('Helvetica-Bold').text('TOTAL PAID', 375, y + 34);
  doc.fillColor('#241531').fontSize(14).text(`Rs. ${Number(payment.amount).toLocaleString('en-IN')}`, 445, y + 32, { width: 85, align: 'right' });

  doc.fillColor('#6B5B7A').fontSize(8).font('Helvetica').text('This is a computer generated receipt and does not require a signature.', 50, 735, { width: 495, align: 'center' });
  doc.fillColor('#C29BEA').fontSize(8).text('HostelHub - Live comfortably, manage effortlessly.', 50, 752, { width: 495, align: 'center' });

  doc.end();
  return doc;
};

module.exports = generateReceipt;
