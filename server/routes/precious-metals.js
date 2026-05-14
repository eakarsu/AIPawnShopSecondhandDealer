const express = require('express');
const router = express.Router();
const pool = require('../db');

// ── In-memory spot price cache (1 hour) ─────────────────────────
let spotPriceCache = null;
let spotPriceCachedAt = 0;
const SPOT_CACHE_MS = 60 * 60 * 1000; // 1 hour

// GET /spot-price - live precious metals spot prices (cached 1 hour)
router.get('/spot-price', async (req, res) => {
  try {
    const now = Date.now();
    if (spotPriceCache && (now - spotPriceCachedAt) < SPOT_CACHE_MS) {
      return res.json({ ...spotPriceCache, cached: true, cached_at: new Date(spotPriceCachedAt).toISOString() });
    }

    const apiKey = process.env.METALS_API_KEY || process.env.EXCHANGE_RATES_API_KEY;

    if (apiKey) {
      try {
        // Try metals-api.com or open exchange rates
        const fetch = require('node-fetch');
        const response = await fetch(
          `https://www.goldapi.io/api/XAU/USD`,
          { headers: { 'x-access-token': apiKey, 'Content-Type': 'application/json' } }
        );
        if (response.ok) {
          const data = await response.json();
          spotPriceCache = {
            gold_usd_per_troy_oz: data.price,
            silver_usd_per_troy_oz: null,
            source: 'goldapi.io',
            note: 'Live price from goldapi.io'
          };
          spotPriceCachedAt = now;
          return res.json({ ...spotPriceCache, cached: false });
        }
      } catch (e) {
        // Fall through to mock
      }
    }

    // Mock prices when API key not configured
    spotPriceCache = {
      gold_usd_per_troy_oz: 2340.00,
      silver_usd_per_troy_oz: 28.50,
      platinum_usd_per_troy_oz: 980.00,
      palladium_usd_per_troy_oz: 960.00,
      gold_usd_per_gram: parseFloat((2340.00 / 31.1035).toFixed(4)),
      silver_usd_per_gram: parseFloat((28.50 / 31.1035).toFixed(4)),
      source: 'mock',
      note: 'Set METALS_API_KEY or EXCHANGE_RATES_API_KEY for live prices. These are approximate reference values.'
    };
    spotPriceCachedAt = now;
    res.json({ ...spotPriceCache, cached: false });
  } catch (err) {
    console.error('Spot price error:', err);
    res.status(500).json({ error: 'Failed to fetch spot prices' });
  }
});

// GET /stats/summary - summary stats (must be before /:id)
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalResult, byMetalResult, byMethodResult, valueResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total_tests FROM precious_metals_log'),
      pool.query('SELECT metal_type, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as total_value, COALESCE(AVG(weight_grams), 0) as avg_weight FROM precious_metals_log GROUP BY metal_type ORDER BY count DESC'),
      pool.query('SELECT test_method, COUNT(*) as count FROM precious_metals_log GROUP BY test_method ORDER BY count DESC'),
      pool.query('SELECT COALESCE(SUM(estimated_value), 0) as total_estimated_value, COALESCE(SUM(weight_grams), 0) as total_weight FROM precious_metals_log')
    ]);

    res.json({
      total_tests: parseInt(totalResult.rows[0].total_tests),
      total_estimated_value: parseFloat(valueResult.rows[0].total_estimated_value),
      total_weight_grams: parseFloat(valueResult.rows[0].total_weight),
      by_metal_type: byMetalResult.rows,
      by_test_method: byMethodResult.rows
    });
  } catch (err) {
    console.error('Precious metals stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list all precious metals tests
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pm.*,
        i.name as item_name,
        c.first_name || ' ' || c.last_name as customer_name
       FROM precious_metals_log pm
       LEFT JOIN inventory i ON pm.inventory_id = i.id
       LEFT JOIN customers c ON pm.customer_id = c.id
       ORDER BY pm.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List precious metals error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get test details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pm.*,
        i.name as item_name, i.category as item_category,
        c.first_name || ' ' || c.last_name as customer_name
       FROM precious_metals_log pm
       LEFT JOIN inventory i ON pm.inventory_id = i.id
       LEFT JOIN customers c ON pm.customer_id = c.id
       WHERE pm.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get precious metal test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create test entry
router.post('/', async (req, res) => {
  try {
    const {
      inventory_id, customer_id, metal_type, purity, weight_grams,
      test_method, test_result, tested_by, test_date,
      market_price_per_gram, estimated_value, notes
    } = req.body;

    if (!metal_type) {
      return res.status(400).json({ error: 'metal_type is required' });
    }

    const result = await pool.query(
      `INSERT INTO precious_metals_log (inventory_id, customer_id, metal_type, purity, weight_grams, test_method, test_result, tested_by, test_date, market_price_per_gram, estimated_value, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [inventory_id, customer_id, metal_type, purity, weight_grams, test_method, test_result, tested_by, test_date || new Date().toISOString().slice(0, 10), market_price_per_gram, estimated_value, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create precious metal test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update test
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      inventory_id, customer_id, metal_type, purity, weight_grams,
      test_method, test_result, tested_by, test_date,
      market_price_per_gram, estimated_value, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE precious_metals_log SET
        inventory_id = COALESCE($1, inventory_id),
        customer_id = COALESCE($2, customer_id),
        metal_type = COALESCE($3, metal_type),
        purity = COALESCE($4, purity),
        weight_grams = COALESCE($5, weight_grams),
        test_method = COALESCE($6, test_method),
        test_result = COALESCE($7, test_result),
        tested_by = COALESCE($8, tested_by),
        test_date = COALESCE($9, test_date),
        market_price_per_gram = COALESCE($10, market_price_per_gram),
        estimated_value = COALESCE($11, estimated_value),
        notes = COALESCE($12, notes)
       WHERE id = $13
       RETURNING *`,
      [inventory_id, customer_id, metal_type, purity, weight_grams, test_method, test_result, tested_by, test_date, market_price_per_gram, estimated_value, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update precious metal test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete test
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM precious_metals_log WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test record not found' });
    }

    res.json({ message: 'Test record deleted successfully' });
  } catch (err) {
    console.error('Delete precious metal test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
