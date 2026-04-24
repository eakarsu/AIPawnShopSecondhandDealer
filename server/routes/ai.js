const express = require('express');
const router = express.Router();
const { callAI } = require('../services/openrouter');

// Helper to parse AI response as JSON, with fallback
function parseAIResponse(content) {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      // fall through
    }
  }

  // Try direct JSON parse
  try {
    return JSON.parse(content);
  } catch (e) {
    // Return as structured text response
    return { raw_response: content };
  }
}

// POST /valuate - Item valuation
router.post('/valuate', async (req, res) => {
  try {
    const { item_description, category, condition, brand, model, age } = req.body;

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

    res.json({
      valuation: parsed,
      input: { item_description, category, condition, brand, model, age }
    });
  } catch (err) {
    console.error('AI valuation error:', err);
    res.status(500).json({ error: 'Failed to generate valuation' });
  }
});

// POST /market-trends - Market price trends
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

    res.json({
      trends: parsed,
      input: { item_category, item_name, region }
    });
  } catch (err) {
    console.error('AI market trends error:', err);
    res.status(500).json({ error: 'Failed to generate market trends analysis' });
  }
});

// POST /risk-score - Loan risk scoring
router.post('/risk-score', async (req, res) => {
  try {
    const { customer_history, loan_amount, item_value, item_category } = req.body;

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

    res.json({
      risk_assessment: parsed,
      input: { customer_history, loan_amount, item_value, item_category }
    });
  } catch (err) {
    console.error('AI risk score error:', err);
    res.status(500).json({ error: 'Failed to generate risk assessment' });
  }
});

// POST /counterfeit-check - Counterfeit detection guidance
router.post('/counterfeit-check', async (req, res) => {
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

    const userMessage = `Please provide authentication guidance for the following item:

Item Description: ${item_description}
Category: ${category || 'Not specified'}
Brand: ${brand || 'Not specified'}
Serial Number: ${serial_number || 'Not provided'}
Visual/Physical Description: ${photos_description || 'No additional visual details provided'}`;

    const aiResponse = await callAI(systemPrompt, userMessage);
    const parsed = parseAIResponse(aiResponse);

    res.json({
      authentication: parsed,
      input: { item_description, category, brand, serial_number, photos_description }
    });
  } catch (err) {
    console.error('AI counterfeit check error:', err);
    res.status(500).json({ error: 'Failed to generate authentication guidance' });
  }
});

// POST /regulatory-report - Draft regulatory report
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

Draft a professional compliance report based on the provided transaction data. The report should be suitable for submission to regulatory authorities.

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
    "total_transactions": <number or description>,
    "reportable_transactions": <number or description>,
    "flagged_items": <number or description>
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

    res.json({
      report: parsed,
      input: { report_type, transactions, date_range, location }
    });
  } catch (err) {
    console.error('AI regulatory report error:', err);
    res.status(500).json({ error: 'Failed to generate regulatory report' });
  }
});

// POST /negotiation-tips - Negotiation talking points
router.post('/negotiation-tips', async (req, res) => {
  try {
    const { item_description, estimated_value, customer_asking_price, market_conditions } = req.body;

    if (!item_description) {
      return res.status(400).json({ error: 'Item description is required' });
    }

    const systemPrompt = `You are a seasoned pawn shop negotiation coach with decades of experience in buying, selling, and lending against secondhand goods. You understand the psychology of negotiation, fair dealing practices, and how to reach mutually beneficial agreements while protecting the shop's margins.

Provide practical negotiation strategies and talking points that are ethical, professional, and effective. Focus on building customer relationships while achieving fair pricing.

Respond ONLY with valid JSON in this exact format:
{
  "negotiation_strategy": "<recommended overall approach>",
  "target_price": <number - recommended offer/counter-offer>,
  "price_range": { "walk_away": <number - minimum acceptable>, "target": <number>, "opening_offer": <number> },
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

    res.json({
      negotiation: parsed,
      input: { item_description, estimated_value, customer_asking_price, market_conditions }
    });
  } catch (err) {
    console.error('AI negotiation tips error:', err);
    res.status(500).json({ error: 'Failed to generate negotiation strategies' });
  }
});

module.exports = router;
