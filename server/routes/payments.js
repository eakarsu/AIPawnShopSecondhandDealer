const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /stats/summary - payment statistics (must be before /:id style routes)
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalResult, byTypeResult, recentResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total_payments, COALESCE(SUM(amount), 0) as total_amount FROM loan_payments'),
      pool.query('SELECT payment_type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount FROM loan_payments GROUP BY payment_type ORDER BY total_amount DESC'),
      pool.query('SELECT COALESCE(SUM(amount), 0) as amount FROM loan_payments WHERE payment_date >= CURRENT_DATE - INTERVAL \'30 days\'')
    ]);

    res.json({
      total_payments: parseInt(totalResult.rows[0].total_payments),
      total_amount: parseFloat(totalResult.rows[0].total_amount),
      last_30_days_amount: parseFloat(recentResult.rows[0].amount),
      by_type: byTypeResult.rows
    });
  } catch (err) {
    console.error('Payment stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list all loan payments with joins
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lp.*,
        l.ticket_number, l.item_description,
        c.first_name || ' ' || c.last_name as customer_name
       FROM loan_payments lp
       JOIN loans l ON lp.loan_id = l.id
       LEFT JOIN customers c ON l.customer_id = c.id
       ORDER BY lp.payment_date DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List payments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /customer/:customerId - get payment history for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const result = await pool.query(
      `SELECT lp.*, l.ticket_number, l.item_description
       FROM loan_payments lp
       JOIN loans l ON lp.loan_id = l.id
       WHERE l.customer_id = $1
       ORDER BY lp.payment_date DESC`,
      [customerId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get customer payments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create payment
router.post('/', async (req, res) => {
  try {
    const { loan_id, amount, payment_type, payment_date, notes } = req.body;

    if (!loan_id || !amount || !payment_type) {
      return res.status(400).json({ error: 'loan_id, amount, and payment_type are required' });
    }

    // Verify loan exists
    const loanResult = await pool.query('SELECT id FROM loans WHERE id = $1', [loan_id]);
    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const result = await pool.query(
      `INSERT INTO loan_payments (loan_id, amount, payment_type, payment_date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [loan_id, amount, payment_type, payment_date || new Date().toISOString().slice(0, 10), notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
