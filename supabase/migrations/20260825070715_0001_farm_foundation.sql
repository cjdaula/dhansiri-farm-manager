/*
# Dhansiri Farm Manager — Phase 1 Core Foundation

This migration creates the foundational relational schema for an integrated
farm management system. It is designed so future modules (dragon fruit, bee
farming, inventory, processing, sales, advanced analytics) can be added later
by introducing new tables and optional nullable foreign-key columns on the
existing expenses/income/activities tables — without redesigning the core.

## 1. New Tables

- `farms`
  - `id` (uuid, primary key)
  - `name` (text, not null) — farm name
  - `location` (text) — location description
  - `total_area` (numeric) — total farm area
  - `area_unit` (text) — unit for total_area (bigha/acre/hectare/sqft)
  - `notes` (text)
  - `created_at` (timestamptz)

- `plots`
  - `id` (uuid, primary key)
  - `farm_id` (uuid, FK -> farms, cascade delete)
  - `name` (text, not null) — plot name/number
  - `area` (numeric) — plot area
  - `area_unit` (text) — unit for area
  - `soil_type` (text)
  - `irrigation_available` (boolean, default false)
  - `notes` (text)
  - `created_at` (timestamptz)

- `crop_types`
  - `id` (uuid, primary key)
  - `name` (text, not null) — e.g. Paddy, Dragon Fruit, Turmeric
  - `category` (text) — grouping for future modules
  - `created_at` (timestamptz)
  - Seeded with a "Paddy" row for Phase 1.

- `paddy_crops`
  - `id` (uuid, primary key)
  - `season_year` (text, not null) — e.g. "2025 Sali"
  - `variety` (text) — paddy variety
  - `plot_id` (uuid, FK -> plots, set null on delete)
  - `area` (numeric)
  - `area_unit` (text)
  - `nursery_date` (date)
  - `transplanting_date` (date)
  - `expected_harvest_date` (date)
  - `actual_harvest_date` (date)
  - `seed_quantity` (numeric)
  - `seed_unit` (text) — e.g. kg
  - `expected_yield` (numeric)
  - `expected_yield_unit` (text)
  - `actual_yield` (numeric)
  - `actual_yield_unit` (text)
  - `status` (text) — planned/nursery/transplanted/growing/harvested/completed
  - `notes` (text)
  - `created_at` (timestamptz)

- `expenses`
  - `id` (uuid, primary key)
  - `date` (date, not null)
  - `category` (text, not null) — seed/fertilizer/pesticide/labour/...
  - `description` (text)
  - `farm_id` (uuid, FK -> farms, set null)
  - `plot_id` (uuid, FK -> plots, set null)
  - `paddy_crop_id` (uuid, FK -> paddy_crops, set null) — optional crop link
  - `quantity` (numeric)
  - `unit` (text)
  - `unit_cost` (numeric)
  - `total_amount` (numeric, not null) — qty * unit_cost, or manual entry
  - `payment_method` (text)
  - `notes` (text)
  - `created_at` (timestamptz)

- `income`
  - `id` (uuid, primary key)
  - `date` (date, not null)
  - `product` (text, not null)
  - `paddy_crop_id` (uuid, FK -> paddy_crops, set null) — optional crop link
  - `farm_id` (uuid, FK -> farms, set null)
  - `plot_id` (uuid, FK -> plots, set null)
  - `quantity` (numeric)
  - `unit` (text)
  - `price_per_unit` (numeric)
  - `total_income` (numeric, not null) — qty * price_per_unit
  - `buyer` (text)
  - `notes` (text)
  - `created_at` (timestamptz)

- `activities`
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `date` (date, not null)
  - `farm_id` (uuid, FK -> farms, set null)
  - `plot_id` (uuid, FK -> plots, set null)
  - `paddy_crop_id` (uuid, FK -> paddy_crops, set null)
  - `activity_type` (text) — land_preparation/nursery/sowing/...
  - `status` (text) — planned/done/cancelled
  - `notes` (text)
  - `created_at` (timestamptz)

- `settings`
  - `id` (int, primary key, fixed to 1) — singleton row
  - `bigha_sqft` (numeric, not null, default 14400) — local Bigha conversion
  - `farm_name` (text) — optional farm business name override
  - `updated_at` (timestamptz)

## 2. Security (RLS)

This is a single-tenant app with NO sign-in screen (Phase 1 does not require
authentication). Therefore every table enables RLS and grants full CRUD to
both `anon` and `authenticated` roles, because the data is intentionally
shared/single-tenant. `USING (true)` is documented as intentional here.

## 3. Important Notes

- Area is stored in the user's chosen unit; the application converts to square
  feet internally for calculations using `settings.bigha_sqft` for Bigha and
  fixed factors for Acre (43,560), Hectare (107,639.104), Sq-ft (1).
- A default settings row (id=1, bigha_sqft=14400) is inserted.
- A "Paddy" crop_type is seeded for Phase 1 linking.
- Future crop modules can add nullable `*_crop_id` FK columns to expenses,
  income, and activities without touching the existing schema.
*/

-- Farms
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  total_area numeric,
  area_unit text NOT NULL DEFAULT 'bigha',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_farms" ON farms;
CREATE POLICY "anon_select_farms" ON farms FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_farms" ON farms;
CREATE POLICY "anon_insert_farms" ON farms FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_farms" ON farms;
CREATE POLICY "anon_update_farms" ON farms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_farms" ON farms;
CREATE POLICY "anon_delete_farms" ON farms FOR DELETE TO anon, authenticated USING (true);

-- Plots
CREATE TABLE IF NOT EXISTS plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  area numeric,
  area_unit text NOT NULL DEFAULT 'bigha',
  soil_type text,
  irrigation_available boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_plots" ON plots;
CREATE POLICY "anon_select_plots" ON plots FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_plots" ON plots;
CREATE POLICY "anon_insert_plots" ON plots FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_plots" ON plots;
CREATE POLICY "anon_update_plots" ON plots FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_plots" ON plots;
CREATE POLICY "anon_delete_plots" ON plots FOR DELETE TO anon, authenticated USING (true);

-- Crop types
CREATE TABLE IF NOT EXISTS crop_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE crop_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_crop_types" ON crop_types;
CREATE POLICY "anon_select_crop_types" ON crop_types FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_crop_types" ON crop_types;
CREATE POLICY "anon_insert_crop_types" ON crop_types FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_crop_types" ON crop_types;
CREATE POLICY "anon_update_crop_types" ON crop_types FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_crop_types" ON crop_types;
CREATE POLICY "anon_delete_crop_types" ON crop_types FOR DELETE TO anon, authenticated USING (true);

-- Paddy crops
CREATE TABLE IF NOT EXISTS paddy_crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year text NOT NULL,
  variety text,
  plot_id uuid REFERENCES plots(id) ON DELETE SET NULL,
  area numeric,
  area_unit text NOT NULL DEFAULT 'bigha',
  nursery_date date,
  transplanting_date date,
  expected_harvest_date date,
  actual_harvest_date date,
  seed_quantity numeric,
  seed_unit text DEFAULT 'kg',
  expected_yield numeric,
  expected_yield_unit text DEFAULT 'kg',
  actual_yield numeric,
  actual_yield_unit text DEFAULT 'kg',
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE paddy_crops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_paddy_crops" ON paddy_crops;
CREATE POLICY "anon_select_paddy_crops" ON paddy_crops FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_paddy_crops" ON paddy_crops;
CREATE POLICY "anon_insert_paddy_crops" ON paddy_crops FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_paddy_crops" ON paddy_crops;
CREATE POLICY "anon_update_paddy_crops" ON paddy_crops FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_paddy_crops" ON paddy_crops;
CREATE POLICY "anon_delete_paddy_crops" ON paddy_crops FOR DELETE TO anon, authenticated USING (true);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  category text NOT NULL,
  description text,
  farm_id uuid REFERENCES farms(id) ON DELETE SET NULL,
  plot_id uuid REFERENCES plots(id) ON DELETE SET NULL,
  paddy_crop_id uuid REFERENCES paddy_crops(id) ON DELETE SET NULL,
  quantity numeric,
  unit text,
  unit_cost numeric,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_expenses" ON expenses;
CREATE POLICY "anon_select_expenses" ON expenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_expenses" ON expenses;
CREATE POLICY "anon_insert_expenses" ON expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_expenses" ON expenses;
CREATE POLICY "anon_update_expenses" ON expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_expenses" ON expenses;
CREATE POLICY "anon_delete_expenses" ON expenses FOR DELETE TO anon, authenticated USING (true);

-- Income
CREATE TABLE IF NOT EXISTS income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  product text NOT NULL,
  paddy_crop_id uuid REFERENCES paddy_crops(id) ON DELETE SET NULL,
  farm_id uuid REFERENCES farms(id) ON DELETE SET NULL,
  plot_id uuid REFERENCES plots(id) ON DELETE SET NULL,
  quantity numeric,
  unit text,
  price_per_unit numeric,
  total_income numeric NOT NULL DEFAULT 0,
  buyer text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_income" ON income;
CREATE POLICY "anon_select_income" ON income FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_income" ON income;
CREATE POLICY "anon_insert_income" ON income FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_income" ON income;
CREATE POLICY "anon_update_income" ON income FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_income" ON income;
CREATE POLICY "anon_delete_income" ON income FOR DELETE TO anon, authenticated USING (true);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date NOT NULL,
  farm_id uuid REFERENCES farms(id) ON DELETE SET NULL,
  plot_id uuid REFERENCES plots(id) ON DELETE SET NULL,
  paddy_crop_id uuid REFERENCES paddy_crops(id) ON DELETE SET NULL,
  activity_type text,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_activities" ON activities;
CREATE POLICY "anon_select_activities" ON activities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_activities" ON activities;
CREATE POLICY "anon_insert_activities" ON activities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_activities" ON activities;
CREATE POLICY "anon_update_activities" ON activities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_activities" ON activities;
CREATE POLICY "anon_delete_activities" ON activities FOR DELETE TO anon, authenticated USING (true);

-- Settings (singleton)
CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bigha_sqft numeric NOT NULL DEFAULT 14400,
  farm_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE TO anon, authenticated USING (true);

-- Seed default settings row and Paddy crop type
INSERT INTO settings (id, bigha_sqft) VALUES (1, 14400)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO crop_types (name, category) VALUES ('Paddy', 'paddy')
  ON CONFLICT DO NOTHING;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_plots_farm_id ON plots(farm_id);
CREATE INDEX IF NOT EXISTS idx_paddy_crops_plot_id ON paddy_crops(plot_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_farm_id ON expenses(farm_id);
CREATE INDEX IF NOT EXISTS idx_expenses_plot_id ON expenses(plot_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
