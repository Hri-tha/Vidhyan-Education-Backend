// models/Faq.js
const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, unique: true },
  answer: { type: String, required: true },
  subject: { type: String, enum: ['Physics', 'Chemistry', 'Maths', 'Biology'] },
  topic: String,
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Faq', faqSchema);