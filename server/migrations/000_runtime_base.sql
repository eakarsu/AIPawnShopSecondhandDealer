CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_valuations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  inventory_id INTEGER,
  endpoint VARCHAR(100),
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
