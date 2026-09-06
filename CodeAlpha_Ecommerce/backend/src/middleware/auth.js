const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'codealpha_ecommerce_super_secret_jwt_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }

    req.user = decodedUser;
    next();
  });
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
