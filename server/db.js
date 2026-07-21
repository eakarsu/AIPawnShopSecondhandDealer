const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT || undefined }
    : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
});

module.exports = pool;
