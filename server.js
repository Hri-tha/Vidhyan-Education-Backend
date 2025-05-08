const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const OpenAI = require('openai');
const axios = require('axios');
const Faq = require('./models/Faq');
const College = require('./models/College');
const stringSimilarity = require('string-similarity');

require('dotenv').config();

const app = express();



const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not defined');
  process.exit(1);
}

// Middleware
// Middleware
// app.use(cors({
//   origin: 'https://vidhyan-education-frontend.vercel.app',
//   credentials: true,
// }));
// // app.options('/*', cors()); // preflight support
// app.use(bodyParser.json());
const allowedOrigins = [
  'https://vidhyan-education-frontend.vercel.app',
  'http://localhost:4200',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(bodyParser.json());


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, 
})
// .then(() => console.log('Connected to MongoDB Atlas'))
// .catch(err => console.error('Error connecting to MongoDB Atlas:', err));
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => {
  console.error('❌ Error connecting to MongoDB Atlas:', err);
  process.exit(1);
});

// Models
const Question = mongoose.model('Question', new mongoose.Schema({
  text: String,
  category: String
}), 'questions');

const Career = mongoose.model('Career', new mongoose.Schema({
  name: String,
  description: String,
  traits: [String]
}), 'careers');

const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true },
  password: String,
  avatar: String,
  bestCareer: {
    name: String,
    score: Number,
    description: String
  }
}), 'users');

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded._id || decoded.id }); // Support both _id and id
    if (!user) throw new Error();
    req.user = user;
    next();
  } catch (e) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

// Auth APIs
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.status(201).send({ user, token });
  } catch (err) {
    res.status(400).send(err);
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new Error('Invalid login credentials');
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid login credentials');
    
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.send({ user, token });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  res.send(req.user);
});

app.patch('/api/me/career', authMiddleware, async (req, res) => {
  try {
    const { bestCareer } = req.body;
    req.user.bestCareer = bestCareer;
    await req.user.save();
    res.send(req.user);
  } catch (err) {
    res.status(400).send(err);
  }
});


Faq.collection.createIndex({ question: "text" });


app.post('/api/chat', async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    // Step 1: Try exact match
    const exactMatch = await Faq.findOne({ question: question.trim() });
    if (exactMatch) {
      return res.json({ answer: exactMatch.answer });
    }

    // Step 2: Try fuzzy match
const allFaqs = await Faq.find({});
const input = question.trim().toLowerCase();

// Normalize DB questions
const questions = allFaqs.map(f => f.question.trim().toLowerCase());
const matches = stringSimilarity.findBestMatch(input, questions);
const bestMatch = matches.bestMatch;

if (bestMatch.rating > 0.6) {
  // Get the original FAQ using the index (since we've normalized the list)
  const matchedFaq = allFaqs[matches.bestMatchIndex];
  return res.json({ answer: matchedFaq.answer });
}


    // Step 3: Fallback response
    res.json({ 
      answer: "This question isn't in my current knowledge base. Please rephrase or ask another JEE/NEET-related question."
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

// Google Login API
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
app.post('/api/google-login', async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const { name, email, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({ name, email, password: 'google_oauth', avatar: picture });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    // 👇 Only send safe public user info
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar
    };

    res.json({ token: jwtToken, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(400).send({ error: 'Google login failed' });
  }
});

app.post('/api/compare', async (req, res) => {
  try {
    const { college1, college2 } = req.body;

    if (!college1 && !college2) {
      return res.status(400).json({ error: 'At least one college (college1 or college2) is required.' });
    }

    const allColleges = await College.find({}); // fetch all colleges

    function normalizeName(name) {
      return name
        .toLowerCase()
        .replace('indian institute of information technology', 'iiit')
        .replace('indian institute of technology', 'iit')
        .replace('national institute of technology', 'nit')
        .replace(/,/g, '') // remove commas
        .replace(/\s+/g, ' ') // replace multiple spaces
        .trim();
    }

    const normalizedColleges = allColleges.map(college => ({
      original: college,
      normalized: normalizeName(college.name)
    }));

    function findCollege(input) {
      if (!input) return null; // if input is undefined
      const normalizedInput = normalizeName(input);
      return normalizedColleges.find(college => college.normalized.includes(normalizedInput));
    }

    const match1 = findCollege(college1);
    const match2 = findCollege(college2);

    // If none matched
    if (!match1 && !match2) {
      return res.status(404).json({ error: 'No matching college found.' });
    }

    // If both found
    if (match1 && match2) {
      return res.json([match1.original, match2.original]);
    }

    // If only one found
    const foundCollege = match1 || match2;
    res.json(foundCollege.original);
  } catch (error) {
    console.error('Error fetching college data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all college names API
app.get('/api/colleges', async (req, res) => {
  try {
    const colleges = await College.find({}, 'name'); // Only get the 'name' field
    res.json(colleges);
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Main APIs 
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/submit', async (req, res) => {
  try {
    const { answers } = req.body;
    const questions = await Question.find();
    const careers = await Career.find();

    const careerScores = careers.map(career => {
      let score = 0;
      questions.forEach((question, index) => {
        if (career.name === question.category) {
          score += answers[index] !== null && answers[index] !== undefined ? answers[index] : 0;
        }
      });
      return { name: career.name, description: career.description, score };
    });

    careerScores.sort((a, b) => b.score - a.score);

    const topCareers = careerScores.slice(0, 3);
    const bestCareer = topCareers[0];

    res.json({ topCareers, bestCareer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
