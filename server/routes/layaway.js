const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET / - list all layaways with customer and inventory joins
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT la.*,
        c.first_name || ' ' || c.last_name as customer_name,
        i.name as item_name, i.category as item_category
       FROM layaways la
       LEFT JOIN customers c ON la.customer_id = c.id
       LEFT JOIN inventory i ON la.inventory_id = i.id
       ORDER BY la.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List layaways error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get layaway details with payments
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const layawayResult = await pool.query(
      `SELECT la.*,
        c.first_name || ' ' || c.last_name as customer_name, c.email as customer_email, c.phone as customer_phone,
        i.name as item_name, i.category as item_category, i.retail_price as item_retail_price
       FROM layaways la
       LEFT JOIN customers c ON la.customer_id = c.id
       LEFT JOIN inventory i ON la.inventory_id = i.id
       WHERE la.id = $1`,
      [id]
    );

    if (layawayResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layaway not found' });
    }

    const paymentsResult = await pool.query(
      'SELECT * FROM layaway_payments WHERE layaway_id = $1 ORDER BY payment_date DESC',
      [id]
    );

    res.json({
      ...layawayResult.rows[0],
      payments: paymentsResult.rows
    });
  } catch (err) {
    console.error('Get layaway error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create layaway
router.post('/', async (req, res) => {
  try {
    const {
      customer_id, inventory_id, total_price, down_payment,
      monthly_payment, due_date, notes
    } = req.body;

    if (!customer_id || !inventory_id || !total_price || !down_payment || !monthly_payment || !due_date) {
      return res.status(400).json({ error: 'customer_id, inventory_id, total_price, down_payment, monthly_payment, and due_date are required' });
    }

    const remaining_balance = parseFloat(total_price) - parseFloat(down_payment);

    const result = await pool.query(
      `INSERT INTO layaways (customer_id, inventory_id, total_price, down_payment, monthly_payment, remaining_balance, due_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [customer_id, inventory_id, total_price, down_payment, monthly_payment, remaining_balance, due_date, notes]
    );

    // Update inventory status to layaway
    await pool.query("UPDATE inventory SET status = 'layaway', updated_at = NOW() WHERE id = $1", [inventory_id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create layaway error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update layaway
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_id, inventory_id, total_price, down_payment,
      monthly_payment, remaining_balance, due_date, status, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE layaways SET
        customer_id = COALESCE($1, customer_id),
        inventory_id = COALESCE($2, inventory_id),
        total_price = COALESCE($3, total_price),
        down_payment = COALESCE($4, down_payment),
        monthly_payment = COALESCE($5, monthly_payment),
        remaining_balance = COALESCE($6, remaining_balance),
        due_date = COALESCE($7, due_date),
        status = COALESCE($8, status),
        notes = COALESCE($9, notes),
        updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [customer_id, inventory_id, total_price, down_payment, monthly_payment, remaining_balance, due_date, status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layaway not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update layaway error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete layaway
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM layaways WHERE id = $1 RETURNING id, inventory_id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layaway not found' });
    }

    // Restore inventory status
    if (result.rows[0].inventory_id) {
      await pool.query("UPDATE inventory SET status = 'available', updated_at = NOW() WHERE id = $1", [result.rows[0].inventory_id]);
    }

    res.json({ message: 'Layaway deleted successfully' });
  } catch (err) {
    console.error('Delete layaway error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/payment - make layaway payment
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'amount is required' });
    }

    const layawayResult = await pool.query('SELECT * FROM layaways WHERE id = $1', [id]);
    if (layawayResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layaway not found' });
    }

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO layaway_payments (layaway_id, amount, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, amount, notes]
    );

    // Update remaining balance
    const newBalance = parseFloat(layawayResult.rows[0].remaining_balance) - parseFloat(amount);
    await pool.query(
      'UPDATE layaways SET remaining_balance = $1, updated_at = NOW() WHERE id = $2',
      [Math.max(0, newBalance), id]
    );

    res.status(201).json(paymentResult.rows[0]);
  } catch (err) {
    console.error('Layaway payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/complete - complete layaway
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    const layawayResult = await pool.query('SELECT * FROM layaways WHERE id = $1', [id]);
    if (layawayResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layaway not found' });
    }

    const layaway = layawayResult.rows[0];

    // Mark layaway as completed
    await pool.query(
      "UPDATE layaways SET status = 'completed', remaining_balance = 0, updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Update inventory status to sold
    if (layaway.inventory_id) {
      await pool.query("UPDATE inventory SET status = 'sold', updated_at = NOW() WHERE id = $1", [layaway.inventory_id]);
    }

    res.json({ message: 'Layaway completed successfully' });
  } catch (err) {
    console.error('Complete layaway error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/cancel - cancel layaway
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const layawayResult = await pool.query('SELECT * FROM layaways WHERE id = $1', [id]);
    if (layawayResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layaway not found' });
    }

    const layaway = layawayResult.rows[0];

    // Mark layaway as cancelled
    await pool.query(
      "UPDATE layaways SET status = 'cancelled', notes = COALESCE($1, notes), updated_at = NOW() WHERE id = $2",
      [notes, id]
    );

    // Restore inventory status to available
    if (layaway.inventory_id) {
      await pool.query("UPDATE inventory SET status = 'available', updated_at = NOW() WHERE id = $1", [layaway.inventory_id]);
    }

    res.json({ message: 'Layaway cancelled successfully' });
  } catch (err) {
    console.error('Cancel layaway error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
