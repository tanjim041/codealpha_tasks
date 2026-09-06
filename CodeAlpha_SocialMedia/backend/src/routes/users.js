const express = require('express');
const { getOne, getAll, run } = require('../database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/suggestions (Recommended users to follow)
router.get('/suggestions', optionalAuth, (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : null;
    let users;

    if (currentUserId) {
      users = getAll(`
        SELECT u.id, u.name, u.username, u.bio, u.avatar
        FROM users u
        WHERE u.id != ?
          AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
        ORDER BY RANDOM()
        LIMIT 5
      `, [currentUserId, currentUserId]);
    } else {
      users = getAll(`
        SELECT u.id, u.name, u.username, u.bio, u.avatar
        FROM users u
        ORDER BY RANDOM()
        LIMIT 5
      `);
    }

    return res.json({ success: true, suggestions: users });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve suggestions.' });
  }
});

// GET /api/users/:username
router.get('/:username', optionalAuth, (req, res) => {
  try {
    const { username } = req.params;
    const cleanUsername = username.trim().toLowerCase();

    const user = getOne(
      'SELECT id, name, username, bio, avatar, created_at FROM users WHERE username = ?',
      [cleanUsername]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const postCountRow = getOne('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [user.id]);
    const followerCountRow = getOne('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [user.id]);
    const followingCountRow = getOne('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [user.id]);

    let isFollowing = false;
    let isSelf = false;

    if (req.user) {
      isSelf = req.user.id === user.id;
      if (!isSelf) {
        const followCheck = getOne(
          'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
          [req.user.id, user.id]
        );
        isFollowing = !!followCheck;
      }
    }

    return res.json({
      success: true,
      user: {
        ...user,
        post_count: postCountRow ? postCountRow.count : 0,
        follower_count: followerCountRow ? followerCountRow.count : 0,
        following_count: followingCountRow ? followingCountRow.count : 0,
        is_following: isFollowing,
        is_self: isSelf
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user profile.' });
  }
});

// PUT /api/users/profile (Update current user's profile)
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
    }

    const cleanName = name.trim();
    const cleanBio = typeof bio === 'string' ? bio.trim().slice(0, 300) : req.user.bio;
    const cleanAvatar = typeof avatar === 'string' && avatar.trim() !== '' ? avatar.trim() : req.user.avatar;

    run(
      'UPDATE users SET name = ?, bio = ?, avatar = ? WHERE id = ?',
      [cleanName, cleanBio, cleanAvatar, userId]
    );

    const updatedUser = getOne(
      'SELECT id, name, username, email, bio, avatar, created_at FROM users WHERE id = ?',
      [userId]
    );

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
