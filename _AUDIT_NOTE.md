# Audit Apply Note — AIPawnShopSecondhandDealer

Source: `_AUDIT/reports/batch_06.md` section 13.

## Original Recommendations
### Missing AI counterparts
- `/auction-price-suggest`
- `/expiration-optimize`
- `/theft-detection`
- `/customer-lifetime-value`

### Missing non-AI
- NCIC/Interpol stolen-goods integration; ATF firearms tracking; customer ID verification; multi-location support

### Custom suggestions
- Agentic valuation; compliance automation (NCIC/ATF); pricing recommendation engine; customer segmentation + marketing; loan-default prediction & intervention

## Implemented
Added three endpoints in `server/routes/ai.js`:
- `POST /api/ai/auction-price-suggest`
- `POST /api/ai/expiration-optimize`
- `POST /api/ai/customer-lifetime-value`

Reused `callAI`, `parseAIResponse`, `saveAiValuation`, `auth`, `aiRateLimiter`.

## Backlog
| Item | Tag |
|---|---|
| `/theft-detection` (cash-drawer/employee anomalies) | MECHANICAL |
| NCIC stolen-goods integration | NEEDS-CREDS |
| ATF firearms tracking | NEEDS-CREDS |
| Customer ID verification | NEEDS-CREDS (Jumio/Onfido) |
| Multi-location inventory transfers | NEEDS-PRODUCT-DECISION |
| SMS/email outreach engine | NEEDS-CREDS |
| Real-time eBay/Craigslist comp scrape | NEEDS-CREDS / TOS concerns |

## Apply pass 4 (mechanical backlog)

- **Implemented:** `POST /api/ai/theft-detection` — auth + rate-limited; pulls recent `cash_drawer_transactions` and `cash_drawer_events` when client doesn't supply them, asks for an LP-style JSON verdict (risk_level, flagged_employees, suspicious_patterns, recommended_actions, etc.), persists via `saveAiValuation`. Returns explicit 503 when `OPENROUTER_API_KEY` is unset (pre-flight + error-path string match).
- **FE:** Added "Theft Detection" tool to existing `client/src/pages/AIPredictive.jsx` — fits into the existing TOOLS array, form (employee_id, no_sale_count, time_range, optional JSON for transactions/voids), `api.post()` carries JWT via the existing axios interceptor, 503 surfaces a specific toast about `OPENROUTER_API_KEY`.
- **Files modified:**
  - `server/routes/ai.js`
  - `client/src/pages/AIPredictive.jsx`
- **Syntax check:** `node --check` PASS, `@babel/parser` JSX PASS.
- **Smoke:** backend on port 3801 with `OPENROUTER_API_KEY=""` → login as `admin@pawnshop.com` → `POST /api/ai/theft-detection` returned `503 {"error":"AI service unavailable: OPENROUTER_API_KEY not configured."}`; without bearer → `401 No authorization header provided`.
- **Backlog still deferred:** NCIC/ATF integrations (NEEDS-CREDS), Jumio/Onfido ID verify (NEEDS-CREDS), multi-location transfers (PRODUCT-DECISION), eBay scrape (TOS).

## Apply pass 3 (frontend)

- **Stack:** Vite + React (Tailwind) + Express backend.
- **Backend AI endpoints surveyed:** ~17 in `server/routes/ai.js` including the pass-2 additions `auction-price-suggest`, `expiration-optimize`, `customer-lifetime-value`.
- **FE state:** `client/src/pages/AIPredictive.jsx` already lists and calls all three new endpoints (plus the rest from `AITools.jsx`).
- **Action:** LEFT-AS-IS — FE already wired (idempotence rule).
- **Files modified:** none.
