// Area unit helpers. Internal canonical unit is square feet.
// Bigha conversion is configurable via settings (default 14,400 sqft for Assam).

export type AreaUnit = 'bigha' | 'acre' | 'hectare' | 'sqft';

export const AREA_UNITS: { value: AreaUnit; label: string }[] = [
  { value: 'bigha', label: 'Bigha' },
  { value: 'acre', label: 'Acre' },
  { value: 'hectare', label: 'Hectare' },
  { value: 'sqft', label: 'Square feet' },
];

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  bigha: 'Bigha',
  acre: 'Acre',
  hectare: 'Hectare',
  sqft: 'Sq ft',
};

const ACRE_SQFT = 43560;
const HECTARE_SQFT = 107639.104;

export function toSqft(value: number | null | undefined, unit: AreaUnit, bighaSqft: number): number | null {
  if (value == null || Number.isNaN(value)) return null;
  switch (unit) {
    case 'bigha':
      return value * bighaSqft;
    case 'acre':
      return value * ACRE_SQFT;
    case 'hectare':
      return value * HECTARE_SQFT;
    case 'sqft':
      return value;
  }
}

export function fromSqft(sqft: number | null | undefined, unit: AreaUnit, bighaSqft: number): number | null {
  if (sqft == null || Number.isNaN(sqft)) return null;
  switch (unit) {
    case 'bigha':
      return sqft / bighaSqft;
    case 'acre':
      return sqft / ACRE_SQFT;
    case 'hectare':
      return sqft / HECTARE_SQFT;
    case 'sqft':
      return sqft;
  }
}

export function convertArea(
  value: number | null | undefined,
  from: AreaUnit,
  to: AreaUnit,
  bighaSqft: number,
): number | null {
  const sqft = toSqft(value, from, bighaSqft);
  return fromSqft(sqft, to, bighaSqft);
}
