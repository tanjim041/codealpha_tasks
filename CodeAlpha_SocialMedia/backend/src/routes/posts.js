const express = require('express');
const { getOne, getAll, run } = require('../database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/posts (with server-side pagination & filtering)
router.get('/', optionalAuth, (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    const feedType = req.query.feed || 'all';
    const usernameFilter = req.query.user ? req.query.user.trim().toLowerCase() : null;
    const search = req.query.search ? req.query.search.trim() : null;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 50) limit = 50; // Maximum clamped at 50

    const offset = (page - 1) * limit;

    const currentUserId = req.user ? req.user.id : null;

    let whereClauses = [];
    let params = [];

    // Filter by specific user
    if (usernameFilter) {
      const targetUser = getOne('SELECT id FROM users WHERE username = ?', [usernameFilter]);
      if (!targetUser) {
        return res.json({
          success: true,
          posts: [],
          pagination: { page, limit, total_posts: 0, total_pages: 0, has_more: false }
        });
      }
      whereClauses.push('p.user_id = ?');
      params.push(targetUser.id);
    }

    // Filter by following feed
    if (feedType === 'following' && currentUserId) {
      whereClauses.push('p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)');
      params.push(currentUserId);
    }

    // Filter by search query
    if (search && search !== '') {
      whereClauses.push('(p.content LIKE ? OR u.name LIKE ? OR u.username LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total matching posts
    const countRow = getOne(`
      SELECT COUNT(*) as count 
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ${whereSql}
    `, params);

    const totalPosts = countRow ? countRow.count : 0;
    const totalPages = Math.ceil(totalPosts / limit);

    // Fetch posts with author info, like count, comment count
    const posts = getAll(`
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.image,
        p.created_at,
        p.updated_at,
        u.name as author_name,
        u.username as author_username,
        u.avatar as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        ${currentUserId ? `(SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ${currentUserId})` : '0'} as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const formattedPosts = posts.map(p => ({
      ...p,
      is_liked: Boolean(p.is_liked),
      is_author: currentUserId ? currentUserId === p.user_id : false
    }));

    return res.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total_posts: totalPosts,
        total_pages: totalPages,
        has_more: page < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve posts.' });
  }
});

// GET /api/posts/:id (Single post details)
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    const currentUserId = req.user ? req.user.id : null;

    const post = getOne(`
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.image,
        p.created_at,
        p.updated_at,
        u.name as author_name,
        u.username as author_username,
        u.avatar as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        ${currentUserId ? `(SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ${currentUserId})` : '0'} as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [postId]);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    return res.json({
      success: true,
      post: {
        ...post,
        is_liked: Boolean(post.is_liked),
        is_author: currentUserId ? currentUserId === post.user_id : false
      }
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve post details.' });
  }
});

// POST /api/posts (Create new post)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { content, image } = req.body;
    const userId = req.user.id; // Enforce user from verified JWT

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Post content cannot be empty.' });
    }

    const cleanContent = content.trim();
    if (cleanContent.length > 2000) {
      return res.status(400).json({ success: false, message: 'Post content exceeds 2000 characters limit.' });
    }

    const cleanImage = typeof image === 'string' ? image.trim() : '';

    const result = run(
      'INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)',
      [userId, cleanContent, cleanImage]
    );

    const newPostId = Number(result.lastInsertRowid);

    const post = getOne(`
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.image,
        p.created_at,
        p.updated_at,
        u.name as author_name,
        u.username as author_username,
        u.avatar as author_avatar,
        0 as like_count,
        0 as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [newPostId]);

    return res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      post: {
        ...post,
        is_liked: false,
        is_author: true
      }
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ success: false, message: 'Failed to create post.' });
  }
});

// PUT /api/posts/:id (Edit post - strict ownership enforcement)
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { content, image } = req.body;

    if (isNaN(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    const post = getOne('SELECT id, user_id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    // Ownership check: only the author can edit
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You can only edit your own posts.' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Content cannot be empty.' });
    }

    const cleanContent = content.trim();
    const cleanImage = typeof image === 'string' ? image.trim() : '';

    run(
      'UPDATE posts SET content = ?, image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [cleanContent, cleanImage, postId]
    );

    const updated = getOne(`
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.image,
        p.created_at,
        p.updated_at,
        u.name as author_name,
        u.username as author_username,
        u.avatar as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [postId]);

    return res.json({
      success: true,
      message: 'Post updated successfully.',
      post: {
        ...updated,
        is_author: true
      }
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return res.status(500).json({ success: false, message: 'Failed to update post.' });
  }
});

// DELETE /api/posts/:id (Delete post - strict ownership enforcement)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    const post = getOne('SELECT id, user_id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    // Ownership check: only the author can delete
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You can only delete your own posts.' });
    }

    run('DELETE FROM posts WHERE id = ?', [postId]);

    return res.json({ success: true, message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete post.' });
  }
});

// POST /api/posts/:id/like (Like a post - idempotent)
router.post('/:id/like', authenticateToken, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    const post = getOne('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const existingLike = getOne('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    if (existingLike) {
      const countRow = getOne('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);
      return res.status(400).json({
        success: false,
        message: 'You have already liked this post.',
        is_liked: true,
        like_count: countRow ? countRow.count : 0
      });
    }

    run('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
    const countRow = getOne('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);

    return res.status(201).json({
      success: true,
      message: 'Post liked.',
      is_liked: true,
      like_count: countRow ? countRow.count : 0
    });
  } catch (error) {
    console.error('Error liking post:', error);
    return res.status(500).json({ success: false, message: 'Failed to like post.' });
  }
});

// DELETE /api/posts/:id/like (Unlike a post)
router.delete('/:id/like', authenticateToken, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    run('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    const countRow = getOne('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);

    return res.json({
      success: true,
      message: 'Post unliked.',
      is_liked: false,
      like_count: countRow ? countRow.count : 0
    });
  } catch (error) {
    console.error('Error unliking post:', error);
    return res.status(500).json({ success: false, message: 'Failed to unlike post.' });
  }
});

// GET /api/posts/:id/likes (List of users who liked post)
router.get('/:id/likes', optionalAuth, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID.' });
    }

    const likes = getAll(`
      SELECT u.id, u.name, u.username, u.avatar, l.created_at
      FROM likes l
      JOIN users u ON l.user_id = u.id
      WHERE l.post_id = ?
      ORDER BY l.created_at DESC
    `, [postId]);

    return res.json({ success: true, likes });
  } catch (error) {
    console.error('Error fetching likes:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve post likes.' });
  }
});

module.exports = router;
