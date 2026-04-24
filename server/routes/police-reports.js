const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET / - list all police reports
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.*,
              COUNT(pri.id) as item_count
       FROM police_reports pr
       LEFT JOIN police_report_items pri ON pr.id = pri.report_id
       GROUP BY pr.id
       ORDER BY pr.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List police reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get report with its items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const reportResult = await pool.query(
      'SELECT * FROM police_reports WHERE id = $1',
      [id]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Police report not found' });
    }

    const itemsResult = await pool.query(
      `SELECT pri.*,
              i.name as item_name, i.category as item_category,
              c.first_name || ' ' || c.last_name as customer_name
       FROM police_report_items pri
       LEFT JOIN inventory i ON pri.inventory_id = i.id
       LEFT JOIN customers c ON pri.customer_id = c.id
       WHERE pri.report_id = $1
       ORDER BY pri.created_at DESC`,
      [id]
    );

    res.json({
      ...reportResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error('Get police report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create report
router.post('/', async (req, res) => {
  try {
    const { report_date, report_type, department, officer_name, badge_number, notes } = req.body;

    if (!report_type) {
      return res.status(400).json({ error: 'Report type is required' });
    }

    const result = await pool.query(
      `INSERT INTO police_reports (report_date, report_type, department, officer_name, badge_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [report_date, report_type, department, officer_name, badge_number, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create police report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update report
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { report_date, report_type, department, officer_name, badge_number, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE police_reports SET
        report_date = COALESCE($1, report_date),
        report_type = COALESCE($2, report_type),
        department = COALESCE($3, department),
        officer_name = COALESCE($4, officer_name),
        badge_number = COALESCE($5, badge_number),
        status = COALESCE($6, status),
        notes = COALESCE($7, notes)
       WHERE id = $8
       RETURNING *`,
      [report_date, report_type, department, officer_name, badge_number, status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Police report not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update police report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete report
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete associated items first
    await pool.query('DELETE FROM police_report_items WHERE report_id = $1', [id]);

    const result = await pool.query('DELETE FROM police_reports WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Police report not found' });
    }

    res.json({ message: 'Police report deleted successfully' });
  } catch (err) {
    console.error('Delete police report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/items - add item to report
router.post('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { inventory_id, customer_id, transaction_type, item_description, serial_number, amount } = req.body;

    // Verify report exists
    const reportResult = await pool.query('SELECT id FROM police_reports WHERE id = $1', [id]);
    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Police report not found' });
    }

    const result = await pool.query(
      `INSERT INTO police_report_items (report_id, inventory_id, customer_id, transaction_type, item_description, serial_number, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, inventory_id, customer_id, transaction_type, item_description, serial_number, amount]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add police report item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/submit - mark report as submitted
router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE police_reports SET status = 'submitted'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Police report not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Submit police report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
