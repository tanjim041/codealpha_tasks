const express = require('express');
const { getOne, getAll, run } = require('../database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/users/:id/follow
router.post('/:id/follow', authenticateToken, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const followerId = req.user.id;

    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid target user ID.' });
    }

    if (targetUserId === followerId) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
    }

    const targetUser = getOne('SELECT id, username FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user does not exist.' });
    }

    const existingFollow = getOne(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, targetUserId]
    );

    if (existingFollow) {
      return res.status(400).json({ success: false, message: 'You are already following this user.' });
    }

    run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [followerId, targetUserId]);

    const followerCountRow = getOne('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [targetUserId]);

    return res.status(201).json({
      success: true,
      message: `Now following @${targetUser.username}`,
      is_following: true,
      follower_count: followerCountRow ? followerCountRow.count : 0
    });
  } catch (error) {
    console.error('Follow error:', error);
    return res.status(500).json({ success: false, message: 'Failed to follow user.' });
  }
});

// POST /api/users/:id/unfollow
router.post('/:id/unfollow', authenticateToken, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const followerId = req.user.id;

    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid target user ID.' });
    }

    const targetUser = getOne('SELECT id, username FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user does not exist.' });
    }

    run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, targetUserId]);

    const followerCountRow = getOne('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [targetUserId]);

    return res.json({
      success: true,
      message: `Unfollowed @${targetUser.username}`,
      is_following: false,
      follower_count: followerCountRow ? followerCountRow.count : 0
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    return res.status(500).json({ success: false, message: 'Failed to unfollow user.' });
  }
});

// GET /api/users/:id/followers
router.get('/:id/followers', optionalAuth, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const followers = getAll(`
      SELECT u.id, u.name, u.username, u.bio, u.avatar, f.created_at as followed_at
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `, [targetUserId]);

    return res.json({ success: true, followers });
  } catch (error) {
    console.error('Error fetching followers:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve followers.' });
  }
});

// GET /api/users/:id/following
router.get('/:id/following', optionalAuth, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    const following = getAll(`
      SELECT u.id, u.name, u.username, u.bio, u.avatar, f.created_at as followed_at
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
    `, [targetUserId]);

    return res.json({ success: true, following });
  } catch (error) {
    console.error('Error fetching following:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve following list.' });
  }
});

module.exports = router;
