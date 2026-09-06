const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne, run } = require('../database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields (name, username, email, password) are required.' });
    }

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 25 || !/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-25 characters long and contain only letters, numbers, and underscores.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check duplicate email
    const existingEmail = getOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }

    // Check duplicate username
    const existingUsername = getOne('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existingUsername) {
      return res.status(409).json({ success: false, message: 'This username is already taken. Please pick another.' });
    }

    // Generate random avatar placeholder
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const result = run(
      'INSERT INTO users (name, username, email, password_hash, avatar) VALUES (?, ?, ?, ?, ?)',
      [cleanName, cleanUsername, cleanEmail, password_hash, defaultAvatar]
    );

    const userId = Number(result.lastInsertRowid);
    const newUser = getOne('SELECT id, name, username, email, bio, avatar, created_at FROM users WHERE id = ?', [userId]);

    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, username, password } = req.body;

    const identifier = (email || username || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/username and password are required.' });
    }

    const user = getOne(
      'SELECT id, name, username, email, password_hash, bio, avatar, created_at FROM users WHERE email = ? OR username = ?',
      [identifier, identifier]
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please verify your email and password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please verify your email and password.' });
    }

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatar: user.avatar,
      created_at: user.created_at
    };

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: sanitizedUser
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
