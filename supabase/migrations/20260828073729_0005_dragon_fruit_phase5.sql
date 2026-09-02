/*
# Dhansiri Farm Manager — Phase 5: Dragon Fruit Management

This migration creates Dragon Fruit-specific tables that sit ON TOP of the
generic crop-management architecture from Phase 4. Dragon Fruit is treated
as a perennial crop: a plantation is established once and produces across
multiple production years.

## Design Principles

- Dragon Fruit plantations link to the existing `farms`, `plots`, and
  `paddy_seasons` tables — no duplicate farm/plot/season tables.
- Financial records (expenses, income) and activities are linked via the
  existing `cultivation_id` FK on `expenses`, `income`, and `activities`.
- Each plantation creates a `cultivations` row with `is_perennial = true`
  to integrate with the generic crop system and intercropping.
- Harvests use a Dragon-Fruit-specific harvest table with fruit-level
  details (fruit count, avg weight, grade).
- No fake seed data is inserted.

## 1. New Tables

### dragon_fruit_plantations
Top-level plantation record. Links to farm, plot, season, and a
cultivation record (is_perennial = true).
- id, name, farm_id, plot_id, season_id, cultivation_id
- plantation_start_date, establishment_year
- area, area_unit
- status (planned|land_preparation|establishing|established|productive|replanting|retired)
- total_poles, plants_per_pole, total_plants
- missing_plants, dead_plants, replacement_plants
- row_spacing, pole_spacing, border_spacing, alley_width, spacing_unit
- notes, created_at

### dragon_fruit_production_years
Annual production cycle linked to a plantation. Each year can have
multiple harvests.
- id, plantation_id, production_year, start_date, end_date
- status (planned|active|completed)
- expected_production, expected_unit
- notes, created_at

### dragon_fruit_sections
Optional sub-areas within a plantation for granular tracking.
- id, plantation_id, name, area, area_unit, notes, created_at

### dragon_fruit_varieties
Dragon Fruit cultivar master with DF-specific attributes.
- id, crop_variety_id (optional link to generic), name
- flesh_color, skin_color, source, planting_material_type
- is_active, notes, created_at

### dragon_fruit_plantation_varieties
Junction table: multiple varieties per plantation.
- id, plantation_id, variety_id, plant_count, notes, created_at

### dragon_fruit_harvests
Extended harvest record with fruit-level details.
- id, plantation_id, production_year_id, cultivation_id
- harvest_date, section_id
- quantity, unit, fruit_count, avg_fruit_weight, avg_fruit_size
- quality_grade, quality_notes
- notes, created_at

### dragon_fruit_health_records
Plant health / pest / disease tracking.
- id, plantation_id, section_id, record_date
- observation, problem_type, severity
- action_taken, product_used, quantity, cost
- follow_up_date, notes, created_at

### dragon_fruit_observations
General observations: flowering, pollination, fruit development, etc.
- id, plantation_id, section_id, observation_date, observation_type
- flower_count, flower_cluster_count
- pollination_method, pollination_type
- fruit_count, avg_fruit_size, avg_fruit_weight
- notes, created_at

### dragon_fruit_infrastructure
Infrastructure items installed on a plantation.
- id, plantation_id, infrastructure_type, quantity, unit
- installation_date, cost, notes, created_at

### dragon_fruit_planting_material
Planting material tracking (cuttings, rooted cuttings, nursery plants).
- id, plantation_id, material_type, quantity, source
- cost_per_plant, total_cost, planting_date, notes, created_at

## 2. Security (RLS)

Single-tenant no-auth app. All new tables enable RLS with full CRUD for
`anon, authenticated` (intentionally shared data, documented).

## 3. Important Notes

- All tables use proper FK references to existing tables.
- No existing data is modified or deleted.
- CHECK constraints enforce non-negative values for area, plant counts,
  quantities, costs, and fruit counts.
- The plantation's cultivation_id links to a cultivations row that has
  is_perennial = true, enabling intercropping via parent_cultivation_id.
*/

-- ===== dragon_fruit_plantations =====
CREATE TABLE IF NOT EXISTS dragon_fruit_plantations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  farm_id uuid REFERENCES farms(id) ON DELETE SET NULL,
  plot_id uuid REFERENCES plots(id) ON DELETE SET NULL,
  season_id uuid REFERENCES paddy_seasons(id) ON DELETE SET NULL,
  cultivation_id uuid REFERENCES cultivations(id) ON DELETE SET NULL,
  plantation_start_date date,
  establishment_year int,
  area numeric CHECK (area IS NULL OR area >= 0),
  area_unit text NOT NULL DEFAULT 'bigha',
  status text NOT NULL DEFAULT 'planned',
  total_poles int CHECK (total_poles IS NULL OR total_poles >= 0),
  plants_per_pole int CHECK (plants_per_pole IS NULL OR plants_per_pole >= 0),
  total_plants int CHECK (total_plants IS NULL OR total_plants >= 0),
  missing_plants int NOT NULL DEFAULT 0 CHECK (missing_plants >= 0),
  dead_plants int NOT NULL DEFAULT 0 CHECK (dead_plants >= 0),
  replacement_plants int NOT NULL DEFAULT 0 CHECK (replacement_plants >= 0),
  row_spacing numeric CHECK (row_spacing IS NULL OR row_spacing >= 0),
  pole_spacing numeric CHECK (pole_spacing IS NULL OR pole_spacing >= 0),
  border_spacing numeric CHECK (border_spacing IS NULL OR border_spacing >= 0),
  alley_width numeric CHECK (alley_width IS NULL OR alley_width >= 0),
  spacing_unit text DEFAULT 'feet',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dragon_fruit_plantations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_df_plantations" ON dragon_fruit_plantations;
CREATE POLICY "anon_select_df_plantations" ON dragon_fruit_plantations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_df_plantations" ON dragon_fruit_plantations;
CREATE POLICY "anon_insert_df_plantations" ON dragon_fruit_plantations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_df_plantations" ON dragon_fruit_plantations;
CREATE POLICY "anon_update_df_plantations" ON dragon_fruit_plantations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_df_plantations" ON dragon_fruit_plantations;
CREATE POLICY "anon_delete_df_plantations" ON dragon_fruit_plantations FOR DELETE TO anon, authenticated USING (true);

-- ===== dragon_fruit_production_years =====
CREATE TABLE IF NOT EXISTS dragon_fruit_production_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantation_id uuid NOT NULL REFERENCES dragon_fruit_plantations(id) ON DELETE CASCADE,
  production_year int NOT NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'planned',
  expected_production numeric CHECK (expected_production IS NULL OR expected_production >= 0),
  expected_unit text DEFAULT 'kg',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plantation_id, production_year)
);
ALTER TABLE dragon_fruit_production_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_df_prod_years" ON dragon_fruit_production_years;
CREATE POLICY "anon_select_df_prod_years" ON dragon_fruit_production_years FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_df_prod_years" ON dragon_fruit_production_years;
CREATE POLICY "anon_insert_df_prod_years" ON dragon_fruit_production_years FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_df_prod_years" ON dragon_fruit_production_years;
CREATE POLICY "anon_update_df_prod_years" ON dragon_fruit_production_years FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_df_prod_years" ON dragon_fruit_production_years;
CREATE POLICY "anon_delete_df_prod_years" ON dragon_fruit_production_years FOR DELETE TO anon, authenticated USING (true);

-- ===== dragon_fruit_sections =====
CREATE TABLE IF NOT EXISTS dragon_fruit_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantation_id uuid NOT NULL REFERENCES dragon_fruit_plantations(id) ON DELETE CASCADE,
  name text NOT NULL,
  area numeric CHECK (area IS NULL OR area >= 0),
  area_unit text NOT NULL DEFAULT 'bigha',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dragon_fruit_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_df_sections" ON dragon_fruit_sections;
CREATE POLICY "anon_select_df_sections" ON dragon_fruit_sections FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_df_sections" ON dragon_fruit_sections;
CREATE POLICY "anon_insert_df_sections" ON dragon_fruit_sections FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_df_sections" ON dragon_fruit_sections;
CREATE POLICY "anon_update_df_sections" ON dragon_fruit_sections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_df_sections" ON dragon_fruit_sections;
CREATE POLICY "anon_delete_df_sections" ON dragon_fruit_sections FOR DELETE TO anon, authenticated USING (true);

-- ===== dragon_fruit_varieties =====
CREATE TABLE IF NOT EXISTS dragon_fruit_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_variety_id uuid REFERENCES crop_varieties(id) ON DELETE SET NULL,
  name text NOT NULL,
  flesh_color text,
  skin_color text,
  source text,
  planting_material_type text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dragon_fruit_varieties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_df_varieties" ON dragon_fruit_varieties;
CREATE POLICY "anon_select_df_varieties" ON dragon_fruit_varieties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_df_varieties" ON dragon_fruit_varieties;
CREATE POLICY "anon_insert_df_varieties" ON dragon_fruit_varieties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_df_varieties" ON dragon_fruit_varieties;
CREATE POLICY "anon_update_df_varieties" ON dragon_fruit_varieties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_df_varieties" ON dragon_fruit_varieties;
CREATE POLICY "anon_delete_df_varieties" ON dragon_fruit_varieties FOR DELETE TO anon, authenticated USING (true);

-- ===== dragon_fruit_plantation_varieties =====
CREATE TABLE IF NOT EXISTS dragon_fruit_plantation_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantation_id uuid NOT NULL REFERENCES dragon_fruit_plantations(id) ON DELETE CASCADE,
  variety_id uuid NOT NULL REFERENCES dragon_fruit_varieties(id) ON DELETE CASCADE,
  plant_count int CHECK (plant_count IS NULL OR plant_count >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plantation_id, variety_id)
);
ALTER TABLE dragon_fruit_plantation_varieties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_df_plant_varieties" ON dragon_fruit_plantation_varieties;
CREATE POLICY "anon_select_df_plant_varieties" ON dragon_fruit_plantation_varieties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_df_plant_varieties" ON dragon_fruit_plantation_varieties;
CREATE POLICY "anon_insert_df_plant_varieties" ON dragon_fruit_plantation_varieties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_df_plant_varieties" ON dragon_fruit_plantation_varieties;
CREATE POLICY "anon_update_df_plant_varieties" ON dragon_fruit_plantation_varieties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_df_plant_varieties" ON dragon_fruit_plantation_varieties;
CREATE POLICY "anon_delete_df_plant_varieties" ON dragon_fruit_plantation_varieties FOR DELETE TO anon, authenticated USING (true);

-- ===== dragon_fruit_harvests =====
CREATE TABLE IF NOT EXISTS dragon_fruit_harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantation_id uuid NOT NULL REFERENCES dragon_fruit_plantations(id) ON DELETE CASCADE,
  production_year_id uuid REFERENCES dragon_fruit_production_years(id) ON DELETE SET NULL,
  cultivation_id uuid REFERENCES cultivations(id) ON DELETE SET NULL,
  harvest_date date,
  section_id uuid REFERENCES dragon_fruit_sections(id) ON DELETE SET NULL,
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text DEFAULT 'kg',
  fruit_count int CHECK (fruit_count IS NULL OR fruit_count >= 0),
  avg_fruit_weight numeric CHECK (avg_fruit_weight IS NULL OR avg_fruit_weight >= 0),
  avg_fruit_size numeric CHECK (avg_fruit_size IS NULL OR avg_fruit_size >= 0),
  quality_grade text,
  quality_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dragon_fruit_harvests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_df_harvests" ON dragon_fruit_harvests;
CREATE POLICY "anon_select_df_harvests" ON dragon_fruit_harvests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_df_harvests" ON dragon_fruit_harvests;
CREATE POLICY "anon_insert_df_harvests" ON dragon_fruit_harvests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_df_harvests" ON dragon_fruit_harvests;
CREATE POLICY "anon_update_df_harvests" ON dragon_fruit_harvests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_df_harvests" ON dragon_fruit_harvests;
CREATE POLICY "anon_delete_df_harvests" ON dragon_fruit_harvests FOR DELETE TO anon, authenticated USING (true);

-- ===== dragon_fruit_health_records =====
CREATE TABLE IF NOT EXISTS dragon_fruit_health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantation_id uuid NOT NULL REFERENCES dragon_fruit_plantations(id) ON DELETE CASCADE,
  section_id uuid REFERENCES dragon_fruit_sections(id) ON DELETE SET NULL,
  record_date date NOT NULL,
  observation text,
  problem_type text,
  severity text,
  action_taken text,
  product_used text,
  quantity numeric CHECK (quantity IS NULL OR quantity >= 0),
  cost numeric CHECK (cost IS NULL OR cost >= 0),
  follow_up_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dragon_fruit_health_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_df_health" ON dragon_fruit_health_records;
CREATE POLICY "anon_select_df_health" ON dragon_fruit_health_records FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_df_health" ON dragon_fruit_health_records;
CREATE POLICY "anon_insert_df_health" ON dragon_fruit_health_records FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_df_health" ON dragon_fruit_health_records;
CREATE POLICY "anon_update_df_health" ON dragon_fruit_health_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_df_health" ON dragon_fruit_health_records;
CREATE POLICY "anon_delete_df_health" ON dragon_fruit_health_records FOR DELETE TO anon, authenticated USING (true);

-- ===== dragon_fruit_observations =====
CREATE TABLE IF NOT EXISTS dragon_fruit_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantation_id uuid NOT NULL REFERENCES dragon_fruit_plantations(id) ON DELETE CASCADE,
  section_id uuid REFERENCES dragon_fruit_sections(id) ON DELETE SET NULL,
  observation_date date NOT NULL,
  observation_type text NOT NULL,
  flower_count int CHECK (flower_count IS NULL OR flower_count >= 0),
  flower_cluster_count int CHECK (flower_cluster_count IS NULL OR flower_cluster_count >= 0),
  pollination_method text,
  pollination_type text,
  fruit_count int CHECK (fruit_count IS NULL OR fruit_count >= 0),
  avg_fruit_size numeric CHECK (avg_fruit_size IS NULL OR avg_fruit_size >= 0),
  avg_fruit_weight numeric CHECK (avg_fruit_weight IS NULL OR avg_fruit_weight >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dragon_fruit_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_df_observations" ON dragon_fruit_observations;
CREATE POLICY "anon_select_df_observations" ON dragon_fruit_observations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_df_observations" ON dragon_fruit_observations;
CREATE POLICY "anon_insert_df_observations" ON dragon_fruit_observations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_df_observations" ON dragon_fruit_observations;
CREATE POLICY "anon_update_df_observations" ON dragon_fruit_observations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_df_observations" ON dragon_fruit_observations;
CREATE POLICY "anon_delete_df_observations" ON dragon_fruit_observations FOR DELETE TO anon, authenticated USING (true);

-- ===== dragon_fruit_infrastructure =====
CREATE TABLE IF NOT EXISTS dragon_fruit_infrastructure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantation_id uuid NOT NULL REFERENCES dragon_fruit_plantations(id) ON DELETE CASCADE,
  infrastructure_type text NOT NULL,
  quantity numeric CHECK (quantity IS NULL OR quantity >= 0),
  unit text,
  installation_date date,
  cost numeric CHECK (cost IS NULL OR cost >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dragon_fruit_infrastructure ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_df_infra" ON dragon_fruit_infrastructure;
CREATE POLICY "anon_select_df_infra" ON dragon_fruit_infrastructure FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_df_infra" ON dragon_fruit_infrastructure;
CREATE POLICY "anon_insert_df_infra" ON dragon_fruit_infrastructure FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_df_infra" ON dragon_fruit_infrastructure;
CREATE POLICY "anon_update_df_infra" ON dragon_fruit_infrastructure FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_df_infra" ON dragon_fruit_infrastructure;
CREATE POLICY "anon_delete_df_infra" ON dragon_fruit_infrastructure FOR DELETE TO anon, authenticated USING (true);

-- ===== dragon_fruit_planting_material =====
CREATE TABLE IF NOT EXISTS dragon_fruit_planting_material (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantation_id uuid NOT NULL REFERENCES dragon_fruit_plantations(id) ON DELETE CASCADE,
  material_type text NOT NULL,
  quantity int CHECK (quantity IS NULL OR quantity >= 0),
  source text,
  cost_per_plant numeric CHECK (cost_per_plant IS NULL OR cost_per_plant >= 0),
  total_cost numeric CHECK (total_cost IS NULL OR total_cost >= 0),
  planting_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dragon_fruit_planting_material ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_df_planting_material" ON dragon_fruit_planting_material;
CREATE POLICY "anon_select_df_planting_material" ON dragon_fruit_planting_material FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_df_planting_material" ON dragon_fruit_planting_material;
CREATE POLICY "anon_insert_df_planting_material" ON dragon_fruit_planting_material FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_df_planting_material" ON dragon_fruit_planting_material;
CREATE POLICY "anon_update_df_planting_material" ON dragon_fruit_planting_material FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_df_planting_material" ON dragon_fruit_planting_material;
CREATE POLICY "anon_delete_df_planting_material" ON dragon_fruit_planting_material FOR DELETE TO anon, authenticated USING (true);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_df_plantations_farm_id ON dragon_fruit_plantations(farm_id);
CREATE INDEX IF NOT EXISTS idx_df_plantations_plot_id ON dragon_fruit_plantations(plot_id);
CREATE INDEX IF NOT EXISTS idx_df_plantations_cultivation_id ON dragon_fruit_plantations(cultivation_id);
CREATE INDEX IF NOT EXISTS idx_df_plantations_status ON dragon_fruit_plantations(status);
CREATE INDEX IF NOT EXISTS idx_df_prod_years_plantation_id ON dragon_fruit_production_years(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_sections_plantation_id ON dragon_fruit_sections(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_harvests_plantation_id ON dragon_fruit_harvests(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_harvests_prod_year_id ON dragon_fruit_harvests(production_year_id);
CREATE INDEX IF NOT EXISTS idx_df_harvests_cultivation_id ON dragon_fruit_harvests(cultivation_id);
CREATE INDEX IF NOT EXISTS idx_df_health_plantation_id ON dragon_fruit_health_records(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_observations_plantation_id ON dragon_fruit_observations(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_infra_plantation_id ON dragon_fruit_infrastructure(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_planting_material_plantation_id ON dragon_fruit_planting_material(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_plant_varieties_plantation_id ON dragon_fruit_plantation_varieties(plantation_id);
