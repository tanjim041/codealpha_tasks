const express = require('express');
const { getOne, getAll, run } = require('../database');
const { authenticateToken, requireProjectMember, requireProjectOwner } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects (List projects belonging to the authenticated user)
router.get('/', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const statusFilter = req.query.status ? req.query.status.trim() : null;
    const search = req.query.search ? req.query.search.trim() : null;

    let whereClauses = [
      '(p.owner_id = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?))'
    ];
    let params = [userId, userId];

    if (statusFilter && statusFilter !== 'All') {
      whereClauses.push('p.status = ?');
      params.push(statusFilter);
    }

    if (search) {
      whereClauses.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const projects = getAll(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.owner_id,
        p.status,
        p.created_at,
        p.updated_at,
        u.name as owner_name,
        u.username as owner_username,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) + 1 as total_members_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'Completed') as completed_tasks
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      ${whereSql}
      ORDER BY p.updated_at DESC
    `, params);

    const formatted = projects.map(p => {
      const progress = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
      return {
        ...p,
        progress_percentage: progress,
        is_owner: p.owner_id === userId
      };
    });

    return res.json({ success: true, projects: formatted });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve projects.' });
  }
});

// GET /api/projects/:id (Get project details)
router.get('/:id', authenticateToken, requireProjectMember, (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const project = getOne(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.owner_id,
        p.status,
        p.created_at,
        p.updated_at,
        u.name as owner_name,
        u.username as owner_username,
        u.avatar as owner_avatar,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'Todo') as todo_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'In Progress') as in_progress_tasks,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'Completed') as completed_tasks
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `, [projectId]);

    // Fetch members
    const members = getAll(`
      SELECT 
        pm.id as membership_id,
        pm.role,
        pm.created_at as joined_at,
        u.id as user_id,
        u.name,
        u.username,
        u.email,
        u.avatar
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY pm.created_at ASC
    `, [projectId]);

    const progress = project.total_tasks > 0 
      ? Math.round((project.completed_tasks / project.total_tasks) * 100) 
      : 0;

    return res.json({
      success: true,
      project: {
        ...project,
        progress_percentage: progress,
        user_role: req.projectRole,
        is_owner: project.owner_id === userId,
        members
      }
    });
  } catch (error) {
    console.error('Error fetching project details:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve project details.' });
  }
});

// POST /api/projects (Create new project)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, description, status } = req.body;
    const ownerId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Project name is required.' });
    }

    const cleanName = name.trim();
    const cleanDesc = typeof description === 'string' ? description.trim() : '';
    const cleanStatus = ['Active', 'Completed', 'Archived'].includes(status) ? status : 'Active';

    const result = run(
      'INSERT INTO projects (name, description, owner_id, status) VALUES (?, ?, ?, ?)',
      [cleanName, cleanDesc, ownerId, cleanStatus]
    );

    const newProjectId = Number(result.lastInsertRowid);

    // Automatically add creator to project_members with role 'Owner'
    run(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [newProjectId, ownerId, 'Owner']
    );

    const newProject = getOne('SELECT * FROM projects WHERE id = ?', [newProjectId]);

    return res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      project: newProject
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({ success: false, message: 'Failed to create project.' });
  }
});

// PUT /api/projects/:id (Update project details)
router.put('/:id', authenticateToken, requireProjectMember, (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { name, description, status } = req.body;

    // Only Owner or Admin can update project details
    if (req.projectRole !== 'Owner' && req.projectRole !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only project owners and admins can edit project settings.' });
    }

    const cleanName = name && name.trim() !== '' ? name.trim() : req.project.name;
    const cleanDesc = description !== undefined 
      ? (typeof description === 'string' ? description.trim() : '') 
      : (req.project.description || '');
    const cleanStatus = ['Active', 'Completed', 'Archived'].includes(status) ? status : req.project.status;

    run(
      'UPDATE projects SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [cleanName, cleanDesc, cleanStatus, projectId]
    );

    const updated = getOne('SELECT * FROM projects WHERE id = ?', [projectId]);

    return res.json({
      success: true,
      message: 'Project updated successfully.',
      project: updated
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return res.status(500).json({ success: false, message: 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id (Delete project - Owner only)
router.delete('/:id', authenticateToken, requireProjectOwner, (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    run('DELETE FROM projects WHERE id = ?', [projectId]);

    return res.json({
      success: true,
      message: 'Project and all associated tasks and comments deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete project.' });
  }
});

// POST /api/projects/:id/members (Add member to project)
router.post('/:id/members', authenticateToken, requireProjectMember, (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { user_id, role } = req.body;

    if (req.projectRole !== 'Owner' && req.projectRole !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only project owners and admins can invite members.' });
    }

    const targetUserId = parseInt(user_id, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const targetUser = getOne('SELECT id, name, username FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User to add does not exist.' });
    }

    const memberRole = ['Admin', 'Member'].includes(role) ? role : 'Member';

    // Prevent duplicate membership
    const existing = getOne('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, targetUserId]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'This user is already a member of the project.' });
    }

    run(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, targetUserId, memberRole]
    );

    return res.status(201).json({
      success: true,
      message: `Added @${targetUser.username} to project as ${memberRole}.`
    });
  } catch (error) {
    console.error('Error adding project member:', error);
    return res.status(500).json({ success: false, message: 'Failed to add project member.' });
  }
});

// DELETE /api/projects/:id/members/:userId (Remove member from project)
router.delete('/:id/members/:userId', authenticateToken, requireProjectMember, (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);

    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid member user ID.' });
    }

    if (req.project.owner_id === targetUserId) {
      return res.status(400).json({ success: false, message: 'The project owner cannot be removed.' });
    }

    // Must be Owner, Admin, or the member themselves leaving
    if (req.projectRole !== 'Owner' && req.projectRole !== 'Admin' && req.user.id !== targetUserId) {
      return res.status(403).json({ success: false, message: 'Access denied. You cannot remove this member.' });
    }

    run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, targetUserId]);

    // Unassign tasks assigned to removed member in this project
    run('UPDATE tasks SET assignee_id = NULL WHERE project_id = ? AND assignee_id = ?', [projectId, targetUserId]);

    return res.json({
      success: true,
      message: 'Member removed from project.'
    });
  } catch (error) {
    console.error('Error removing project member:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove member.' });
  }
});

module.exports = router;
