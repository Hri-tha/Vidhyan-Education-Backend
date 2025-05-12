const express = require('express');
const router = express.Router();
const College = require('../models/College');

// Get all college names
router.get('/', async (req, res) => {
  try {
    const colleges = await College.find({}, 'name');
    res.json(colleges);
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
