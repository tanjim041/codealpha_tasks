const express = require('express');
const { getOne, getAll, run } = require('../database');
const { authenticateToken, requireProjectMember } = require('../middleware/auth');

const router = express.Router();

// GET /api/tasks (List tasks assigned to current user across all projects)
router.get('/tasks', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status ? req.query.status.trim() : null;
    const priority = req.query.priority ? req.query.priority.trim() : null;

    let whereClauses = ['t.assignee_id = ?'];
    let params = [userId];

    if (status && status !== 'All') {
      whereClauses.push('t.status = ?');
      params.push(status);
    }

    if (priority && priority !== 'All') {
      whereClauses.push('t.priority = ?');
      params.push(priority);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const tasks = getAll(`
      SELECT 
        t.id,
        t.project_id,
        t.title,
        t.description,
        t.assignee_id,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        t.updated_at,
        p.name as project_name,
        u.name as assignee_name,
        u.avatar as assignee_avatar,
        (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      ${whereSql}
      ORDER BY 
        CASE t.status
          WHEN 'In Progress' THEN 1
          WHEN 'Todo' THEN 2
          WHEN 'Completed' THEN 3
          ELSE 4
        END,
        t.updated_at DESC
    `, params);

    return res.json({ success: true, tasks });
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve tasks.' });
  }
});

// GET /api/projects/:projectId/tasks (List tasks in specific project)
router.get('/projects/:projectId/tasks', authenticateToken, requireProjectMember, (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const status = req.query.status ? req.query.status.trim() : null;
    const priority = req.query.priority ? req.query.priority.trim() : null;

    let whereClauses = ['t.project_id = ?'];
    let params = [projectId];

    if (status && status !== 'All') {
      whereClauses.push('t.status = ?');
      params.push(status);
    }

    if (priority && priority !== 'All') {
      whereClauses.push('t.priority = ?');
      params.push(priority);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const tasks = getAll(`
      SELECT 
        t.id,
        t.project_id,
        t.title,
        t.description,
        t.assignee_id,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        t.updated_at,
        u.name as assignee_name,
        u.username as assignee_username,
        u.avatar as assignee_avatar,
        (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      ${whereSql}
      ORDER BY 
        CASE t.status
          WHEN 'In Progress' THEN 1
          WHEN 'Todo' THEN 2
          WHEN 'Completed' THEN 3
          ELSE 4
        END,
        t.created_at DESC
    `, params);

    return res.json({ success: true, tasks });
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve project tasks.' });
  }
});

// POST /api/projects/:projectId/tasks (Create task in project)
router.post('/projects/:projectId/tasks', authenticateToken, requireProjectMember, (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { title, description, assignee_id, status, priority, due_date } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    const cleanTitle = title.trim();
    const cleanDesc = typeof description === 'string' ? description.trim() : '';
    const cleanStatus = ['Todo', 'In Progress', 'Completed'].includes(status) ? status : 'Todo';
    const cleanPriority = ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium';
    const cleanDueDate = typeof due_date === 'string' ? due_date.trim() : '';

    let cleanAssigneeId = null;
    if (assignee_id !== undefined && assignee_id !== null && assignee_id !== '') {
      const parsedAssignee = parseInt(assignee_id, 10);
      if (!isNaN(parsedAssignee)) {
        // Enforce rule: assignee must be a member of the project
        const isProjectOwner = req.project.owner_id === parsedAssignee;
        const isMember = getOne('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, parsedAssignee]);

        if (!isProjectOwner && !isMember) {
          return res.status(400).json({
            success: false,
            message: 'Invalid assignment. You can only assign tasks to verified members of this project.'
          });
        }
        cleanAssigneeId = parsedAssignee;
      }
    }

    const result = run(`
      INSERT INTO tasks (project_id, title, description, assignee_id, status, priority, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [projectId, cleanTitle, cleanDesc, cleanAssigneeId, cleanStatus, cleanPriority, cleanDueDate]);

    const newTaskId = Number(result.lastInsertRowid);
    const newTask = getOne(`
      SELECT 
        t.*,
        u.name as assignee_name,
        u.username as assignee_username,
        u.avatar as assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `, [newTaskId]);

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      task: newTask
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ success: false, message: 'Failed to create task.' });
  }
});

// GET /api/tasks/:id (Single task details)
router.get('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID.' });
    }

    const task = getOne(`
      SELECT 
        t.*,
        p.name as project_name,
        p.owner_id as project_owner_id,
        u.name as assignee_name,
        u.username as assignee_username,
        u.avatar as assignee_avatar
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `, [taskId]);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    // Verify user belongs to project
    const isOwner = task.project_owner_id === req.user.id;
    const isMember = getOne('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [task.project_id, req.user.id]);
    if (!isOwner && !isMember) {
      return res.status(403).json({ success: false, message: 'Access denied. You do not have access to this task.' });
    }

    return res.json({ success: true, task });
  } catch (error) {
    console.error('Error fetching task details:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve task.' });
  }
});

// PUT /api/tasks/:id (Update task)
router.put('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID.' });
    }

    const task = getOne(`
      SELECT t.*, p.owner_id as project_owner_id 
      FROM tasks t 
      JOIN projects p ON t.project_id = p.id 
      WHERE t.id = ?
    `, [taskId]);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    // Verify user is member of project
    const isOwner = task.project_owner_id === req.user.id;
    const member = getOne('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [task.project_id, req.user.id]);
    if (!isOwner && !member) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not a member of this project.' });
    }

    const { title, description, assignee_id, status, priority, due_date } = req.body;

    const cleanTitle = title && title.trim() !== '' ? title.trim() : task.title;
    const cleanDesc = typeof description === 'string' ? description.trim() : task.description;
    const cleanStatus = ['Todo', 'In Progress', 'Completed'].includes(status) ? status : task.status;
    const cleanPriority = ['Low', 'Medium', 'High'].includes(priority) ? priority : task.priority;
    const cleanDueDate = typeof due_date === 'string' ? due_date.trim() : task.due_date;

    let cleanAssigneeId = task.assignee_id;
    if (assignee_id !== undefined) {
      if (assignee_id === null || assignee_id === '') {
        cleanAssigneeId = null;
      } else {
        const parsedAssignee = parseInt(assignee_id, 10);
        if (!isNaN(parsedAssignee)) {
          const isAssigneeOwner = task.project_owner_id === parsedAssignee;
          const isAssigneeMember = getOne('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [task.project_id, parsedAssignee]);
          if (!isAssigneeOwner && !isAssigneeMember) {
            return res.status(400).json({ success: false, message: 'Assignee must be a member of this project.' });
          }
          cleanAssigneeId = parsedAssignee;
        }
      }
    }

    run(`
      UPDATE tasks 
      SET title = ?, description = ?, assignee_id = ?, status = ?, priority = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [cleanTitle, cleanDesc, cleanAssigneeId, cleanStatus, cleanPriority, cleanDueDate, taskId]);

    const updated = getOne(`
      SELECT 
        t.*,
        u.name as assignee_name,
        u.username as assignee_username,
        u.avatar as assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `, [taskId]);

    return res.json({ success: true, message: 'Task updated successfully.', task: updated });
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(500).json({ success: false, message: 'Failed to update task.' });
  }
});

// DELETE /api/tasks/:id (Delete task)
router.delete('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID.' });
    }

    const task = getOne(`
      SELECT t.*, p.owner_id as project_owner_id 
      FROM tasks t 
      JOIN projects p ON t.project_id = p.id 
      WHERE t.id = ?
    `, [taskId]);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const isOwner = task.project_owner_id === req.user.id;
    const member = getOne('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [task.project_id, req.user.id]);
    if (!isOwner && !member) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    run('DELETE FROM tasks WHERE id = ?', [taskId]);

    return res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete task.' });
  }
});

// GET /api/tasks/:id/comments (Get task comments)
router.get('/tasks/:id/comments', authenticateToken, (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID.' });
    }

    const comments = getAll(`
      SELECT 
        tc.id,
        tc.task_id,
        tc.user_id,
        tc.content,
        tc.created_at,
        u.name as author_name,
        u.username as author_username,
        u.avatar as author_avatar
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `, [taskId]);

    const formatted = comments.map(c => ({
      ...c,
      is_author: c.user_id === req.user.id
    }));

    return res.json({ success: true, comments: formatted });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve comments.' });
  }
});

// POST /api/tasks/:id/comments (Add comment to task)
router.post('/tasks/:id/comments', authenticateToken, (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
    }

    const task = getOne('SELECT id, project_id FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const cleanContent = content.trim();

    const result = run(
      'INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)',
      [taskId, req.user.id, cleanContent]
    );

    const newCommentId = Number(result.lastInsertRowid);
    const newComment = getOne(`
      SELECT 
        tc.id,
        tc.task_id,
        tc.user_id,
        tc.content,
        tc.created_at,
        u.name as author_name,
        u.username as author_username,
        u.avatar as author_avatar
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.id = ?
    `, [newCommentId]);

    return res.status(201).json({
      success: true,
      message: 'Comment posted.',
      comment: {
        ...newComment,
        is_author: true
      }
    });
  } catch (error) {
    console.error('Error posting comment:', error);
    return res.status(500).json({ success: false, message: 'Failed to post comment.' });
  }
});

// DELETE /api/comments/:id (Delete own comment - ownership enforced)
router.delete('/comments/:id', authenticateToken, (req, res) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    if (isNaN(commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment ID.' });
    }

    const comment = getOne('SELECT id, user_id FROM task_comments WHERE id = ?', [commentId]);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    // Strict ownership enforcement
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You can only delete your own comments.' });
    }

    run('DELETE FROM task_comments WHERE id = ?', [commentId]);

    return res.json({ success: true, message: 'Comment deleted successfully.' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete comment.' });
  }
});

module.exports = router;
