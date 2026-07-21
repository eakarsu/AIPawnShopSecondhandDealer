const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');

// Try to load helmet; skip gracefully if not installed yet
let helmet;
try { helmet = require('helmet'); } catch (e) { helmet = null; }

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
if ((process.env.JWT_SECRET || '').length < 32 || !process.env.GOVERNANCE_TENANT_ID) {
  throw new Error('JWT_SECRET (32+ characters) and GOVERNANCE_TENANT_ID are required');
}

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/governed-pawn-finance', require('./governance'));
if (process.env.ENABLE_GENERATED_ROUTES === 'true' && process.env.NODE_ENV !== 'production') {
  app.use('/api/ext', require('./routes/extensions'));
  app.use('/api/cf-agentic-valuation', require('./routes/customFeat01_AgenticValuation'));
  app.use('/api/cf-compliance-automation', require('./routes/customFeat02_ComplianceAutomation'));
  app.use('/api/cf-pricing-recommendation-engine', require('./routes/customFeat03_PricingRecommendationEngine'));
  app.use('/api/cf-customer-segmentation-marketing', require('./routes/customFeat04_CustomerSegmentationMarketing'));
  app.use('/api/cf-loan-default-prediction-intervention', require('./routes/customFeat05_LoanDefaultPredictionIntervention'));
}

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


app.listen(PORT, () => {
  console.log(`Pawn Shop server running on port ${PORT}`);
});

module.exports = app;
