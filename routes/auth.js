const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middlewares/auth');

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid login credentials');
    }
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.send({ user, token });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

// routes/auth.js
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);  // <== FIXED
  if (!user) return res.status(404).send({ error: 'User not found' });
  res.json({
    name: user.name,
    avatar: user.avatar,
    email: user.email
  });
});

router.patch('/me/career', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id); // <== FIXED
    if (!user) return res.status(404).send({ error: 'User not found' });
    user.bestCareer = req.body.bestCareer;
    await user.save();
    res.send(user);
  } catch (err) {
    res.status(400).send(err);
  }
});

module.exports = router;
