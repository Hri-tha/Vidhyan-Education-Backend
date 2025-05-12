const express = require('express');
const router = express.Router();
const College = require('../models/College');
const normalizeCollege = require('../utils/normalizeCollege');

router.post('/', async (req, res) => {
  try {
    const { college1, college2 } = req.body;

    if (!college1 && !college2) {
      return res.status(400).json({ error: 'At least one college (college1 or college2) is required.' });
    }

    const allColleges = await College.find({});
    const normalizedColleges = allColleges.map(college => ({
      original: college,
      normalized: normalizeCollege(college.name)
    }));

    function findCollege(input) {
      if (!input) return null;
      const normalizedInput = normalizeCollege(input);
      return normalizedColleges.find(college => college.normalized.includes(normalizedInput));
    }

    const match1 = findCollege(college1);
    const match2 = findCollege(college2);

    if (!match1 && !match2) {
      return res.status(404).json({ error: 'No matching college found.' });
    }

    if (match1 && match2) {
      return res.json([match1.original, match2.original]);
    }

    const foundCollege = match1 || match2;
    res.json(foundCollege.original);
  } catch (error) {
    console.error('Compare API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
