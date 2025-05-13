  const express = require('express');
  const http = require('http');
  const cors = require('cors');
  const mongoose = require('mongoose');
  const dotenv = require('dotenv');
  const socketSetup = require('./sockets/chat');
  const connectDB = require('./config/db');
  const transporter = require('./config/mailer'); // Ensure mailer setup doesn't fail silently

  // Load environment variables
  dotenv.config();

  // Validate required environment variables
  const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID'];
  const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  const app = express();
  const server = http.createServer(app);

  // CORS configuration
  const allowedOrigins = [
    'https://www.vidhyaneducation.info',
    'https://vidhyan-education-frontend.vercel.app',
    'http://localhost:4200'
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  // Middleware
  app.use(express.json()); // Handles JSON bodies

  // Connect to MongoDB
  connectDB();

  // API Routes
  app.use('/api', require('./routes/auth'));
  app.use('/api', require('./routes/googleAuth'));
  app.use('/api', require('./routes/career'));
  app.use('/api/compare', require('./routes/compare'));
  app.use('/api/colleges', require('./routes/colleges'));

  // WebSocket setup
  socketSetup(server);

  // Start server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
