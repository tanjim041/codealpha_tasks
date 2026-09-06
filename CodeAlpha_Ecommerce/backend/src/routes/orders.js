const express = require('express');
const { db, getOne, getAll, runSql } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/orders - Place a new order
router.post('/', authenticateToken, (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Order must contain at least one item.'
    });
  }

  // Sanity check items
  for (const item of items) {
    const productId = parseInt(item.product_id, 10);
    const quantity = parseInt(item.quantity, 10);

    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID provided.'
      });
    }

    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Item quantity must be a positive integer.'
      });
    }
  }

  // Pre-validate all products, stock, and calculate trusted backend totals
  const validatedItems = [];
  let calculatedTotal = 0;

  try {
    for (const item of items) {
      const productId = parseInt(item.product_id, 10);
      const quantity = parseInt(item.quantity, 10);

      const product = getOne('SELECT * FROM products WHERE id = ?', [productId]);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} not found.`
        });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${quantity}.`
        });
      }

      const itemPrice = parseFloat(product.price);
      calculatedTotal += itemPrice * quantity;

      validatedItems.push({
        product_id: product.id,
        name: product.name,
        image: product.image,
        quantity,
        price: itemPrice
      });
    }

    // Round total to 2 decimal places
    calculatedTotal = Math.round(calculatedTotal * 100) / 100;

    // Execute order creation in a single transaction
    db.exec('BEGIN TRANSACTION;');

    try {
      const orderResult = runSql(
        'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
        [req.user.id, calculatedTotal, 'confirmed']
      );

      const orderId = orderResult.lastID;

      // Insert order items and deduct stock
      for (const item of validatedItems) {
        runSql(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price]
        );

        runSql(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      db.exec('COMMIT;');

      const createdOrder = getOne('SELECT * FROM orders WHERE id = ?', [orderId]);

      return res.status(201).json({
        success: true,
        message: 'Order created successfully.',
        order: {
          ...createdOrder,
          items: validatedItems
        }
      });
    } catch (txError) {
      db.exec('ROLLBACK;');
      console.error('Transaction rollback due to error:', txError);
      return res.status(500).json({
        success: false,
        message: 'Failed to process order. Transaction was cancelled.'
      });
    }
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while processing order.'
    });
  }
});

// GET /api/orders - Get current user's orders
router.get('/', authenticateToken, (req, res) => {
  try {
    const orders = getAll(
      `SELECT o.id, o.user_id, o.total, o.status, o.created_at,
              COALESCE(SUM(oi.quantity), 0) AS total_items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC, o.id DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving orders.'
    });
  }
});

// GET /api/orders/:id - Get specific order details (Authorized only for order owner)
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.'
      });
    }

    const order = getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Security: ensure order belongs to authenticated user
    if (order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own orders.'
      });
    }

    const items = getAll(
      `SELECT oi.id, oi.product_id, oi.quantity, oi.price,
              p.name, p.image, p.category, p.description
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    return res.status(200).json({
      success: true,
      order: {
        ...order,
        items
      }
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving order details.'
    });
  }
});

module.exports = router;
