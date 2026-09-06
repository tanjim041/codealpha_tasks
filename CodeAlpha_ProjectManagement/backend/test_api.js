/**
 * Comprehensive Automated API Test Suite
 * Validates REST Endpoints, Multi-Tenant Authorization, and Security Rules
 * Author: Md. Tanjimul Islam
 */
const http = require('http');

const BASE_URL = 'http://localhost:5002';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Comprehensive CodeAlpha Task 3 API Test Suite...');
  console.log('Target Server:', BASE_URL);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    console.log('\n[1] Health Check');
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'ok', 'GET /api/health returned 200 OK');

    // 2. Authentication Flow
    console.log('\n[2] Authentication & Token Verification');
    const login = await request('POST', '/api/auth/login', {
      email: 'demo@codealpha.com',
      password: 'password123'
    });
    assert(login.status === 200 && !!login.body.token, 'POST /api/auth/login authenticated demo user');
    const demoToken = login.body.token;

    const me = await request('GET', '/api/auth/me', null, demoToken);
    assert(me.status === 200 && me.body.user.email === 'demo@codealpha.com', 'GET /api/auth/me verified JWT payload identity');
    const demoUser = me.body.user;

    // Register a secondary test user for authorization tests
    const randomSuffix = Date.now().toString().slice(-4);
    const secondaryEmail = `tester_${randomSuffix}@codealpha.com`;
    const regSecondary = await request('POST', '/api/auth/register', {
      name: 'Secondary Tester',
      username: `tester_${randomSuffix}`,
      email: secondaryEmail,
      password: 'password123'
    });
    assert(regSecondary.status === 201 && !!regSecondary.body.token, 'POST /api/auth/register registered secondary user');
    const secondaryToken = regSecondary.body.token;
    const secondaryUser = regSecondary.body.user;

    // 3. Project Management
    console.log('\n[3] Project Lifecycle & Multi-Tenancy');
    const createProj = await request('POST', '/api/projects', {
      name: 'Automated Security Workspace',
      description: 'End-to-end multi-tenant validation project',
      status: 'Active'
    }, demoToken);
    assert(createProj.status === 201 && !!createProj.body.project.id, 'POST /api/projects created new project');
    const projectId = createProj.body.project.id;

    const getProj = await request('GET', `/api/projects/${projectId}`, null, demoToken);
    assert(getProj.status === 200 && getProj.body.project.user_role === 'Owner', 'GET /api/projects/:id confirmed creator as Owner');

    const updateProj = await request('PUT', `/api/projects/${projectId}`, {
      description: 'Updated workspace description'
    }, demoToken);
    assert(updateProj.status === 200 && updateProj.body.project.description === 'Updated workspace description', 'PUT /api/projects/:id updated project metadata');

    // 4. Team Member Management & Security
    console.log('\n[4] Team Member Management & Security Authorization');
    // Non-member access rejection test
    const nonMemberAccess = await request('GET', `/api/projects/${projectId}`, null, secondaryToken);
    assert(nonMemberAccess.status === 403, 'GET /api/projects/:id correctly denied access to non-member');

    // Add secondary user to project
    const addMember = await request('POST', `/api/projects/${projectId}/members`, {
      user_id: secondaryUser.id,
      role: 'Member'
    }, demoToken);
    assert(addMember.status === 201, 'POST /api/projects/:id/members added secondary user to project');

    // Duplicate membership rejection test
    const dupMember = await request('POST', `/api/projects/${projectId}/members`, {
      user_id: secondaryUser.id,
      role: 'Member'
    }, demoToken);
    assert(dupMember.status === 400, 'POST /api/projects/:id/members rejected duplicate membership');

    // Unauthorized member invitation attempt (secondary user is a Member, not Admin/Owner)
    const unauthorizedInvite = await request('POST', `/api/projects/${projectId}/members`, {
      user_id: 1,
      role: 'Member'
    }, secondaryToken);
    assert(unauthorizedInvite.status === 403, 'POST /api/projects/:id/members rejected unauthorized invitation by standard member');

    // 5. Tasks Management & Assignment Validation
    console.log('\n[5] Task Operations & Assignee Validation');
    // Attempt assignment to an unregistered/non-member ID (e.g. 99999)
    const invalidAssigneeTask = await request('POST', `/api/projects/${projectId}/tasks`, {
      title: 'Invalid Assignee Test',
      assignee_id: 99999,
      priority: 'Low'
    }, demoToken);
    assert(invalidAssigneeTask.status === 400, 'POST /api/projects/:id/tasks rejected assigning task to non-member');

    // Valid task creation assigned to secondary user (verified member)
    const validTask = await request('POST', `/api/projects/${projectId}/tasks`, {
      title: 'Valid Member Deliverable',
      description: 'Deliverable assigned to verified project member',
      assignee_id: secondaryUser.id,
      priority: 'High',
      due_date: '2026-10-15'
    }, demoToken);
    assert(validTask.status === 201 && validTask.body.task.assignee_id === secondaryUser.id, 'POST /api/projects/:id/tasks assigned task to verified member');
    const taskId = validTask.body.task.id;

    // Status transition: Todo -> In Progress -> Completed
    const progressTask = await request('PUT', `/api/tasks/${taskId}`, { status: 'In Progress' }, demoToken);
    assert(progressTask.status === 200 && progressTask.body.task.status === 'In Progress', 'PUT /api/tasks/:id transitioned task status to In Progress');

    const completeTask = await request('PUT', `/api/tasks/${taskId}`, { status: 'Completed' }, demoToken);
    assert(completeTask.status === 200 && completeTask.body.task.status === 'Completed', 'PUT /api/tasks/:id transitioned task status to Completed');

    // 6. Comments & Strict Ownership Enforcement
    console.log('\n[6] Comments & Ownership Enforcement');
    const postComment = await request('POST', `/api/tasks/${taskId}/comments`, {
      content: 'This is a comment authored by secondary user'
    }, secondaryToken);
    assert(postComment.status === 201 && !!postComment.body.comment.id, 'POST /api/tasks/:id/comments posted new comment');
    const commentId = postComment.body.comment.id;

    // Demo user attempts to delete secondary user's comment (must be forbidden)
    const unauthorizedDelComment = await request('DELETE', `/api/comments/${commentId}`, null, demoToken);
    assert(unauthorizedDelComment.status === 403, 'DELETE /api/comments/:id prevented deleting another user\'s comment');

    // Author deletes own comment
    const authorizedDelComment = await request('DELETE', `/api/comments/${commentId}`, null, secondaryToken);
    assert(authorizedDelComment.status === 200, 'DELETE /api/comments/:id permitted author to delete own comment');

    // 7. Cleanup & Cascading Deletion
    console.log('\n[7] Cleanup & Cascading Deletion');
    const delTask = await request('DELETE', `/api/tasks/${taskId}`, null, demoToken);
    assert(delTask.status === 200, 'DELETE /api/tasks/:id deleted task');

    const delProj = await request('DELETE', `/api/projects/${projectId}`, null, demoToken);
    assert(delProj.status === 200, 'DELETE /api/projects/:id deleted project and cascaded memberships');

    console.log('\n====================================================');
    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 Test execution error:', err);
    process.exit(1);
  }
}

runTests();
