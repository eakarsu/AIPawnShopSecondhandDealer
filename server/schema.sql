-- AI Pawn Shop & Secondhand Dealer - Database Schema
-- Drop existing tables in reverse dependency order

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS auction_items CASCADE;
DROP TABLE IF EXISTS auctions CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS cash_drawer_transactions CASCADE;
DROP TABLE IF EXISTS cash_drawers CASCADE;
DROP TABLE IF EXISTS police_report_items CASCADE;
DROP TABLE IF EXISTS police_reports CASCADE;
DROP TABLE IF EXISTS firearm_log CASCADE;
DROP TABLE IF EXISTS precious_metals_log CASCADE;
DROP TABLE IF EXISTS hold_periods CASCADE;
DROP TABLE IF EXISTS layaway_payments CASCADE;
DROP TABLE IF EXISTS layaways CASCADE;
DROP TABLE IF EXISTS loan_payments CASCADE;
DROP TABLE IF EXISTS loan_extensions CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),
  id_type VARCHAR(50),
  id_number VARCHAR(100),
  id_expiry DATE,
  date_of_birth DATE,
  photo_url TEXT,
  notes TEXT,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  serial_number VARCHAR(100),
  brand VARCHAR(100),
  model VARCHAR(100),
  condition VARCHAR(50),
  cost_price DECIMAL(10,2),
  retail_price DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'available',
  location VARCHAR(100),
  photo_url TEXT,
  customer_id INTEGER REFERENCES customers(id),
  acquired_date DATE DEFAULT CURRENT_DATE,
  hold_until DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LOANS
-- ============================================================
CREATE TABLE loans (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  inventory_id INTEGER REFERENCES inventory(id),
  item_description TEXT NOT NULL,
  principal_amount DECIMAL(10,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  maturity_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  total_due DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LOAN PAYMENTS
-- ============================================================
CREATE TABLE loan_payments (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER REFERENCES loans(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type VARCHAR(50) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LOAN EXTENSIONS
-- ============================================================
CREATE TABLE loan_extensions (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER REFERENCES loans(id) NOT NULL,
  old_maturity_date DATE NOT NULL,
  new_maturity_date DATE NOT NULL,
  extension_fee DECIMAL(10,2),
  extension_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LAYAWAYS
-- ============================================================
CREATE TABLE layaways (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  inventory_id INTEGER REFERENCES inventory(id) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  down_payment DECIMAL(10,2) NOT NULL,
  monthly_payment DECIMAL(10,2) NOT NULL,
  remaining_balance DECIMAL(10,2) NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- LAYAWAY PAYMENTS
-- ============================================================
CREATE TABLE layaway_payments (
  id SERIAL PRIMARY KEY,
  layaway_id INTEGER REFERENCES layaways(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- HOLD PERIODS
-- ============================================================
CREATE TABLE hold_periods (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(id) NOT NULL,
  hold_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  police_case_number VARCHAR(100),
  officer_name VARCHAR(100),
  officer_badge VARCHAR(50),
  department VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PRECIOUS METALS LOG
-- ============================================================
CREATE TABLE precious_metals_log (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(id),
  customer_id INTEGER REFERENCES customers(id),
  metal_type VARCHAR(50) NOT NULL,
  purity VARCHAR(20),
  weight_grams DECIMAL(10,3),
  test_method VARCHAR(50),
  test_result VARCHAR(50),
  tested_by VARCHAR(100),
  test_date DATE DEFAULT CURRENT_DATE,
  market_price_per_gram DECIMAL(10,2),
  estimated_value DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- FIREARM LOG
-- ============================================================
CREATE TABLE firearm_log (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(id),
  customer_id INTEGER REFERENCES customers(id),
  manufacturer VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  serial_number VARCHAR(100) NOT NULL,
  caliber VARCHAR(50),
  firearm_type VARCHAR(50),
  action_type VARCHAR(50),
  barrel_length VARCHAR(20),
  transaction_type VARCHAR(50) NOT NULL,
  transaction_date DATE DEFAULT CURRENT_DATE,
  acquisition_disposition VARCHAR(20),
  nics_check_number VARCHAR(100),
  nics_check_date DATE,
  nics_result VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- POLICE REPORTS
-- ============================================================
CREATE TABLE police_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  report_type VARCHAR(50) NOT NULL,
  department VARCHAR(100),
  officer_name VARCHAR(100),
  badge_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- POLICE REPORT ITEMS
-- ============================================================
CREATE TABLE police_report_items (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES police_reports(id) NOT NULL,
  inventory_id INTEGER REFERENCES inventory(id),
  customer_id INTEGER REFERENCES customers(id),
  transaction_type VARCHAR(50),
  item_description TEXT,
  serial_number VARCHAR(100),
  amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CASH DRAWERS
-- ============================================================
CREATE TABLE cash_drawers (
  id SERIAL PRIMARY KEY,
  drawer_name VARCHAR(100) NOT NULL,
  location VARCHAR(100),
  opening_balance DECIMAL(10,2) DEFAULT 0,
  current_balance DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'closed',
  opened_by INTEGER REFERENCES users(id),
  opened_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CASH DRAWER TRANSACTIONS
-- ============================================================
CREATE TABLE cash_drawer_transactions (
  id SERIAL PRIMARY KEY,
  drawer_id INTEGER REFERENCES cash_drawers(id) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference_type VARCHAR(50),
  reference_id INTEGER,
  description TEXT,
  performed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- RECEIPTS
-- ============================================================
CREATE TABLE receipts (
  id SERIAL PRIMARY KEY,
  receipt_number VARCHAR(20) UNIQUE NOT NULL,
  receipt_type VARCHAR(50) NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  loan_id INTEGER REFERENCES loans(id),
  items JSONB,
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  total DECIMAL(10,2),
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- AUCTIONS
-- ============================================================
CREATE TABLE auctions (
  id SERIAL PRIMARY KEY,
  auction_name VARCHAR(255) NOT NULL,
  auction_date DATE NOT NULL,
  auction_type VARCHAR(50) DEFAULT 'liquidation',
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- AUCTION ITEMS
-- ============================================================
CREATE TABLE auction_items (
  id SERIAL PRIMARY KEY,
  auction_id INTEGER REFERENCES auctions(id) NOT NULL,
  inventory_id INTEGER REFERENCES inventory(id) NOT NULL,
  loan_id INTEGER REFERENCES loans(id),
  starting_bid DECIMAL(10,2),
  winning_bid DECIMAL(10,2),
  winner_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  loan_id INTEGER REFERENCES loans(id),
  notification_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  sent_via VARCHAR(50),
  sent_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
