// const socketIo = require('socket.io');
// const transporter = require('../config/mailer');

// const connectedUsers = {}; // { socketId: socket }
// const pendingRequests = []; // Store pending connection requests

// function sendEmailToHrithik() {
//   const mailOptions = {
//     from: 'hrithikkthakurdbg@gmail.com',
//     to: 'iec2020009@iiita.ac.in',
//     subject: 'New Chat Request',
//     text: 'A user wants to chat with you. Please log in to respond.'
//   };

//   transporter.sendMail(mailOptions, (err, info) => {
//     if (err) console.error('❌ Failed to send email:', err);
//     else console.log('✅ Email sent:', info.response);
//   });
// }

// module.exports = (server) => {
//   const io = socketIo(server, {
//     cors: {
//       origin: [
//         'https://www.vidhyaneducation.info',
//         'https://vidhyan-education-frontend.vercel.app',
//         'http://localhost:4200'
//       ],
//       methods: ['GET', 'POST'],
//       credentials: true
//     },
//     path: '/socket.io/',
//     transports: ['websocket', 'polling']
//   });

//   io.engine.on("connection_error", (err) => {
//     console.error('Socket.IO error:', err);
//   });

//   io.on('connection', (socket) => {
//     console.log('🟢 Connected:', socket.id);

//     // Handle disconnect
//     socket.on('disconnect', () => {
//       console.log('🔴 Disconnected:', socket.id);
//       delete connectedUsers[socket.id];
//     });

//     // User requests chat
//     socket.on('user:requestChat', () => {
//       sendEmailToHrithik();

//       connectedUsers[socket.id] = socket;

//       socket.emit('bot:response', 'Hrithik will join shortly...');

//       const request = {
//         socketId: socket.id,
//         message: '[User has requested to connect]'
//       };

//       // Save pending request if no admin is online yet
//       pendingRequests.push(request);

//       // Send to all connected admins
//       io.to('admin').emit('chat:fromUser', request);
//     });

//     // User sends message
//     socket.on('user:message', (message) => {
//       io.to('admin').emit('chat:fromUser', {
//         socketId: socket.id,
//         message
//       });
//     });

//     // Admin joins
//     socket.on('admin:join', () => {
//       socket.join('admin');
//       console.log(`🟣 Admin joined room: ${socket.id}`);

//       // Send any pending requests to this admin
//       pendingRequests.forEach((request) => {
//         socket.emit('chat:fromUser', request);
//       });

//       // Clear requests after sending
//       pendingRequests.length = 0;
//     });

//     // Admin replies to user
//     socket.on('admin:message', ({ toSocketId, message }) => {
//       const userSocket = connectedUsers[toSocketId];
//       if (userSocket) {
//         userSocket.emit('chat:fromAdmin', message);
//       }
//     });
//   });
// };
const socketIo = require('socket.io');
const transporter = require('../config/mailer');

const connectedUsers = {}; // { socketId: { socket, userName } }
const pendingRequests = []; // Store pending connection requests

function sendEmailToHrithik(userName) {
  const mailOptions = {
    from: 'hrithikkthakurdbg@gmail.com',
    to: 'iec2020009@iiita.ac.in',
    subject: 'New Chat Request',
    text: `${userName} wants to chat with you. Please log in to respond.`
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
        'https://www.vidhyaneducation.info',
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

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('🔴 Disconnected:', socket.id);
      delete connectedUsers[socket.id];
    });

    // User requests chat
    socket.on('user:requestChat', (data) => {
      const userName = data.userName || 'User';
      sendEmailToHrithik(userName);

      // Store user info with socket
      connectedUsers[socket.id] = {
        socket: socket,
        userName: userName
      };

      socket.emit('bot:response', 'Hrithik will join shortly...');

      const request = {
        socketId: socket.id,
        message: '[User has requested to connect]',
        userName: userName
      };

      // Save pending request if no admin is online yet
      pendingRequests.push(request);

      // Send to all connected admins
      io.to('admin').emit('chat:fromUser', request);
    });

    // User sends message
    socket.on('user:message', (data) => {
      const userData = connectedUsers[socket.id] || {};
      io.to('admin').emit('chat:fromUser', {
        socketId: socket.id,
        message: data.message,
        userName: data.userName || userData.userName || 'User'
      });
    });

    // Admin joins
    socket.on('admin:join', () => {
      socket.join('admin');
      console.log(`🟣 Admin joined room: ${socket.id}`);

      // Send any pending requests to this admin
      pendingRequests.forEach((request) => {
        socket.emit('chat:fromUser', request);
      });

      // Clear requests after sending
      pendingRequests.length = 0;
    });

    // Admin replies to user
    socket.on('admin:message', ({ toSocketId, message }) => {
      const userData = connectedUsers[toSocketId];
      if (userData && userData.socket) {
        userData.socket.emit('chat:fromAdmin', message);
      }
    });
  });
};