// Apply pass 5 — backlog extensions for AIPawnShopSecondhandDealer
//
// ENV VARS (consumed by NEEDS-CREDS endpoints; absence triggers 503 + missing: <ENV>):
//   NCIC_API_URL, NCIC_API_KEY                       (NCIC stolen-goods lookup)
//   ATF_API_URL, ATF_API_KEY                         (ATF firearms tracking)
//   IDV_PROVIDER, IDV_API_KEY                        (Jumio / Onfido ID verification)
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (SMS outreach)
//   SMTP_HOST, SMTP_USER, SMTP_PASS                  (Email outreach)
//   EBAY_API_KEY                                     (eBay comparable-sales scrape)
//
// All env-gated endpoints return 503 with `missing: <ENV>` when unset.
// CREATE TABLE IF NOT EXISTS only.

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');

router.use(auth);

async function ensureExtTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ncic_lookups (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      serial_number VARCHAR(120),
      item_description TEXT,
      result JSONB,
      hit BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS atf_firearm_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      firearm_serial VARCHAR(120),
      manufacturer VARCHAR(120),
      model VARCHAR(120),
      transaction_type VARCHAR(40),
      bound_book_entry JSONB,
      status VARCHAR(40) DEFAULT 'recorded',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS idv_verifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      customer_id INTEGER,
      provider VARCHAR(40),
      status VARCHAR(40) DEFAULT 'pending',
      reference_id VARCHAR(120),
      result JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      address TEXT,
      timezone VARCHAR(60) DEFAULT 'America/New_York',
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_transfers (
      id SERIAL PRIMARY KEY,
      from_location_id INTEGER REFERENCES locations(id),
      to_location_id INTEGER REFERENCES locations(id),
      item_id INTEGER,
      item_description TEXT,
      qty INTEGER DEFAULT 1,
      requested_by_user_id INTEGER,
      approved_by_user_id INTEGER,
      status VARCHAR(30) DEFAULT 'requested',
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outreach_messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      channel VARCHAR(20),
      to_address VARCHAR(255),
      subject VARCHAR(255),
      body TEXT,
      status VARCHAR(30) DEFAULT 'queued',
      provider_response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comp_scrape_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      source VARCHAR(40),
      query TEXT,
      results JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}
ensureExtTables();

function missingEnv(...keys) { return keys.filter(k => !process.env[k]); }

// ── 1) NCIC stolen-goods lookup (NEEDS-CREDS) ──────────────────────────────
router.post('/ncic/check', async (req, res) => {
  const missing = missingEnv('NCIC_API_URL', 'NCIC_API_KEY');
  if (missing.length) return res.status(503).json({ error: 'NCIC not configured', missing: missing.join(',') });
  const { serial_number, item_description } = req.body || {};
  if (!serial_number && !item_description) return res.status(400).json({ error: 'serial_number or item_description required' });
  // Stub: real call would POST to NCIC_API_URL with NCIC_API_KEY.
  const result = { hit: false, source: 'NCIC', queried_at: new Date().toISOString(), note: 'stub; live call requires DOJ-issued credentials' };
  const ins = await pool.query(
    `INSERT INTO ncic_lookups (user_id, serial_number, item_description, result, hit) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [req.user.id, serial_number || null, item_description || null, JSON.stringify(result), false]
  );
  res.json({ success: true, id: ins.rows[0].id, ...result });
});

router.get('/ncic/log', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM ncic_lookups WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [req.user.id]);
  res.json({ success: true, lookups: rows });
});

// ── 2) ATF firearms tracking (NEEDS-CREDS) ─────────────────────────────────
router.post('/atf/record', async (req, res) => {
  const missing = missingEnv('ATF_API_URL', 'ATF_API_KEY');
  if (missing.length) return res.status(503).json({ error: 'ATF integration not configured', missing: missing.join(',') });
  const { firearm_serial, manufacturer, model, transaction_type, bound_book_entry } = req.body || {};
  if (!firearm_serial || !transaction_type) return res.status(400).json({ error: 'firearm_serial and transaction_type required' });
  const ins = await pool.query(
    `INSERT INTO atf_firearm_records (user_id, firearm_serial, manufacturer, model, transaction_type, bound_book_entry, status)
     VALUES ($1,$2,$3,$4,$5,$6,'recorded') RETURNING *`,
    [req.user.id, firearm_serial, manufacturer || null, model || null, transaction_type, JSON.stringify(bound_book_entry || {})]
  );
  res.json({ success: true, record: ins.rows[0] });
});

router.get('/atf/records', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM atf_firearm_records WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`, [req.user.id]);
  res.json({ success: true, records: rows });
});

// ── 3) Customer ID verification: Jumio / Onfido (NEEDS-CREDS) ──────────────
router.post('/idv/initiate', async (req, res) => {
  const missing = missingEnv('IDV_PROVIDER', 'IDV_API_KEY');
  if (missing.length) return res.status(503).json({ error: 'ID verification not configured', missing: missing.join(',') });
  const { customer_id } = req.body || {};
  if (!customer_id) return res.status(400).json({ error: 'customer_id required' });
  const referenceId = `idv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ins = await pool.query(
    `INSERT INTO idv_verifications (user_id, customer_id, provider, status, reference_id) VALUES ($1,$2,$3,'pending',$4) RETURNING *`,
    [req.user.id, customer_id, process.env.IDV_PROVIDER, referenceId]
  );
  res.json({ success: true, verification: ins.rows[0], note: 'Stub initiation; redirect URL would come from provider SDK in production.' });
});

router.get('/idv/list', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM idv_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [req.user.id]);
  res.json({ success: true, verifications: rows });
});

// ── 4) Multi-location inventory transfers (NEEDS-PRODUCT-DECISION) ─────────
// PRODUCT-DECISION: Two-step approval flow: requested → approved → completed.
// Approver must be a different user from requester (enforced server-side).
// Locations are independently editable; new locations default to active=true.
router.get('/locations', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM locations ORDER BY name`);
  res.json({ success: true, locations: rows });
});

router.post('/locations', async (req, res) => {
  const { name, address, timezone } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const ins = await pool.query(
    `INSERT INTO locations (name, address, timezone) VALUES ($1,$2,$3) RETURNING *`,
    [name, address || null, timezone || 'America/New_York']
  );
  res.json({ success: true, location: ins.rows[0] });
});

router.post('/transfers', async (req, res) => {
  const { from_location_id, to_location_id, item_id, item_description, qty } = req.body || {};
  if (!from_location_id || !to_location_id) return res.status(400).json({ error: 'from_location_id and to_location_id required' });
  if (from_location_id === to_location_id) return res.status(400).json({ error: 'from and to must differ' });
  const ins = await pool.query(
    `INSERT INTO inventory_transfers (from_location_id, to_location_id, item_id, item_description, qty, requested_by_user_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,'requested') RETURNING *`,
    [from_location_id, to_location_id, item_id || null, item_description || null, qty || 1, req.user.id]
  );
  res.json({ success: true, transfer: ins.rows[0] });
});

router.post('/transfers/:id/approve', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rows } = await pool.query(`SELECT * FROM inventory_transfers WHERE id = $1`, [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Transfer not found' });
  if (rows[0].requested_by_user_id === req.user.id) {
    return res.status(403).json({ error: 'Approver must differ from requester' });
  }
  const upd = await pool.query(
    `UPDATE inventory_transfers SET approved_by_user_id = $1, status = 'approved' WHERE id = $2 RETURNING *`,
    [req.user.id, id]
  );
  res.json({ success: true, transfer: upd.rows[0] });
});

router.post('/transfers/:id/complete', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const upd = await pool.query(
    `UPDATE inventory_transfers SET status = 'completed', completed_at = NOW() WHERE id = $1 AND status = 'approved' RETURNING *`,
    [id]
  );
  if (upd.rows.length === 0) return res.status(400).json({ error: 'Transfer not approved or not found' });
  res.json({ success: true, transfer: upd.rows[0] });
});

router.get('/transfers', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM inventory_transfers ORDER BY created_at DESC LIMIT 200`);
  res.json({ success: true, transfers: rows });
});

// ── 5) SMS / email outreach (NEEDS-CREDS) ──────────────────────────────────
router.post('/outreach/sms', async (req, res) => {
  const missing = missingEnv('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM');
  if (missing.length) return res.status(503).json({ error: 'SMS provider not configured', missing: missing.join(',') });
  const { to, body } = req.body || {};
  if (!to || !body) return res.status(400).json({ error: 'to and body required' });
  const ins = await pool.query(
    `INSERT INTO outreach_messages (user_id, channel, to_address, body, status) VALUES ($1,'sms',$2,$3,'queued') RETURNING *`,
    [req.user.id, to, body]
  );
  res.json({ success: true, message: ins.rows[0], note: 'Stub; install twilio package for live send.' });
});

router.post('/outreach/email', async (req, res) => {
  const missing = missingEnv('SMTP_HOST', 'SMTP_USER', 'SMTP_PASS');
  if (missing.length) return res.status(503).json({ error: 'SMTP not configured', missing: missing.join(',') });
  const { to, subject, body } = req.body || {};
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, body required' });
  const ins = await pool.query(
    `INSERT INTO outreach_messages (user_id, channel, to_address, subject, body, status) VALUES ($1,'email',$2,$3,$4,'queued') RETURNING *`,
    [req.user.id, to, subject, body]
  );
  res.json({ success: true, message: ins.rows[0], note: 'Stub; install nodemailer for live send.' });
});

router.get('/outreach', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM outreach_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [req.user.id]);
  res.json({ success: true, messages: rows });
});

// ── 6) eBay/Craigslist comparable-sales scrape (NEEDS-CREDS / TOS) ─────────
// PRODUCT-DECISION: Craigslist disallows scraping per TOS — endpoint exposes
// eBay only, gated on EBAY_API_KEY. No on-the-wire fetch is performed in this
// stub; caller can submit pre-fetched comps for storage and review.
router.post('/comps/ebay', async (req, res) => {
  const missing = missingEnv('EBAY_API_KEY');
  if (missing.length) return res.status(503).json({ error: 'eBay API not configured', missing: missing.join(',') });
  const { query, comps } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query required' });
  const ins = await pool.query(
    `INSERT INTO comp_scrape_results (user_id, source, query, results) VALUES ($1,'ebay',$2,$3) RETURNING *`,
    [req.user.id, query, JSON.stringify(comps || [])]
  );
  res.json({ success: true, record: ins.rows[0], note: 'Stub; install eBay Browse API SDK or use REST directly with EBAY_API_KEY for live results.' });
});

router.get('/comps/log', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM comp_scrape_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [req.user.id]);
  res.json({ success: true, comps: rows });
});

module.exports = router;
