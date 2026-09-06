const jwt = require('jsonwebtoken');
const { getOne } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'codealpha_social_media_secure_jwt_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }

    const user = getOne('SELECT id, name, username, email, bio, avatar, created_at FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  });
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err && decoded && decoded.id) {
      const user = getOne('SELECT id, name, username, email, bio, avatar, created_at FROM users WHERE id = ?', [decoded.id]);
      req.user = user || null;
    } else {
      req.user = null;
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  optionalAuth,
  JWT_SECRET
};
