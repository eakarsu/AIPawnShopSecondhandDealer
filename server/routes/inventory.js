const express = require('express');
const router = express.Router();
const pool = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');

// Multer disk storage for item photos
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'items');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `item-${req.params.id}-${Date.now()}${ext}`);
  }
});
const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// GET /stats/summary - inventory stats (must be before /:id)
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalResult, valueResult, byCategoryResult, byStatusResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total_items FROM inventory'),
      pool.query('SELECT COALESCE(SUM(retail_price), 0) as total_retail_value, COALESCE(SUM(cost_price), 0) as total_cost_value FROM inventory'),
      pool.query('SELECT category, COUNT(*) as count, COALESCE(SUM(retail_price), 0) as total_value FROM inventory GROUP BY category ORDER BY count DESC'),
      pool.query('SELECT status, COUNT(*) as count FROM inventory GROUP BY status ORDER BY count DESC')
    ]);

    res.json({
      total_items: parseInt(totalResult.rows[0].total_items),
      total_retail_value: parseFloat(valueResult.rows[0].total_retail_value),
      total_cost_value: parseFloat(valueResult.rows[0].total_cost_value),
      by_category: byCategoryResult.rows,
      by_status: byStatusResult.rows
    });
  } catch (err) {
    console.error('Inventory stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list all inventory with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      whereClause += ` AND i.status = $${params.length}`;
    }

    if (category) {
      params.push(category);
      whereClause += ` AND i.category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (i.name ILIKE $${params.length} OR i.description ILIKE $${params.length} OR i.serial_number ILIKE $${params.length} OR i.brand ILIKE $${params.length})`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM inventory i ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const dataResult = await pool.query(
      `SELECT i.*, c.first_name || ' ' || c.last_name as customer_name FROM inventory i LEFT JOIN customers c ON i.customer_id = c.id ${whereClause} ORDER BY i.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('List inventory error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get single item with related loans, hold periods
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const itemResult = await pool.query(
      `SELECT i.*, c.first_name || ' ' || c.last_name as customer_name
       FROM inventory i LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.id = $1`,
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const [loansResult, holdResult] = await Promise.all([
      pool.query('SELECT * FROM loans WHERE inventory_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM hold_periods WHERE inventory_id = $1 ORDER BY created_at DESC', [id])
    ]);

    res.json({
      ...itemResult.rows[0],
      loans: loansResult.rows,
      hold_periods: holdResult.rows
    });
  } catch (err) {
    console.error('Get inventory item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create item
router.post('/', async (req, res) => {
  try {
    const {
      category, subcategory, name, description, serial_number, brand, model,
      condition, cost_price, retail_price, status, location, photo_url,
      customer_id, acquired_date, hold_until, notes
    } = req.body;

    if (!category || !name) {
      return res.status(400).json({ error: 'Category and name are required' });
    }

    const result = await pool.query(
      `INSERT INTO inventory (category, subcategory, name, description, serial_number, brand, model, condition, cost_price, retail_price, status, location, photo_url, customer_id, acquired_date, hold_until, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [category, subcategory, name, description, serial_number, brand, model, condition, cost_price, retail_price, status || 'available', location, photo_url, customer_id, acquired_date, hold_until, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create inventory item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category, subcategory, name, description, serial_number, brand, model,
      condition, cost_price, retail_price, status, location, photo_url,
      customer_id, acquired_date, hold_until, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE inventory SET
        category = COALESCE($1, category),
        subcategory = COALESCE($2, subcategory),
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        serial_number = COALESCE($5, serial_number),
        brand = COALESCE($6, brand),
        model = COALESCE($7, model),
        condition = COALESCE($8, condition),
        cost_price = COALESCE($9, cost_price),
        retail_price = COALESCE($10, retail_price),
        status = COALESCE($11, status),
        location = COALESCE($12, location),
        photo_url = COALESCE($13, photo_url),
        customer_id = COALESCE($14, customer_id),
        acquired_date = COALESCE($15, acquired_date),
        hold_until = COALESCE($16, hold_until),
        notes = COALESCE($17, notes),
        updated_at = NOW()
       WHERE id = $18
       RETURNING *`,
      [category, subcategory, name, description, serial_number, brand, model, condition, cost_price, retail_price, status, location, photo_url, customer_id, acquired_date, hold_until, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update inventory item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Delete inventory item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/upload-photo — upload a photo for an item
router.post('/:id/upload-photo', auth, photoUpload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No photo file provided' });

    const photoUrl = `/uploads/items/${req.file.filename}`;

    const result = await pool.query(
      'UPDATE inventory SET photo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, photo_url',
      [photoUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      success: true,
      photo_url: photoUrl,
      item: result.rows[0]
    });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: err.message || 'Photo upload failed' });
  }
});

module.exports = router;
