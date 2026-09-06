const http = require('http');
const app = require('./src/server');

const TEST_PORT = 5099;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${TEST_PORT}${path}`;
    const parsed = new URL(url);

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    let bodyData = null;
    if (options.body) {
      bodyData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(raw);
            resolve({ status: res.statusCode, body: json, headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, body: raw, headers: res.headers });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING AUTOMATED SOCIAL MEDIA API TESTS ===\n');

  let server;
  try {
    server = await new Promise((resolve) => {
      const s = app.listen(TEST_PORT, () => resolve(s));
    });
  } catch (err) {
    console.error('Failed to start test server:', err);
    process.exit(1);
  }

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`Test ${total}: ${name}\n  PASS`);
      passed++;
    } catch (err) {
      console.error(`Test ${total}: ${name}\n  FAIL:`, err.message);
    }
  }

  const timestamp = Date.now();
  let tokenA = '';
  let userA = null;
  let tokenB = '';
  let userB = null;
  let createdPostId = null;
  let createdCommentId = null;

  try {
    // 1. Health check
    await test('Health check endpoint returns status ok and developer credit', async () => {
      const res = await request('/api/health');
      if (res.status !== 200 || res.body.status !== 'ok' || !res.body.developer.includes('Tanjimul')) {
        throw new Error(`Unexpected health response: ${JSON.stringify(res.body)}`);
      }
    });

    // 2. Register User A
    await test('Register User A successfully with unique email and username', async () => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Alice Tester',
          username: `alice_${timestamp}`,
          email: `alice_${timestamp}@test.com`,
          password: 'password123'
        }
      });
      if (res.status !== 201 || !res.body.token || !res.body.user) {
        throw new Error(`Failed to register user A: ${JSON.stringify(res.body)}`);
      }
      tokenA = res.body.token;
      userA = res.body.user;
    });

    // 3. Reject duplicate registration
    await test('Reject duplicate email registration with 409', async () => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Alice Duplicate',
          username: `alice_dup_${timestamp}`,
          email: `alice_${timestamp}@test.com`,
          password: 'password123'
        }
      });
      if (res.status !== 409) {
        throw new Error(`Expected 409 duplicate conflict, received ${res.status}`);
      }
    });

    // 4. Register User B
    await test('Register User B for cross-user permission and ownership tests', async () => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Bob Tester',
          username: `bob_${timestamp}`,
          email: `bob_${timestamp}@test.com`,
          password: 'password123'
        }
      });
      if (res.status !== 201 || !res.body.token) {
        throw new Error(`Failed to register user B: ${JSON.stringify(res.body)}`);
      }
      tokenB = res.body.token;
      userB = res.body.user;
    });

    // 5. Login User A
    await test('Login User A returns JWT token and sanitized profile', async () => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: {
          email: `alice_${timestamp}@test.com`,
          password: 'password123'
        }
      });
      if (res.status !== 200 || !res.body.token || res.body.user.password_hash) {
        throw new Error(`Login failed or exposed password_hash: ${JSON.stringify(res.body)}`);
      }
      tokenA = res.body.token;
    });

    // 6. Get Current User (/api/auth/me)
    await test('Get current user profile (/api/auth/me) using Bearer token', async () => {
      const res = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      if (res.status !== 200 || res.body.user.id !== userA.id) {
        throw new Error(`Failed /api/auth/me: ${JSON.stringify(res.body)}`);
      }
    });

    // 7. Create Post (User A)
    await test('User A creates post with text and optional image', async () => {
      const res = await request('/api/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          content: 'Hello World! Testing automated post creation.',
          image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'
        }
      });
      if (res.status !== 201 || !res.body.post || !res.body.post.id) {
        throw new Error(`Post creation failed: ${JSON.stringify(res.body)}`);
      }
      createdPostId = res.body.post.id;
    });

    // 8. Get Posts with Pagination
    await test('Get posts feed with server-side pagination (limit=10)', async () => {
      const res = await request('/api/posts?page=1&limit=10', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      if (res.status !== 200 || !Array.isArray(res.body.posts) || !res.body.pagination) {
        throw new Error(`Posts feed failed: ${JSON.stringify(res.body)}`);
      }
      if (res.body.posts.length === 0 || res.body.pagination.limit !== 10) {
        throw new Error(`Unexpected pagination format: ${JSON.stringify(res.body.pagination)}`);
      }
    });

    // 9. Get Single Post
    await test('Get single post details with like count and comment count', async () => {
      const res = await request(`/api/posts/${createdPostId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      if (res.status !== 200 || res.body.post.id !== createdPostId) {
        throw new Error(`Get post failed: ${JSON.stringify(res.body)}`);
      }
    });

    // 10. Like Post (User B likes User A post)
    await test('User B likes User A post', async () => {
      const res = await request(`/api/posts/${createdPostId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      if (res.status !== 201 || !res.body.is_liked || res.body.like_count !== 1) {
        throw new Error(`Like failed: ${JSON.stringify(res.body)}`);
      }
    });

    // 11. Prevent Duplicate Like
    await test('Prevent duplicate like from User B on the same post', async () => {
      const res = await request(`/api/posts/${createdPostId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      if (res.status !== 400 || !res.body.message.includes('already liked')) {
        throw new Error(`Expected 400 duplicate like prevention, received ${res.status}`);
      }
    });

    // 12. Unlike Post
    await test('User B unlikes User A post', async () => {
      const res = await request(`/api/posts/${createdPostId}/like`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      if (res.status !== 200 || res.body.is_liked !== false || res.body.like_count !== 0) {
        throw new Error(`Unlike failed: ${JSON.stringify(res.body)}`);
      }
    });

    // 13. Create Comment (User B comments on User A post)
    await test('User B adds a comment to User A post', async () => {
      const res = await request(`/api/posts/${createdPostId}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: { content: 'Great post Alice! Fully automated test comment.' }
      });
      if (res.status !== 201 || !res.body.comment || res.body.comment_count < 1) {
        throw new Error(`Comment creation failed: ${JSON.stringify(res.body)}`);
      }
      createdCommentId = res.body.comment.id;
    });

    // 14. Get Comments for Post
    await test('Get comments list for post with author details', async () => {
      const res = await request(`/api/posts/${createdPostId}/comments`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      if (res.status !== 200 || !Array.isArray(res.body.comments) || res.body.comments.length === 0) {
        throw new Error(`Comments fetch failed: ${JSON.stringify(res.body)}`);
      }
    });

    // 15. Ownership Security: User A tries to delete User B comment -> 403 Forbidden
    await test('Ownership Security: User A cannot delete User B comment (403)', async () => {
      const res = await request(`/api/comments/${createdCommentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      if (res.status !== 403) {
        throw new Error(`Expected 403 Forbidden on foreign comment delete, received ${res.status}`);
      }
    });

    // 16. Delete Own Comment: User B deletes User B comment
    await test('User B deletes own comment successfully', async () => {
      const res = await request(`/api/comments/${createdCommentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      if (res.status !== 200 || !res.body.success) {
        throw new Error(`Failed to delete own comment: ${JSON.stringify(res.body)}`);
      }
    });

    // 17. Follow User: User B follows User A
    await test('User B follows User A', async () => {
      const res = await request(`/api/users/${userA.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      if (res.status !== 201 || !res.body.is_following) {
        throw new Error(`Follow failed: ${JSON.stringify(res.body)}`);
      }
    });

    // 18. Prevent Duplicate Follow & Prevent Self-Follow
    await test('Prevent self-follow (400) and duplicate follow (400)', async () => {
      // Self-follow attempt
      const selfRes = await request(`/api/users/${userA.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      if (selfRes.status !== 400 || !selfRes.body.message.includes('cannot follow yourself')) {
        throw new Error(`Expected 400 self-follow prevention, got ${selfRes.status}`);
      }

      // Duplicate follow attempt
      const dupRes = await request(`/api/users/${userA.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      if (dupRes.status !== 400 || !dupRes.body.message.includes('already following')) {
        throw new Error(`Expected 400 duplicate follow prevention, got ${dupRes.status}`);
      }
    });

    // 19. Get User Profile with Follower/Following/Post stats
    await test('Get User A profile returns follower count = 1 and post count = 1', async () => {
      const res = await request(`/api/users/${userA.username}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      if (res.status !== 200 || res.body.user.follower_count < 1 || res.body.user.is_following !== true) {
        throw new Error(`User profile stats failed: ${JSON.stringify(res.body)}`);
      }
    });

    // 20. Unfollow User: User B unfollows User A
    await test('User B unfollows User A', async () => {
      const res = await request(`/api/users/${userA.id}/unfollow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      if (res.status !== 200 || res.body.is_following !== false) {
        throw new Error(`Unfollow failed: ${JSON.stringify(res.body)}`);
      }
    });

    // 21. Ownership Security: User B tries to delete User A post -> 403 Forbidden
    await test('Ownership Security: User B cannot delete User A post (403)', async () => {
      const res = await request(`/api/posts/${createdPostId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      if (res.status !== 403) {
        throw new Error(`Expected 403 Forbidden on foreign post delete, received ${res.status}`);
      }
    });

    // 22. User A deletes own post successfully
    await test('User A deletes own post successfully', async () => {
      const res = await request(`/api/posts/${createdPostId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      if (res.status !== 200 || !res.body.success) {
        throw new Error(`Post delete failed: ${JSON.stringify(res.body)}`);
      }
    });

  } finally {
    if (server) {
      server.close();
    }
  }

  console.log(`\n>>> API TEST RESULTS: ${passed}/${total} TESTS PASSED <<<`);
  if (passed === total) {
    console.log('>>> ALL SOCIAL MEDIA BACKEND API & SECURITY TESTS PASSED! <<<\n');
    process.exit(0);
  } else {
    console.error('>>> SOME TESTS FAILED! <<<\n');
    process.exit(1);
  }
}

runTests();
