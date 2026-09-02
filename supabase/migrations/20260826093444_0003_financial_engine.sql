/*
# Dhansiri Farm Manager — Phase 3: Financial & Profitability Engine

This migration builds the unified financial foundation that works across all
current and future farm enterprises (paddy, dragon fruit, turmeric, beekeeping,
processing, etc.). It extends the existing expenses/income tables in place
rather than creating duplicate financial tables.

## 1. New Tables

### expense_categories
Configurable category/subcategory system for expenses, replacing the hard-coded
EXPENSE_CATEGORIES constant. Parent rows have parent_id = NULL; subcategories
reference their parent.
- `id` (uuid, primary key)
- `name` (text, not null)
- `parent_id` (uuid, FK -> expense_categories, set null) — NULL for top-level categories
- `is_active` (boolean, default true) — soft-archive
- `created_at` (timestamptz)
Seeded with: Crop Production, Machinery, Farm Infrastructure, Post-Harvest, Business
and their subcategories (Seed, Fertilizer, Diesel, Repairs, etc.).

### units
Reusable unit registry grouped by category (weight, area, volume, count).
- `id` (uuid, primary key)
- `name` (text, not null) — display name, e.g. "kilogram"
- `symbol` (text) — short symbol, e.g. "kg"
- `unit_group` (text, not null) — weight | area | volume | count
- `is_active` (boolean, default true)
- `created_at` (timestamptz)
Seeded with gram, kilogram, quintal, tonne, square feet, bigha, acre, hectare,
litre, millilitre, piece, bag, packet, box, hive.

### expense_allocations
Optional cost-allocation mechanism. One expense can be split across multiple
crops/plots/farms. The sum of allocations must not exceed the original expense.
- `id` (uuid, primary key)
- `expense_id` (uuid, FK -> expenses, cascade delete)
- `farm_id` (uuid, FK -> farms, set null)
- `plot_id` (uuid, FK -> plots, set null)
- `crop_type_id` (uuid, FK -> crop_types, set null)
- `paddy_crop_id` (uuid, FK -> paddy_crops, set null)
- `amount` (numeric, not null) — allocated portion
- `notes` (text)
- `created_at` (timestamptz)

## 2. Modified Tables

### expenses (extended)
New nullable columns (all additive, existing rows remain valid):
- `subcategory` (text) — subcategory label
- `vendor` (text) — supplier/vendor
- `invoice_ref` (text) — invoice or reference number
- `expense_type` (text, default 'operating') — operating | capital
- `recurrence_type` (text, default 'one_time') — one_time|daily|weekly|monthly|seasonal|annual
- `recurrence_interval` (int) — interval count for recurrence
- `payment_status` (text, default 'paid') — paid | partially_paid | unpaid
- `amount_paid` (numeric) — amount already paid
- `amount_due` (numeric) — outstanding payable
- `crop_type_id` (uuid, FK -> crop_types, set null) — generic crop link for any future crop
- `season_id` (uuid, FK -> paddy_seasons, set null) — season link (reuses paddy_seasons for now)

### income (extended)
New nullable columns:
- `product_category` (text)
- `income_type` (text, default 'sale') — sale | other
- `payment_status` (text, default 'fully_received') — pending | partially_received | fully_received
- `amount_due` (numeric)
- `amount_received` (numeric)
- `invoice_ref` (text)
- `payment_method` (text)
- `crop_type_id` (uuid, FK -> crop_types, set null) — generic crop link
- `season_id` (uuid, FK -> paddy_seasons, set null) — season link

## 3. Security (RLS)

Single-tenant no-auth app. All new tables enable RLS with full CRUD for
`anon, authenticated` (intentionally shared data, documented).

## 4. Important Notes

- No expense/income data is lost: all new columns are nullable and additive.
- The existing `paddy_crop_id` FK on expenses/income is preserved; the new
  `crop_type_id` column enables linking to ANY crop type (paddy is one of them).
- `paddy_seasons` is reused as the season table for financial records to avoid
  creating a duplicate season table; future crop modules can add their own
  season tables and link via their own *_crop_id columns.
- A CHECK constraint on expense_allocations ensures allocated amount is non-negative.
- No seed financial records are inserted (per the no-fake-data requirement).
*/

-- expense_categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_expense_categories" ON expense_categories;
CREATE POLICY "anon_select_expense_categories" ON expense_categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_expense_categories" ON expense_categories;
CREATE POLICY "anon_insert_expense_categories" ON expense_categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_expense_categories" ON expense_categories;
CREATE POLICY "anon_update_expense_categories" ON expense_categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_expense_categories" ON expense_categories;
CREATE POLICY "anon_delete_expense_categories" ON expense_categories FOR DELETE TO anon, authenticated USING (true);

-- units
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  symbol text,
  unit_group text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_units" ON units;
CREATE POLICY "anon_select_units" ON units FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_units" ON units;
CREATE POLICY "anon_insert_units" ON units FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_units" ON units;
CREATE POLICY "anon_update_units" ON units FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_units" ON units;
CREATE POLICY "anon_delete_units" ON units FOR DELETE TO anon, authenticated USING (true);

-- expense_allocations
CREATE TABLE IF NOT EXISTS expense_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES farms(id) ON DELETE SET NULL,
  plot_id uuid REFERENCES plots(id) ON DELETE SET NULL,
  crop_type_id uuid REFERENCES crop_types(id) ON DELETE SET NULL,
  paddy_crop_id uuid REFERENCES paddy_crops(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE expense_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_expense_allocations" ON expense_allocations;
CREATE POLICY "anon_select_expense_allocations" ON expense_allocations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_expense_allocations" ON expense_allocations;
CREATE POLICY "anon_insert_expense_allocations" ON expense_allocations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_expense_allocations" ON expense_allocations;
CREATE POLICY "anon_update_expense_allocations" ON expense_allocations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_expense_allocations" ON expense_allocations;
CREATE POLICY "anon_delete_expense_allocations" ON expense_allocations FOR DELETE TO anon, authenticated USING (true);

-- Extend expenses with new columns (all nullable, idempotent)
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN subcategory text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN vendor text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN invoice_ref text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN expense_type text NOT NULL DEFAULT 'operating'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN recurrence_type text NOT NULL DEFAULT 'one_time'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN recurrence_interval int; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN payment_status text NOT NULL DEFAULT 'paid'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN amount_paid numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN amount_due numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN crop_type_id uuid REFERENCES crop_types(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN season_id uuid REFERENCES paddy_seasons(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Extend income with new columns (all nullable, idempotent)
DO $$ BEGIN ALTER TABLE income ADD COLUMN product_category text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE income ADD COLUMN income_type text NOT NULL DEFAULT 'sale'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE income ADD COLUMN payment_status text NOT NULL DEFAULT 'fully_received'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE income ADD COLUMN amount_due numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE income ADD COLUMN amount_received numeric; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE income ADD COLUMN invoice_ref text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE income ADD COLUMN payment_method text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE income ADD COLUMN crop_type_id uuid REFERENCES crop_types(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE income ADD COLUMN season_id uuid REFERENCES paddy_seasons(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Seed expense categories (idempotent)
INSERT INTO expense_categories (name) VALUES
  ('Crop Production'),
  ('Machinery'),
  ('Farm Infrastructure'),
  ('Post-Harvest'),
  ('Business')
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (name, parent_id)
SELECT s.name, p.id FROM expense_categories p
JOIN (VALUES
  ('Crop Production','Seed'), ('Crop Production','Seedling'), ('Crop Production','Fertilizer'),
  ('Crop Production','Manure'), ('Crop Production','Pesticide'), ('Crop Production','Herbicide'),
  ('Crop Production','Fungicide'), ('Crop Production','Labour'), ('Crop Production','Land preparation'),
  ('Crop Production','Transplanting'), ('Crop Production','Irrigation'), ('Crop Production','Harvesting'),
  ('Machinery','Diesel'), ('Machinery','Tractor'), ('Machinery','Machinery rental'),
  ('Machinery','Repairs'), ('Machinery','Maintenance'), ('Machinery','Spare parts'),
  ('Farm Infrastructure','Electricity'), ('Farm Infrastructure','Water system'), ('Farm Infrastructure','Pump'),
  ('Farm Infrastructure','Fencing'), ('Farm Infrastructure','Building'), ('Farm Infrastructure','Farm tools'),
  ('Farm Infrastructure','Equipment'),
  ('Post-Harvest','Drying'), ('Post-Harvest','Cleaning'), ('Post-Harvest','Milling'),
  ('Post-Harvest','Processing'), ('Post-Harvest','Packaging'), ('Post-Harvest','Storage'),
  ('Post-Harvest','Transport'),
  ('Business','Office'), ('Business','Marketing'), ('Business','Software'),
  ('Business','Professional services'), ('Business','Other')
) AS s(parent_name, name) ON s.parent_name = p.name
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories c WHERE c.name = s.name AND c.parent_id = p.id
)
ON CONFLICT DO NOTHING;

-- Seed units
INSERT INTO units (name, symbol, unit_group) VALUES
  ('gram','g','weight'), ('kilogram','kg','weight'), ('quintal','quintal','weight'), ('tonne','tonne','weight'),
  ('square feet','sqft','area'), ('bigha','bigha','area'), ('acre','acre','area'), ('hectare','hectare','area'),
  ('litre','litre','volume'), ('millilitre','ml','volume'),
  ('piece','piece','count'), ('bag','bag','count'), ('packet','packet','count'), ('box','box','count'), ('hive','hive','count')
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expense_categories_parent ON expense_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_status ON expenses(payment_status);
CREATE INDEX IF NOT EXISTS idx_expenses_crop_type_id ON expenses(crop_type_id);
CREATE INDEX IF NOT EXISTS idx_expenses_season_id ON expenses(season_id);
CREATE INDEX IF NOT EXISTS idx_income_payment_status ON income(payment_status);
CREATE INDEX IF NOT EXISTS idx_income_crop_type_id ON income(crop_type_id);
CREATE INDEX IF NOT EXISTS idx_income_season_id ON income(season_id);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_expense_id ON expense_allocations(expense_id);
