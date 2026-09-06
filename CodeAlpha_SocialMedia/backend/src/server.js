const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDb } = require('./database');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const followsRoutes = require('./routes/follows');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');

// Initialize SQLite database and tables
initDb();

const app = express();
const PORT = process.env.PORT || 5001;

// Global Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/users', followsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api', commentsRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'CodeAlpha Social Media Platform API',
    developer: 'Md. Tanjimul Islam',
    timestamp: new Date().toISOString()
  });
});

// Fallback for SPA/HTML routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  next();
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred.'
  });
});

// Start server if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` CodeAlpha Social Media Platform Backend`);
    console.log(` Developer: Md. Tanjimul Islam`);
    console.log(` Server listening on http://localhost:${PORT}`);
    console.log(` Frontend served at http://localhost:${PORT}/index.html`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
