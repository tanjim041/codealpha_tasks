const express = require('express');
const { getAll, getOne } = require('../database');

const router = express.Router();

// GET /api/products/categories
router.get('/categories', (req, res) => {
  try {
    const rows = getAll('SELECT DISTINCT category FROM products ORDER BY category ASC');
    const categories = rows.map((r) => r.category);
    return res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving categories.'
    });
  }
});

// GET /api/products (supports optional ?search= and ?category=)
router.get('/', (req, res) => {
  try {
    const { search, category } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      query += ' AND LOWER(category) = LOWER(?)';
      params.push(category.trim());
    }

    if (search && search.trim() !== '') {
      query += ' AND (LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))';
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC, id DESC';

    const products = getAll(query, params);

    return res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving products.'
    });
  }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.'
      });
    }

    const product = getOne('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving product details.'
    });
  }
});

module.exports = router;
