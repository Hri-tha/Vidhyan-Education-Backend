const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hrithikkthakurdbg@gmail.com',
    pass: 'uwpkcniaxuusjobm'
  }
});

transporter.verify((err, success) => {
  if (err) {
    console.error('❌ Mailer verification failed:', err);
  } else {
    console.log('✅ Mailer is ready.');
  }
});

module.exports = transporter;
