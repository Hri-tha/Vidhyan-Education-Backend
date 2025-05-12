// routes/career.js
const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Career = require('../models/Career');

// GET /questions - return all questions
router.get('/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching questions' });
  }
});


// POST /submit - score careers based on answers
router.post('/submit', async (req, res) => {
  const { answers } = req.body;
  if (!Array.isArray(answers)) {
    return res.status(400).json({ message: 'Invalid answers format' });
  }

  try {
    const questions = await Question.find(); // get the questions to match category
    const careers = await Career.find();

    const careerScores = careers.map(career => {
      let score = 0;

      questions.forEach((question, index) => {
        if (career.name === question.category) {
          const answerValue = answers[index];
          score += answerValue !== null && answerValue !== undefined ? answerValue : 0;
        }
      });

      return {
        id: career._id,
        name: career.name,
        description: career.description,
        score
      };
    });

    careerScores.sort((a, b) => b.score - a.score);

    const top3 = careerScores.slice(0, 3);
    const bestCareer = top3[0] || null;

    res.json({ top3, best: bestCareer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error submitting answers' });
  }
});

module.exports = router;
