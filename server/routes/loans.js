const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper to generate ticket number: PL-YYYYMMDD-XXX
async function generateTicketNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PL-${dateStr}-`;

  const result = await pool.query(
    "SELECT ticket_number FROM loans WHERE ticket_number LIKE $1 ORDER BY ticket_number DESC LIMIT 1",
    [`${prefix}%`]
  );

  let seq = 1;
  if (result.rows.length > 0) {
    const lastNum = parseInt(result.rows[0].ticket_number.split('-')[2], 10);
    seq = lastNum + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
}

// GET / - list all loans with filters
router.get('/', async (req, res) => {
  try {
    const { status, customer_id, search } = req.query;
    let query = `
      SELECT l.*,
        c.first_name || ' ' || c.last_name as customer_name,
        i.name as item_name, i.category as item_category
      FROM loans l
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN inventory i ON l.inventory_id = i.id
      WHERE 1=1`;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND l.status = $${params.length}`;
    }

    if (customer_id) {
      params.push(customer_id);
      query += ` AND l.customer_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (l.ticket_number ILIKE $${params.length} OR l.item_description ILIKE $${params.length} OR c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length})`;
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List loans error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get loan details with payments, extensions, customer, inventory
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const loanResult = await pool.query(
      `SELECT l.*,
        c.first_name || ' ' || c.last_name as customer_name, c.email as customer_email, c.phone as customer_phone,
        i.name as item_name, i.category as item_category, i.serial_number as item_serial
       FROM loans l
       LEFT JOIN customers c ON l.customer_id = c.id
       LEFT JOIN inventory i ON l.inventory_id = i.id
       WHERE l.id = $1`,
      [id]
    );

    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const [paymentsResult, extensionsResult] = await Promise.all([
      pool.query('SELECT * FROM loan_payments WHERE loan_id = $1 ORDER BY payment_date DESC', [id]),
      pool.query('SELECT * FROM loan_extensions WHERE loan_id = $1 ORDER BY extension_date DESC', [id])
    ]);

    res.json({
      ...loanResult.rows[0],
      payments: paymentsResult.rows,
      extensions: extensionsResult.rows
    });
  } catch (err) {
    console.error('Get loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create loan
router.post('/', async (req, res) => {
  try {
    const {
      customer_id, inventory_id, item_description, principal_amount,
      interest_rate, loan_date, maturity_date, notes
    } = req.body;

    if (!customer_id || !item_description || !principal_amount || !interest_rate) {
      return res.status(400).json({ error: 'customer_id, item_description, principal_amount, and interest_rate are required' });
    }

    const ticket_number = await generateTicketNumber();

    // Calculate maturity_date if not provided (default 30 days)
    const loanDate = loan_date || new Date().toISOString().slice(0, 10);
    const calcMaturityDate = maturity_date || new Date(new Date(loanDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Calculate total_due: principal + interest
    const total_due = parseFloat(principal_amount) + (parseFloat(principal_amount) * parseFloat(interest_rate) / 100);

    const result = await pool.query(
      `INSERT INTO loans (ticket_number, customer_id, inventory_id, item_description, principal_amount, interest_rate, loan_date, maturity_date, total_due, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [ticket_number, customer_id, inventory_id, item_description, principal_amount, interest_rate, loanDate, calcMaturityDate, total_due, notes]
    );

    // Update inventory status to pawned if inventory_id provided
    if (inventory_id) {
      await pool.query("UPDATE inventory SET status = 'pawned', updated_at = NOW() WHERE id = $1", [inventory_id]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update loan
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_id, inventory_id, item_description, principal_amount,
      interest_rate, loan_date, maturity_date, status, total_due, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE loans SET
        customer_id = COALESCE($1, customer_id),
        inventory_id = COALESCE($2, inventory_id),
        item_description = COALESCE($3, item_description),
        principal_amount = COALESCE($4, principal_amount),
        interest_rate = COALESCE($5, interest_rate),
        loan_date = COALESCE($6, loan_date),
        maturity_date = COALESCE($7, maturity_date),
        status = COALESCE($8, status),
        total_due = COALESCE($9, total_due),
        notes = COALESCE($10, notes),
        updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [customer_id, inventory_id, item_description, principal_amount, interest_rate, loan_date, maturity_date, status, total_due, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete loan
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM loans WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    res.json({ message: 'Loan deleted successfully' });
  } catch (err) {
    console.error('Delete loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/extend - extend loan
router.post('/:id/extend', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_maturity_date, extension_fee, notes } = req.body;

    if (!new_maturity_date) {
      return res.status(400).json({ error: 'new_maturity_date is required' });
    }

    const loanResult = await pool.query('SELECT * FROM loans WHERE id = $1', [id]);
    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    // Create extension record
    const extensionResult = await pool.query(
      `INSERT INTO loan_extensions (loan_id, old_maturity_date, new_maturity_date, extension_fee, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, loan.maturity_date, new_maturity_date, extension_fee || 0, notes]
    );

    // Update loan maturity_date and total_due
    const newTotalDue = parseFloat(loan.total_due) + (parseFloat(extension_fee) || 0);
    await pool.query(
      'UPDATE loans SET maturity_date = $1, total_due = $2, updated_at = NOW() WHERE id = $3',
      [new_maturity_date, newTotalDue, id]
    );

    res.status(201).json(extensionResult.rows[0]);
  } catch (err) {
    console.error('Extend loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/redeem - redeem loan
router.post('/:id/redeem', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_type, notes } = req.body;

    const loanResult = await pool.query('SELECT * FROM loans WHERE id = $1', [id]);
    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    // Create payment record
    await pool.query(
      `INSERT INTO loan_payments (loan_id, amount, payment_type, notes)
       VALUES ($1, $2, $3, $4)`,
      [id, amount || loan.total_due, payment_type || 'redemption', notes]
    );

    // Mark loan as redeemed
    await pool.query(
      "UPDATE loans SET status = 'redeemed', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Update inventory status back to available if exists
    if (loan.inventory_id) {
      await pool.query(
        "UPDATE inventory SET status = 'available', updated_at = NOW() WHERE id = $1",
        [loan.inventory_id]
      );
    }

    res.json({ message: 'Loan redeemed successfully' });
  } catch (err) {
    console.error('Redeem loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/forfeit - forfeit/default loan
router.post('/:id/forfeit', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const loanResult = await pool.query('SELECT * FROM loans WHERE id = $1', [id]);
    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    // Mark loan as defaulted
    await pool.query(
      "UPDATE loans SET status = 'defaulted', notes = COALESCE($1, notes), updated_at = NOW() WHERE id = $2",
      [notes, id]
    );

    // Update inventory status to forfeited/available for sale
    if (loan.inventory_id) {
      await pool.query(
        "UPDATE inventory SET status = 'forfeited', updated_at = NOW() WHERE id = $1",
        [loan.inventory_id]
      );
    }

    res.json({ message: 'Loan forfeited successfully' });
  } catch (err) {
    console.error('Forfeit loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
