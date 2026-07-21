# Governed pawn finance operations

## Intended use and limits

The governed API validates cent-based valuation and loan calculations, effective jurisdictional terms, balanced ledgers, identity-verification receipts, segregated approval, reversals, period locks, and test evidence. It is not financial or legal advice. Raw identity documents and autonomous approvals are prohibited.

## Data and integrations

Signed tenant claims isolate locations. Bank, billing, CRM, market-data, document, regulatory-filing, and identity actions use an approval-gated outbox with request-bound idempotency, bounded retries, dead letters, and reconciliation. TLS verification is mandatory when database SSL is enabled. Secrets remain in the secret manager, never request payloads.

## Deploy, rollback, and recovery

Run `./start.sh check`, take ledger/database backups, and use `ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate`. Roll back code while retaining additive finance and audit tables. On recovery, restore a verified backup, balance each ledger batch, reconcile external IDs, and use explicit reversals instead of rewriting entries. Rotate JWT, database, IDV, and provider secrets centrally and invalidate sessions.

Accounting locks and legal holds take precedence over erasure. Alert on imbalance, calculation drift, failed identity checks, self-approval, overrides, late corrections, TLS errors, dead letters, and missing deletion receipts.
