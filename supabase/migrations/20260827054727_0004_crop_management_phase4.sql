/*
# Dhansiri Farm Manager — Phase 4: Generic Crop Management & Planning

This migration builds the generic crop management foundation that supports
all current and future crops (paddy, dragon fruit, turmeric, ginger, etc.).
Paddy remains fully functional via its existing tables; the new generic
tables are additive and do not duplicate or migrate paddy data.

## 1. Modified Tables

### crop_types (extended)
New columns to make it a full crop master:
- `crop_nature` (text) — Annual | Biennial | Perennial | Seasonal | Multi-year
- `default_unit` (text) — default production unit (e.g. kg)
- `typical_production_unit` (text) — typical harvest unit
- `is_active` (boolean, default true) — soft-archive
- `notes` (text)

### expenses (extended)
- `cultivation_id` (uuid, FK -> cultivations, set null) — link to generic cultivation record

### income (extended)
- `cultivation_id` (uuid, FK -> cultivations, set null) — link to generic cultivation record

### activities (extended)
- `cultivation_id` (uuid, FK -> cultivations, set null) — link to generic cultivation record
- `planned_date` (date) — planned activity date (distinct from actual date)
- `actual_date` (date) — actual activity date

## 2. New Tables

### crop_varieties
Generic variety master usable by all crop types.
- `id` (uuid, primary key)
- `crop_type_id` (uuid, FK -> crop_types, cascade delete)
- `name` (text, not null) — variety name
- `variety_code` (text) — short code
- `duration_days` (int) — crop duration in days
- `maturity_days` (int) — maturity period in days
- `expected_yield` (numeric) — expected yield value
- `yield_unit` (text, default 'kg')
- `suitable_season` (text) — suitable season label
- `notes` (text)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)

### cultivations
Generic cultivation/production record. One row = one crop planted on one
plot in one season. Supports intercropping via parent_cultivation_id and
intercrop_role. Supports perennials via is_perennial, planting_date,
plant_age_years, plant_count, spacing, production_year.
- `id` (uuid, primary key)
- `crop_type_id` (uuid, FK -> crop_types, set null)
- `variety_id` (uuid, FK -> crop_varieties, set null)
- `season_id` (uuid, FK -> paddy_seasons, set null) — reuses existing seasons table
- `farm_id` (uuid, FK -> farms, set null)
- `plot_id` (uuid, FK -> plots, set null)
- `area` (numeric) — allocated area for this crop
- `area_unit` (text, default 'bigha')
- `start_date` (date) — planting/sowing/start date
- `expected_harvest_date` (date)
- `actual_harvest_date` (date)
- `status` (text, default 'planned') — planned|prepared|sown|nursery|transplanted|growing|flowering|fruiting|harvesting|harvested|completed|cancelled
- `is_perennial` (boolean, default false)
- `planting_date` (date) — for perennials: original plantation date
- `plant_age_years` (numeric) — for perennials
- `plant_count` (int) — for perennials
- `spacing` (text) — spacing info
- `production_year` (int) — for perennials: which production cycle year
- `parent_cultivation_id` (uuid, FK -> cultivations, set null) — for intercropping: parent crop
- `intercrop_role` (text) — primary | secondary | mixed
- `expected_yield` (numeric) — planned production
- `expected_yield_unit` (text, default 'kg')
- `expected_selling_price` (numeric) — expected price per unit
- `expected_cost` (numeric) — expected total cost
- `notes` (text)
- `created_at` (timestamptz)

### crop_harvests
Generic production/harvest records. Multiple harvests per cultivation
record are supported (e.g. dragon fruit, vegetables).
- `id` (uuid, primary key)
- `cultivation_id` (uuid, FK -> cultivations, cascade delete)
- `harvest_date` (date)
- `quantity` (numeric, not null) — harvested quantity
- `unit` (text, default 'kg')
- `quality_grade` (text) — A | B | C | Other
- `moisture_percentage` (numeric) — where applicable
- `loss_quantity` (numeric) — wastage/loss
- `final_quantity` (numeric) — net after loss
- `notes` (text)
- `created_at` (timestamptz)

## 3. Security (RLS)

Single-tenant no-auth app. All new/modified tables enable RLS with full
CRUD for `anon, authenticated` (intentionally shared data, documented).

## 4. Important Notes

- No existing data is lost: all new columns are nullable and additive.
- Paddy tables (paddy_crops, paddy_varieties, paddy_seasons, etc.) are
  untouched and remain fully functional.
- `paddy_seasons` is reused as the season table for cultivations.
- The `cultivation_id` columns on expenses/income/activities enable linking
  financial records and activities to any generic cultivation record.
- Intercropping is supported via parent_cultivation_id and intercrop_role.
- Perennial support is built into cultivations via is_perennial.
- No seed crop data is inserted (per the no-fake-data requirement).
*/

-- ===== Extend crop_types =====
DO $$ BEGIN ALTER TABLE crop_types ADD COLUMN crop_nature text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE crop_types ADD COLUMN default_unit text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE crop_types ADD COLUMN typical_production_unit text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE crop_types ADD COLUMN is_active boolean NOT NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE crop_types ADD COLUMN notes text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ===== crop_varieties =====
CREATE TABLE IF NOT EXISTS crop_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type_id uuid NOT NULL REFERENCES crop_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  variety_code text,
  duration_days int,
  maturity_days int,
  expected_yield numeric,
  yield_unit text DEFAULT 'kg',
  suitable_season text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE crop_varieties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_crop_varieties" ON crop_varieties;
CREATE POLICY "anon_select_crop_varieties" ON crop_varieties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_crop_varieties" ON crop_varieties;
CREATE POLICY "anon_insert_crop_varieties" ON crop_varieties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_crop_varieties" ON crop_varieties;
CREATE POLICY "anon_update_crop_varieties" ON crop_varieties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_crop_varieties" ON crop_varieties;
CREATE POLICY "anon_delete_crop_varieties" ON crop_varieties FOR DELETE TO anon, authenticated USING (true);

-- ===== cultivations =====
CREATE TABLE IF NOT EXISTS cultivations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type_id uuid REFERENCES crop_types(id) ON DELETE SET NULL,
  variety_id uuid REFERENCES crop_varieties(id) ON DELETE SET NULL,
  season_id uuid REFERENCES paddy_seasons(id) ON DELETE SET NULL,
  farm_id uuid REFERENCES farms(id) ON DELETE SET NULL,
  plot_id uuid REFERENCES plots(id) ON DELETE SET NULL,
  area numeric,
  area_unit text NOT NULL DEFAULT 'bigha',
  start_date date,
  expected_harvest_date date,
  actual_harvest_date date,
  status text NOT NULL DEFAULT 'planned',
  is_perennial boolean NOT NULL DEFAULT false,
  planting_date date,
  plant_age_years numeric,
  plant_count int,
  spacing text,
  production_year int,
  parent_cultivation_id uuid REFERENCES cultivations(id) ON DELETE SET NULL,
  intercrop_role text,
  expected_yield numeric,
  expected_yield_unit text DEFAULT 'kg',
  expected_selling_price numeric,
  expected_cost numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cultivations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cultivations" ON cultivations;
CREATE POLICY "anon_select_cultivations" ON cultivations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cultivations" ON cultivations;
CREATE POLICY "anon_insert_cultivations" ON cultivations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cultivations" ON cultivations;
CREATE POLICY "anon_update_cultivations" ON cultivations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cultivations" ON cultivations;
CREATE POLICY "anon_delete_cultivations" ON cultivations FOR DELETE TO anon, authenticated USING (true);

-- ===== crop_harvests =====
CREATE TABLE IF NOT EXISTS crop_harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivation_id uuid NOT NULL REFERENCES cultivations(id) ON DELETE CASCADE,
  harvest_date date,
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text DEFAULT 'kg',
  quality_grade text,
  moisture_percentage numeric,
  loss_quantity numeric CHECK (loss_quantity >= 0),
  final_quantity numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE crop_harvests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_crop_harvests" ON crop_harvests;
CREATE POLICY "anon_select_crop_harvests" ON crop_harvests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_crop_harvests" ON crop_harvests;
CREATE POLICY "anon_insert_crop_harvests" ON crop_harvests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_crop_harvests" ON crop_harvests;
CREATE POLICY "anon_update_crop_harvests" ON crop_harvests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_crop_harvests" ON crop_harvests;
CREATE POLICY "anon_delete_crop_harvests" ON crop_harvests FOR DELETE TO anon, authenticated USING (true);

-- ===== Now add cultivation_id FK columns to expenses, income, activities =====
DO $$ BEGIN ALTER TABLE expenses ADD COLUMN cultivation_id uuid REFERENCES cultivations(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE income ADD COLUMN cultivation_id uuid REFERENCES cultivations(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE activities ADD COLUMN cultivation_id uuid REFERENCES cultivations(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE activities ADD COLUMN planned_date date; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE activities ADD COLUMN actual_date date; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_crop_varieties_crop_type_id ON crop_varieties(crop_type_id);
CREATE INDEX IF NOT EXISTS idx_cultivations_crop_type_id ON cultivations(crop_type_id);
CREATE INDEX IF NOT EXISTS idx_cultivations_variety_id ON cultivations(variety_id);
CREATE INDEX IF NOT EXISTS idx_cultivations_season_id ON cultivations(season_id);
CREATE INDEX IF NOT EXISTS idx_cultivations_farm_id ON cultivations(farm_id);
CREATE INDEX IF NOT EXISTS idx_cultivations_plot_id ON cultivations(plot_id);
CREATE INDEX IF NOT EXISTS idx_cultivations_status ON cultivations(status);
CREATE INDEX IF NOT EXISTS idx_cultivations_parent_cultivation_id ON cultivations(parent_cultivation_id);
CREATE INDEX IF NOT EXISTS idx_crop_harvests_cultivation_id ON crop_harvests(cultivation_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cultivation_id ON expenses(cultivation_id);
CREATE INDEX IF NOT EXISTS idx_income_cultivation_id ON income(cultivation_id);
CREATE INDEX IF NOT EXISTS idx_activities_cultivation_id ON activities(cultivation_id);
