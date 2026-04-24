const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /profit-margins - profit margin report (cost vs retail for sold items)
router.get('/profit-margins', async (req, res) => {
  try {
    const { category, start_date, end_date } = req.query;
    let query = `
      SELECT
        i.id, i.name, i.category, i.brand, i.model,
        i.cost_price, i.retail_price,
        CASE WHEN i.cost_price > 0
          THEN ROUND(((i.retail_price - i.cost_price) / i.cost_price * 100), 2)
          ELSE NULL
        END as margin_percent,
        (i.retail_price - i.cost_price) as profit,
        i.acquired_date, i.updated_at as sold_date
      FROM inventory i
      WHERE i.status = 'sold'
        AND i.cost_price IS NOT NULL
        AND i.retail_price IS NOT NULL`;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND i.category = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      query += ` AND i.updated_at >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND i.updated_at <= $${params.length}`;
    }

    query += ' ORDER BY i.updated_at DESC';

    const itemsResult = await pool.query(query, params);

    // Summary stats
    const summaryResult = await pool.query(
      `SELECT
        COUNT(*) as total_sold,
        COALESCE(SUM(retail_price), 0) as total_revenue,
        COALESCE(SUM(cost_price), 0) as total_cost,
        COALESCE(SUM(retail_price - cost_price), 0) as total_profit,
        CASE WHEN SUM(cost_price) > 0
          THEN ROUND((SUM(retail_price - cost_price) / SUM(cost_price) * 100), 2)
          ELSE 0
        END as overall_margin_percent
       FROM inventory
       WHERE status = 'sold' AND cost_price IS NOT NULL AND retail_price IS NOT NULL`
    );

    res.json({
      summary: summaryResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error('Profit margins report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /aging - aging report (loans by days until maturity)
router.get('/aging', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        l.id, l.ticket_number, l.principal_amount, l.total_due,
        l.loan_date, l.maturity_date, l.status,
        l.item_description,
        c.first_name || ' ' || c.last_name as customer_name,
        (l.maturity_date - CURRENT_DATE) as days_until_maturity,
        CASE
          WHEN l.maturity_date < CURRENT_DATE THEN 'past_due'
          WHEN (l.maturity_date - CURRENT_DATE) <= 7 THEN '7_days'
          WHEN (l.maturity_date - CURRENT_DATE) <= 14 THEN '14_days'
          WHEN (l.maturity_date - CURRENT_DATE) <= 30 THEN '30_days'
          ELSE 'current'
        END as aging_bucket
       FROM loans l
       JOIN customers c ON l.customer_id = c.id
       WHERE l.status = 'active'
       ORDER BY l.maturity_date ASC`
    );

    // Summarize by bucket
    const buckets = { current: [], '7_days': [], '14_days': [], '30_days': [], past_due: [] };
    for (const row of result.rows) {
      buckets[row.aging_bucket].push(row);
    }

    const summary = {};
    for (const [bucket, items] of Object.entries(buckets)) {
      summary[bucket] = {
        count: items.length,
        total_principal: items.reduce((sum, i) => sum + parseFloat(i.principal_amount || 0), 0),
        total_due: items.reduce((sum, i) => sum + parseFloat(i.total_due || 0), 0)
      };
    }

    res.json({
      summary,
      loans: result.rows
    });
  } catch (err) {
    console.error('Aging report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /regulatory-compliance - compliance dashboard data
router.get('/regulatory-compliance', async (req, res) => {
  try {
    const [holdPeriodsResult, policeReportsResult, firearmLogResult, recentAcquisitionsResult] = await Promise.all([
      // Hold periods status
      pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active' AND end_date >= CURRENT_DATE) as active_compliant,
          COUNT(*) FILTER (WHERE status = 'active' AND end_date < CURRENT_DATE) as expired,
          COUNT(*) FILTER (WHERE status = 'released') as released
         FROM hold_periods`
      ),
      // Police reports status
      pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'overdue' OR (status = 'pending' AND report_date < CURRENT_DATE - INTERVAL '30 days')) as overdue
         FROM police_reports`
      ),
      // Firearm log completeness
      pool.query(
        `SELECT
          COUNT(*) as total_entries,
          COUNT(*) FILTER (WHERE nics_check_number IS NOT NULL) as with_nics,
          COUNT(*) FILTER (WHERE nics_check_number IS NULL AND transaction_type IN ('sale', 'disposition')) as missing_nics,
          COUNT(*) FILTER (WHERE serial_number IS NOT NULL AND serial_number != '') as with_serial
         FROM firearm_log`
      ),
      // Items acquired without hold period
      pool.query(
        `SELECT COUNT(*) as count
         FROM inventory i
         WHERE i.acquired_date >= CURRENT_DATE - INTERVAL '30 days'
           AND NOT EXISTS (
             SELECT 1 FROM hold_periods hp WHERE hp.inventory_id = i.id
           )`
      )
    ]);

    res.json({
      hold_periods: holdPeriodsResult.rows[0],
      police_reports: policeReportsResult.rows[0],
      firearm_log: firearmLogResult.rows[0],
      items_without_hold: parseInt(recentAcquisitionsResult.rows[0].count)
    });
  } catch (err) {
    console.error('Regulatory compliance report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /daily-summary - daily transaction summary
router.get('/daily-summary', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const [loansResult, paymentsResult, inventoryResult, receiptsResult, layawayResult] = await Promise.all([
      // Loans created today
      pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(principal_amount), 0) as total_amount
         FROM loans WHERE loan_date = $1`,
        [targetDate]
      ),
      // Payments received today
      pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
         FROM loan_payments WHERE payment_date = $1`,
        [targetDate]
      ),
      // Inventory acquired today
      pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(cost_price), 0) as total_cost
         FROM inventory WHERE acquired_date = $1`,
        [targetDate]
      ),
      // Receipts today
      pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total_amount
         FROM receipts WHERE created_at::date = $1`,
        [targetDate]
      ),
      // Layaway payments today
      pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
         FROM layaway_payments WHERE payment_date = $1`,
        [targetDate]
      )
    ]);

    res.json({
      date: targetDate,
      loans: loansResult.rows[0],
      loan_payments: paymentsResult.rows[0],
      inventory_acquired: inventoryResult.rows[0],
      receipts: receiptsResult.rows[0],
      layaway_payments: layawayResult.rows[0]
    });
  } catch (err) {
    console.error('Daily summary report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /inventory-value - total inventory value by category and status
router.get('/inventory-value', async (req, res) => {
  try {
    const [byCategoryResult, byStatusResult, totalResult] = await Promise.all([
      pool.query(
        `SELECT category,
                COUNT(*) as item_count,
                COALESCE(SUM(cost_price), 0) as total_cost,
                COALESCE(SUM(retail_price), 0) as total_retail
         FROM inventory
         GROUP BY category
         ORDER BY total_retail DESC`
      ),
      pool.query(
        `SELECT status,
                COUNT(*) as item_count,
                COALESCE(SUM(cost_price), 0) as total_cost,
                COALESCE(SUM(retail_price), 0) as total_retail
         FROM inventory
         GROUP BY status
         ORDER BY item_count DESC`
      ),
      pool.query(
        `SELECT
          COUNT(*) as total_items,
          COALESCE(SUM(cost_price), 0) as total_cost_value,
          COALESCE(SUM(retail_price), 0) as total_retail_value,
          COALESCE(SUM(retail_price) - SUM(cost_price), 0) as potential_profit
         FROM inventory
         WHERE status IN ('available', 'on_hold', 'pawned')`
      )
    ]);

    res.json({
      totals: totalResult.rows[0],
      by_category: byCategoryResult.rows,
      by_status: byStatusResult.rows
    });
  } catch (err) {
    console.error('Inventory value report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
