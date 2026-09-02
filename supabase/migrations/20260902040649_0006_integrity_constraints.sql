/*
# Database Integrity Constraints & Performance Indexes

1. Purpose
   This migration adds CHECK constraints to prevent negative values in critical
   numeric columns and creates missing indexes on foreign key columns identified
   by the database performance linter. No data is modified, deleted, or recalculated.

2. CHECK Constraints Added (all use IS NULL OR >= 0 to allow nullable columns)
   - farms.total_area, plots.area, paddy_crops.area
   - expenses: total_amount, amount_paid, amount_due
   - income: total_income, amount_received, amount_due, quantity
   - dragon_fruit_plantations: area, total_poles, total_plants, missing/dead/replacement
     plants, plants_per_pole, row_spacing, pole_spacing, border_spacing, alley_width
   - dragon_fruit_harvests: quantity, fruit_count, avg_fruit_weight
   - dragon_fruit_production_years: expected_production
   - dragon_fruit_sections: area
   - dragon_fruit_planting_material: quantity, cost_per_plant, total_cost
   - dragon_fruit_infrastructure: quantity, cost
   - expense_allocations: amount

3. Indexes Added
   - Foreign key indexes on activities, income, cultivations, expense_allocations,
     dragon_fruit_* child tables, paddy_harvests, paddy_nursery_batches.

4. Security
   - No RLS or policy changes. Existing policies remain unchanged.

5. Important Notes
   - All constraints use IF NOT EXISTS via DO $$ blocks for idempotency.
   - No data is modified or deleted. Only constraints and indexes are added.
   - Safe to re-run if a timeout occurs after commit.
*/

-- ============================================================
-- CHECK CONSTRAINTS: Non-negative values
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'farms_total_area_nonneg') THEN
    ALTER TABLE farms ADD CONSTRAINT farms_total_area_nonneg CHECK (total_area IS NULL OR total_area >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plots_area_nonneg') THEN
    ALTER TABLE plots ADD CONSTRAINT plots_area_nonneg CHECK (area IS NULL OR area >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'paddy_crops_area_nonneg') THEN
    ALTER TABLE paddy_crops ADD CONSTRAINT paddy_crops_area_nonneg CHECK (area IS NULL OR area >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_total_amount_nonneg') THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_total_amount_nonneg CHECK (total_amount IS NULL OR total_amount >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_amount_paid_nonneg') THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_amount_paid_nonneg CHECK (amount_paid IS NULL OR amount_paid >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_amount_due_nonneg') THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_amount_due_nonneg CHECK (amount_due IS NULL OR amount_due >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'income_total_income_nonneg') THEN
    ALTER TABLE income ADD CONSTRAINT income_total_income_nonneg CHECK (total_income IS NULL OR total_income >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'income_amount_received_nonneg') THEN
    ALTER TABLE income ADD CONSTRAINT income_amount_received_nonneg CHECK (amount_received IS NULL OR amount_received >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'income_amount_due_nonneg') THEN
    ALTER TABLE income ADD CONSTRAINT income_amount_due_nonneg CHECK (amount_due IS NULL OR amount_due >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'income_quantity_nonneg') THEN
    ALTER TABLE income ADD CONSTRAINT income_quantity_nonneg CHECK (quantity IS NULL OR quantity >= 0);
  END IF;
END $$;

-- Dragon Fruit plantation constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_plant_area_nonneg') THEN
    ALTER TABLE dragon_fruit_plantations ADD CONSTRAINT df_plant_area_nonneg CHECK (area IS NULL OR area >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_plant_poles_nonneg') THEN
    ALTER TABLE dragon_fruit_plantations ADD CONSTRAINT df_plant_poles_nonneg CHECK (total_poles IS NULL OR total_poles >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_plant_total_plants_nonneg') THEN
    ALTER TABLE dragon_fruit_plantations ADD CONSTRAINT df_plant_total_plants_nonneg CHECK (total_plants IS NULL OR total_plants >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_plant_missing_nonneg') THEN
    ALTER TABLE dragon_fruit_plantations ADD CONSTRAINT df_plant_missing_nonneg CHECK (missing_plants IS NULL OR missing_plants >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_plant_dead_nonneg') THEN
    ALTER TABLE dragon_fruit_plantations ADD CONSTRAINT df_plant_dead_nonneg CHECK (dead_plants IS NULL OR dead_plants >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_plant_replacement_nonneg') THEN
    ALTER TABLE dragon_fruit_plantations ADD CONSTRAINT df_plant_replacement_nonneg CHECK (replacement_plants IS NULL OR replacement_plants >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_plant_per_pole_nonneg') THEN
    ALTER TABLE dragon_fruit_plantations ADD CONSTRAINT df_plant_per_pole_nonneg CHECK (plants_per_pole IS NULL OR plants_per_pole >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_plant_spacing_nonneg') THEN
    ALTER TABLE dragon_fruit_plantations ADD CONSTRAINT df_plant_spacing_nonneg CHECK (
      (row_spacing IS NULL OR row_spacing >= 0) AND
      (pole_spacing IS NULL OR pole_spacing >= 0) AND
      (border_spacing IS NULL OR border_spacing >= 0) AND
      (alley_width IS NULL OR alley_width >= 0)
    );
  END IF;
END $$;

-- Dragon Fruit harvests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_harvest_qty_nonneg') THEN
    ALTER TABLE dragon_fruit_harvests ADD CONSTRAINT df_harvest_qty_nonneg CHECK (quantity IS NULL OR quantity >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_harvest_fruit_count_nonneg') THEN
    ALTER TABLE dragon_fruit_harvests ADD CONSTRAINT df_harvest_fruit_count_nonneg CHECK (fruit_count IS NULL OR fruit_count >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_harvest_avg_wt_nonneg') THEN
    ALTER TABLE dragon_fruit_harvests ADD CONSTRAINT df_harvest_avg_wt_nonneg CHECK (avg_fruit_weight IS NULL OR avg_fruit_weight >= 0);
  END IF;
END $$;

-- Dragon Fruit production years
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_py_expected_prod_nonneg') THEN
    ALTER TABLE dragon_fruit_production_years ADD CONSTRAINT df_py_expected_prod_nonneg CHECK (expected_production IS NULL OR expected_production >= 0);
  END IF;
END $$;

-- Dragon Fruit sections (only area column exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_section_area_nonneg') THEN
    ALTER TABLE dragon_fruit_sections ADD CONSTRAINT df_section_area_nonneg CHECK (area IS NULL OR area >= 0);
  END IF;
END $$;

-- Dragon Fruit planting material (columns: quantity, cost_per_plant, total_cost)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_pm_quantity_nonneg') THEN
    ALTER TABLE dragon_fruit_planting_material ADD CONSTRAINT df_pm_quantity_nonneg CHECK (quantity IS NULL OR quantity >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_pm_cost_per_plant_nonneg') THEN
    ALTER TABLE dragon_fruit_planting_material ADD CONSTRAINT df_pm_cost_per_plant_nonneg CHECK (cost_per_plant IS NULL OR cost_per_plant >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_pm_total_cost_nonneg') THEN
    ALTER TABLE dragon_fruit_planting_material ADD CONSTRAINT df_pm_total_cost_nonneg CHECK (total_cost IS NULL OR total_cost >= 0);
  END IF;
END $$;

-- Dragon Fruit infrastructure
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_infra_quantity_nonneg') THEN
    ALTER TABLE dragon_fruit_infrastructure ADD CONSTRAINT df_infra_quantity_nonneg CHECK (quantity IS NULL OR quantity >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'df_infra_cost_nonneg') THEN
    ALTER TABLE dragon_fruit_infrastructure ADD CONSTRAINT df_infra_cost_nonneg CHECK (cost IS NULL OR cost >= 0);
  END IF;
END $$;

-- Expense allocations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expense_alloc_amount_nonneg') THEN
    ALTER TABLE expense_allocations ADD CONSTRAINT expense_alloc_amount_nonneg CHECK (amount IS NULL OR amount >= 0);
  END IF;
END $$;

-- ============================================================
-- INDEXES: Missing indexes on foreign keys
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_activities_farm_id ON activities(farm_id);
CREATE INDEX IF NOT EXISTS idx_activities_paddy_crop_id ON activities(paddy_crop_id);
CREATE INDEX IF NOT EXISTS idx_activities_plot_id ON activities(plot_id);
CREATE INDEX IF NOT EXISTS idx_activities_cultivation_id ON activities(cultivation_id);
CREATE INDEX IF NOT EXISTS idx_income_farm_id ON income(farm_id);
CREATE INDEX IF NOT EXISTS idx_income_plot_id ON income(plot_id);
CREATE INDEX IF NOT EXISTS idx_income_cultivation_id ON income(cultivation_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cultivation_id ON expenses(cultivation_id);
CREATE INDEX IF NOT EXISTS idx_cultivations_farm_id ON cultivations(farm_id);
CREATE INDEX IF NOT EXISTS idx_cultivations_plot_id ON cultivations(plot_id);
CREATE INDEX IF NOT EXISTS idx_cultivations_season_id ON cultivations(season_id);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_farm_id ON expense_allocations(farm_id);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_expense_id ON expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_df_plantations_farm_id ON dragon_fruit_plantations(farm_id);
CREATE INDEX IF NOT EXISTS idx_df_plantations_plot_id ON dragon_fruit_plantations(plot_id);
CREATE INDEX IF NOT EXISTS idx_df_plantations_season_id ON dragon_fruit_plantations(season_id);
CREATE INDEX IF NOT EXISTS idx_df_production_years_plantation_id ON dragon_fruit_production_years(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_sections_plantation_id ON dragon_fruit_sections(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_harvests_plantation_id ON dragon_fruit_harvests(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_harvests_production_year_id ON dragon_fruit_harvests(production_year_id);
CREATE INDEX IF NOT EXISTS idx_df_health_records_plantation_id ON dragon_fruit_health_records(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_observations_plantation_id ON dragon_fruit_observations(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_infrastructure_plantation_id ON dragon_fruit_infrastructure(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_planting_material_plantation_id ON dragon_fruit_planting_material(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_plantation_varieties_plantation_id ON dragon_fruit_plantation_varieties(plantation_id);
CREATE INDEX IF NOT EXISTS idx_df_plantation_varieties_variety_id ON dragon_fruit_plantation_varieties(variety_id);
CREATE INDEX IF NOT EXISTS idx_paddy_harvests_cultivation_id ON paddy_harvests(cultivation_id);
CREATE INDEX IF NOT EXISTS idx_paddy_nursery_cultivation_id ON paddy_nursery_batches(cultivation_id);