/*
# Dhansiri Farm Manager — Phase 2: Complete Paddy Management

This migration extends the paddy module into a full multi-variety, multi-season
cultivation management system. It adds dedicated master tables for varieties and
seasons, supports multiple nursery batches per cultivation, and records harvest
data with moisture/loss adjustments for future inventory integration.

## 1. New Tables

### paddy_varieties
- `id` (uuid, primary key)
- `name` (text, not null) — variety name, e.g. Ranjit, CR Dhan 801
- `variety_type` (text) — e.g. High-yielding, Local, Hybrid, Aromatic
- `duration_days` (int) — typical crop duration in days
- `grain_type` (text) — e.g. Long, Medium, Short
- `rice_type` (text) — e.g. Basmati, Samba, Joha, Bora, Black
- `expected_yield` (numeric) — typical expected yield (informational)
- `expected_yield_unit` (text, default 'kg')
- `suitable_season` (text) — e.g. Sali, Ahu, Boro, Rabi
- `notes` (text)
- `is_active` (boolean, default true) — archived = false
- `created_at` (timestamptz)

### paddy_seasons
- `id` (uuid, primary key)
- `name` (text, not null) — e.g. "2026-27 Sali"
- `agri_year` (text, not null) — e.g. "2026-27"
- `start_date` (date)
- `end_date` (date)
- `status` (text, default 'planned') — planned/active/completed
- `notes` (text)
- `created_at` (timestamptz)

### paddy_nursery_batches
- `id` (uuid, primary key)
- `cultivation_id` (uuid, FK -> paddy_cultivations, cascade delete)
- `batch_number` (text) — e.g. "Batch 1", "Batch 2"
- `nursery_date` (date, not null)
- `nursery_area` (numeric)
- `nursery_area_unit` (text, default 'bigha')
- `seed_quantity` (numeric)
- `seed_unit` (text, default 'kg')
- `notes` (text)
- `created_at` (timestamptz)

### paddy_harvests
- `id` (uuid, primary key)
- `cultivation_id` (uuid, FK -> paddy_cultivations, cascade delete)
- `harvest_date` (date)
- `harvested_area` (numeric)
- `harvested_area_unit` (text, default 'bigha')
- `gross_quantity` (numeric) — gross paddy harvested
- `quantity_unit` (text, default 'kg')
- `moisture_percentage` (numeric) — moisture at harvest
- `drying_loss` (numeric) — drying/shrinkage adjustment
- `final_quantity` (numeric) — net available after adjustments
- `notes` (text)
- `created_at` (timestamptz)

## 2. Modified Tables

### paddy_crops (extended)
New nullable columns added to support the full cultivation record:
- `farm_id` (uuid, FK -> farms, set null on delete)
- `variety_id` (uuid, FK -> paddy_varieties, set null on delete)
- `season_id` (uuid, FK -> paddy_seasons, set null on delete)
- `nursery_area` (numeric)
- `nursery_area_unit` (text, default 'bigha')
- `nursery_batch_number` (text)
- `nursery_notes` (text)
- `seedling_age_days` (int)
- `planting_method` (text) — e.g. Manual, DSR, Machine
- `spacing` (text) — e.g. 25x25 cm
- `labour_used` (numeric) — person-days
- `transplanting_notes` (text)
- `irrigation_notes` (text)
- `fertilizer_notes` (text)
- `crop_protection_notes` (text)
- `observations` (text)
- `harvested_area` (numeric)
- `harvested_area_unit` (text, default 'bigha')
- `gross_quantity` (numeric)
- `moisture_percentage` (numeric)
- `drying_loss` (numeric)
- `final_quantity` (numeric)
- `harvest_notes` (text)
- `archived` (boolean, default false)

The existing `season_year` (text) and `variety` (text) columns are kept for
backward compatibility with Phase 1 data; the new `season_id` and `variety_id`
foreign keys are the preferred links going forward.

## 3. Security (RLS)

Single-tenant no-auth app. All new tables enable RLS with full CRUD for
`anon, authenticated` (intentionally shared data, documented).

## 4. Important Notes

- No seed data is inserted. The variety/season tables start empty.
- paddy_nursery_batches allows multiple batches per cultivation.
- paddy_harvests allows multiple harvest entries per cultivation (partial harvests).
- The existing `activities.paddy_crop_id` FK already links activities to cultivations.
- The existing `expenses.paddy_crop_id` and `income.paddy_crop_id` FKs already link
  financial records to cultivations — no new expense/income tables needed.
- All new columns on paddy_crops are nullable so existing Phase 1 rows remain valid.
*/

-- paddy_varieties
CREATE TABLE IF NOT EXISTS paddy_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  variety_type text,
  duration_days int,
  grain_type text,
  rice_type text,
  expected_yield numeric,
  expected_yield_unit text DEFAULT 'kg',
  suitable_season text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE paddy_varieties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_paddy_varieties" ON paddy_varieties;
CREATE POLICY "anon_select_paddy_varieties" ON paddy_varieties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_paddy_varieties" ON paddy_varieties;
CREATE POLICY "anon_insert_paddy_varieties" ON paddy_varieties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_paddy_varieties" ON paddy_varieties;
CREATE POLICY "anon_update_paddy_varieties" ON paddy_varieties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_paddy_varieties" ON paddy_varieties;
CREATE POLICY "anon_delete_paddy_varieties" ON paddy_varieties FOR DELETE TO anon, authenticated USING (true);

-- paddy_seasons
CREATE TABLE IF NOT EXISTS paddy_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  agri_year text NOT NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE paddy_seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_paddy_seasons" ON paddy_seasons;
CREATE POLICY "anon_select_paddy_seasons" ON paddy_seasons FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_paddy_seasons" ON paddy_seasons;
CREATE POLICY "anon_insert_paddy_seasons" ON paddy_seasons FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_paddy_seasons" ON paddy_seasons;
CREATE POLICY "anon_update_paddy_seasons" ON paddy_seasons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_paddy_seasons" ON paddy_seasons;
CREATE POLICY "anon_delete_paddy_seasons" ON paddy_seasons FOR DELETE TO anon, authenticated USING (true);

-- Extend paddy_crops with new columns (all nullable, idempotent)
DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN farm_id uuid REFERENCES farms(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN variety_id uuid REFERENCES paddy_varieties(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN season_id uuid REFERENCES paddy_seasons(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN nursery_area numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN nursery_area_unit text DEFAULT 'bigha';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN nursery_batch_number text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN nursery_notes text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN seedling_age_days int;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN planting_method text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN spacing text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN labour_used numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN transplanting_notes text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN irrigation_notes text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN fertilizer_notes text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN crop_protection_notes text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN observations text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN harvested_area numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN harvested_area_unit text DEFAULT 'bigha';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN gross_quantity numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN moisture_percentage numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN drying_loss numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN final_quantity numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN harvest_notes text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paddy_crops ADD COLUMN archived boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- paddy_nursery_batches
CREATE TABLE IF NOT EXISTS paddy_nursery_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivation_id uuid NOT NULL REFERENCES paddy_crops(id) ON DELETE CASCADE,
  batch_number text,
  nursery_date date NOT NULL,
  nursery_area numeric,
  nursery_area_unit text DEFAULT 'bigha',
  seed_quantity numeric,
  seed_unit text DEFAULT 'kg',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE paddy_nursery_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_paddy_nursery_batches" ON paddy_nursery_batches;
CREATE POLICY "anon_select_paddy_nursery_batches" ON paddy_nursery_batches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_paddy_nursery_batches" ON paddy_nursery_batches;
CREATE POLICY "anon_insert_paddy_nursery_batches" ON paddy_nursery_batches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_paddy_nursery_batches" ON paddy_nursery_batches;
CREATE POLICY "anon_update_paddy_nursery_batches" ON paddy_nursery_batches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_paddy_nursery_batches" ON paddy_nursery_batches;
CREATE POLICY "anon_delete_paddy_nursery_batches" ON paddy_nursery_batches FOR DELETE TO anon, authenticated USING (true);

-- paddy_harvests
CREATE TABLE IF NOT EXISTS paddy_harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivation_id uuid NOT NULL REFERENCES paddy_crops(id) ON DELETE CASCADE,
  harvest_date date,
  harvested_area numeric,
  harvested_area_unit text DEFAULT 'bigha',
  gross_quantity numeric,
  quantity_unit text DEFAULT 'kg',
  moisture_percentage numeric,
  drying_loss numeric,
  final_quantity numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE paddy_harvests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_paddy_harvests" ON paddy_harvests;
CREATE POLICY "anon_select_paddy_harvests" ON paddy_harvests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_paddy_harvests" ON paddy_harvests;
CREATE POLICY "anon_insert_paddy_harvests" ON paddy_harvests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_paddy_harvests" ON paddy_harvests;
CREATE POLICY "anon_update_paddy_harvests" ON paddy_harvests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_paddy_harvests" ON paddy_harvests;
CREATE POLICY "anon_delete_paddy_harvests" ON paddy_harvests FOR DELETE TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_paddy_crops_farm_id ON paddy_crops(farm_id);
CREATE INDEX IF NOT EXISTS idx_paddy_crops_variety_id ON paddy_crops(variety_id);
CREATE INDEX IF NOT EXISTS idx_paddy_crops_season_id ON paddy_crops(season_id);
CREATE INDEX IF NOT EXISTS idx_paddy_crops_archived ON paddy_crops(archived);
CREATE INDEX IF NOT EXISTS idx_paddy_nursery_cultivation ON paddy_nursery_batches(cultivation_id);
CREATE INDEX IF NOT EXISTS idx_paddy_harvests_cultivation ON paddy_harvests(cultivation_id);
