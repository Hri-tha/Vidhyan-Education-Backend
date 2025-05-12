// models/Career.js
const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String },
  traits:      [{ type: String }]  // e.g. ['creative', 'analytical']
});

module.exports = mongoose.model('Career', careerSchema);
