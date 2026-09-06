const assert = require('assert');
const http = require('http');
const app = require('./src/server');

const TEST_PORT = 5055;
let server;
let token;
let secondUserToken;
let createdOrderId;
let testProduct;

function makeRequest(method, path, body = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: TEST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING AUTOMATED BACKEND API TESTS ===');

  server = app.listen(TEST_PORT);
  await new Promise((r) => setTimeout(r, 500));

  try {
    // 1. Health check
    console.log('Test 1: Health check');
    const health = await makeRequest('GET', '/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'ok');
    console.log('  PASS');

    // 2. Register new user
    console.log('Test 2: User registration');
    const randomEmail = `test_${Date.now()}@example.com`;
    const regRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Test Customer',
      email: randomEmail,
      password: 'password123'
    });
    assert.strictEqual(regRes.status, 201);
    assert.ok(regRes.body.token);
    assert.strictEqual(regRes.body.user.email, randomEmail);
    assert.strictEqual(regRes.body.user.password_hash, undefined, 'password_hash must NOT be exposed');
    token = regRes.body.token;
    console.log('  PASS');

    // 3. Reject duplicate email
    console.log('Test 3: Reject duplicate email registration');
    const dupRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Duplicate',
      email: randomEmail,
      password: 'password123'
    });
    assert.strictEqual(dupRes.status, 400);
    console.log('  PASS');

    // 4. Login user
    console.log('Test 4: User login');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: randomEmail,
      password: 'password123'
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.body.token);
    console.log('  PASS');

    // 5. Auth /me
    console.log('Test 5: Protected /api/auth/me');
    const meRes = await makeRequest('GET', '/api/auth/me', null, token);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.email, randomEmail);
    console.log('  PASS');

    // 6. Products listing & category filtering
    console.log('Test 6: Products listing and filtering');
    const prodList = await makeRequest('GET', '/api/products');
    assert.strictEqual(prodList.status, 200);
    assert.ok(prodList.body.products.length >= 10);
    testProduct = prodList.body.products[0];

    const filtered = await makeRequest('GET', `/api/products?category=${encodeURIComponent(testProduct.category)}`);
    assert.strictEqual(filtered.status, 200);
    assert.ok(filtered.body.products.length > 0);

    const searchRes = await makeRequest('GET', `/api/products?search=${encodeURIComponent(testProduct.name.substring(0, 5))}`);
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.body.products.length > 0);
    console.log('  PASS');

    // 7. Product details & 404
    console.log('Test 7: Product details and 404 handling');
    const detail = await makeRequest('GET', `/api/products/${testProduct.id}`);
    assert.strictEqual(detail.status, 200);
    assert.strictEqual(detail.body.product.id, testProduct.id);

    const notFound = await makeRequest('GET', '/api/products/999999');
    assert.strictEqual(notFound.status, 404);
    console.log('  PASS');

    // 8. Order rejection when stock insufficient
    console.log('Test 8: Reject order when requested quantity exceeds stock');
    const excessiveOrder = await makeRequest(
      'POST',
      '/api/orders',
      {
        items: [{ product_id: testProduct.id, quantity: testProduct.stock + 999 }]
      },
      token
    );
    assert.strictEqual(excessiveOrder.status, 400);
    console.log('  PASS');

    // 9. Order creation with server-calculated total
    console.log('Test 9: Order creation with server-side trusted price calculation');
    const initialStock = testProduct.stock;
    const orderRes = await makeRequest(
      'POST',
      '/api/orders',
      {
        items: [
          {
            product_id: testProduct.id,
            quantity: 2,
            price: 0.01 // Attacker tries to send fake low price
          }
        ]
      },
      token
    );
    assert.strictEqual(orderRes.status, 201);
    createdOrderId = orderRes.body.order.id;

    // Verify backend calculated the true price from DB
    const expectedTotal = Math.round(testProduct.price * 2 * 100) / 100;
    assert.strictEqual(orderRes.body.order.total, expectedTotal, 'Total must be calculated from database unit price');
    console.log('  PASS');

    // 10. Verify stock decrement
    console.log('Test 10: Verify stock reduced after order');
    const updatedProd = await makeRequest('GET', `/api/products/${testProduct.id}`);
    assert.strictEqual(updatedProd.body.product.stock, initialStock - 2);
    console.log('  PASS');

    // 11. User-specific order isolation
    console.log('Test 11: Security check - cross-user order isolation');
    const user2Res = await makeRequest('POST', '/api/auth/register', {
      name: 'User Two',
      email: `user2_${Date.now()}@example.com`,
      password: 'password123'
    });
    secondUserToken = user2Res.body.token;

    // User 2 tries to access User 1's order
    const stolenOrder = await makeRequest('GET', `/api/orders/${createdOrderId}`, null, secondUserToken);
    assert.strictEqual(stolenOrder.status, 403, 'User 2 must NOT be allowed to access User 1 order');

    // User 1 accesses their own order
    const validOrder = await makeRequest('GET', `/api/orders/${createdOrderId}`, null, token);
    assert.strictEqual(validOrder.status, 200);
    assert.strictEqual(validOrder.body.order.id, createdOrderId);
    assert.strictEqual(validOrder.body.order.items.length, 1);
    console.log('  PASS');

    console.log('\n>>> ALL BACKEND API & SECURITY TESTS PASSED SUCCESSFULLY! <<<');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
