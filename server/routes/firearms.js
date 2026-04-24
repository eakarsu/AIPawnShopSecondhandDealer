const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /stats/summary - stats by firearm type, transaction type (must be before /:id)
router.get('/stats/summary', async (req, res) => {
  try {
    const [byTypeResult, byTransactionResult, totalResult] = await Promise.all([
      pool.query(
        `SELECT firearm_type, COUNT(*) as count
         FROM firearm_log
         GROUP BY firearm_type
         ORDER BY count DESC`
      ),
      pool.query(
        `SELECT transaction_type, COUNT(*) as count
         FROM firearm_log
         GROUP BY transaction_type
         ORDER BY count DESC`
      ),
      pool.query('SELECT COUNT(*) as total FROM firearm_log')
    ]);

    res.json({
      total: parseInt(totalResult.rows[0].total),
      by_firearm_type: byTypeResult.rows,
      by_transaction_type: byTransactionResult.rows
    });
  } catch (err) {
    console.error('Firearm stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list all firearm log entries with inventory/customer joins
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fl.*,
              i.name as item_name, i.category as item_category,
              c.first_name || ' ' || c.last_name as customer_name
       FROM firearm_log fl
       LEFT JOIN inventory i ON fl.inventory_id = i.id
       LEFT JOIN customers c ON fl.customer_id = c.id
       ORDER BY fl.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List firearms error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get entry details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT fl.*,
              i.name as item_name, i.category as item_category,
              c.first_name || ' ' || c.last_name as customer_name
       FROM firearm_log fl
       LEFT JOIN inventory i ON fl.inventory_id = i.id
       LEFT JOIN customers c ON fl.customer_id = c.id
       WHERE fl.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Firearm log entry not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get firearm entry error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create entry
router.post('/', async (req, res) => {
  try {
    const {
      inventory_id, customer_id, manufacturer, model, serial_number,
      caliber, firearm_type, action_type, barrel_length, transaction_type,
      transaction_date, acquisition_disposition, nics_check_number,
      nics_check_date, nics_result, notes
    } = req.body;

    if (!manufacturer || !serial_number || !transaction_type) {
      return res.status(400).json({ error: 'Manufacturer, serial number, and transaction type are required' });
    }

    const result = await pool.query(
      `INSERT INTO firearm_log (
        inventory_id, customer_id, manufacturer, model, serial_number,
        caliber, firearm_type, action_type, barrel_length, transaction_type,
        transaction_date, acquisition_disposition, nics_check_number,
        nics_check_date, nics_result, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [inventory_id, customer_id, manufacturer, model, serial_number,
       caliber, firearm_type, action_type, barrel_length, transaction_type,
       transaction_date, acquisition_disposition, nics_check_number,
       nics_check_date, nics_result, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create firearm entry error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      inventory_id, customer_id, manufacturer, model, serial_number,
      caliber, firearm_type, action_type, barrel_length, transaction_type,
      transaction_date, acquisition_disposition, nics_check_number,
      nics_check_date, nics_result, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE firearm_log SET
        inventory_id = COALESCE($1, inventory_id),
        customer_id = COALESCE($2, customer_id),
        manufacturer = COALESCE($3, manufacturer),
        model = COALESCE($4, model),
        serial_number = COALESCE($5, serial_number),
        caliber = COALESCE($6, caliber),
        firearm_type = COALESCE($7, firearm_type),
        action_type = COALESCE($8, action_type),
        barrel_length = COALESCE($9, barrel_length),
        transaction_type = COALESCE($10, transaction_type),
        transaction_date = COALESCE($11, transaction_date),
        acquisition_disposition = COALESCE($12, acquisition_disposition),
        nics_check_number = COALESCE($13, nics_check_number),
        nics_check_date = COALESCE($14, nics_check_date),
        nics_result = COALESCE($15, nics_result),
        notes = COALESCE($16, notes)
       WHERE id = $17
       RETURNING *`,
      [inventory_id, customer_id, manufacturer, model, serial_number,
       caliber, firearm_type, action_type, barrel_length, transaction_type,
       transaction_date, acquisition_disposition, nics_check_number,
       nics_check_date, nics_result, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Firearm log entry not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update firearm entry error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM firearm_log WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Firearm log entry not found' });
    }

    res.json({ message: 'Firearm log entry deleted successfully' });
  } catch (err) {
    console.error('Delete firearm entry error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
