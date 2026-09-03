-- Rewindr — D1 (SQLite-kompatibel) databasschema
-- Körs med: npx wrangler d1 execute rewindr-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  is_admin INTEGER NOT NULL DEFAULT 0,
  banned INTEGER NOT NULL DEFAULT 0,
  stripe_account_id TEXT,
  stripe_charges_enabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  format TEXT,
  genre TEXT,
  price INTEGER NOT NULL,
  owner TEXT NOT NULL,
  note TEXT,
  image_url TEXT,
  for_sale INTEGER NOT NULL DEFAULT 0,
  delivery TEXT NOT NULL DEFAULT 'pickup',
  shipping_price INTEGER NOT NULL DEFAULT 0,
  replacement_value INTEGER NOT NULL DEFAULT 0,
  tradeable INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rentals (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  renter_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  rented_at INTEGER NOT NULL,
  days INTEGER NOT NULL,
  delivery TEXT,
  ship_cost INTEGER NOT NULL DEFAULT 0,
  rent_cost INTEGER NOT NULL DEFAULT 0,
  returned INTEGER NOT NULL DEFAULT 0,
  returned_at INTEGER,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  application_fee_amount INTEGER NOT NULL DEFAULT 0,
  -- "active_key" är NULL för återlämnade lån, men item_id för aktiva.
  -- Det unika indexet nedan gör det FYSISKT OMÖJLIGT att ha två aktiva
  -- uthyrningar av samma titel samtidigt, även vid samtidiga klick —
  -- databasen själv stoppar den andra, inte bara appens JS-kod.
  active_key TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_rental_per_item ON rentals(active_key);

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_title TEXT,
  owner TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  offered_item_id TEXT,
  offered_item_title TEXT,
  trade_type TEXT,
  trade_days INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  from_name TEXT NOT NULL,
  text TEXT NOT NULL,
  at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  owner_username TEXT NOT NULL,
  reviewer_username TEXT NOT NULL,
  rating INTEGER NOT NULL,
  text TEXT,
  at INTEGER NOT NULL
);
