const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET / - list all hold periods with inventory joins
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT hp.*, i.name as item_name, i.category as item_category, i.serial_number as item_serial
       FROM hold_periods hp
       LEFT JOIN inventory i ON hp.inventory_id = i.id
       ORDER BY hp.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List hold periods error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get hold period details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT hp.*, i.name as item_name, i.category as item_category, i.serial_number as item_serial
       FROM hold_periods hp
       LEFT JOIN inventory i ON hp.inventory_id = i.id
       WHERE hp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hold period not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get hold period error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create hold period
router.post('/', async (req, res) => {
  try {
    const {
      inventory_id, hold_type, start_date, end_date,
      police_case_number, officer_name, officer_badge, department, notes
    } = req.body;

    if (!inventory_id || !hold_type || !end_date) {
      return res.status(400).json({ error: 'inventory_id, hold_type, and end_date are required' });
    }

    const result = await pool.query(
      `INSERT INTO hold_periods (inventory_id, hold_type, start_date, end_date, police_case_number, officer_name, officer_badge, department, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [inventory_id, hold_type, start_date || new Date().toISOString().slice(0, 10), end_date, police_case_number, officer_name, officer_badge, department, notes]
    );

    // Update inventory status to on_hold
    await pool.query("UPDATE inventory SET status = 'on_hold', hold_until = $1, updated_at = NOW() WHERE id = $2", [end_date, inventory_id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create hold period error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update hold period
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      inventory_id, hold_type, start_date, end_date,
      police_case_number, officer_name, officer_badge, department, status, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE hold_periods SET
        inventory_id = COALESCE($1, inventory_id),
        hold_type = COALESCE($2, hold_type),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        police_case_number = COALESCE($5, police_case_number),
        officer_name = COALESCE($6, officer_name),
        officer_badge = COALESCE($7, officer_badge),
        department = COALESCE($8, department),
        status = COALESCE($9, status),
        notes = COALESCE($10, notes),
        updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [inventory_id, hold_type, start_date, end_date, police_case_number, officer_name, officer_badge, department, status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hold period not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update hold period error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete hold period
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM hold_periods WHERE id = $1 RETURNING id, inventory_id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hold period not found' });
    }

    // Restore inventory status
    if (result.rows[0].inventory_id) {
      await pool.query("UPDATE inventory SET status = 'available', hold_until = NULL, updated_at = NOW() WHERE id = $1", [result.rows[0].inventory_id]);
    }

    res.json({ message: 'Hold period deleted successfully' });
  } catch (err) {
    console.error('Delete hold period error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/release - release hold
router.post('/:id/release', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const holdResult = await pool.query('SELECT * FROM hold_periods WHERE id = $1', [id]);
    if (holdResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hold period not found' });
    }

    const hold = holdResult.rows[0];

    // Mark hold as released
    await pool.query(
      "UPDATE hold_periods SET status = 'released', notes = COALESCE($1, notes), updated_at = NOW() WHERE id = $2",
      [notes, id]
    );

    // Restore inventory status
    await pool.query(
      "UPDATE inventory SET status = 'available', hold_until = NULL, updated_at = NOW() WHERE id = $1",
      [hold.inventory_id]
    );

    res.json({ message: 'Hold released successfully' });
  } catch (err) {
    console.error('Release hold error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
