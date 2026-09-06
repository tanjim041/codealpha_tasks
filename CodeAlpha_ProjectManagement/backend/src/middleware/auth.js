const jwt = require('jsonwebtoken');
const { getOne } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'codealpha_project_management_secure_jwt_secret_key_2026';

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

    const user = getOne('SELECT id, name, username, email, avatar, role, created_at FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  });
}

// Project membership authorization middleware
function requireProjectMember(req, res, next) {
  const projectId = parseInt(req.params.projectId || req.params.id || req.body.project_id, 10);
  if (isNaN(projectId)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  const project = getOne('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' });
  }

  // Check if owner or member
  if (project.owner_id === req.user.id) {
    req.project = project;
    req.projectRole = 'Owner';
    return next();
  }

  const member = getOne('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, req.user.id]);
  if (!member) {
    return res.status(403).json({ success: false, message: 'Access denied. You are not a member of this project.' });
  }

  req.project = project;
  req.projectRole = member.role;
  next();
}

// Project owner only authorization middleware
function requireProjectOwner(req, res, next) {
  const projectId = parseInt(req.params.projectId || req.params.id, 10);
  if (isNaN(projectId)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  const project = getOne('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' });
  }

  if (project.owner_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied. Only the project owner can perform this action.' });
  }

  req.project = project;
  req.projectRole = 'Owner';
  next();
}

module.exports = {
  authenticateToken,
  requireProjectMember,
  requireProjectOwner,
  JWT_SECRET
};
