export type AreaUnit = 'bigha' | 'acre' | 'hectare' | 'sqft';

export interface Farm {
  id: string;
  name: string;
  location: string | null;
  total_area: number | null;
  area_unit: AreaUnit;
  notes: string | null;
  created_at: string;
}

export interface Plot {
  id: string;
  farm_id: string | null;
  name: string;
  area: number | null;
  area_unit: AreaUnit;
  soil_type: string | null;
  irrigation_available: boolean;
  notes: string | null;
  created_at: string;
}

export type PaddyStatus =
  | 'planned'
  | 'nursery'
  | 'transplanted'
  | 'growing'
  | 'harvested'
  | 'completed';

export interface PaddyCrop {
  id: string;
  season_year: string | null;
  variety: string | null;
  plot_id: string | null;
  area: number | null;
  area_unit: AreaUnit;
  nursery_date: string | null;
  transplanting_date: string | null;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  seed_quantity: number | null;
  seed_unit: string | null;
  expected_yield: number | null;
  expected_yield_unit: string | null;
  actual_yield: number | null;
  actual_yield_unit: string | null;
  status: PaddyStatus;
  notes: string | null;
  created_at: string;
  farm_id: string | null;
  variety_id: string | null;
  season_id: string | null;
  nursery_area: number | null;
  nursery_area_unit: string | null;
  nursery_batch_number: string | null;
  nursery_notes: string | null;
  seedling_age_days: number | null;
  planting_method: string | null;
  spacing: string | null;
  labour_used: number | null;
  transplanting_notes: string | null;
  irrigation_notes: string | null;
  fertilizer_notes: string | null;
  crop_protection_notes: string | null;
  observations: string | null;
  harvested_area: number | null;
  harvested_area_unit: string | null;
  gross_quantity: number | null;
  moisture_percentage: number | null;
  drying_loss: number | null;
  final_quantity: number | null;
  harvest_notes: string | null;
  archived: boolean;
}

export interface PaddyVariety {
  id: string;
  name: string;
  variety_type: string | null;
  duration_days: number | null;
  grain_type: string | null;
  rice_type: string | null;
  expected_yield: number | null;
  expected_yield_unit: string | null;
  suitable_season: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PaddySeason {
  id: string;
  name: string;
  agri_year: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface PaddyNurseryBatch {
  id: string;
  cultivation_id: string;
  batch_number: string | null;
  nursery_date: string;
  nursery_area: number | null;
  nursery_area_unit: string | null;
  seed_quantity: number | null;
  seed_unit: string | null;
  notes: string | null;
  created_at: string;
}

export interface PaddyHarvest {
  id: string;
  cultivation_id: string;
  harvest_date: string | null;
  harvested_area: number | null;
  harvested_area_unit: string | null;
  gross_quantity: number | null;
  quantity_unit: string | null;
  moisture_percentage: number | null;
  drying_loss: number | null;
  final_quantity: number | null;
  notes: string | null;
  created_at: string;
}

export type ExpenseType = 'operating' | 'capital';
export type RecurrenceType = 'one_time' | 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'annual';
export type ExpensePaymentStatus = 'paid' | 'partially_paid' | 'unpaid';

export interface Expense {
  id: string;
  date: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  farm_id: string | null;
  plot_id: string | null;
  paddy_crop_id: string | null;
  crop_type_id: string | null;
  season_id: string | null;
  cultivation_id: string | null;
  quantity: number | null;
  unit: string | null;
  unit_cost: number | null;
  total_amount: number;
  payment_method: string | null;
  vendor: string | null;
  invoice_ref: string | null;
  expense_type: ExpenseType;
  recurrence_type: RecurrenceType;
  recurrence_interval: number | null;
  payment_status: ExpensePaymentStatus;
  amount_paid: number | null;
  amount_due: number | null;
  notes: string | null;
  created_at: string;
}

export type IncomeType = 'sale' | 'other';
export type IncomePaymentStatus = 'pending' | 'partially_received' | 'fully_received';

export interface Income {
  id: string;
  date: string;
  product: string;
  product_category: string | null;
  income_type: IncomeType;
  paddy_crop_id: string | null;
  crop_type_id: string | null;
  season_id: string | null;
  cultivation_id: string | null;
  farm_id: string | null;
  plot_id: string | null;
  quantity: number | null;
  unit: string | null;
  price_per_unit: number | null;
  total_income: number;
  buyer: string | null;
  payment_method: string | null;
  invoice_ref: string | null;
  payment_status: IncomePaymentStatus;
  amount_due: number | null;
  amount_received: number | null;
  notes: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  name: string;
  date: string;
  farm_id: string | null;
  plot_id: string | null;
  paddy_crop_id: string | null;
  cultivation_id: string | null;
  activity_type: string | null;
  status: string;
  notes: string | null;
  planned_date: string | null;
  actual_date: string | null;
  created_at: string;
}

export interface Settings {
  id: number;
  bigha_sqft: number;
  farm_name: string | null;
  updated_at: string;
}

export interface CropType {
  id: string;
  name: string;
  category: string | null;
  crop_nature: string | null;
  default_unit: string | null;
  typical_production_unit: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string | null;
  unit_group: 'weight' | 'area' | 'volume' | 'count';
  is_active: boolean;
  created_at: string;
}

export interface ExpenseAllocation {
  id: string;
  expense_id: string;
  farm_id: string | null;
  plot_id: string | null;
  crop_type_id: string | null;
  paddy_crop_id: string | null;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface CropVariety {
  id: string;
  crop_type_id: string;
  name: string;
  variety_code: string | null;
  duration_days: number | null;
  maturity_days: number | null;
  expected_yield: number | null;
  yield_unit: string | null;
  suitable_season: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export type CultivationStatus =
  | 'planned'
  | 'prepared'
  | 'sown'
  | 'nursery'
  | 'transplanted'
  | 'growing'
  | 'flowering'
  | 'fruiting'
  | 'harvesting'
  | 'harvested'
  | 'completed'
  | 'cancelled';

export type IntercropRole = 'primary' | 'secondary' | 'mixed';

export interface Cultivation {
  id: string;
  crop_type_id: string | null;
  variety_id: string | null;
  season_id: string | null;
  farm_id: string | null;
  plot_id: string | null;
  area: number | null;
  area_unit: AreaUnit;
  start_date: string | null;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  status: CultivationStatus;
  is_perennial: boolean;
  planting_date: string | null;
  plant_age_years: number | null;
  plant_count: number | null;
  spacing: string | null;
  production_year: number | null;
  parent_cultivation_id: string | null;
  intercrop_role: IntercropRole | null;
  expected_yield: number | null;
  expected_yield_unit: string | null;
  expected_selling_price: number | null;
  expected_cost: number | null;
  notes: string | null;
  created_at: string;
}

export type HarvestStatus = 'not_harvested' | 'partially_harvested' | 'fully_harvested';

export interface CropHarvest {
  id: string;
  cultivation_id: string;
  harvest_date: string | null;
  quantity: number;
  unit: string;
  quality_grade: string | null;
  moisture_percentage: number | null;
  loss_quantity: number | null;
  final_quantity: number | null;
  notes: string | null;
  created_at: string;
}

// ===== Phase 5: Dragon Fruit =====

export type DFPlantationStatus =
  | 'planned'
  | 'land_preparation'
  | 'establishing'
  | 'established'
  | 'productive'
  | 'replanting'
  | 'retired';

export type DFSpacingUnit = 'feet' | 'metre';

export interface DragonFruitPlantation {
  id: string;
  name: string;
  farm_id: string | null;
  plot_id: string | null;
  season_id: string | null;
  cultivation_id: string | null;
  plantation_start_date: string | null;
  establishment_year: number | null;
  area: number | null;
  area_unit: AreaUnit;
  status: string;
  total_poles: number | null;
  plants_per_pole: number | null;
  total_plants: number | null;
  missing_plants: number;
  dead_plants: number;
  replacement_plants: number;
  row_spacing: number | null;
  pole_spacing: number | null;
  border_spacing: number | null;
  alley_width: number | null;
  spacing_unit: string;
  notes: string | null;
  created_at: string;
}

export interface DFProductionYear {
  id: string;
  plantation_id: string;
  production_year: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  expected_production: number | null;
  expected_unit: string;
  notes: string | null;
  created_at: string;
}

export interface DFSection {
  id: string;
  plantation_id: string;
  name: string;
  area: number | null;
  area_unit: AreaUnit;
  notes: string | null;
  created_at: string;
}

export interface DFVariety {
  id: string;
  crop_variety_id: string | null;
  name: string;
  flesh_color: string | null;
  skin_color: string | null;
  source: string | null;
  planting_material_type: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface DFPlantationVariety {
  id: string;
  plantation_id: string;
  variety_id: string;
  plant_count: number | null;
  notes: string | null;
  created_at: string;
}

export interface DFHarvest {
  id: string;
  plantation_id: string;
  production_year_id: string | null;
  cultivation_id: string | null;
  harvest_date: string | null;
  section_id: string | null;
  quantity: number;
  unit: string;
  fruit_count: number | null;
  avg_fruit_weight: number | null;
  avg_fruit_size: number | null;
  quality_grade: string | null;
  quality_notes: string | null;
  notes: string | null;
  created_at: string;
}

export interface DFHealthRecord {
  id: string;
  plantation_id: string;
  section_id: string | null;
  record_date: string;
  observation: string | null;
  problem_type: string | null;
  severity: string | null;
  action_taken: string | null;
  product_used: string | null;
  quantity: number | null;
  cost: number | null;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
}

export type DFObservationType = 'flowering' | 'pollination' | 'fruit_development' | 'other';

export interface DFObservation {
  id: string;
  plantation_id: string;
  section_id: string | null;
  observation_date: string;
  observation_type: string;
  flower_count: number | null;
  flower_cluster_count: number | null;
  pollination_method: string | null;
  pollination_type: string | null;
  fruit_count: number | null;
  avg_fruit_size: number | null;
  avg_fruit_weight: number | null;
  notes: string | null;
  created_at: string;
}

export interface DFInfrastructure {
  id: string;
  plantation_id: string;
  infrastructure_type: string;
  quantity: number | null;
  unit: string | null;
  installation_date: string | null;
  cost: number | null;
  notes: string | null;
  created_at: string;
}

export interface DFPlantingMaterial {
  id: string;
  plantation_id: string;
  material_type: string;
  quantity: number | null;
  source: string | null;
  cost_per_plant: number | null;
  total_cost: number | null;
  planting_date: string | null;
  notes: string | null;
  created_at: string;
}
