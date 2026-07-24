const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function main() {
  if (!['1', 'true'].includes(process.env.ALLOW_SCHEMA_MIGRATION)) {
    throw new Error('ALLOW_SCHEMA_MIGRATION=true is required');
  }
  if (process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
    throw new Error('BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required');
  }
  const demoPassword = process.env.DEMO_PASSWORD || '';
  if (demoPassword.length < 12 || demoPassword.length > 72) {
    throw new Error('DEMO_PASSWORD must contain 12-72 characters');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    for (const filename of fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
      await pool.query(fs.readFileSync(path.join(migrationsDir, filename), 'utf8'));
    }

    const password = await bcrypt.hash(demoPassword, 12);
    const demoUsers = [
      ['admin@pawnshop.com', 'Mike Rossi', 'admin'],
      ['employee@pawnshop.com', 'Sarah Chen', 'employee'],
    ];
    for (const [email, name, role] of demoUsers) {
      await pool.query(
        `INSERT INTO users (email, password, name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE
         SET password = EXCLUDED.password, name = EXCLUDED.name, role = EXCLUDED.role`,
        [email, password, name, role]
      );
    }
    console.log(`Provisioned ${demoUsers.length} demo login users.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Runtime preparation failed: ${error.message}`);
  process.exit(1);
});
