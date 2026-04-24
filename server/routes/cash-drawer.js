const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET / - list all drawers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cd.*,
              u.name as opened_by_name
       FROM cash_drawers cd
       LEFT JOIN users u ON cd.opened_by = u.id
       ORDER BY cd.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List cash drawers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get drawer with transactions
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const drawerResult = await pool.query(
      `SELECT cd.*, u.name as opened_by_name
       FROM cash_drawers cd
       LEFT JOIN users u ON cd.opened_by = u.id
       WHERE cd.id = $1`,
      [id]
    );

    if (drawerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cash drawer not found' });
    }

    const transactionsResult = await pool.query(
      `SELECT cdt.*, u.name as performed_by_name
       FROM cash_drawer_transactions cdt
       LEFT JOIN users u ON cdt.performed_by = u.id
       WHERE cdt.drawer_id = $1
       ORDER BY cdt.created_at DESC`,
      [id]
    );

    res.json({
      ...drawerResult.rows[0],
      transactions: transactionsResult.rows
    });
  } catch (err) {
    console.error('Get cash drawer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create drawer
router.post('/', async (req, res) => {
  try {
    const { drawer_name, location } = req.body;

    if (!drawer_name) {
      return res.status(400).json({ error: 'Drawer name is required' });
    }

    const result = await pool.query(
      `INSERT INTO cash_drawers (drawer_name, location)
       VALUES ($1, $2)
       RETURNING *`,
      [drawer_name, location]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create cash drawer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/open - open drawer (set opening balance, status to open)
router.post('/:id/open', async (req, res) => {
  try {
    const { id } = req.params;
    const { opening_balance, opened_by } = req.body;

    if (opening_balance === undefined) {
      return res.status(400).json({ error: 'Opening balance is required' });
    }

    const result = await pool.query(
      `UPDATE cash_drawers SET
        opening_balance = $1,
        current_balance = $1,
        status = 'open',
        opened_by = $2,
        opened_at = NOW(),
        closed_at = NULL
       WHERE id = $3
       RETURNING *`,
      [opening_balance, opened_by, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash drawer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Open cash drawer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/close - close drawer (set status to closed, record closing time)
router.post('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE cash_drawers SET
        status = 'closed',
        closed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash drawer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Close cash drawer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/transaction - add transaction (cash_in, cash_out, adjust) update current_balance
router.post('/:id/transaction', async (req, res) => {
  try {
    const { id } = req.params;
    const { transaction_type, amount, reference_type, reference_id, description, performed_by } = req.body;

    if (!transaction_type || amount === undefined) {
      return res.status(400).json({ error: 'Transaction type and amount are required' });
    }

    const validTypes = ['cash_in', 'cash_out', 'adjust'];
    if (!validTypes.includes(transaction_type)) {
      return res.status(400).json({ error: 'Transaction type must be cash_in, cash_out, or adjust' });
    }

    // Verify drawer exists and is open
    const drawerResult = await pool.query('SELECT * FROM cash_drawers WHERE id = $1', [id]);
    if (drawerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cash drawer not found' });
    }
    if (drawerResult.rows[0].status !== 'open') {
      return res.status(400).json({ error: 'Cash drawer is not open' });
    }

    // Calculate balance change
    let balanceChange;
    if (transaction_type === 'cash_in') {
      balanceChange = Math.abs(amount);
    } else if (transaction_type === 'cash_out') {
      balanceChange = -Math.abs(amount);
    } else {
      // adjust: amount can be positive or negative
      balanceChange = amount;
    }

    // Insert transaction and update balance in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const txnResult = await client.query(
        `INSERT INTO cash_drawer_transactions (drawer_id, transaction_type, amount, reference_type, reference_id, description, performed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [id, transaction_type, Math.abs(amount), reference_type, reference_id, description, performed_by]
      );

      const drawerUpdate = await client.query(
        `UPDATE cash_drawers SET current_balance = current_balance + $1
         WHERE id = $2
         RETURNING *`,
        [balanceChange, id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        transaction: txnResult.rows[0],
        drawer: drawerUpdate.rows[0]
      });
    } catch (txnErr) {
      await client.query('ROLLBACK');
      throw txnErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Cash drawer transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete drawer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete associated transactions first
    await pool.query('DELETE FROM cash_drawer_transactions WHERE drawer_id = $1', [id]);

    const result = await pool.query('DELETE FROM cash_drawers WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cash drawer not found' });
    }

    res.json({ message: 'Cash drawer deleted successfully' });
  } catch (err) {
    console.error('Delete cash drawer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
