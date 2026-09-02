import { useEffect, useState, useCallback, useMemo } from 'react';
import { BarChart3, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Cultivation, CropType, CropVariety, Expense, Income, CropHarvest, Settings, AreaUnit } from '@/lib/types';
import { AREA_UNIT_LABELS } from '@/lib/area';
import { DEFAULT_BIGHA_SQFT } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';
import { calcActualProfitability } from '@/lib/cropCalc';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';

export function CropComparisonPage() {
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [varieties, setVarieties] = useState<CropVariety[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [harvests, setHarvests] = useState<CropHarvest[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [addId, setAddId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, ctRes, vRes, eRes, iRes, hRes, setRes] = await Promise.all([
      supabase.from('cultivations').select('*').order('created_at', { ascending: false }),
      supabase.from('crop_types').select('*').order('name'),
      supabase.from('crop_varieties').select('*').order('name'),
      supabase.from('expenses').select('id, total_amount, cultivation_id').not('cultivation_id', 'is', null),
      supabase.from('income').select('id, total_income, cultivation_id').not('cultivation_id', 'is', null),
      supabase.from('crop_harvests').select('*'),
      supabase.from('settings').select('*').maybeSingle(),
    ]);
    if (cRes.error) setError(cRes.error.message);
    else setCultivations(cRes.data as Cultivation[]);
    if (ctRes.data) setCropTypes(ctRes.data as CropType[]);
    if (vRes.data) setVarieties(vRes.data as CropVariety[]);
    setExpenses((eRes.data ?? []) as Expense[]);
    setIncome((iRes.data ?? []) as Income[]);
    setHarvests((hRes.data ?? []) as CropHarvest[]);
    if (setRes.data) setSettings(setRes.data as Settings);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const bighaSqft = settings?.bigha_sqft ?? DEFAULT_BIGHA_SQFT;
  const cropName = (id: string | null) => cropTypes.find((c) => c.id === id)?.name ?? '—';
  const varietyName = (id: string | null) => varieties.find((v) => v.id === id)?.name ?? '';

  const selectedCultivations = useMemo(
    () => cultivations.filter((c) => selectedIds.includes(c.id)),
    [cultivations, selectedIds],
  );

  const comparisonData = useMemo(() => {
    return selectedCultivations.map((c) => {
      const cultExpenses = expenses.filter((e) => e.cultivation_id === c.id);
      const cultIncome = income.filter((i) => i.cultivation_id === c.id);
      const cultHarvests = harvests.filter((h) => h.cultivation_id === c.id);
      const actual = calcActualProfitability(cultExpenses, cultIncome, c.area, c.area_unit as AreaUnit, bighaSqft);
      const actualProduction = cultHarvests.reduce((s, h) => s + Number(h.quantity ?? 0), 0);
      const hasActualData = cultExpenses.length > 0 || cultIncome.length > 0 || cultHarvests.length > 0;
      return {
        cultivation: c,
        actual,
        actualProduction,
        hasActualData,
        harvestUnit: cultHarvests[0]?.unit ?? c.expected_yield_unit ?? '',
      };
    });
  }, [selectedCultivations, expenses, income, harvests, bighaSqft]);

  const addCrop = () => {
    if (addId && !selectedIds.includes(addId)) setSelectedIds([...selectedIds, addId]);
    setAddId('');
  };

  const removeCrop = (id: string) => setSelectedIds(selectedIds.filter((x) => x !== id));

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Crop Comparison" subtitle="Compare actual performance across selected crops." />
      {error && <ErrorState message={error} />}

      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-56">
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Add crop to compare</label>
            <Select value={addId} onChange={(e) => setAddId(e.target.value)}>
              <option value="">Select cultivation…</option>
              {cultivations.filter((c) => !selectedIds.includes(c.id)).map((c) => (
                <option key={c.id} value={c.id}>{cropName(c.crop_type_id)}{varietyName(c.variety_id) ? ` · ${varietyName(c.variety_id)}` : ''}</option>
              ))}
            </Select>
          </div>
          <button onClick={addCrop} disabled={!addId} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </Card>

      {selectedIds.length === 0 ? (
        <Card><EmptyState icon={<BarChart3 className="h-7 w-7" />} title="No crops selected" description="Select cultivation records above to compare their performance side by side." /></Card>
      ) : selectedIds.length === 1 ? (
        <Card><EmptyState icon={<BarChart3 className="h-7 w-7" />} title="Add more crops" description="Select at least two crops to compare." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 flex flex-wrap gap-2">
            {selectedCultivations.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                {cropName(c.crop_type_id)}{varietyName(c.variety_id) ? ` · ${varietyName(c.variety_id)}` : ''}
                <button onClick={() => removeCrop(c.id)} className="hover:text-emerald-900"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Metric</th>
                  {comparisonData.map((d) => (
                    <th key={d.cultivation.id} className="text-right px-4 py-3 font-medium">
                      {cropName(d.cultivation.crop_type_id)}
                      <div className="text-[10px] font-normal text-stone-400">{varietyName(d.cultivation.variety_id)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr><td className="px-4 py-2.5 text-stone-600 font-medium">Area</td>{comparisonData.map((d) => <td key={d.cultivation.id} className="px-4 py-2.5 text-right text-stone-700">{d.cultivation.area != null ? `${d.cultivation.area} ${AREA_UNIT_LABELS[d.cultivation.area_unit]}` : '—'}</td>)}</tr>
                <tr><td className="px-4 py-2.5 text-stone-600 font-medium">Start date</td>{comparisonData.map((d) => <td key={d.cultivation.id} className="px-4 py-2.5 text-right text-stone-500">{formatDate(d.cultivation.start_date)}</td>)}</tr>
                <tr><td className="px-4 py-2.5 text-stone-600 font-medium">Production</td>{comparisonData.map((d) => <td key={d.cultivation.id} className="px-4 py-2.5 text-right text-stone-700">{d.hasActualData ? `${d.actualProduction} ${d.harvestUnit}` : '—'}</td>)}</tr>
                <tr><td className="px-4 py-2.5 text-stone-600 font-medium">Production / bigha</td>{comparisonData.map((d) => <td key={d.cultivation.id} className="px-4 py-2.5 text-right text-stone-700">{d.hasActualData && d.cultivation.area ? (d.actualProduction / d.cultivation.area).toFixed(1) : '—'}</td>)}</tr>
                <tr className="bg-rose-50/30"><td className="px-4 py-2.5 text-stone-600 font-medium">Cost</td>{comparisonData.map((d) => <td key={d.cultivation.id} className="px-4 py-2.5 text-right text-stone-700">{d.hasActualData ? formatCurrency(d.actual.totalCost) : '—'}</td>)}</tr>
                <tr className="bg-rose-50/30"><td className="px-4 py-2.5 text-stone-600 font-medium">Cost / bigha</td>{comparisonData.map((d) => <td key={d.cultivation.id} className="px-4 py-2.5 text-right text-stone-700">{d.hasActualData && d.actual.costPerBigha != null ? formatCurrency(d.actual.costPerBigha) : '—'}</td>)}</tr>
                <tr className="bg-emerald-50/30"><td className="px-4 py-2.5 text-stone-600 font-medium">Revenue</td>{comparisonData.map((d) => <td key={d.cultivation.id} className="px-4 py-2.5 text-right text-stone-700">{d.hasActualData ? formatCurrency(d.actual.totalRevenue) : '—'}</td>)}</tr>
                <tr className="bg-emerald-50/30"><td className="px-4 py-2.5 text-stone-600 font-medium">Revenue / bigha</td>{comparisonData.map((d) => <td key={d.cultivation.id} className="px-4 py-2.5 text-right text-stone-700">{d.hasActualData && d.actual.revenuePerBigha != null ? formatCurrency(d.actual.revenuePerBigha) : '—'}</td>)}</tr>
                <tr className="bg-stone-50/50"><td className="px-4 py-2.5 text-stone-800 font-semibold">Profit</td>{comparisonData.map((d) => <td key={d.cultivation.id} className={`px-4 py-2.5 text-right font-semibold ${d.hasActualData ? (d.actual.profit >= 0 ? 'text-emerald-700' : 'text-rose-700') : 'text-stone-400'}`}>{d.hasActualData ? formatCurrency(d.actual.profit) : '—'}</td>)}</tr>
                <tr className="bg-stone-50/50"><td className="px-4 py-2.5 text-stone-800 font-semibold">Profit / bigha</td>{comparisonData.map((d) => <td key={d.cultivation.id} className={`px-4 py-2.5 text-right font-semibold ${d.hasActualData && d.actual.profitPerBigha != null ? (d.actual.profitPerBigha >= 0 ? 'text-emerald-700' : 'text-rose-700') : 'text-stone-400'}`}>{d.hasActualData && d.actual.profitPerBigha != null ? formatCurrency(d.actual.profitPerBigha) : '—'}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-stone-100">
            <p className="text-xs text-stone-400">Crops without actual data (expenses, income, or harvests) show "—" and are excluded from meaningful comparison.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
