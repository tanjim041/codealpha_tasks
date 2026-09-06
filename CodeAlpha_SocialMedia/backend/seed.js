const bcrypt = require('bcryptjs');
const { db, initDb, run, getOne } = require('./src/database');

console.log('--- Seeding CodeAlpha Social Media Database ---');

initDb();

// Clear existing records to ensure idempotent clean seed
db.exec('PRAGMA foreign_keys = OFF;');
db.exec('DELETE FROM follows;');
db.exec('DELETE FROM likes;');
db.exec('DELETE FROM comments;');
db.exec('DELETE FROM posts;');
db.exec('DELETE FROM users;');
db.exec('VACUUM;');
db.exec('PRAGMA foreign_keys = ON;');

const salt = bcrypt.genSaltSync(10);
const defaultPasswordHash = bcrypt.hashSync('password123', salt);

// 1. Seed Users (10 users including demo user)
const usersData = [
  {
    name: 'Demo Explorer',
    username: 'demo_user',
    email: 'demo@codealpha.com',
    bio: 'Tech enthusiast, full-stack learner, and open-source contributor exploring the CodeAlpha platform.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
  },
  {
    name: 'Sarah Jenkins',
    username: 'sarah_j',
    email: 'sarah.jenkins@example.com',
    bio: 'Product Designer & Frontend minimalist. Obsessed with micro-interactions, typography, and dark interfaces.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80'
  },
  {
    name: 'Marcus Vance',
    username: 'marcus_v',
    email: 'marcus.vance@example.com',
    bio: 'Backend systems engineer. Distributed databases, high-concurrency Node.js, and SQLite performance tuning.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'
  },
  {
    name: 'Elena Rostova',
    username: 'elena_dev',
    email: 'elena.rostova@example.com',
    bio: 'Cloud architect & DevOps advocate. Automating pipelines and tinkering with edge computing.',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80'
  },
  {
    name: 'David Kim',
    username: 'dkim_codes',
    email: 'david.kim@example.com',
    bio: 'Mobile dev & JavaScript craftsman. Building responsive web apps that feel native on iOS and Android.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80'
  },
  {
    name: 'Aisha Al-Mansoor',
    username: 'aisha_tech',
    email: 'aisha.mansoor@example.com',
    bio: 'Cybersecurity analyst & privacy enthusiast. Let us build secure, reliable web applications together.',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80'
  },
  {
    name: 'Liam O\'Connor',
    username: 'liam_design',
    email: 'liam.oconnor@example.com',
    bio: 'UI engineer loving Tailwind CSS, clean layouts, and accessible component architectures.',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80'
  },
  {
    name: 'Maya Patel',
    username: 'maya_ai',
    email: 'maya.patel@example.com',
    bio: 'Data science student & tech blogger. Passionate about machine learning pipelines and visual storytelling.',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80'
  },
  {
    name: 'Carlos Mendez',
    username: 'carlos_m',
    email: 'carlos.mendez@example.com',
    bio: 'Open source enthusiast & full-stack mentor. Coffee, clean code, and community building.',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80'
  },
  {
    name: 'Zoe Chen',
    username: 'zoe_chen',
    email: 'zoe.chen@example.com',
    bio: 'Junior web developer passionate about web accessibility, semantic HTML, and modern JavaScript.',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80'
  }
];

const userIds = [];
for (const u of usersData) {
  const res = run(
    'INSERT INTO users (name, username, email, password_hash, bio, avatar) VALUES (?, ?, ?, ?, ?, ?)',
    [u.name, u.username, u.email, defaultPasswordHash, u.bio, u.avatar]
  );
  userIds.push(Number(res.lastInsertRowid));
}
console.log(`Created ${userIds.length} users (Demo: demo@codealpha.com / password123).`);

// 2. Seed Posts (20 realistic posts)
const postsData = [
  {
    user_idx: 1, // Sarah
    content: 'Just deployed our new dark-first design system! Deep navy surfaces with subtle indigo borders make such a massive difference for visual hierarchy and readability. What do you all think?',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
  },
  {
    user_idx: 2, // Marcus
    content: 'SQLite in WAL mode with foreign keys enabled is surprisingly capable for high-throughput single-node backends. Simple file-based storage without server setup overhead is severely underrated.',
    image: ''
  },
  {
    user_idx: 0, // Demo User
    content: 'Excited to be testing out the new CodeAlpha Social Media platform! Fast, minimal, dark-first, and completely responsive. Looking forward to connecting with other developers here.',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80'
  },
  {
    user_idx: 3, // Elena
    content: 'Reminder for web developers: Never trust user IDs or authorization flags sent from the client. Always decode and enforce session identity on the backend through secure JWT tokens.',
    image: ''
  },
  {
    user_idx: 4, // David
    content: 'Working on mobile-first responsive design today. Stacking grids into single-column layouts at 375px and ensuring 44px tap targets saves so many headaches on touch devices.',
    image: 'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?auto=format&fit=crop&w=800&q=80'
  },
  {
    user_idx: 5, // Aisha
    content: 'Password hashing benchmark: bcryptjs with 10 salt rounds hits that sweet spot between cryptographic resilience and sub-100ms server response times.',
    image: ''
  },
  {
    user_idx: 6, // Liam
    content: 'Check out this minimalist developer setup! Natural light, mechanical keyboard, and a terminal set to dark theme. Ready for a productive week of coding.',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80'
  },
  {
    user_idx: 7, // Maya
    content: 'Data visualization tip: limit your primary accent to a single vibrant color, and let neutral slate tones carry the structure. High cognitive load disappears instantly.',
    image: ''
  },
  {
    user_idx: 8, // Carlos
    content: 'Pair programming with our intern today. Watching someone understand relational database joins and foreign keys for the first time is one of the most rewarding parts of software engineering.',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80'
  },
  {
    user_idx: 9, // Zoe
    content: 'Finally completed my first full-stack CRUD application! Frontend in Vanilla JavaScript and backend in Express with SQLite. Clean, understandable, and fast.',
    image: ''
  },
  {
    user_idx: 1, // Sarah
    content: 'Micro-interactions that make a big difference: a subtle 95% scale on button clicks, smooth skeleton shimmers instead of jarring spinners, and quick badge pop animations.',
    image: ''
  },
  {
    user_idx: 2, // Marcus
    content: 'Server-side pagination is essential. Never let a client query an unbounded database table with SELECT * without LIMIT and OFFSET constraints.',
    image: ''
  },
  {
    user_idx: 3, // Elena
    content: 'Automated CI test suites that run in under 5 seconds give developers so much confidence to refactor without fear of regressions.',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80'
  },
  {
    user_idx: 4, // David
    content: 'Clean code over clever code, every single day. In six months, you will thank yourself for writing simple, readable functions.',
    image: ''
  },
  {
    user_idx: 5, // Aisha
    content: 'Security checklist: Sanitize user inputs, set proper CORS origins, hash all credentials, and use parameterized SQL queries to prevent SQL injections.',
    image: ''
  },
  {
    user_idx: 6, // Liam
    content: 'Design token rule: consistency builds trust. When borders, surfaces, and foregrounds use predictable hex variables across every screen, the product feels unified.',
    image: ''
  },
  {
    user_idx: 7, // Maya
    content: 'Evening coding session with coffee. Debugging asynchronous fetch calls and building a smooth comment section.',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80'
  },
  {
    user_idx: 8, // Carlos
    content: 'If your application feels fast and responsive on a 375px mobile screen, it will feel fantastic everywhere.',
    image: ''
  },
  {
    user_idx: 9, // Zoe
    content: 'Big shoutout to the community here. The feedback on my recent posts has been super inspiring. Let us keep building great software together!',
    image: ''
  },
  {
    user_idx: 0, // Demo User
    content: 'Sharing a snapshot of my latest workspace setup. Loving this clean dark atmosphere.',
    image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80'
  }
];

const postIds = [];
for (const p of postsData) {
  const authorId = userIds[p.user_idx];
  const res = run(
    'INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)',
    [authorId, p.content, p.image]
  );
  postIds.push(Number(res.lastInsertRowid));
}
console.log(`Created ${postIds.length} posts.`);

// 3. Seed Comments (32 realistic comments)
const commentsData = [
  { post_idx: 0, user_idx: 2, content: 'Completely agree Sarah! The deep indigo accent gives it a high-end feel without being overwhelming.' },
  { post_idx: 0, user_idx: 4, content: 'The contrast on `#111827` surface with `#F8FAFC` typography looks super crisp.' },
  { post_idx: 0, user_idx: 6, content: 'Spot on design choices. Loving the consistent borders.' },
  { post_idx: 1, user_idx: 3, content: 'SQLite in Node 22 native module is a game changer for zero-dependency deployments.' },
  { post_idx: 1, user_idx: 0, content: 'Been using it for local full-stack development and the speed is incredible.' },
  { post_idx: 2, user_idx: 1, content: 'Welcome @demo_user! Great to have you on the platform.' },
  { post_idx: 2, user_idx: 5, content: 'Welcome aboard! Let us know if you have any questions about the API.' },
  { post_idx: 3, user_idx: 5, content: 'Rule #1 of web security: never trust the client payload!' },
  { post_idx: 3, user_idx: 8, content: 'Always verify authorization server-side on every mutating request.' },
  { post_idx: 4, user_idx: 6, content: 'Touch-target sizing is so often overlooked. Great reminder David.' },
  { post_idx: 4, user_idx: 9, content: 'Learning mobile-first design right now and this advice is golden.' },
  { post_idx: 5, user_idx: 2, content: '10 rounds is the industry gold standard for bcrypt.' },
  { post_idx: 6, user_idx: 1, content: 'That setup is aesthetic goals! What keyboard switches are you using?' },
  { post_idx: 6, user_idx: 7, content: 'Love the minimalist vibe!' },
  { post_idx: 7, user_idx: 1, content: 'A single strong primary color is always cleaner than three competing accents.' },
  { post_idx: 8, user_idx: 9, content: 'Mentors like you make such a difference for beginners. Thank you Carlos!' },
  { post_idx: 8, user_idx: 0, content: 'Heartwarming to see great mentorship in software engineering.' },
  { post_idx: 9, user_idx: 2, content: 'Congratulations Zoe! Big milestone!' },
  { post_idx: 9, user_idx: 8, content: 'Huge congrats! Keep pushing your skills forward.' },
  { post_idx: 10, user_idx: 6, content: 'Button scale on click gives that tactile feedback that users love.' },
  { post_idx: 10, user_idx: 0, content: 'Preach! Smooth transitions beat flashy bounce animations every time.' },
  { post_idx: 11, user_idx: 3, content: 'Pagination also prevents server memory spikes when datasets scale up.' },
  { post_idx: 12, user_idx: 5, content: 'Fast unit and integration tests are essential for continuous deployment.' },
  { post_idx: 13, user_idx: 7, content: '100%. Readability is the most underrated engineering metric.' },
  { post_idx: 14, user_idx: 2, content: 'Parameterized queries are non-negotiable for database safety.' },
  { post_idx: 15, user_idx: 0, content: 'Consistency creates trust. Well said Liam.' },
  { post_idx: 16, user_idx: 4, content: 'Coffee and code, the classic combination.' },
  { post_idx: 17, user_idx: 6, content: 'Desktop responsive is easy once mobile is dialed in.' },
  { post_idx: 18, user_idx: 1, content: 'Glad you are here Zoe! The developer community thrives on collaboration.' },
  { post_idx: 19, user_idx: 8, content: 'Awesome desk setup @demo_user!' },
  { post_idx: 19, user_idx: 3, content: 'Very neat cable management.' },
  { post_idx: 19, user_idx: 4, content: 'Dark theme all the way!' }
];

for (const c of commentsData) {
  const postId = postIds[c.post_idx];
  const authorId = userIds[c.user_idx];
  run(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
    [postId, authorId, c.content]
  );
}
console.log(`Created ${commentsData.length} comments.`);

// 4. Seed Likes (Realistic distribution across posts)
const likesToInsert = [
  // Post 0 (Sarah's design post) - popular
  { post_idx: 0, user_idx: 0 },
  { post_idx: 0, user_idx: 2 },
  { post_idx: 0, user_idx: 3 },
  { post_idx: 0, user_idx: 4 },
  { post_idx: 0, user_idx: 5 },
  { post_idx: 0, user_idx: 6 },
  { post_idx: 0, user_idx: 7 },
  // Post 1 (Marcus SQLite)
  { post_idx: 1, user_idx: 0 },
  { post_idx: 1, user_idx: 1 },
  { post_idx: 1, user_idx: 3 },
  { post_idx: 1, user_idx: 5 },
  // Post 2 (Demo Welcome)
  { post_idx: 2, user_idx: 1 },
  { post_idx: 2, user_idx: 2 },
  { post_idx: 2, user_idx: 4 },
  { post_idx: 2, user_idx: 8 },
  // Post 3 (Security)
  { post_idx: 3, user_idx: 0 },
  { post_idx: 3, user_idx: 2 },
  { post_idx: 3, user_idx: 5 },
  // Post 4 (Mobile)
  { post_idx: 4, user_idx: 0 },
  { post_idx: 4, user_idx: 1 },
  { post_idx: 4, user_idx: 6 },
  // Post 6 (Desk setup)
  { post_idx: 6, user_idx: 0 },
  { post_idx: 6, user_idx: 1 },
  { post_idx: 6, user_idx: 3 },
  { post_idx: 6, user_idx: 7 },
  // Post 9 (Zoe congrats)
  { post_idx: 9, user_idx: 0 },
  { post_idx: 9, user_idx: 1 },
  { post_idx: 9, user_idx: 2 },
  { post_idx: 9, user_idx: 3 },
  { post_idx: 9, user_idx: 4 },
  { post_idx: 9, user_idx: 8 },
  // Post 19 (Demo desk)
  { post_idx: 19, user_idx: 1 },
  { post_idx: 19, user_idx: 2 },
  { post_idx: 19, user_idx: 3 },
  { post_idx: 19, user_idx: 6 }
];

let likesCount = 0;
for (const l of likesToInsert) {
  try {
    run(
      'INSERT INTO likes (post_id, user_id) VALUES (?, ?)',
      [postIds[l.post_idx], userIds[l.user_idx]]
    );
    likesCount++;
  } catch (e) {
    // ignore duplicate if any
  }
}
console.log(`Created ${likesCount} likes.`);

// 5. Seed Follows
const followsToInsert = [
  // Demo user follows: Sarah, Marcus, David, Elena
  { follower_idx: 0, following_idx: 1 },
  { follower_idx: 0, following_idx: 2 },
  { follower_idx: 0, following_idx: 3 },
  { follower_idx: 0, following_idx: 4 },
  // Users following Demo user: Sarah, Carlos, Zoe
  { follower_idx: 1, following_idx: 0 },
  { follower_idx: 8, following_idx: 0 },
  { follower_idx: 9, following_idx: 0 },
  // Other connections
  { follower_idx: 1, following_idx: 2 },
  { follower_idx: 1, following_idx: 6 },
  { follower_idx: 2, following_idx: 1 },
  { follower_idx: 2, following_idx: 3 },
  { follower_idx: 3, following_idx: 2 },
  { follower_idx: 3, following_idx: 5 },
  { follower_idx: 4, following_idx: 1 },
  { follower_idx: 4, following_idx: 6 },
  { follower_idx: 5, following_idx: 3 },
  { follower_idx: 6, following_idx: 1 },
  { follower_idx: 7, following_idx: 1 },
  { follower_idx: 8, following_idx: 9 },
  { follower_idx: 9, following_idx: 8 }
];

let followsCount = 0;
for (const f of followsToInsert) {
  try {
    run(
      'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
      [userIds[f.follower_idx], userIds[f.following_idx]]
    );
    followsCount++;
  } catch (e) {
    // ignore duplicate
  }
}
console.log(`Created ${followsCount} follow relationships.`);

console.log('--- Seeding Completed Successfully! ---');
