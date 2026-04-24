const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET / - list all auctions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              COUNT(ai.id) as item_count,
              COALESCE(SUM(ai.winning_bid), 0) as total_winning_bids
       FROM auctions a
       LEFT JOIN auction_items ai ON a.id = ai.auction_id
       GROUP BY a.id
       ORDER BY a.auction_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List auctions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get auction with its items (join with inventory)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const auctionResult = await pool.query(
      'SELECT * FROM auctions WHERE id = $1',
      [id]
    );

    if (auctionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const itemsResult = await pool.query(
      `SELECT ai.*,
              i.name as item_name, i.category as item_category,
              i.brand as item_brand, i.model as item_model,
              i.condition as item_condition, i.retail_price as item_retail_price
       FROM auction_items ai
       LEFT JOIN inventory i ON ai.inventory_id = i.id
       WHERE ai.auction_id = $1
       ORDER BY ai.created_at ASC`,
      [id]
    );

    res.json({
      ...auctionResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error('Get auction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create auction
router.post('/', async (req, res) => {
  try {
    const { auction_name, auction_date, auction_type, notes } = req.body;

    if (!auction_name || !auction_date) {
      return res.status(400).json({ error: 'Auction name and date are required' });
    }

    const result = await pool.query(
      `INSERT INTO auctions (auction_name, auction_date, auction_type, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [auction_name, auction_date, auction_type || 'liquidation', notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create auction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update auction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { auction_name, auction_date, auction_type, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE auctions SET
        auction_name = COALESCE($1, auction_name),
        auction_date = COALESCE($2, auction_date),
        auction_type = COALESCE($3, auction_type),
        status = COALESCE($4, status),
        notes = COALESCE($5, notes)
       WHERE id = $6
       RETURNING *`,
      [auction_name, auction_date, auction_type, status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update auction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete auction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete associated items first
    await pool.query('DELETE FROM auction_items WHERE auction_id = $1', [id]);

    const result = await pool.query('DELETE FROM auctions WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    res.json({ message: 'Auction deleted successfully' });
  } catch (err) {
    console.error('Delete auction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/items - add item to auction
router.post('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { inventory_id, loan_id, starting_bid, notes } = req.body;

    if (!inventory_id) {
      return res.status(400).json({ error: 'Inventory item ID is required' });
    }

    // Verify auction exists
    const auctionResult = await pool.query('SELECT id FROM auctions WHERE id = $1', [id]);
    if (auctionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const result = await pool.query(
      `INSERT INTO auction_items (auction_id, inventory_id, loan_id, starting_bid, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, inventory_id, loan_id, starting_bid, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add auction item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /items/:itemId - update auction item (record winning bid)
router.put('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { starting_bid, winning_bid, winner_name, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE auction_items SET
        starting_bid = COALESCE($1, starting_bid),
        winning_bid = COALESCE($2, winning_bid),
        winner_name = COALESCE($3, winner_name),
        status = COALESCE($4, status),
        notes = COALESCE($5, notes)
       WHERE id = $6
       RETURNING *`,
      [starting_bid, winning_bid, winner_name, status, notes, itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Auction item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update auction item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/complete - complete auction
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update auction status
      const auctionResult = await client.query(
        `UPDATE auctions SET status = 'completed'
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (auctionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Auction not found' });
      }

      // Mark unsold items
      await client.query(
        `UPDATE auction_items SET status = 'unsold'
         WHERE auction_id = $1 AND winning_bid IS NULL AND status = 'pending'`,
        [id]
      );

      // Mark items with winning bids as sold
      await client.query(
        `UPDATE auction_items SET status = 'sold'
         WHERE auction_id = $1 AND winning_bid IS NOT NULL AND status = 'pending'`,
        [id]
      );

      // Update inventory status for sold items
      await client.query(
        `UPDATE inventory SET status = 'sold', updated_at = NOW()
         WHERE id IN (
           SELECT inventory_id FROM auction_items
           WHERE auction_id = $1 AND status = 'sold'
         )`,
        [id]
      );

      await client.query('COMMIT');

      // Fetch the completed auction with items
      const itemsResult = await pool.query(
        `SELECT ai.*, i.name as item_name
         FROM auction_items ai
         LEFT JOIN inventory i ON ai.inventory_id = i.id
         WHERE ai.auction_id = $1`,
        [id]
      );

      res.json({
        ...auctionResult.rows[0],
        items: itemsResult.rows
      });
    } catch (txnErr) {
      await client.query('ROLLBACK');
      throw txnErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Complete auction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
