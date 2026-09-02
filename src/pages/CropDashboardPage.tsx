import { useEffect, useState, useCallback, useMemo } from 'react';
import { Leaf, Sprout, TrendingUp, TrendingDown, BarChart3, CalendarClock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Cultivation, CropType, CropVariety, Farm, Plot, PaddySeason, Expense, Income, CropHarvest, Settings } from '@/lib/types';
import { CULTIVATION_STATUSES, DEFAULT_BIGHA_SQFT } from '@/lib/constants';
import { AREA_UNIT_LABELS } from '@/lib/area';
import { formatCurrency, formatDate } from '@/lib/format';
import { calcActualProfitability, summarizeHarvests } from '@/lib/cropCalc';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card, StatCard } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';

export function CropDashboardPage() {
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [varieties, setVarieties] = useState<CropVariety[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [seasons, setSeasons] = useState<PaddySeason[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [harvests, setHarvests] = useState<CropHarvest[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCrop, setFilterCrop] = useState('');
  const [filterVariety, setFilterVariety] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterFarm, setFilterFarm] = useState('');
  const [filterPlot, setFilterPlot] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, ctRes, vRes, fRes, pRes, sRes, eRes, iRes, hRes, setRes] = await Promise.all([
      supabase.from('cultivations').select('*').order('created_at', { ascending: false }),
      supabase.from('crop_types').select('*').order('name'),
      supabase.from('crop_varieties').select('*').order('name'),
      supabase.from('farms').select('id, name').order('name'),
      supabase.from('plots').select('id, name, farm_id').order('name'),
      supabase.from('paddy_seasons').select('*').order('name'),
      supabase.from('expenses').select('id, total_amount, cultivation_id').not('cultivation_id', 'is', null),
      supabase.from('income').select('id, total_income, cultivation_id').not('cultivation_id', 'is', null),
      supabase.from('crop_harvests').select('*'),
      supabase.from('settings').select('*').maybeSingle(),
    ]);
    if (cRes.error) setError(cRes.error.message);
    else setCultivations(cRes.data as Cultivation[]);
    if (ctRes.data) setCropTypes(ctRes.data as CropType[]);
    if (vRes.data) setVarieties(vRes.data as CropVariety[]);
    if (fRes.data) setFarms(fRes.data as Farm[]);
    if (pRes.data) setPlots(pRes.data as Plot[]);
    if (sRes.data) setSeasons(sRes.data as PaddySeason[]);
    setExpenses((eRes.data ?? []) as Expense[]);
    setIncome((iRes.data ?? []) as Income[]);
    setHarvests((hRes.data ?? []) as CropHarvest[]);
    if (setRes.data) setSettings(setRes.data as Settings);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const bighaSqft = settings?.bigha_sqft ?? DEFAULT_BIGHA_SQFT;
  const cropName = (id: string | null) => cropTypes.find((c) => c.id === id)?.name ?? '—';
  const varietyName = (id: string | null) => varieties.find((v) => v.id === id)?.name ?? '—';

  const filteredVarieties = useMemo(
    () => filterCrop ? varieties.filter((v) => v.crop_type_id === filterCrop) : varieties,
    [varieties, filterCrop],
  );

  const filteredCultivations = useMemo(() => {
    return cultivations.filter((c) => {
      if (filterCrop && c.crop_type_id !== filterCrop) return false;
      if (filterVariety && c.variety_id !== filterVariety) return false;
      if (filterSeason && c.season_id !== filterSeason) return false;
      if (filterFarm && c.farm_id !== filterFarm) return false;
      if (filterPlot && c.plot_id !== filterPlot) return false;
      if (filterStatus && c.status !== filterStatus) return false;
      return true;
    });
  }, [cultivations, filterCrop, filterVariety, filterSeason, filterFarm, filterPlot, filterStatus]);

  const stats = useMemo(() => {
    const active = filteredCultivations.filter((c) => !['completed', 'cancelled', 'harvested'].includes(c.status));
    const planned = filteredCultivations.filter((c) => c.status === 'planned' || c.status === 'prepared');
    const growing = filteredCultivations.filter((c) => ['sown', 'nursery', 'transplanted', 'growing'].includes(c.status));
    const harvesting = filteredCultivations.filter((c) => ['flowering', 'fruiting', 'harvesting'].includes(c.status));
    const completed = filteredCultivations.filter((c) => c.status === 'completed' || c.status === 'harvested');

    const activeArea = active.reduce((s, c) => s + Number(c.area ?? 0), 0);

    const cultIds = new Set(filteredCultivations.map((c) => c.id));
    const linkedExpenses = expenses.filter((e) => cultIds.has(e.cultivation_id ?? ''));
    const linkedIncome = income.filter((i) => cultIds.has(i.cultivation_id ?? ''));
    const linkedHarvests = harvests.filter((h) => cultIds.has(h.cultivation_id));

    const totalCost = linkedExpenses.reduce((s, e) => s + Number(e.total_amount ?? 0), 0);
    const totalRevenue = linkedIncome.reduce((s, i) => s + Number(i.total_income ?? 0), 0);
    const actualProduction = linkedHarvests.reduce((s, h) => s + Number(h.quantity ?? 0), 0);
    const expectedProduction = filteredCultivations.reduce((s, c) => s + Number(c.expected_yield ?? 0), 0);

    return {
      activeCount: active.length,
      activeArea,
      plannedCount: planned.length,
      growingCount: growing.length,
      harvestingCount: harvesting.length,
      completedCount: completed.length,
      expectedProduction,
      actualProduction,
      totalCost,
      totalRevenue,
      profit: totalRevenue - totalCost,
    };
  }, [filteredCultivations, expenses, income, harvests]);

  if (loading) return <LoadingState />;

  const hasFilters = filterCrop || filterVariety || filterSeason || filterFarm || filterPlot || filterStatus;

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Crop Dashboard" subtitle="Overview of all cultivation activity across the farm." />
      {error && <ErrorState message={error} />}

      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40"><label className="block text-xs font-medium text-stone-500 mb-1.5">Crop</label><Select value={filterCrop} onChange={(e) => { setFilterCrop(e.target.value); setFilterVariety(''); }}><option value="">All crops</option>{cropTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
          <div className="w-40"><label className="block text-xs font-medium text-stone-500 mb-1.5">Variety</label><Select value={filterVariety} onChange={(e) => setFilterVariety(e.target.value)}><option value="">All varieties</option>{filteredVarieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></div>
          <div className="w-36"><label className="block text-xs font-medium text-stone-500 mb-1.5">Season</label><Select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}><option value="">All seasons</option>{seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
          <div className="w-36"><label className="block text-xs font-medium text-stone-500 mb-1.5">Farm</label><Select value={filterFarm} onChange={(e) => setFilterFarm(e.target.value)}><option value="">All farms</option>{farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></div>
          <div className="w-36"><label className="block text-xs font-medium text-stone-500 mb-1.5">Plot</label><Select value={filterPlot} onChange={(e) => setFilterPlot(e.target.value)}><option value="">All plots</option>{plots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
          <div className="w-36"><label className="block text-xs font-medium text-stone-500 mb-1.5">Status</label><Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="">All statuses</option>{CULTIVATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>
          {hasFilters && <button onClick={() => { setFilterCrop(''); setFilterVariety(''); setFilterSeason(''); setFilterFarm(''); setFilterPlot(''); setFilterStatus(''); }} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium pb-2">Clear filters</button>}
        </div>
      </Card>

      {filteredCultivations.length === 0 ? (
        <Card><EmptyState icon={<Leaf className="h-7 w-7" />} title="No cultivation records" description="Create cultivation records to see dashboard stats." /></Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <StatCard label="Active crops" value={String(stats.activeCount)} icon={<Sprout className="h-5 w-5" />} tone="success" />
            <StatCard label="Active area" value={`${stats.activeArea} bigha`} icon={<Leaf className="h-5 w-5" />} />
            <StatCard label="Planned" value={String(stats.plannedCount)} icon={<CalendarClock className="h-5 w-5" />} />
            <StatCard label="Growing" value={String(stats.growingCount)} icon={<Sprout className="h-5 w-5" />} tone="success" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <StatCard label="Harvesting" value={String(stats.harvestingCount)} icon={<CalendarClock className="h-5 w-5" />} tone="warning" />
            <StatCard label="Completed" value={String(stats.completedCount)} icon={<BarChart3 className="h-5 w-5" />} />
            <StatCard label="Expected production" value={String(stats.expectedProduction)} icon={<BarChart3 className="h-5 w-5" />} />
            <StatCard label="Actual production" value={String(stats.actualProduction)} icon={<BarChart3 className="h-5 w-5" />} tone="success" />
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <StatCard label="Total expenses" value={formatCurrency(stats.totalCost)} icon={<TrendingDown className="h-5 w-5" />} tone="error" />
            <StatCard label="Total income" value={formatCurrency(stats.totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
            <StatCard label="Profit" value={formatCurrency(stats.profit)} icon={<BarChart3 className="h-5 w-5" />} tone={stats.profit >= 0 ? 'success' : 'error'} />
          </div>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-700">Active cultivations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Crop / Variety</th>
                    <th className="text-left px-4 py-3 font-medium">Area</th>
                    <th className="text-left px-4 py-3 font-medium">Start</th>
                    <th className="text-left px-4 py-3 font-medium">Expected harvest</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCultivations.filter((c) => !['completed', 'cancelled'].includes(c.status)).map((c) => {
                    const si = CULTIVATION_STATUSES.find((x) => x.value === c.status);
                    return (
                      <tr key={c.id} className="hover:bg-stone-50/60">
                        <td className="px-4 py-3">
                          <div className="font-medium text-stone-800">{cropName(c.crop_type_id)}</div>
                          <div className="text-xs text-stone-500">{varietyName(c.variety_id)}</div>
                        </td>
                        <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{c.area != null ? `${c.area} ${AREA_UNIT_LABELS[c.area_unit]}` : '—'}</td>
                        <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{formatDate(c.start_date)}</td>
                        <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{formatDate(c.expected_harvest_date)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${si?.color ?? 'bg-stone-100 text-stone-600'}`}>{si?.label ?? c.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
