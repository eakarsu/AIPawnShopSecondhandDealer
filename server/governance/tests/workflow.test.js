'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../domain');

const valid = () => ({
  transactionId: 'tx-1', customerId: 'customer-1', locationId: 'location-1', retentionDays: 365,
  identityVerification: { status: 'verified', providerRef: 'idv:receipt:1', checkedAt: '2026-07-18T12:00:00Z', rawDocumentStored: false },
  valuation: { marketValueCents: 20000, principalCents: 10000, marketSourceRef: 'market:snapshot:1', marketCapturedAt: '2026-07-18T11:00:00Z', policy: { version: 'valuation-v2', effectiveAt: '2026-07-01' } },
  loanTerms: { termDays: 365, aprPercent: 12, financeChargeCents: 1200, effectiveAt: '2026-07-18', jurisdiction: 'NY' },
  ledger: { batchId: 'ledger-1', status: 'reconciled', debitsCents: 11200, creditsCents: 11200 },
  integrations: [{ provider: 'bank', externalId: 'bank:1', idempotencyKey: 'bank:2026:0001', status: 'reconciled' }],
  approval: { preparedBy: 'clerk-1', approvedBy: 'manager-2', status: 'approved', note: 'terms and identity reviewed' },
  overridePolicy: 'dual approval required', periodLock: 'open-current-period',
  validation: { fixtureSet: { version: 'fixtures-v2', effectiveAt: '2026-07-01' }, goldenCases: ['standard-loan'], lateCorrections: ['reversal-after-settlement'], backtestWindow: '2025-Q1..2026-Q2', boundaryPolicy: 'round half up to cents' }
});

test('accepts balanced approved pawn finance transaction', () => assert.deepEqual(evaluate(valid()).errors, []));
test('blocks raw identity documents and unbalanced ledger', () => { const input = valid(); input.identityVerification.rawDocumentStored = true; input.ledger.creditsCents = 0; assert.ok(evaluate(input).errors.length >= 2); });
