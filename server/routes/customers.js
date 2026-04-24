const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET / - list all customers with search/filter
router.get('/', async (req, res) => {
  try {
    const { search, flagged } = req.query;
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }

    if (flagged !== undefined) {
      params.push(flagged === 'true');
      query += ` AND flagged = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get customer by id with loans, layaways, payment history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    const [loansResult, layawaysResult, paymentsResult] = await Promise.all([
      pool.query('SELECT * FROM loans WHERE customer_id = $1 ORDER BY created_at DESC', [id]),
      pool.query('SELECT * FROM layaways WHERE customer_id = $1 ORDER BY created_at DESC', [id]),
      pool.query(
        `SELECT lp.*, l.ticket_number FROM loan_payments lp
         JOIN loans l ON lp.loan_id = l.id
         WHERE l.customer_id = $1
         ORDER BY lp.payment_date DESC`,
        [id]
      )
    ]);

    res.json({
      ...customer,
      loans: loansResult.rows,
      layaways: layawaysResult.rows,
      payments: paymentsResult.rows
    });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create customer
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, address, city, state, zip,
      id_type, id_number, id_expiry, date_of_birth, notes
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const result = await pool.query(
      `INSERT INTO customers (first_name, last_name, email, phone, address, city, state, zip, id_type, id_number, id_expiry, date_of_birth, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [first_name, last_name, email, phone, address, city, state, zip, id_type, id_number, id_expiry, date_of_birth, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name, last_name, email, phone, address, city, state, zip,
      id_type, id_number, id_expiry, date_of_birth, notes, flagged, flag_reason
    } = req.body;

    const result = await pool.query(
      `UPDATE customers SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        address = COALESCE($5, address),
        city = COALESCE($6, city),
        state = COALESCE($7, state),
        zip = COALESCE($8, zip),
        id_type = COALESCE($9, id_type),
        id_number = COALESCE($10, id_number),
        id_expiry = COALESCE($11, id_expiry),
        date_of_birth = COALESCE($12, date_of_birth),
        notes = COALESCE($13, notes),
        flagged = COALESCE($14, flagged),
        flag_reason = COALESCE($15, flag_reason),
        updated_at = NOW()
       WHERE id = $16
       RETURNING *`,
      [first_name, last_name, email, phone, address, city, state, zip, id_type, id_number, id_expiry, date_of_birth, notes, flagged, flag_reason, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
