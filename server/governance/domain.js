'use strict';

const present = (value) => typeof value === 'string' && value.trim().length > 0;
const money = (value) => Number.isInteger(value) && value >= 0;
const versioned = (value) => value && present(value.version) && present(value.effectiveAt);

function evaluate(input) {
  const errors = [];
  if (!present(input.transactionId) || !present(input.customerId) || !present(input.locationId)) errors.push('transaction, customer, and location identities are required');
  if (!input.identityVerification || input.identityVerification.status !== 'verified' || !present(input.identityVerification.providerRef) || !present(input.identityVerification.checkedAt)) errors.push('provider-backed identity verification is required');
  if (input.identityVerification.rawDocumentStored === true) errors.push('raw identity documents must not be stored in workflow payloads');
  if (!Number.isInteger(input.retentionDays) || input.retentionDays < 1 || input.retentionDays > 3650) errors.push('bounded retentionDays is required');

  const valuation = input.valuation || {};
  if (!money(valuation.marketValueCents) || !money(valuation.principalCents) || !present(valuation.marketSourceRef) || !present(valuation.marketCapturedAt)) errors.push('reconciled cent-based valuation inputs are required');
  if (!versioned(valuation.policy) || valuation.principalCents > valuation.marketValueCents) errors.push('versioned valuation policy and bounded principal are required');
  const terms = input.loanTerms || {};
  if (!Number.isInteger(terms.termDays) || terms.termDays < 1 || !Number.isFinite(terms.aprPercent) || terms.aprPercent < 0 || !present(terms.effectiveAt) || !present(terms.jurisdiction)) errors.push('effective jurisdictional loan terms are required');
  const expectedFinance = Math.round(valuation.principalCents * (terms.aprPercent || 0) / 100 * (terms.termDays || 0) / 365);
  if (!money(terms.financeChargeCents) || Math.abs(terms.financeChargeCents - expectedFinance) > 1) errors.push('finance charge must reconcile to principal, APR, and term');

  const ledger = input.ledger || {};
  if (!present(ledger.batchId) || ledger.status !== 'reconciled' || !money(ledger.debitsCents) || !money(ledger.creditsCents) || ledger.debitsCents !== ledger.creditsCents) errors.push('balanced reconciled ledger batch is required');
  if (!Array.isArray(input.integrations) || input.integrations.some((i) => !['bank','billing','crm','market-data','documents','regulatory-filing'].includes(i.provider) || !present(i.externalId) || !present(i.idempotencyKey) || i.status !== 'reconciled')) errors.push('idempotent reconciled provider records are required');

  const approval = input.approval || {};
  if (!present(approval.preparedBy) || !present(approval.approvedBy) || approval.preparedBy === approval.approvedBy || approval.status !== 'approved' || !present(approval.note)) errors.push('segregated independent approval is required');
  if (!present(input.overridePolicy) || !present(input.periodLock) || input.periodLock !== 'open-current-period') errors.push('override policy and explicit accounting-period lock are required');
  if (input.reversal && (!present(input.reversal.originalEntryRef) || !present(input.reversal.reason) || !present(input.reversal.approvedBy))) errors.push('reversals require original-entry linkage, reason, and approval');

  const validation = input.validation || {};
  if (!versioned(validation.fixtureSet) || !Array.isArray(validation.goldenCases) || validation.goldenCases.length < 1 || !Array.isArray(validation.lateCorrections) || validation.lateCorrections.length < 1) errors.push('versioned golden and late-correction fixtures are required');
  if (!present(validation.backtestWindow) || !present(validation.boundaryPolicy)) errors.push('backtest window and boundary policy are required');

  return {
    errors,
    result: { transactionId: input.transactionId, principalCents: valuation.principalCents ?? null, financeChargeCents: terms.financeChargeCents ?? null, status: errors.length ? 'blocked' : 'approved-and-reconciled' },
    assumptions: ['Financial output remains subject to licensed human and jurisdictional review'],
    uncertainty: { marketDataAge: valuation.marketCapturedAt || null, externalReconciliationRequired: true }
  };
}

module.exports = { evaluate };
