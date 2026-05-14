const express = require('express');
const router = express.Router();
const pool = require('../db');

// Try to load pdfkit
let PDFDocument;
try { PDFDocument = require('pdfkit'); } catch (e) { PDFDocument = null; }

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

// GET /:id/pdf - generate PDF receipt
router.get('/:id/pdf', async (req, res) => {
  try {
    if (!PDFDocument) {
      return res.status(501).json({ error: 'PDF generation not available. Install pdfkit: npm install pdfkit' });
    }

    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*, c.first_name || ' ' || c.last_name as customer_name,
              c.email as customer_email, c.phone as customer_phone
       FROM receipts r LEFT JOIN customers c ON r.customer_id = c.id WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = result.rows[0];

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt.receipt_number || id}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('Gold Shield Pawn Shop', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Receipt', { align: 'center' });
    doc.moveDown();

    // Receipt details
    doc.fontSize(14).font('Helvetica-Bold').text(`Receipt #${receipt.receipt_number || id}`);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Date: ${new Date(receipt.created_at).toLocaleDateString()}`);
    doc.text(`Type: ${receipt.receipt_type || '-'}`);
    if (receipt.customer_name) doc.text(`Customer: ${receipt.customer_name}`);
    if (receipt.customer_phone) doc.text(`Phone: ${receipt.customer_phone}`);
    if (receipt.customer_email) doc.text(`Email: ${receipt.customer_email}`);
    doc.moveDown();

    // Items
    if (receipt.items) {
      doc.fontSize(12).font('Helvetica-Bold').text('Items:');
      doc.fontSize(11).font('Helvetica');
      try {
        const items = typeof receipt.items === 'string' ? JSON.parse(receipt.items) : receipt.items;
        if (Array.isArray(items)) {
          items.forEach(item => {
            doc.text(`- ${item.name || item.description || JSON.stringify(item)} ${item.price ? `($${item.price})` : ''}`);
          });
        } else {
          doc.text(JSON.stringify(items));
        }
      } catch (e) {
        doc.text(String(receipt.items));
      }
      doc.moveDown();
    }

    // Financials
    doc.fontSize(12).font('Helvetica-Bold').text('Financial Summary:');
    doc.fontSize(11).font('Helvetica');
    if (receipt.subtotal) doc.text(`Subtotal: $${parseFloat(receipt.subtotal).toFixed(2)}`);
    if (receipt.tax) doc.text(`Tax: $${parseFloat(receipt.tax).toFixed(2)}`);
    if (receipt.total) doc.text(`Total: $${parseFloat(receipt.total).toFixed(2)}`);
    if (receipt.payment_method) doc.text(`Payment Method: ${receipt.payment_method}`);
    if (receipt.notes) {
      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold').text('Notes:');
      doc.fontSize(11).font('Helvetica').text(receipt.notes);
    }

    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica').fillColor('#666666').text('Thank you for your business!', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF receipt error:', err);
    res.status(500).json({ error: 'Failed to generate PDF receipt' });
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
