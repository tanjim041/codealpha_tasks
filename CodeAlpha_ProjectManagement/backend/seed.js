const bcrypt = require('bcryptjs');
const { db, initDb, run, getOne } = require('./src/database');

async function seed() {
  console.log('🌱 Initializing database schema...');
  initDb();

  console.log('🧹 Cleaning existing data...');
  // Disable foreign keys temporarily for clean truncation
  db.exec('PRAGMA foreign_keys = OFF;');
  run('DELETE FROM task_comments;');
  run('DELETE FROM tasks;');
  run('DELETE FROM project_members;');
  run('DELETE FROM projects;');
  run('DELETE FROM users;');
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('👤 Creating users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    {
      name: 'Md. Tanjimul Islam',
      username: 'tanjimul',
      email: 'demo@codealpha.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      role: 'Admin'
    },
    {
      name: 'Sarah Jenkins',
      username: 'sarahj',
      email: 'sarah@codealpha.com',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
      role: 'Member'
    },
    {
      name: 'Alexander Mercer',
      username: 'alexm',
      email: 'alex@codealpha.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      role: 'Member'
    },
    {
      name: 'Elena Rostova',
      username: 'elenar',
      email: 'elena@codealpha.com',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      role: 'Member'
    }
  ];

  const userIds = {};
  for (const u of users) {
    run(
      `INSERT INTO users (name, username, email, password_hash, avatar, role) VALUES (?, ?, ?, ?, ?, ?)`,
      [u.name, u.username, u.email, passwordHash, u.avatar, u.role]
    );
    const created = getOne(`SELECT id FROM users WHERE email = ?`, [u.email]);
    userIds[u.username] = created.id;
  }

  console.log('📁 Creating projects and members...');
  const projectsData = [
    {
      name: 'CloudSync Infrastructure',
      description: 'Enterprise scalable cloud synchronization and microservices monitoring platform with real-time alerting.',
      owner: userIds['tanjimul'],
      status: 'Active',
      members: [
        { id: userIds['tanjimul'], role: 'Owner' },
        { id: userIds['sarahj'], role: 'Admin' },
        { id: userIds['alexm'], role: 'Member' }
      ]
    },
    {
      name: 'Mobile App Redesign v2',
      description: 'Comprehensive mobile application redesign prioritizing responsive accessibility and dark-first aesthetic tokens.',
      owner: userIds['tanjimul'],
      status: 'Active',
      members: [
        { id: userIds['tanjimul'], role: 'Owner' },
        { id: userIds['elenar'], role: 'Member' },
        { id: userIds['alexm'], role: 'Member' }
      ]
    },
    {
      name: 'Security & SOC-2 Compliance',
      description: 'End-to-end security compliance audit, data encryption review, and penetration testing verification.',
      owner: userIds['tanjimul'],
      status: 'Completed',
      members: [
        { id: userIds['tanjimul'], role: 'Owner' },
        { id: userIds['sarahj'], role: 'Member' }
      ]
    },
    {
      name: 'AI Analytics Pipeline',
      description: 'Machine learning data pipeline for real-time telemetry processing and anomaly classification.',
      owner: userIds['sarahj'],
      status: 'Active',
      members: [
        { id: userIds['sarahj'], role: 'Owner' },
        { id: userIds['tanjimul'], role: 'Admin' },
        { id: userIds['elenar'], role: 'Member' }
      ]
    }
  ];

  const projectIds = [];
  for (const p of projectsData) {
    run(
      `INSERT INTO projects (name, description, owner_id, status) VALUES (?, ?, ?, ?)`,
      [p.name, p.description, p.owner, p.status]
    );
    const createdProj = getOne(`SELECT id FROM projects WHERE name = ?`, [p.name]);
    projectIds.push(createdProj.id);

    for (const m of p.members) {
      run(
        `INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`,
        [createdProj.id, m.id, m.role]
      );
    }
  }

  console.log('✅ Creating tasks...');
  const tasksData = [
    {
      project_id: projectIds[0],
      title: 'Architect Kubernetes deployment manifests',
      description: 'Create Helm charts and ingress configurations with mutual TLS enforcement.',
      assignee_id: userIds['tanjimul'],
      status: 'In Progress',
      priority: 'High',
      due_date: '2026-09-20'
    },
    {
      project_id: projectIds[0],
      title: 'Setup Prometheus and Grafana alerts',
      description: 'Configure scrape intervals, alertmanager routing, and Slack webhook notifications.',
      assignee_id: userIds['alexm'],
      status: 'Todo',
      priority: 'Medium',
      due_date: '2026-09-25'
    },
    {
      project_id: projectIds[0],
      title: 'Benchmark Redis cluster latency',
      description: 'Execute load tests with 10k concurrent virtual users and analyze P99 latencies.',
      assignee_id: userIds['sarahj'],
      status: 'Completed',
      priority: 'High',
      due_date: '2026-09-05'
    },
    {
      project_id: projectIds[1],
      title: 'Audit WCAG 2.1 AA color contrast',
      description: 'Inspect all theme tokens in Figma and CSS variables for high contrast accessibility.',
      assignee_id: userIds['elenar'],
      status: 'In Progress',
      priority: 'High',
      due_date: '2026-09-18'
    },
    {
      project_id: projectIds[1],
      title: 'Design interactive dashboard cards',
      description: 'Implement responsive glassmorphic cards with Lucide icons and hover transitions.',
      assignee_id: userIds['tanjimul'],
      status: 'Todo',
      priority: 'Medium',
      due_date: '2026-09-22'
    },
    {
      project_id: projectIds[2],
      title: 'Prepare audit report documentation',
      description: 'Compile penetration testing artifacts and encryption key rotation logs for SOC-2.',
      assignee_id: userIds['tanjimul'],
      status: 'Completed',
      priority: 'Low',
      due_date: '2026-08-30'
    },
    {
      project_id: projectIds[3],
      title: 'Build feature extraction pipeline',
      description: 'Transform telemetry stream into standardized numpy embeddings for model inference.',
      assignee_id: userIds['tanjimul'],
      status: 'In Progress',
      priority: 'High',
      due_date: '2026-09-28'
    }
  ];

  const taskIds = [];
  for (const t of tasksData) {
    run(
      `INSERT INTO tasks (project_id, title, description, assignee_id, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [t.project_id, t.title, t.description, t.assignee_id, t.status, t.priority, t.due_date]
    );
    const createdTask = getOne(`SELECT id FROM tasks WHERE title = ?`, [t.title]);
    taskIds.push(createdTask.id);
  }

  console.log('💬 Creating task comments...');
  const commentsData = [
    {
      task_id: taskIds[0],
      user_id: userIds['sarahj'],
      content: 'I verified the Helm chart values for staging. Looks solid!'
    },
    {
      task_id: taskIds[0],
      user_id: userIds['tanjimul'],
      content: 'Thanks Sarah! Moving on to configure mutual TLS next.'
    },
    {
      task_id: taskIds[3],
      user_id: userIds['tanjimul'],
      content: 'Please ensure we test both dark (#080B14) and light modes for contrast ratios.'
    },
    {
      task_id: taskIds[3],
      user_id: userIds['elenar'],
      content: 'Understood! I will check with Axe DevTools and report back.'
    }
  ];

  for (const c of commentsData) {
    run(
      `INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)`,
      [c.task_id, c.user_id, c.content]
    );
  }

  console.log('====================================================');
  console.log('✨ Database seeded successfully with demo data!');
  console.log('🔑 Demo Login Account:');
  console.log('   Email:    demo@codealpha.com');
  console.log('   Password: password123');
  console.log('   User:     Md. Tanjimul Islam (Admin)');
  console.log('====================================================');
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
