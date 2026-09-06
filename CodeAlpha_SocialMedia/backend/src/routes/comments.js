const express = require('express');
const { getOne, getAll, run } = require('../database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/posts/:id/comments (Retrieve comments for a specific post)
router.get('/posts/:id/comments', optionalAuth, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    const currentUserId = req.user ? req.user.id : null;

    const comments = getAll(`
      SELECT 
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.created_at,
        u.name as author_name,
        u.username as author_username,
        u.avatar as author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);

    const formattedComments = comments.map(c => ({
      ...c,
      is_author: currentUserId ? currentUserId === c.user_id : false
    }));

    return res.json({ success: true, comments: formattedComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve comments.' });
  }
});

// POST /api/posts/:id/comments (Add a comment to a post)
router.post('/posts/:id/comments', authenticateToken, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { content } = req.body;
    const userId = req.user.id;

    if (isNaN(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
    }

    const cleanContent = content.trim();
    if (cleanContent.length > 1000) {
      return res.status(400).json({ success: false, message: 'Comment exceeds 1000 characters limit.' });
    }

    const post = getOne('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const result = run(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, userId, cleanContent]
    );

    const newCommentId = Number(result.lastInsertRowid);

    const newComment = getOne(`
      SELECT 
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.created_at,
        u.name as author_name,
        u.username as author_username,
        u.avatar as author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [newCommentId]);

    const countRow = getOne('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [postId]);

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      comment: {
        ...newComment,
        is_author: true
      },
      comment_count: countRow ? countRow.count : 1
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({ success: false, message: 'Failed to post comment.' });
  }
});

// DELETE /api/comments/:id (Delete own comment - strict ownership enforcement)
router.delete('/comments/:id', authenticateToken, (req, res) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    if (isNaN(commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment ID.' });
    }

    const comment = getOne('SELECT id, post_id, user_id FROM comments WHERE id = ?', [commentId]);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    // Strict ownership enforcement
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You can only delete your own comments.' });
    }

    run('DELETE FROM comments WHERE id = ?', [commentId]);

    const countRow = getOne('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [comment.post_id]);

    return res.json({
      success: true,
      message: 'Comment deleted successfully.',
      post_id: comment.post_id,
      comment_count: countRow ? countRow.count : 0
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete comment.' });
  }
});

module.exports = router;
