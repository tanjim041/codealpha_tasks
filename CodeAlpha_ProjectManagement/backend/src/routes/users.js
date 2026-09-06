const express = require('express');
const { getOne, getAll, run } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/users (Search users to add to projects or assign to tasks)
router.get('/', authenticateToken, (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : '';
    let users;

    if (search) {
      users = getAll(`
        SELECT id, name, username, email, avatar, role
        FROM users
        WHERE (name LIKE ? OR username LIKE ? OR email LIKE ?)
        LIMIT 20
      `, [`%${search}%`, `%${search}%`, `%${search}%`]);
    } else {
      users = getAll(`
        SELECT id, name, username, email, avatar, role
        FROM users
        LIMIT 20
      `);
    }

    return res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Failed to search users.' });
  }
});

// GET /api/users/:id (User profile with task statistics)
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const user = getOne(
      'SELECT id, name, username, email, avatar, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const projectsCountRow = getOne(`
      SELECT COUNT(DISTINCT project_id) as count
      FROM (
        SELECT id as project_id FROM projects WHERE owner_id = ?
        UNION
        SELECT project_id FROM project_members WHERE user_id = ?
      )
    `, [userId, userId]);

    const assignedTasksRow = getOne(`
      SELECT COUNT(*) as count FROM tasks WHERE assignee_id = ?
    `, [userId]);

    const completedTasksRow = getOne(`
      SELECT COUNT(*) as count FROM tasks WHERE assignee_id = ? AND status = 'Completed'
    `, [userId]);

    return res.json({
      success: true,
      user: {
        ...user,
        projects_count: projectsCountRow ? projectsCountRow.count : 0,
        assigned_tasks_count: assignedTasksRow ? assignedTasksRow.count : 0,
        completed_tasks_count: completedTasksRow ? completedTasksRow.count : 0
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
});

// PUT /api/users/profile (Update current user's profile)
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { name, avatar } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
    }

    const cleanName = name.trim();
    const cleanAvatar = typeof avatar === 'string' && avatar.trim() !== '' ? avatar.trim() : req.user.avatar;

    run('UPDATE users SET name = ?, avatar = ? WHERE id = ?', [cleanName, cleanAvatar, userId]);

    const updatedUser = getOne('SELECT id, name, username, email, avatar, role, created_at FROM users WHERE id = ?', [userId]);

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

module.exports = router;
