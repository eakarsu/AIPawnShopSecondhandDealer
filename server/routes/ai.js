const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { callAI } = require('../services/openrouter');
const auth = require('../middleware/auth');
const pool = require('../db');

// ── Auth on ALL AI routes ──────────────────────────────────────────
router.use(auth);

// ── Rate limiter: 20 AI calls/hour per user ID or IP ──────────────
const rateLimitMap = new Map();
function aiRateLimiter(req, res, next) {
  const key = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 20;

  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  rateLimitMap.set(key, entry);

  if (entry.count > limit) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 20 AI calls per hour.' });
  }
  next();
}
router.use(aiRateLimiter);

// ── Multer setup for photo uploads ────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// ── Helper: parse AI response as JSON ─────────────────────────────
function parseAIResponse(content) {
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1].trim()); } catch (e) {}
  }
  try { return JSON.parse(content); } catch (e) {
    return { raw_response: content };
  }
}

// ── Ensure ai_valuations table exists ─────────────────────────────
async function ensureAiValuationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_valuations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      inventory_id INTEGER,
      endpoint VARCHAR(50),
      result JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}
ensureAiValuationsTable().catch(e => console.error('Failed to create ai_valuations table:', e.message));

// ── Helper: save AI valuation result ──────────────────────────────
async function saveAiValuation(userId, inventoryId, endpoint, result) {
  try {
    await pool.query(
      `INSERT INTO ai_valuations (user_id, inventory_id, endpoint, result) VALUES ($1, $2, $3, $4)`,
      [userId || null, inventoryId || null, endpoint, JSON.stringify(result)]
    );
  } catch (e) {
    console.error('Failed to save AI valuation:', e.message);
  }
}

// ── In-memory spot price cache (1 hour) ───────────────────────────
let spotPriceCache = null;
let spotPriceCacheAt = 0;

// ── GET /spot-price - no need to be here, but exported for metals route ──

// ═══════════════════════════════════════════════════════════════════
// POST /valuate - Item valuation
// ═══════════════════════════════════════════════════════════════════
router.post('/valuate', async (req, res) => {
  try {
    const { item_description, category, condition, brand, model, age, inventory_id } = req.body;

    if (!item_description) {
      return res.status(400).json({ error: 'Item description is required' });
    }

    const systemPrompt = `You are an expert pawn shop appraiser with 25+ years of experience valuing secondhand goods across all categories including electronics, jewelry, firearms, tools, musical instruments, antiques, and collectibles. You have deep knowledge of current resale markets, depreciation rates, brand premiums, and condition-based pricing.

Your task is to provide a fair market valuation for items brought into a pawn shop. Consider:
- Current retail and secondhand market prices
- Brand reputation and model desirability
- Condition impact on value (mint, excellent, good, fair, poor)
- Age and depreciation curves for the item category
- Typical pawn shop buy/loan ratios (pawn shops typically offer 25-60% of resale value)

Respond ONLY with valid JSON in this exact format:
{
  "estimated_retail_value": <number>,
  "estimated_pawn_value": <number>,
  "estimated_resale_value": <number>,
  "confidence": "<high|medium|low>",
  "value_range": { "low": <number>, "high": <number> },
  "reasoning": "<detailed explanation of valuation>",
  "key_factors": ["<factor1>", "<factor2>", ...],
  "market_demand": "<high|medium|low>",
  "recommended_loan_amount": <number>,
  "depreciation_notes": "<notes on how value may change>"
}`;

    const userMessage = `Please valuate the following item:

Item Description: ${item_description}
Category: ${category || 'Not specified'}
Condition: ${condition || 'Not specified'}
Brand: ${brand || 'Not specified'}
Model: ${model || 'Not specified'}
Age: ${age || 'Not specified'}`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    // Persist result
    await saveAiValuation(req.user?.id, inventory_id, 'valuate', parsed);

    // Update inventory row if inventory_id provided
    if (inventory_id) {
      try {
        await pool.query(
          `UPDATE inventory SET ai_valuation = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(parsed), inventory_id]
        );
      } catch (e) {
        // Column may not exist yet — try to add it
        try {
          await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS ai_valuation JSONB`);
          await pool.query(`UPDATE inventory SET ai_valuation = $1 WHERE id = $2`, [JSON.stringify(parsed), inventory_id]);
        } catch (e2) {}
      }
    }

    res.json({ valuation: parsed, input: { item_description, category, condition, brand, model, age } });
  } catch (err) {
    console.error('AI valuation error:', err);
    res.status(500).json({ error: 'Failed to generate valuation' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /market-trends
// ═══════════════════════════════════════════════════════════════════
router.post('/market-trends', async (req, res) => {
  try {
    const { item_category, item_name, region } = req.body;

    if (!item_category) {
      return res.status(400).json({ error: 'Item category is required' });
    }

    const systemPrompt = `You are a market analyst specializing in the secondhand and pawn shop industry. You have extensive knowledge of resale market trends, seasonal demand patterns, regional pricing variations, and economic factors affecting secondhand goods pricing.

Analyze market trends for the specified item category and provide actionable insights for a pawn shop owner to optimize buying and selling decisions.

Respond ONLY with valid JSON in this exact format:
{
  "category": "<category analyzed>",
  "current_trend": "<rising|stable|declining>",
  "trend_summary": "<brief summary of current market conditions>",
  "price_trend_6_months": "<description of price movement over last 6 months>",
  "seasonal_patterns": [
    { "season": "<season>", "demand": "<high|medium|low>", "notes": "<explanation>" }
  ],
  "demand_level": "<high|medium|low>",
  "supply_level": "<high|medium|low>",
  "recommended_actions": ["<action1>", "<action2>", ...],
  "price_forecast": "<short-term price direction and reasoning>",
  "regional_notes": "<regional market considerations>",
  "risk_factors": ["<risk1>", "<risk2>", ...]
}`;

    const userMessage = `Analyze market trends for the following:

Item Category: ${item_category}
Specific Item: ${item_name || 'General category analysis'}
Region: ${region || 'United States - General'}`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    await saveAiValuation(req.user?.id, null, 'market-trends', parsed);

    res.json({ trends: parsed, input: { item_category, item_name, region } });
  } catch (err) {
    console.error('AI market trends error:', err);
    res.status(500).json({ error: 'Failed to generate market trends analysis' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /risk-score - Loan risk scoring
// ═══════════════════════════════════════════════════════════════════
router.post('/risk-score', async (req, res) => {
  try {
    const { customer_history, loan_amount, item_value, item_category, inventory_id } = req.body;

    if (loan_amount === undefined || item_value === undefined) {
      return res.status(400).json({ error: 'Loan amount and item value are required' });
    }

    const systemPrompt = `You are a risk assessment specialist for the pawn lending industry. You evaluate loan risk based on multiple factors including loan-to-value ratios, customer history, collateral quality, and market conditions.

Provide a comprehensive risk assessment for the proposed pawn loan. The risk score should be 1-100 where:
- 1-20: Very Low Risk (excellent collateral, reliable customer)
- 21-40: Low Risk
- 41-60: Moderate Risk
- 61-80: High Risk
- 81-100: Very High Risk (poor collateral, high default probability)

Respond ONLY with valid JSON in this exact format:
{
  "risk_score": <number 1-100>,
  "risk_level": "<very_low|low|moderate|high|very_high>",
  "loan_to_value_ratio": <number as percentage>,
  "recommendation": "<approve|approve_with_conditions|review|decline>",
  "risk_factors": [
    { "factor": "<factor name>", "impact": "<positive|neutral|negative>", "weight": <1-10>, "details": "<explanation>" }
  ],
  "suggested_terms": {
    "max_loan_amount": <number>,
    "recommended_interest_rate": <number as percentage>,
    "recommended_term_days": <number>,
    "conditions": ["<condition1>", "<condition2>", ...]
  },
  "default_probability": "<estimated percentage>",
  "reasoning": "<overall risk assessment explanation>"
}`;

    const userMessage = `Assess the risk for the following pawn loan:

Loan Amount Requested: $${loan_amount}
Item/Collateral Value: $${item_value}
Item Category: ${item_category || 'Not specified'}
Customer History: ${customer_history ? JSON.stringify(customer_history) : 'No prior history available'}
Loan-to-Value Ratio: ${((loan_amount / item_value) * 100).toFixed(1)}%`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    await saveAiValuation(req.user?.id, inventory_id, 'risk-score', parsed);

    // Update inventory row with ai_risk_score if inventory_id provided
    if (inventory_id) {
      try {
        await pool.query(`UPDATE inventory SET ai_risk_score = $1, updated_at = NOW() WHERE id = $2`, [JSON.stringify(parsed), inventory_id]);
      } catch (e) {
        try {
          await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS ai_risk_score JSONB`);
          await pool.query(`UPDATE inventory SET ai_risk_score = $1 WHERE id = $2`, [JSON.stringify(parsed), inventory_id]);
        } catch (e2) {}
      }
    }

    res.json({ risk_assessment: parsed, input: { customer_history, loan_amount, item_value, item_category } });
  } catch (err) {
    console.error('AI risk score error:', err);
    res.status(500).json({ error: 'Failed to generate risk assessment' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /counterfeit-check - with optional photo upload (vision AI)
// ═══════════════════════════════════════════════════════════════════
router.post('/counterfeit-check', upload.single('photo'), async (req, res) => {
  try {
    const { item_description, category, brand, serial_number, photos_description } = req.body;

    if (!item_description) {
      return res.status(400).json({ error: 'Item description is required' });
    }

    const systemPrompt = `You are an authentication and counterfeit detection expert working in the pawn and secondhand retail industry. You have extensive knowledge of how to identify counterfeit goods across categories including luxury watches, designer handbags, jewelry, electronics, sneakers, art, collectibles, and branded merchandise.

Provide detailed authentication guidance for the described item. Include specific physical checks, serial number verification methods, and red flags to watch for.

Respond ONLY with valid JSON in this exact format:
{
  "authenticity_assessment": "<likely_authentic|suspicious|likely_counterfeit|insufficient_info>",
  "confidence": "<high|medium|low>",
  "risk_level": "<low|medium|high>",
  "verification_steps": [
    { "step": <number>, "check": "<what to check>", "how": "<detailed instructions>", "importance": "<critical|important|supplementary>" }
  ],
  "red_flags": ["<flag1>", "<flag2>", ...],
  "positive_indicators": ["<indicator1>", "<indicator2>", ...],
  "serial_number_notes": "<guidance on serial number verification for this brand/category>",
  "recommended_tools": ["<tool or resource for verification>", ...],
  "market_counterfeit_prevalence": "<how common are counterfeits for this item>",
  "additional_notes": "<any other authentication advice>"
}`;

    let userMessage;

    if (req.file) {
      // Vision: include image as base64
      const b64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype || 'image/jpeg';

      userMessage = [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${b64}` }
        },
        {
          type: 'text',
          text: `Analyze this item for counterfeit indicators. Check logo placement, stitching, materials, serial number format, overall quality.

Item Description: ${item_description}
Category: ${category || 'Not specified'}
Brand: ${brand || 'Not specified'}
Serial Number: ${serial_number || 'Not provided'}
Additional Visual Description: ${photos_description || 'None'}

${systemPrompt}`
        }
      ];
    } else {
      userMessage = `Please provide authentication guidance for the following item:

Item Description: ${item_description}
Category: ${category || 'Not specified'}
Brand: ${brand || 'Not specified'}
Serial Number: ${serial_number || 'Not provided'}
Visual/Physical Description: ${photos_description || 'No additional visual details provided'}`;
    }

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    await saveAiValuation(req.user?.id, null, 'counterfeit-check', parsed);

    res.json({
      authentication: parsed,
      input: { item_description, category, brand, serial_number, photos_description },
      photo_analyzed: !!req.file
    });
  } catch (err) {
    console.error('AI counterfeit check error:', err);
    res.status(500).json({ error: 'Failed to generate authentication guidance' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /regulatory-report
// ═══════════════════════════════════════════════════════════════════
router.post('/regulatory-report', async (req, res) => {
  try {
    const { report_type, transactions, date_range, location } = req.body;

    if (!report_type) {
      return res.status(400).json({ error: 'Report type is required' });
    }

    const systemPrompt = `You are a regulatory compliance specialist for the pawn and secondhand dealer industry. You are deeply familiar with federal, state, and local regulations including:
- ATF Form 4473 and firearm transaction requirements
- BSA/AML (Bank Secrecy Act / Anti-Money Laundering) reporting
- IRS Form 8300 for cash transactions over $10,000
- State-specific pawn transaction reporting requirements
- Police reporting obligations for secondhand dealers
- Precious metals and jewelry reporting requirements
- Hold period compliance documentation

Draft a professional compliance report based on the provided transaction data.

Respond ONLY with valid JSON in this exact format:
{
  "report_title": "<formal report title>",
  "report_type": "<type of regulatory report>",
  "reporting_period": "<date range covered>",
  "executive_summary": "<brief overview of report contents>",
  "sections": [
    {
      "title": "<section title>",
      "content": "<detailed section content>",
      "compliance_status": "<compliant|needs_attention|non_compliant>"
    }
  ],
  "transaction_summary": {
    "total_transactions": "<number or description>",
    "reportable_transactions": "<number or description>",
    "flagged_items": "<number or description>"
  },
  "compliance_findings": ["<finding1>", "<finding2>", ...],
  "recommendations": ["<recommendation1>", "<recommendation2>", ...],
  "required_filings": ["<filing1>", "<filing2>", ...],
  "disclaimer": "<standard compliance disclaimer>"
}`;

    const userMessage = `Draft a regulatory compliance report with the following details:

Report Type: ${report_type}
Date Range: ${date_range ? JSON.stringify(date_range) : 'Current reporting period'}
Location/Jurisdiction: ${location || 'Not specified'}
Transaction Data: ${transactions ? JSON.stringify(transactions) : 'No specific transaction data provided - generate a template report'}`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    await saveAiValuation(req.user?.id, null, 'regulatory-report', parsed);

    res.json({ report: parsed, input: { report_type, transactions, date_range, location } });
  } catch (err) {
    console.error('AI regulatory report error:', err);
    res.status(500).json({ error: 'Failed to generate regulatory report' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /negotiation-tips
// ═══════════════════════════════════════════════════════════════════
router.post('/negotiation-tips', async (req, res) => {
  try {
    const { item_description, estimated_value, customer_asking_price, market_conditions } = req.body;

    if (!item_description) {
      return res.status(400).json({ error: 'Item description is required' });
    }

    const systemPrompt = `You are a seasoned pawn shop negotiation coach with decades of experience in buying, selling, and lending against secondhand goods. You understand the psychology of negotiation, fair dealing practices, and how to reach mutually beneficial agreements while protecting the shop's margins.

Provide practical negotiation strategies and talking points that are ethical, professional, and effective.

Respond ONLY with valid JSON in this exact format:
{
  "negotiation_strategy": "<recommended overall approach>",
  "target_price": <number - recommended offer/counter-offer>,
  "price_range": { "walk_away": <number>, "target": <number>, "opening_offer": <number> },
  "opening_talking_points": ["<point1>", "<point2>", ...],
  "counter_arguments": [
    { "if_customer_says": "<common customer argument>", "respond_with": "<suggested response>" }
  ],
  "value_justification": ["<reason for your price>", ...],
  "leverage_points": ["<advantage you can use>", ...],
  "concession_strategy": "<how and when to make concessions>",
  "closing_techniques": ["<technique1>", "<technique2>", ...],
  "relationship_tips": ["<tip for maintaining good customer relations>", ...],
  "things_to_avoid": ["<pitfall1>", "<pitfall2>", ...]
}`;

    const userMessage = `Provide negotiation strategies for the following situation:

Item Description: ${item_description}
Our Estimated Value: ${estimated_value ? `$${estimated_value}` : 'Not yet determined'}
Customer's Asking Price: ${customer_asking_price ? `$${customer_asking_price}` : 'Not yet stated'}
Current Market Conditions: ${market_conditions || 'Standard market conditions'}`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    await saveAiValuation(req.user?.id, null, 'negotiation-tips', parsed);

    res.json({ negotiation: parsed, input: { item_description, estimated_value, customer_asking_price, market_conditions } });
  } catch (err) {
    console.error('AI negotiation tips error:', err);
    res.status(500).json({ error: 'Failed to generate negotiation strategies' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /customer-risk-score - Customer creditworthiness scoring
// ═══════════════════════════════════════════════════════════════════
router.post('/customer-risk-score', async (req, res) => {
  try {
    const { customer_id } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });

    // Fetch customer + loan history
    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [customer_id]);
    if (customerResult.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    const customer = customerResult.rows[0];

    const loansResult = await pool.query(
      `SELECT status, principal_amount, loan_amount,
        CASE WHEN status = 'redeemed' THEN 1 ELSE 0 END as redeemed,
        CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END as defaulted
       FROM loans WHERE customer_id = $1`,
      [customer_id]
    );
    const loans = loansResult.rows;

    const totalLoans = loans.length;
    const redeemed = loans.filter(l => l.redeemed).length;
    const defaulted = loans.filter(l => l.defaulted).length;
    const redemptionRate = totalLoans > 0 ? ((redeemed / totalLoans) * 100).toFixed(1) : 0;
    const avgLoanAmount = totalLoans > 0
      ? (loans.reduce((sum, l) => sum + parseFloat(l.loan_amount || l.principal_amount || 0), 0) / totalLoans).toFixed(2)
      : 0;

    const systemPrompt = `You are a pawn shop credit analyst. Score this customer's creditworthiness for pawn shop loans on a scale of 1-100.
Return JSON: {"risk_score": <1-100>, "tier": "<low|medium|high|very_high>", "max_recommended_loan": <number>, "reasoning": "<string>", "flags": []}`;

    const userMessage = `Score this customer:
Name: ${customer.first_name} ${customer.last_name}
Total Loans: ${totalLoans}
Loans Redeemed: ${redeemed}
Defaults: ${defaulted}
Redemption Rate: ${redemptionRate}%
Avg Loan Amount: $${avgLoanAmount}
Member Since: ${customer.created_at}`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    await saveAiValuation(req.user?.id, null, 'customer-risk-score', { customer_id, ...parsed });

    res.json({ customer_risk: parsed, customer_id, loan_history_summary: { totalLoans, redeemed, defaulted, redemptionRate, avgLoanAmount } });
  } catch (err) {
    console.error('Customer risk score error:', err);
    res.status(500).json({ error: 'Failed to generate customer risk score' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GET /history - Paginated AI valuation history for logged-in user
// ═══════════════════════════════════════════════════════════════════
router.get('/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM ai_valuations WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query(
      'SELECT * FROM ai_valuations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('AI history error:', err);
    res.status(500).json({ error: 'Failed to fetch AI history' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/items/:id/upload-photo (inventory photo upload)
// ═══════════════════════════════════════════════════════════════════

// Disk storage for item photos
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = require('path').join(__dirname, '..', 'uploads', 'items');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = require('path').extname(file.originalname).toLowerCase();
    cb(null, `item-${req.params.id}-${Date.now()}${ext}`);
  }
});

const diskUpload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(require('path').extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// This route is mounted separately on /api/items in server/index.js
// We export the handler so the inventory route can use it
// However since routes/ai.js is mounted at /api/ai, we expose via ai for simplicity:

// POST /api/ai/items/:id/upload-photo
router.post('/items/:id/upload-photo', diskUpload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No photo file uploaded' });

    const photoUrl = `/uploads/items/${req.file.filename}`;

    // Update inventory record
    try {
      await pool.query('UPDATE inventory SET photo_url = $1, updated_at = NOW() WHERE id = $2', [photoUrl, id]);
    } catch (e) {
      console.error('Could not update inventory photo_url:', e.message);
    }

    res.json({
      success: true,
      photo_url: photoUrl,
      filename: req.file.filename,
      size: req.file.size,
      item_id: parseInt(id)
    });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: err.message || 'Photo upload failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/ai/items/:id/ai-visual-appraise
// Vision-based appraisal: reads uploaded photo from DB and sends to Claude vision
// ═══════════════════════════════════════════════════════════════════
router.post('/items/:id/ai-visual-appraise', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch item record
    const itemResult = await pool.query('SELECT * FROM inventory WHERE id = $1', [id]);
    if (itemResult.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    const item = itemResult.rows[0];

    if (!item.photo_url) {
      return res.status(400).json({ error: 'No photo uploaded for this item. Please upload a photo first.' });
    }

    // Read photo file from disk
    const photoPath = require('path').join(__dirname, '..', item.photo_url);
    let photoBase64;
    let mimeType = 'image/jpeg';
    try {
      photoBase64 = require('fs').readFileSync(photoPath).toString('base64');
      const ext = require('path').extname(item.photo_url).toLowerCase();
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.gif') mimeType = 'image/gif';
    } catch (e) {
      return res.status(400).json({ error: 'Could not read photo file. Please re-upload the photo.' });
    }

    const systemPrompt = `You are an expert pawn shop appraiser with 25+ years of experience. Analyze this item photo and provide a detailed condition assessment and value estimate.

Respond ONLY with valid JSON in this exact format:
{
  "item_identified": "<what the item appears to be>",
  "condition_grade": "<Mint|Excellent|Good|Fair|Poor|For Parts>",
  "condition_score": <1-10>,
  "condition_details": {
    "overall": "<overall condition description>",
    "cosmetic": "<scratches, dents, wear visible in photo>",
    "functional": "<estimated functional status based on appearance>",
    "completeness": "<appears complete/missing parts>"
  },
  "estimated_retail_value": <number>,
  "estimated_pawn_value": <number>,
  "estimated_resale_value": <number>,
  "value_range": { "low": <number>, "high": <number> },
  "confidence": "<high|medium|low>",
  "confidence_reason": "<why confidence is at this level>",
  "visual_observations": ["<observation 1>", "<observation 2>"],
  "authenticity_notes": "<any counterfeit red flags or authenticity indicators visible>",
  "recommended_loan_amount": <number>,
  "additional_photos_needed": ["<what to photograph for better assessment>"],
  "appraiser_notes": "<any additional notes>"
}`;

    const userMessage = [
      {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${photoBase64}` }
      },
      {
        type: 'text',
        text: `Please appraise this item from the pawn shop inventory photo.

Known Item Details:
- Name: ${item.name || 'Unknown'}
- Category: ${item.category || 'Unknown'}
- Brand: ${item.brand || 'Not specified'}
- Model: ${item.model || 'Not specified'}
- Current Condition Label: ${item.condition || 'Not specified'}
- Serial Number: ${item.serial_number || 'Not provided'}
- Description: ${item.description || 'No additional description'}

Analyze the photo carefully and provide your professional appraisal.`
      }
    ];

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    // Persist result
    await saveAiValuation(req.user?.id, parseInt(id), 'visual-appraise', parsed);

    // Update inventory with AI appraisal
    try {
      await pool.query(
        `UPDATE inventory SET ai_valuation = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(parsed), id]
      );
    } catch (e) {
      try {
        await pool.query('ALTER TABLE inventory ADD COLUMN IF NOT EXISTS ai_valuation JSONB');
        await pool.query('UPDATE inventory SET ai_valuation = $1 WHERE id = $2', [JSON.stringify(parsed), id]);
      } catch (e2) {}
    }

    res.json({
      success: true,
      appraisal: parsed,
      item: { id: item.id, name: item.name, category: item.category },
      photo_url: item.photo_url
    });
  } catch (err) {
    console.error('Visual appraisal error:', err);
    res.status(500).json({ error: 'Visual appraisal failed: ' + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/ai/items/:id/check-stolen
// Police report integration: AI risk assessment for stolen item
// ═══════════════════════════════════════════════════════════════════
router.post('/items/:id/check-stolen', async (req, res) => {
  try {
    const { id } = req.params;

    const itemResult = await pool.query('SELECT * FROM inventory WHERE id = $1', [id]);
    if (itemResult.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    const item = itemResult.rows[0];

    const { additionalNotes } = req.body || {};

    const systemPrompt = `You are a loss prevention and compliance specialist for pawn shops. Assess the stolen item risk for this item and provide verification guidance.

Respond ONLY with valid JSON in this exact format:
{
  "risk_level": "<low|moderate|high|critical>",
  "risk_score": <1-100>,
  "risk_factors": ["<factor 1>", "<factor 2>"],
  "stolen_item_indicators": ["<indicator>"],
  "clean_indicators": ["<positive indicator>"],
  "recommended_verification_steps": [
    { "step": <number>, "action": "<what to do>", "resource": "<how to do it>", "priority": "<critical|recommended|optional>" }
  ],
  "hold_period_recommendation": "<days to hold before selling>",
  "police_report_required": <true|false>,
  "police_report_reason": "<why report is required or not>",
  "database_checks": [
    { "database": "<name>", "url": "<url if applicable>", "purpose": "<what to check>" }
  ],
  "documentation_required": ["<document to collect>"],
  "serial_number_assessment": "<is the serial number valid format, suspicious, etc.>",
  "summary": "<overall assessment summary>"
}`;

    const userMessage = `Assess stolen item risk for this pawn shop intake:

Item Name: ${item.name}
Category: ${item.category || 'Unknown'}
Brand: ${item.brand || 'Unknown'}
Model: ${item.model || 'Unknown'}
Serial Number: ${item.serial_number || 'NOT PROVIDED'}
Condition: ${item.condition || 'Unknown'}
Description: ${item.description || 'None'}
Additional Notes: ${additionalNotes || 'None'}

Check if this item has characteristics common in stolen goods and what verification steps should be taken.`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    await saveAiValuation(req.user?.id, parseInt(id), 'check-stolen', parsed);

    res.json({
      success: true,
      assessment: parsed,
      item: { id: item.id, name: item.name, serial_number: item.serial_number }
    });
  } catch (err) {
    console.error('Stolen check error:', err);
    res.status(500).json({ error: 'Stolen item check failed: ' + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/ai/market-price
// Market price lookup: category + description + condition → price range
// ═══════════════════════════════════════════════════════════════════
router.post('/market-price', async (req, res) => {
  try {
    const { category, description, condition, brand, model } = req.body;

    if (!category || !description) {
      return res.status(400).json({ error: 'category and description are required' });
    }

    const systemPrompt = `You are a market pricing expert for secondhand and pawn shop goods with access to real-time market knowledge. Provide accurate market price ranges for items.

Respond ONLY with valid JSON in this exact format:
{
  "category": "<item category>",
  "item_summary": "<brief description of item analyzed>",
  "market_price_range": {
    "low": <number>,
    "mid": <number>,
    "high": <number>,
    "currency": "USD"
  },
  "pawn_offer_range": {
    "low": <number>,
    "high": <number>,
    "typical_percentage": "<what % of retail pawn shops typically offer>"
  },
  "comparable_sales": [
    { "platform": "<eBay|Facebook Marketplace|Craigslist|etc>", "price_range": "<$X - $Y>", "condition": "<condition notes>", "notes": "<any context>" }
  ],
  "condition_impact": {
    "mint": "<% of high value>",
    "excellent": "<% of high value>",
    "good": "<% of high value>",
    "fair": "<% of high value>",
    "poor": "<% of high value>"
  },
  "price_factors": ["<factor affecting price>"],
  "best_selling_platforms": ["<platform>"],
  "seasonal_demand": "<high|medium|low and any seasonal notes>",
  "price_trend": "<rising|stable|declining>",
  "last_updated_note": "<note that this is AI knowledge based estimate>",
  "confidence": "<high|medium|low>"
}`;

    const userMessage = `Provide market price analysis for:

Category: ${category}
Description: ${description}
Condition: ${condition || 'Good'}
Brand: ${brand || 'Not specified'}
Model: ${model || 'Not specified'}`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    await saveAiValuation(req.user?.id, null, 'market-price', parsed);

    res.json({
      success: true,
      market_price: parsed,
      input: { category, description, condition, brand, model }
    });
  } catch (err) {
    console.error('Market price error:', err);
    res.status(500).json({ error: 'Market price lookup failed: ' + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/ai/loan-recommendation
// Loan calculator: appraised value + customer history → recommended terms
// ═══════════════════════════════════════════════════════════════════
router.post('/loan-recommendation', async (req, res) => {
  try {
    const { appraisedValue, customerHistory, itemCategory, customerId } = req.body;

    if (!appraisedValue) {
      return res.status(400).json({ error: 'appraisedValue is required' });
    }

    // Optionally fetch customer history from DB
    let fetchedCustomerHistory = customerHistory || null;
    if (customerId && !customerHistory) {
      try {
        const cust = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
        const loans = await pool.query(
          `SELECT status, loan_amount, created_at FROM loans WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10`,
          [customerId]
        );
        if (cust.rows.length > 0) {
          const c = cust.rows[0];
          const redeemed = loans.rows.filter(l => l.status === 'redeemed').length;
          const defaulted = loans.rows.filter(l => l.status === 'defaulted').length;
          fetchedCustomerHistory = {
            name: `${c.first_name} ${c.last_name}`,
            totalLoans: loans.rows.length,
            redeemedLoans: redeemed,
            defaultedLoans: defaulted,
            redemptionRate: loans.rows.length > 0 ? `${Math.round((redeemed / loans.rows.length) * 100)}%` : 'N/A',
            memberSince: c.created_at
          };
        }
      } catch (e) { /* proceed without */ }
    }

    const systemPrompt = `You are a pawn shop lending specialist. Provide loan recommendations based on item value and customer history.

Respond ONLY with valid JSON in this exact format:
{
  "appraised_value": <number>,
  "recommended_loan_amount": <number>,
  "loan_to_value_ratio": "<percentage>",
  "interest_rate": {
    "monthly": "<percentage>",
    "annual": "<percentage>",
    "apr_equivalent": "<percentage>"
  },
  "redemption_timeline": {
    "standard_days": <number>,
    "recommended_days": <number>,
    "grace_period_days": <number>,
    "rationale": "<why these terms>"
  },
  "total_redemption_cost": {
    "principal": <number>,
    "fees_30_days": <number>,
    "fees_60_days": <number>,
    "fees_90_days": <number>
  },
  "customer_tier": "<excellent|good|fair|new|high_risk>",
  "tier_rationale": "<why this tier>",
  "risk_adjustment": "<any adjustments based on customer history>",
  "alternative_terms": [
    { "loan_amount": <number>, "rate": "<rate>", "term": "<days>", "scenario": "<description>" }
  ],
  "recommendations": ["<recommendation to shop>"],
  "approval_recommendation": "<approve|conditional|decline>",
  "conditions": ["<any conditions for approval>"]
}`;

    const userMessage = `Provide loan recommendation for:

Item Appraised Value: $${appraisedValue}
Item Category: ${itemCategory || 'General merchandise'}
Customer History: ${fetchedCustomerHistory ? JSON.stringify(fetchedCustomerHistory, null, 2) : 'New customer, no history'}`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    await saveAiValuation(req.user?.id, null, 'loan-recommendation', parsed);

    res.json({
      success: true,
      loan_recommendation: parsed,
      input: { appraisedValue, itemCategory, customerId },
      customer_history: fetchedCustomerHistory
    });
  } catch (err) {
    console.error('Loan recommendation error:', err);
    res.status(500).json({ error: 'Loan recommendation failed: ' + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// POST /api/ai/compliance-check
// Compliance checker: jurisdiction → pawn shop regulatory requirements
// ═══════════════════════════════════════════════════════════════════
router.post('/compliance-check', async (req, res) => {
  try {
    const { jurisdiction, businessType, specificQuestion } = req.body;

    if (!jurisdiction) {
      return res.status(400).json({ error: 'jurisdiction is required (e.g. "Texas", "California", "New York City")' });
    }

    const systemPrompt = `You are a pawn shop regulatory compliance expert with comprehensive knowledge of pawn shop laws across all US states and major municipalities. Provide accurate, detailed compliance requirements.

Respond ONLY with valid JSON in this exact format:
{
  "jurisdiction": "<jurisdiction analyzed>",
  "jurisdiction_type": "<state|city|county>",
  "license_requirements": [
    { "license": "<license name>", "issuing_authority": "<who issues>", "estimated_cost": "<cost>", "renewal_period": "<how often>", "requirements": ["<req>"] }
  ],
  "holding_period_requirements": {
    "standard_hold_days": <number>,
    "firearms_hold_days": <number or null>,
    "jewelry_hold_days": <number or null>,
    "electronics_hold_days": <number or null>,
    "notes": "<any special rules>"
  },
  "reporting_requirements": [
    { "report_type": "<name>", "frequency": "<daily|weekly|monthly>", "submitted_to": "<authority>", "method": "<paper|electronic>", "details": "<what must be reported>" }
  ],
  "record_keeping": {
    "minimum_years": <number>,
    "required_fields": ["<field required for each transaction>"],
    "format": "<paper|digital|either>"
  },
  "transaction_restrictions": ["<restriction 1>", "<restriction 2>"],
  "interest_rate_limits": {
    "maximum_monthly_rate": "<rate or 'not specified'>",
    "maximum_annual_rate": "<rate or 'not specified'>",
    "fee_restrictions": "<any fee limits>"
  },
  "police_cooperation": {
    "stolen_property_reporting": "<requirements>",
    "database_submission": "<required databases>",
    "law_enforcement_access": "<rules for police inspection>"
  },
  "special_items_rules": [
    { "category": "<item type>", "special_requirements": "<requirements>" }
  ],
  "penalties": {
    "license_violation": "<penalty>",
    "record_keeping_violation": "<penalty>",
    "reporting_violation": "<penalty>"
  },
  "recent_changes": "<any recent regulatory changes to be aware of>",
  "compliance_tips": ["<practical tip>"],
  "disclaimer": "This information is AI-generated for reference purposes. Always verify with local authorities and legal counsel for current regulations."
}`;

    const userMessage = `Provide comprehensive pawn shop compliance requirements for:

Jurisdiction: ${jurisdiction}
Business Type: ${businessType || 'Traditional pawn shop (buy/sell/loan)'}
Specific Question: ${specificQuestion || 'General compliance overview'}`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    await saveAiValuation(req.user?.id, null, 'compliance-check', parsed);

    res.json({
      success: true,
      compliance: parsed,
      input: { jurisdiction, businessType, specificQuestion }
    });
  } catch (err) {
    console.error('Compliance check error:', err);
    res.status(500).json({ error: 'Compliance check failed: ' + err.message });
  }
});

// POST /auction-price-suggest - reserve / opening price suggestion
router.post('/auction-price-suggest', async (req, res) => {
  try {
    const { inventory_id, item_description, category, condition, comparable_sales, expected_attendance, prior_pass_through } = req.body || {};
    const prompt = `Recommend a reserve and opening bid for this auction lot.
Item: ${item_description || 'unknown'}
Category: ${category || 'unknown'}
Condition: ${condition || 'unknown'}
Comparable sales: ${JSON.stringify(comparable_sales || [])}
Expected attendance: ${expected_attendance || 'unknown'}
Prior pass-through history: ${JSON.stringify(prior_pass_through || [])}

Return ONLY JSON:
{ "reserve_price_usd": number, "opening_bid_usd": number, "expected_hammer_low_usd": number, "expected_hammer_high_usd": number, "demand_signals": [string], "rationale": string, "confidence": "low|medium|high" }`;
    const result = await callAI('You are an auction-pricing specialist for resale and pawn-shop merchandise.', prompt);
    const parsed = parseAIResponse(result.content);
    await saveAiValuation(req.user?.id, inventory_id || null, 'auction-price-suggest', parsed);
    res.json({ suggestion: parsed, model: result.model });
  } catch (err) {
    console.error('auction-price-suggest error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

// POST /expiration-optimize - identify items unlikely to redeem; suggest early sale
router.post('/expiration-optimize', async (req, res) => {
  try {
    const { items } = req.body || {};
    let lots = items;
    if (!Array.isArray(lots) || lots.length === 0) {
      try {
        const r = await pool.query(`SELECT id, item_description, hold_until, original_loan_amount, customer_id, last_payment_date
                                     FROM loans WHERE status='active' ORDER BY hold_until ASC LIMIT 100`);
        lots = r.rows;
      } catch { lots = []; }
    }
    const prompt = `Identify pawn loan / hold-period items unlikely to be redeemed and recommend early sale or extension actions.
Items: ${JSON.stringify(lots).slice(0, 6000)}

Return ONLY JSON:
{ "items": [{"id": any, "redemption_probability": number, "recommended_action": "hold|extend|early_sale|notify_customer", "rationale": string, "expected_recovery_usd": number}], "summary": string }`;
    const result = await callAI('You are a pawn-shop loan-portfolio analyst optimizing recovery vs. hold-period costs.', prompt);
    const parsed = parseAIResponse(result.content);
    await saveAiValuation(req.user?.id, null, 'expiration-optimize', parsed);
    res.json({ analysis: parsed, model: result.model });
  } catch (err) {
    console.error('expiration-optimize error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

// POST /customer-lifetime-value - score CLV and segment
router.post('/customer-lifetime-value', async (req, res) => {
  try {
    const { customer_id } = req.body || {};
    if (!customer_id) return res.status(400).json({ error: 'customer_id required' });
    let customer = null, loans = [], purchases = [];
    try { const r = await pool.query('SELECT * FROM customers WHERE id=$1', [customer_id]); customer = r.rows[0]; } catch {}
    try { const r = await pool.query('SELECT * FROM loans WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 50', [customer_id]); loans = r.rows; } catch {}
    try { const r = await pool.query('SELECT * FROM sales WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 50', [customer_id]); purchases = r.rows; } catch {}
    const prompt = `Score the customer lifetime value (CLV) and recommend retention actions.
Customer: ${JSON.stringify(customer || { id: customer_id })}
Loan history: ${JSON.stringify(loans).slice(0, 3000)}
Purchase history: ${JSON.stringify(purchases).slice(0, 3000)}

Return ONLY JSON:
{ "clv_estimate_usd": number, "segment": "VIP|loyal|regular|occasional|at-risk", "expected_visits_next_12mo": number, "expected_revenue_next_12mo_usd": number, "retention_actions": [string], "personalized_offers": [string], "key_signals": [string] }`;
    const result = await callAI('You score customer lifetime value for pawn-shop and secondhand-dealer customers.', prompt);
    const parsed = parseAIResponse(result.content);
    await saveAiValuation(req.user?.id, null, 'customer-lifetime-value', parsed);
    res.json({ clv: parsed, model: result.model });
  } catch (err) {
    console.error('customer-lifetime-value error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

// POST /theft-detection - cash-drawer / employee anomaly detection (text-only)
router.post('/theft-detection', async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured.' });
    }

    const { employee_id, recent_transactions, cash_drawer_history, void_history, no_sale_count, time_range } = req.body || {};

    let txns = recent_transactions;
    let drawerEvents = cash_drawer_history;
    if (!Array.isArray(txns)) {
      try {
        const r = await pool.query(
          `SELECT id, type, amount, employee_id, created_at FROM cash_drawer_transactions
           ORDER BY created_at DESC LIMIT 200`
        );
        txns = r.rows;
      } catch { txns = []; }
    }
    if (!Array.isArray(drawerEvents)) {
      try {
        const r = await pool.query(
          `SELECT id, action, employee_id, drawer_balance, created_at FROM cash_drawer_events
           ORDER BY created_at DESC LIMIT 200`
        );
        drawerEvents = r.rows;
      } catch { drawerEvents = []; }
    }

    const systemPrompt = 'You are a retail loss-prevention analyst specializing in pawn-shop and secondhand-dealer cash-handling and employee theft / fraud detection.';
    const userMessage = `Analyze the following data for theft, shrinkage, or fraud indicators. Be specific about which patterns are concerning.

Employee filter: ${employee_id || 'ALL'}
Time range: ${time_range || 'recent'}
No-sale opens (count): ${no_sale_count != null ? no_sale_count : 'unknown'}
Void history: ${JSON.stringify(void_history || []).slice(0, 1500)}
Recent cash transactions (first 80): ${JSON.stringify((txns || []).slice(0, 80)).slice(0, 5000)}
Recent cash-drawer events (first 80): ${JSON.stringify((drawerEvents || []).slice(0, 80)).slice(0, 5000)}

Return ONLY JSON:
{
  "risk_level": "low|medium|high|critical",
  "overall_score": number,
  "flagged_employees": [{"employee_id": any, "score": number, "rationale": string}],
  "suspicious_patterns": [{"pattern": string, "evidence": string, "severity": "low|medium|high"}],
  "recommended_actions": [string],
  "investigation_priorities": [string],
  "false_positive_caveats": [string]
}`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);
    await saveAiValuation(req.user?.id, null, 'theft-detection', parsed);
    res.json({ success: true, detection: parsed });
  } catch (err) {
    console.error('theft-detection error:', err);
    const msg = String(err.message || '');
    if (/OPENROUTER_API_KEY|api.?key/i.test(msg)) {
      return res.status(503).json({ error: 'AI service unavailable: ' + msg });
    }
    res.status(500).json({ error: 'Theft detection failed: ' + msg });
  }
});

module.exports = router;
