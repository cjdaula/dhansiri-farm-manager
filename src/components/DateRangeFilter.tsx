import { useMemo } from 'react';
import { DATE_RANGE_PRESETS, type DateRangePreset } from '@/lib/constants';
import { Select } from '@/components/ui/Field';

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangeFilterProps {
  preset: DateRangePreset;
  from: string;
  to: string;
  onPresetChange: (p: DateRangePreset) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

function financialYearRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  // Indian financial year: April 1 – March 31
  const fyStart = now.getMonth() >= 3 ? year : year - 1;
  return {
    from: `${fyStart}-04-01`,
    to: `${fyStart + 1}-03-31`,
  };
}

function thisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function thisSeasonRange(): { from: string; to: string } {
  // Sali season approximation: June – December
  const now = new Date();
  const year = now.getFullYear();
  const from = `${year}-06-01`;
  const to = `${year}-12-31`;
  return { from, to };
}

export function resolvePreset(preset: DateRangePreset): { from: string; to: string } {
  switch (preset) {
    case 'this_month': return thisMonthRange();
    case 'this_season': return thisSeasonRange();
    case 'this_financial_year': return financialYearRange();
    default: return { from: '', to: '' };
  }
}

export function DateRangeFilter({ preset, from, to, onPresetChange, onFromChange, onToChange }: DateRangeFilterProps) {
  const showCustom = preset === 'custom';
  const presets = useMemo(() => DATE_RANGE_PRESETS, []);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-48">
        <label className="block text-xs font-medium text-stone-500 mb-1.5">Period</label>
        <Select value={preset} onChange={(e) => onPresetChange(e.target.value as DateRangePreset)}>
          {presets.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Select>
      </div>
      {showCustom && (
        <>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
            />
          </div>
        </>
      )}
    </div>
  );
}
