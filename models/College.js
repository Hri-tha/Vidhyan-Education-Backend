// models/College.js

const mongoose = require('mongoose');

const CollegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  ranking: {
    type: Number,
  },
  fees: {
    type: String,
  },
  placements: {
    highest_package: String,
    average_package: String,
  },
  courses_offered: [String],
  facilities: [String],
  website: String,
});

module.exports = mongoose.model('College', CollegeSchema);
