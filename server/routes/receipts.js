const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET / - list all receipts with customer joins
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
              c.first_name || ' ' || c.last_name as customer_name
       FROM receipts r
       LEFT JOIN customers c ON r.customer_id = c.id
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List receipts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get receipt details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*,
              c.first_name || ' ' || c.last_name as customer_name,
              c.email as customer_email, c.phone as customer_phone
       FROM receipts r
       LEFT JOIN customers c ON r.customer_id = c.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get receipt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create receipt (auto-generate receipt_number like RCP-YYYYMMDD-XXX)
router.post('/', async (req, res) => {
  try {
    const { receipt_type, customer_id, loan_id, items, subtotal, tax, total, payment_method, notes } = req.body;

    if (!receipt_type) {
      return res.status(400).json({ error: 'Receipt type is required' });
    }

    // Auto-generate receipt_number: RCP-YYYYMMDD-XXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM receipts
       WHERE receipt_number LIKE $1`,
      [`RCP-${dateStr}-%`]
    );
    const sequence = (parseInt(countResult.rows[0].count) + 1).toString().padStart(3, '0');
    const receipt_number = `RCP-${dateStr}-${sequence}`;

    const result = await pool.query(
      `INSERT INTO receipts (receipt_number, receipt_type, customer_id, loan_id, items, subtotal, tax, total, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [receipt_number, receipt_type, customer_id, loan_id, JSON.stringify(items), subtotal, tax, total, payment_method, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create receipt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete receipt
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM receipts WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({ message: 'Receipt deleted successfully' });
  } catch (err) {
    console.error('Delete receipt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
