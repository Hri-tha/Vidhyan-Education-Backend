const socketIo = require('socket.io');
const transporter = require('../config/mailer');

const connectedUsers = {};

function sendEmailToHrithik() {
  const mailOptions = {
    from: 'hrithikkthakurdbg@gmail.com',
    to: 'iec2020009@iiita.ac.in',
    subject: 'New Chat Request',
    text: 'A user wants to chat with you. Please log in to respond.'
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error('❌ Failed to send email:', err);
    else console.log('✅ Email sent:', info.response);
  });
}

module.exports = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: [
        'https://vidhyan-education-frontend.vercel.app',
        'http://localhost:4200'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling']
  });

  io.engine.on("connection_error", (err) => {
    console.error('Socket.IO error:', err);
  });

  io.on('connection', (socket) => {
    console.log('🟢 Connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('🔴 Disconnected:', socket.id);
      delete connectedUsers[socket.id];
    });

    socket.on('user:requestChat', () => {
      sendEmailToHrithik();
      connectedUsers[socket.id] = socket;
      socket.emit('bot:response', 'Hrithik will join shortly...');
    });

    socket.on('user:message', (message) => {
      io.to('admin').emit('chat:fromUser', { socketId: socket.id, message });
    });

    socket.on('admin:join', () => {
      socket.join('admin');
    });

    socket.on('admin:message', ({ toSocketId, message }) => {
      const userSocket = connectedUsers[toSocketId];
      if (userSocket) {
        userSocket.emit('chat:fromAdmin', message);
      }
    });
  });
};
