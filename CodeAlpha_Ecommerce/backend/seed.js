const bcrypt = require('bcryptjs');
const { initDb, db, runSql, getOne, getAll } = require('./src/database');

const sampleProducts = [
  {
    name: 'Wireless Noise-Canceling Headphones',
    description: 'Premium over-ear wireless headphones with active noise cancellation, 30-hour battery life, and crystal-clear acoustic fidelity.',
    price: 129.99,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    category: 'Electronics',
    stock: 25
  },
  {
    name: 'Ultra-Slim Mechanical Keyboard',
    description: 'Compact 75% layout mechanical keyboard with customizable RGB backlighting, hot-swappable switches, and Bluetooth connectivity.',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
    category: 'Electronics',
    stock: 18
  },
  {
    name: 'Ergonomic Wireless Gaming Mouse',
    description: 'High-precision 16,000 DPI optical sensor, ultra-lightweight ergonomic chassis, and programmable macro buttons.',
    price: 49.99,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80',
    category: 'Gaming',
    stock: 30
  },
  {
    name: 'Pro Wireless Gaming Controller',
    description: 'Ergonomic gamepad featuring responsive tactile triggers, dual rumble feedback, and multi-platform compatibility.',
    price: 59.99,
    image: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&w=600&q=80',
    category: 'Gaming',
    stock: 15
  },
  {
    name: 'Classic Minimalist Leather Watch',
    description: 'Elegant timepiece with a genuine Italian leather strap, stainless steel casing, and scratch-resistant sapphire crystal.',
    price: 119.50,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
    category: 'Accessories',
    stock: 12
  },
  {
    name: 'Polarized Aviator Sunglasses',
    description: 'UV400 protective polarized lenses set in a featherweight titanium frame for timeless outdoor style and eye protection.',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
    category: 'Accessories',
    stock: 22
  },
  {
    name: 'Water-Resistant Commuter Backpack',
    description: 'Streamlined urban travel pack with padded laptop compartment, concealed anti-theft pocket, and ergonomic shoulder straps.',
    price: 69.00,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
    category: 'Accessories',
    stock: 20
  },
  {
    name: 'Organic Cotton Crewneck T-Shirt',
    description: 'Ultra-soft 100% combed organic cotton shirt with reinforced seams and breathable comfort for everyday wear.',
    price: 24.50,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
    category: 'Clothing',
    stock: 40
  },
  {
    name: 'Waterproof Hooded Windbreaker Jacket',
    description: 'Durable water-repellent shell with zippered security pockets and an adjustable storm hood for year-round protection.',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=600&q=80',
    category: 'Clothing',
    stock: 14
  },
  {
    name: 'Insulated Stainless Steel Water Bottle',
    description: 'Double-wall vacuum insulation keeps cold beverages ice-cold for 24 hours and hot coffee steaming for 12 hours.',
    price: 28.00,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80',
    category: 'Home',
    stock: 35
  },
  {
    name: 'Ceramic Pour-Over Coffee Maker',
    description: 'Artisan ceramic dripper set with heat-resistant borosilicate glass carafe for rich, flavorful hand-brewed coffee.',
    price: 39.99,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    category: 'Home',
    stock: 16
  },
  {
    name: 'Smart Ambient Desk Lamp',
    description: 'Dimmable LED task light with customizable color temperatures, wireless phone charging pad base, and touch slider control.',
    price: 45.00,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
    category: 'Home',
    stock: 10
  },
  {
    name: 'Limited Edition Gaming Headset Stand',
    description: 'Solid aluminum headset cradle with weighted anti-slip base and integrated USB pass-through ports.',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80',
    category: 'Gaming',
    stock: 8
  },
  {
    name: 'High-Speed USB-C GaN Wall Charger',
    description: '65W dual-port GaN fast charger with foldable prongs, capable of rapidly powering laptops, tablets, and phones.',
    price: 32.50,
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
    category: 'Electronics',
    stock: 25
  }
];

async function seed() {
  console.log('--- Initializing SQLite Database ---');
  initDb();

  // Seed sample products
  console.log('--- Seeding Products ---');
  const existingCount = getAll('SELECT id FROM products').length;

  if (existingCount === 0) {
    for (const p of sampleProducts) {
      runSql(
        `INSERT INTO products (name, description, price, image, category, stock)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [p.name, p.description, p.price, p.image, p.category, p.stock]
      );
    }
    console.log(`Seeded ${sampleProducts.length} realistic products across 5 categories.`);
  } else {
    console.log(`Products table already populated with ${existingCount} items. Skipping.`);
  }

  // Seed demo user
  console.log('--- Seeding Demo User ---');
  const demoEmail = 'demo@codealpha.com';
  const existingUser = getOne('SELECT id FROM users WHERE email = ?', [demoEmail]);

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('password123', 10);
    runSql(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      ['Demo Intern', demoEmail, passwordHash]
    );
    console.log(`Demo user created: ${demoEmail} (password: password123)`);
  } else {
    console.log(`Demo user already exists: ${demoEmail}`);
  }

  console.log('--- Database Initialization & Seeding Complete ---');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
