const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');

// Try to load helmet; skip gracefully if not installed yet
let helmet;
try { helmet = require('helmet'); } catch (e) { helmet = null; }

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security headers
if (helmet) app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parser with 50mb limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/layaway', require('./routes/layaway'));
app.use('/api/precious-metals', require('./routes/precious-metals'));
app.use('/api/firearms', require('./routes/firearms'));
app.use('/api/police-reports', require('./routes/police-reports'));
app.use('/api/cash-drawer', require('./routes/cash-drawer'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/hold-periods', require('./routes/hold-periods'));
app.use('/api/auctions', require('./routes/auctions'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/ext', require('./routes/extensions')); // Apply pass 5 backlog: NCIC, ATF, IDV, multi-location, outreach, eBay comps

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err.message || err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error'
  });
});


// === Custom Feature Mounts (batch_06) ===
app.use('/api/cf-agentic-valuation', require('./routes/customFeat01_AgenticValuation'));
app.use('/api/cf-compliance-automation', require('./routes/customFeat02_ComplianceAutomation'));
app.use('/api/cf-pricing-recommendation-engine', require('./routes/customFeat03_PricingRecommendationEngine'));
app.use('/api/cf-customer-segmentation-marketing', require('./routes/customFeat04_CustomerSegmentationMarketing'));
app.use('/api/cf-loan-default-prediction-intervention', require('./routes/customFeat05_LoanDefaultPredictionIntervention'));


// === Batch 06 Gaps & Frontend Mounts ===
app.use('/api/gap-auctions-without-auction', require('./routes/gapFeat_auctions_without_auction'));
app.use('/api/gap-hold', require('./routes/gapFeat_hold'));
app.use('/api/gap-cash', require('./routes/gapFeat_cash'));
app.use('/api/gap-customers-without-customer', require('./routes/gapFeat_customers_without_customer'));
app.use('/api/gap-no-integration-with-ncic-stolen-goods-databases-fb', require('./routes/gapFeat_no_integration_with_ncic_stolen_goods_databases_fb'));
app.use('/api/gap-limited-atf-firearms-tracking-integration-some-int', require('./routes/gapFeat_limited_atf_firearms_tracking_integration_some_int'));
app.use('/api/gap-no-customer-id-verification-system-age-address-for', require('./routes/gapFeat_no_customer_id_verification_system_age_address_for'));
app.use('/api/gap-no-multi', require('./routes/gapFeat_no_multi'));
app.use('/api/gap-no-audit-trail-dedicated-module-grep-showed-0-audi', require('./routes/gapFeat_no_audit_trail_dedicated_module_grep_showed_0_audi'));
app.use('/api/gap-no-webhooks-for-stolen', require('./routes/gapFeat_no_webhooks_for_stolen'));
app.use('/api/gap-no-mobile-app-for-showroom-floor-staff', require('./routes/gapFeat_no_mobile_app_for_showroom_floor_staff'));

app.listen(PORT, () => {
  console.log(`Pawn Shop server running on port ${PORT}`);
});

module.exports = app;
