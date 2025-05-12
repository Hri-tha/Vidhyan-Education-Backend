// models/User.js
const mongoose = require('mongoose');

const bestCareerSchema = new mongoose.Schema({
  name: String,
  score: Number,
  description: String
}, { _id: false }); // no separate _id for subdoc

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  avatar:    { type: String },  // URL to avatar image
  bestCareer: { type: bestCareerSchema, default: {} }
});

module.exports = mongoose.model('User', userSchema);
