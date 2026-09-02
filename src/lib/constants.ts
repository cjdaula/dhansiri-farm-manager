import type { AreaUnit } from './area';

// Currency — kept configurable for future expansion. Default: Indian Rupee.
export const CURRENCY_SYMBOL = '₹';

// Default Bigha size in square feet (Assam standard). Used when settings aren't loaded yet.
export const DEFAULT_BIGHA_SQFT = 14400;

export const EXPENSE_TYPES = [
  { value: 'operating', label: 'Operating Expense' },
  { value: 'capital', label: 'Capital Expense' },
] as const;

export const RECURRENCE_TYPES = [
  { value: 'one_time', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'annual', label: 'Annual' },
] as const;

export const EXPENSE_PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'unpaid', label: 'Unpaid' },
] as const;

export const INCOME_TYPES = [
  { value: 'sale', label: 'Sale' },
  { value: 'other', label: 'Other income' },
] as const;

export const INCOME_PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'partially_received', label: 'Partially received' },
  { value: 'fully_received', label: 'Fully received' },
] as const;

export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Credit', 'Other'] as const;

// Fallback categories used before the database categories load.
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Crop Production',
  'Machinery',
  'Farm Infrastructure',
  'Post-Harvest',
  'Business',
] as const;

export const PADDY_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'planned', label: 'Planned', color: 'bg-slate-100 text-slate-700' },
  { value: 'nursery', label: 'Nursery', color: 'bg-amber-100 text-amber-700' },
  { value: 'transplanted', label: 'Transplanted', color: 'bg-sky-100 text-sky-700' },
  { value: 'growing', label: 'Growing', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'harvested', label: 'Harvested', color: 'bg-lime-100 text-lime-700' },
  { value: 'completed', label: 'Completed', color: 'bg-teal-100 text-teal-700' },
];

export const ACTIVITY_TYPES = [
  'Land preparation',
  'Nursery',
  'Sowing',
  'Transplanting',
  'Fertilization',
  'Irrigation',
  'Spraying',
  'Weeding',
  'Harvest',
  'Other',
] as const;

export const ACTIVITY_STATUSES = ['planned', 'done', 'cancelled'] as const;

export const SEASON_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'planned', label: 'Planned', color: 'bg-slate-100 text-slate-700' },
  { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'completed', label: 'Completed', color: 'bg-teal-100 text-teal-700' },
];

export const PLANTING_METHODS = ['Manual', 'Direct Seeded (DSR)', 'Machine Transplant', 'Drum Seeder', 'Other'] as const;

export const GRAIN_TYPES = ['Long', 'Medium', 'Short', 'Aromatic'] as const;
export const RICE_TYPES = ['Basmati', 'Samba', 'Joha', 'Bora', 'Black', 'Red', 'Regular', 'Other'] as const;
export const VARIETY_TYPES = ['High-yielding', 'Local', 'Hybrid', 'Aromatic', 'Traditional'] as const;

export const AREA_UNITS: { value: AreaUnit; label: string }[] = [
  { value: 'bigha', label: 'Bigha' },
  { value: 'acre', label: 'Acre' },
  { value: 'hectare', label: 'Hectare' },
  { value: 'sqft', label: 'Square feet' },
];

export const DATE_RANGE_PRESETS = [
  { value: 'all', label: 'All time' },
  { value: 'this_month', label: 'This month' },
  { value: 'this_season', label: 'This season' },
  { value: 'this_financial_year', label: 'This financial year' },
  { value: 'custom', label: 'Custom range' },
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]['value'];

// ===== Phase 4: Crop Management =====

export const CROP_CATEGORIES = [
  'Cereal',
  'Pulse',
  'Oilseed',
  'Spice',
  'Medicinal',
  'Horticulture',
  'Fruit',
  'Vegetable',
  'Flower',
  'Plantation',
  'Other',
] as const;

export const CROP_NATURES = [
  { value: 'Annual', label: 'Annual' },
  { value: 'Biennial', label: 'Biennial' },
  { value: 'Perennial', label: 'Perennial' },
  { value: 'Seasonal', label: 'Seasonal' },
  { value: 'Multi-year', label: 'Multi-year' },
] as const;

export const CULTIVATION_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'planned', label: 'Planned', color: 'bg-slate-100 text-slate-700' },
  { value: 'prepared', label: 'Prepared', color: 'bg-stone-100 text-stone-700' },
  { value: 'sown', label: 'Sown', color: 'bg-amber-100 text-amber-700' },
  { value: 'nursery', label: 'Nursery', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'transplanted', label: 'Transplanted', color: 'bg-sky-100 text-sky-700' },
  { value: 'growing', label: 'Growing', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'flowering', label: 'Flowering', color: 'bg-pink-100 text-pink-700' },
  { value: 'fruiting', label: 'Fruiting', color: 'bg-orange-100 text-orange-700' },
  { value: 'harvesting', label: 'Harvesting', color: 'bg-lime-100 text-lime-700' },
  { value: 'harvested', label: 'Harvested', color: 'bg-teal-100 text-teal-700' },
  { value: 'completed', label: 'Completed', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-rose-100 text-rose-700' },
];

export const INTERCROP_ROLES = [
  { value: 'primary', label: 'Primary crop' },
  { value: 'secondary', label: 'Secondary / intercrop' },
  { value: 'mixed', label: 'Mixed cropping' },
] as const;

export const QUALITY_GRADES = ['A', 'B', 'C', 'Other'] as const;

export const CROP_ACTIVITY_TYPES = [
  'Land preparation',
  'Nursery',
  'Sowing',
  'Transplanting',
  'Fertilization',
  'Irrigation',
  'Weeding',
  'Mulching',
  'Spraying',
  'Pruning',
  'Flowering',
  'Fruiting',
  'Harvest',
  'Post-harvest',
  'Other',
] as const;

// ===== Phase 5: Dragon Fruit =====

export const DF_PLANTATION_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'planned', label: 'Planned', color: 'bg-slate-100 text-slate-700' },
  { value: 'land_preparation', label: 'Land preparation', color: 'bg-stone-100 text-stone-700' },
  { value: 'establishing', label: 'Establishing', color: 'bg-amber-100 text-amber-700' },
  { value: 'established', label: 'Established', color: 'bg-sky-100 text-sky-700' },
  { value: 'productive', label: 'Productive', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'replanting', label: 'Replanting', color: 'bg-orange-100 text-orange-700' },
  { value: 'retired', label: 'Retired', color: 'bg-rose-100 text-rose-700' },
];

export const DF_PRODUCTION_YEAR_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'planned', label: 'Planned', color: 'bg-slate-100 text-slate-700' },
  { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'completed', label: 'Completed', color: 'bg-teal-100 text-teal-700' },
];

export const DF_SPACING_UNITS = [
  { value: 'feet', label: 'Feet' },
  { value: 'metre', label: 'Metre' },
] as const;

export const DF_PROBLEM_TYPES = [
  'Pest',
  'Disease',
  'Nutrient issue',
  'Water stress',
  'Physical damage',
  'Weed',
  'Other',
] as const;

export const DF_SEVERITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'severe', label: 'Severe' },
] as const;

export const DF_IRRIGATION_METHODS = ['Drip', 'Hose', 'Sprinkler', 'Manual', 'Other'] as const;

export const DF_PLANTING_MATERIAL_TYPES = [
  'Cutting',
  'Rooted cutting',
  'Nursery plant',
  'Other',
] as const;

export const DF_INFRASTRUCTURE_TYPES = [
  'RCC poles',
  'Concrete supports',
  'Trellis',
  'Drip irrigation',
  'Water tank',
  'Pump',
  'Fencing',
  'Shade/protection',
  'Other',
] as const;

export const DF_FERTILIZER_TYPES = [
  'Organic manure',
  'Compost',
  'Fertilizer',
  'Micronutrient',
  'Other',
] as const;

export const DF_POLLINATION_METHODS = ['Natural', 'Manual', 'Other'] as const;

export const DF_OBSERVATION_TYPES = [
  { value: 'flowering', label: 'Flowering' },
  { value: 'pollination', label: 'Pollination' },
  { value: 'fruit_development', label: 'Fruit development' },
  { value: 'other', label: 'Other' },
] as const;

export const DF_HARVEST_UNITS = ['kg', 'quintal', 'tonne', 'number'] as const;

export const DF_ESTABLISHMENT_EXPENSE_CATEGORIES = [
  'Land preparation',
  'Poles/posts',
  'Concrete',
  'Trellis/support',
  'Planting material',
  'Labour',
  'Irrigation',
  'Drip system',
  'Fertilizer',
  'Organic manure',
  'Mulching',
  'Tools',
  'Transport',
  'Fencing',
  'Electricity',
  'Other',
] as const;
