const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /generate-expiring - auto-generate notifications for loans expiring within 7 days (must be before /:id)
router.post('/generate-expiring', async (req, res) => {
  try {
    // Find active loans expiring within 7 days that don't already have a pending notification
    const expiringLoans = await pool.query(
      `SELECT l.*, c.first_name, c.last_name, c.phone, c.email
       FROM loans l
       JOIN customers c ON l.customer_id = c.id
       WHERE l.status = 'active'
         AND l.maturity_date <= CURRENT_DATE + INTERVAL '7 days'
         AND l.maturity_date >= CURRENT_DATE
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.loan_id = l.id
             AND n.notification_type = 'loan_expiring'
             AND n.status = 'pending'
         )`
    );

    const notifications = [];
    for (const loan of expiringLoans.rows) {
      const daysUntil = Math.ceil((new Date(loan.maturity_date) - new Date()) / (1000 * 60 * 60 * 24));
      const message = `Dear ${loan.first_name} ${loan.last_name}, your pawn loan (Ticket #${loan.ticket_number}) for $${loan.principal_amount} is due in ${daysUntil} day(s) on ${loan.maturity_date}. Please contact us to redeem or extend your loan.`;

      const result = await pool.query(
        `INSERT INTO notifications (customer_id, loan_id, notification_type, message, sent_via, status)
         VALUES ($1, $2, 'loan_expiring', $3, 'sms', 'pending')
         RETURNING *`,
        [loan.customer_id, loan.id, message]
      );
      notifications.push(result.rows[0]);
    }

    res.status(201).json({
      generated: notifications.length,
      notifications
    });
  } catch (err) {
    console.error('Generate expiring notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list all notifications with customer joins
router.get('/', async (req, res) => {
  try {
    const { status, notification_type } = req.query;
    let query = `SELECT n.*,
                        c.first_name || ' ' || c.last_name as customer_name,
                        c.phone as customer_phone, c.email as customer_email,
                        l.ticket_number
                 FROM notifications n
                 LEFT JOIN customers c ON n.customer_id = c.id
                 LEFT JOIN loans l ON n.loan_id = l.id
                 WHERE 1=1`;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND n.status = $${params.length}`;
    }

    if (notification_type) {
      params.push(notification_type);
      query += ` AND n.notification_type = $${params.length}`;
    }

    query += ' ORDER BY n.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get notification details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT n.*,
              c.first_name || ' ' || c.last_name as customer_name,
              c.phone as customer_phone, c.email as customer_email,
              l.ticket_number, l.principal_amount, l.maturity_date
       FROM notifications n
       LEFT JOIN customers c ON n.customer_id = c.id
       LEFT JOIN loans l ON n.loan_id = l.id
       WHERE n.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create notification
router.post('/', async (req, res) => {
  try {
    const { customer_id, loan_id, notification_type, message, sent_via } = req.body;

    if (!customer_id || !notification_type || !message) {
      return res.status(400).json({ error: 'Customer ID, notification type, and message are required' });
    }

    const result = await pool.query(
      `INSERT INTO notifications (customer_id, loan_id, notification_type, message, sent_via)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [customer_id, loan_id, notification_type, message, sent_via]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update notification
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { notification_type, message, sent_via, status } = req.body;

    const result = await pool.query(
      `UPDATE notifications SET
        notification_type = COALESCE($1, notification_type),
        message = COALESCE($2, message),
        sent_via = COALESCE($3, sent_via),
        status = COALESCE($4, status)
       WHERE id = $5
       RETURNING *`,
      [notification_type, message, sent_via, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM notifications WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/send - mark as sent (set sent_at, status to sent)
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE notifications SET
        sent_at = NOW(),
        status = 'sent'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Send notification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
