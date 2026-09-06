const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CodeAlpha Project Management API',
    version: '1.0.0',
    developer: 'Md. Tanjimul Islam',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes);

// Catch-all route to serve frontend index.html for client-side navigation
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  initializeDatabase();
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 CodeAlpha Task 3: Project Management Backend Running`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`👨‍💻 Developer: Md. Tanjimul Islam`);
    console.log(`====================================================`);
  });
}

module.exports = app;
