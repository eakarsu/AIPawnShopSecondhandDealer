'use strict';
const { createRouter } = require('./router');
const { postgres } = require('./store');
const { evaluate } = require('./domain');
const pool = require('../db');
const auth = require('../middleware/auth');

module.exports = createRouter({
  db: postgres(pool), auth, evaluate, workflow: 'pawn-finance',
  providers: ['bank','billing','crm','market-data','documents','regulatory-filing','identity-verification'],
  approverRoles: ['finance_reviewer','compliance_officer','location_manager','records_officer','admin']
});
