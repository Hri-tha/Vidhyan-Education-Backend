const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('Error connecting to MongoDB Atlas:', err));

// Question Model
// Change your Question model to:
const Question = mongoose.model('Question', new mongoose.Schema({
  text: String,
  category: String
}), 'questions'); // ← Add the exact collection name here

// Career Model
const Career = mongoose.model('Career', new mongoose.Schema({
  name: String,
  description: String,
  traits: [String]
}), 'careers');

// Add these near your other models
const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String },  
  email: { type: String, unique: true },
  password: String,
  bestCareer: {
    name: String,
    score: Number,
    description: String
  }
}), 'users');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Add JWT secret to your .env
// JWT_SECRET=your_random_secret_key_here

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded._id });
    
    if (!user) throw new Error();
    req.user = user;
    next();
  } catch (e) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

// Add these routes before your existing routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body; // ✅ extract name also
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = new User({ name, email, password: hashedPassword }); // ✅ Save name also
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

// Routes
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// app.post('/api/submit', async (req, res) => {
//   try {
//     const { answers } = req.body;
//     const questions = await Question.find();
//     const careers = await Career.find();
    
//     // Calculate scores for each career
//     const careerScores = careers.map(career => {
//       let score = 0;
      
//       questions.forEach((question, index) => {
//         if (career.traits.includes(question.category)) {
//           score += answers[index] || 0;
//         }
//       });
      
//       return {
//         name: career.name,
//         description: career.description,
//         score
//       };
//     });
    
//     // Sort careers by score (descending)
//     careerScores.sort((a, b) => b.score - a.score);
    
//     // Get top 3 careers
//     const topCareers = careerScores.slice(0, 3);
//     const bestCareer = topCareers[0];
    
//     res.json({ topCareers, bestCareer });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });
app.post('/api/submit', async (req, res) => {
  try {
    const { answers } = req.body;
    const questions = await Question.find(); // Fetch all questions
    const careers = await Career.find(); // Fetch all careers

    // Calculate scores for each career
    const careerScores = careers.map(career => {
      let score = 0;

      questions.forEach((question, index) => {
        // Check if the question's category matches the career's name
        if (career.name === question.category) {
          // Add the answer score (0, 1, 2) to the career's total score
          score += answers[index] !== null && answers[index] !== undefined ? answers[index] : 0;
        }
      });

      return {
        name: career.name,
        description: career.description,
        score
      };
    });

    // Sort careers by score (descending)
    careerScores.sort((a, b) => b.score - a.score);

    // Get top 3 careers
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