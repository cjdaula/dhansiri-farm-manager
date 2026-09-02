import { useEffect, useState, useCallback, useMemo } from 'react';
import { BarChart3, TrendingDown, TrendingUp, Wallet, PieChart, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Expense, Income, Farm, Plot, PaddyCrop, ExpenseCategory, AreaUnit } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/Card';
import { DateRangeFilter, resolvePreset } from '@/components/DateRangeFilter';
import { calcProfitability, formatOrNull } from '@/lib/financeCalc';
import type { DateRangePreset } from '@/lib/constants';
import { DEFAULT_BIGHA_SQFT } from '@/lib/constants';

type ReportTab = 'expense' | 'income' | 'profitability';

export function ReportsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [crops, setCrops] = useState<PaddyCrop[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReportTab>('expense');

  // shared filters
  const [preset, setPreset] = useState<DateRangePreset>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [farmId, setFarmId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [cropId, setCropId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [includeCapital, setIncludeCapital] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [eRes, iRes, fRes, pRes, cRes, catRes] = await Promise.all([
      supabase.from('expenses').select('*'),
      supabase.from('income').select('*'),
      supabase.from('farms').select('id, name').order('name'),
      supabase.from('plots').select('id, name, farm_id').order('name'),
      supabase.from('paddy_crops').select('id, season_year, variety, area, area_unit').order('created_at', { ascending: false }),
      supabase.from('expense_categories').select('*').order('name'),
    ]);
    if (eRes.error) setError(eRes.error.message);
    else setExpenses(eRes.data ?? []);
    if (iRes.error) setError(iRes.error.message);
    else setIncome(iRes.data ?? []);
    if (fRes.data) setFarms(fRes.data as Farm[]);
    if (pRes.data) setPlots(pRes.data as Plot[]);
    if (cRes.data) setCrops(cRes.data as PaddyCrop[]);
    if (catRes.data) setCategories(catRes.data as ExpenseCategory[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (preset !== 'custom') {
      const r = resolvePreset(preset);
      setFrom(r.from);
      setTo(r.to);
    }
  }, [preset]);

  const parentCategories = useMemo(() => categories.filter((c) => c.parent_id == null), [categories]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      if (farmId && e.farm_id !== farmId) return false;
      if (plotId && e.plot_id !== plotId) return false;
      if (cropId && e.paddy_crop_id !== cropId) return false;
      if (categoryFilter && e.category !== categoryFilter) return false;
      return true;
    });
  }, [expenses, from, to, farmId, plotId, cropId, categoryFilter]);

  const filteredIncome = useMemo(() => {
    return income.filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      if (farmId && e.farm_id !== farmId) return false;
      if (plotId && e.plot_id !== plotId) return false;
      if (cropId && e.paddy_crop_id !== cropId) return false;
      return true;
    });
  }, [income, from, to, farmId, plotId, cropId]);

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((s, e) => s + Number(e.total_amount ?? 0), 0),
    [filteredExpenses],
  );
  const totalIncome = useMemo(
    () => filteredIncome.reduce((s, e) => s + Number(e.total_income ?? 0), 0),
    [filteredIncome],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.total_amount ?? 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);
  const maxCat = byCategory.length > 0 ? Math.max(...byCategory.map((c) => c[1])) : 0;

  const byProduct = useMemo(() => {
    const map = new Map<string, number>();
    filteredIncome.forEach((e) => {
      map.set(e.product, (map.get(e.product) ?? 0) + Number(e.total_income ?? 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredIncome]);
  const maxProd = byProduct.length > 0 ? Math.max(...byProduct.map((c) => c[1])) : 0;

  const monthlyExpenses = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      const m = e.date.slice(0, 7);
      map.set(m, (map.get(m) ?? 0) + Number(e.total_amount ?? 0));
    });
    return Array.from(map.entries()).sort();
  }, [filteredExpenses]);

  const monthlyIncome = useMemo(() => {
    const map = new Map<string, number>();
    filteredIncome.forEach((e) => {
      const m = e.date.slice(0, 7);
      map.set(m, (map.get(m) ?? 0) + Number(e.total_income ?? 0));
    });
    return Array.from(map.entries()).sort();
  }, [filteredIncome]);

  // Profitability
  const profitability = useMemo(() => {
    const crop = crops.find((c) => c.id === cropId);
    return calcProfitability({
      expenses: filteredExpenses,
      income: filteredIncome,
      area: crop?.area ?? null,
      areaUnit: crop?.area_unit ?? 'bigha',
      bighaSqft: DEFAULT_BIGHA_SQFT,
      totalProduction: crop?.final_quantity ?? crop?.actual_yield ?? null,
      includeCapital,
    });
  }, [filteredExpenses, filteredIncome, crops, cropId, includeCapital]);

  const filteredPlots = farmId ? plots.filter((p) => p.farm_id === farmId) : plots;
  const hasData = expenses.length > 0 || income.length > 0;

  if (loading) return <LoadingState />;

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'expense', label: 'Expense Report' },
    { key: 'income', label: 'Income Report' },
    { key: 'profitability', label: 'Profitability Report' },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Reports" subtitle="Financial reports with filters by date, farm, plot and crop." />

      {error && <ErrorState message={error} />}

      {!hasData ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="h-7 w-7" />}
            title="No data to report yet"
            description="Once you record expenses and income, profitability reports will appear here."
          />
        </Card>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex gap-1 mb-5 overflow-x-auto border-b border-stone-200">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <Card className="p-4 mb-5">
            <div className="flex flex-wrap items-end gap-3">
              <DateRangeFilter
                preset={preset}
                from={from}
                to={to}
                onPresetChange={setPreset}
                onFromChange={setFrom}
                onToChange={setTo}
              />
              <div className="w-40">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Farm</label>
                <Select value={farmId} onChange={(e) => { setFarmId(e.target.value); setPlotId(''); }}>
                  <option value="">All farms</option>
                  {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Plot</label>
                <Select value={plotId} onChange={(e) => setPlotId(e.target.value)}>
                  <option value="">All plots</option>
                  {filteredPlots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div className="w-44">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Crop (paddy)</label>
                <Select value={cropId} onChange={(e) => setCropId(e.target.value)}>
                  <option value="">All crops</option>
                  {crops.map((c) => <option key={c.id} value={c.id}>{c.season_year} · {c.variety ?? 'Paddy'}</option>)}
                </Select>
              </div>
              {tab === 'expense' && (
                <div className="w-44">
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Category</label>
                  <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">All categories</option>
                    {parentCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </Select>
                </div>
              )}
              {tab === 'profitability' && (
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={includeCapital} onChange={(e) => setIncludeCapital(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm text-stone-700">Include capital expenses</span>
                </label>
              )}
              {(preset !== 'all' || farmId || plotId || cropId || categoryFilter) && (
                <button
                  onClick={() => { setPreset('all'); setFrom(''); setTo(''); setFarmId(''); setPlotId(''); setCropId(''); setCategoryFilter(''); }}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium pb-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          </Card>

          {/* Expense Report */}
          {tab === 'expense' && (
            <>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <StatCard label="Total expenses" value={formatCurrency(totalExpenses)} icon={<TrendingDown className="h-5 w-5" />} tone="error" />
                <StatCard label="Records" value={String(filteredExpenses.length)} icon={<PieChart className="h-5 w-5" />} />
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <Card className="p-5">
                  <h3 className="font-semibold text-stone-800 mb-4">Expenses by category</h3>
                  {byCategory.length === 0 ? (
                    <p className="text-sm text-stone-400 py-6 text-center">No expenses match the current filters.</p>
                  ) : (
                    <div className="space-y-3">
                      {byCategory.map(([cat, amt]) => (
                        <div key={cat}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-stone-600 font-medium">{cat}</span>
                            <span className="text-stone-800 font-semibold">{formatCurrency(amt)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                            <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${maxCat > 0 ? (amt / maxCat) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold text-stone-800 mb-4">Monthly breakdown</h3>
                  {monthlyExpenses.length === 0 ? (
                    <p className="text-sm text-stone-400 py-6 text-center">No data.</p>
                  ) : (
                    <div className="space-y-2">
                      {monthlyExpenses.map(([m, amt]) => (
                        <div key={m} className="flex items-center justify-between text-sm">
                          <span className="text-stone-600">{m}</span>
                          <span className="text-stone-800 font-semibold">{formatCurrency(amt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}

          {/* Income Report */}
          {tab === 'income' && (
            <>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <StatCard label="Total income" value={formatCurrency(totalIncome)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
                <StatCard label="Records" value={String(filteredIncome.length)} icon={<PieChart className="h-5 w-5" />} />
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <Card className="p-5">
                  <h3 className="font-semibold text-stone-800 mb-4">Income by product</h3>
                  {byProduct.length === 0 ? (
                    <p className="text-sm text-stone-400 py-6 text-center">No income matches the current filters.</p>
                  ) : (
                    <div className="space-y-3">
                      {byProduct.map(([prod, amt]) => (
                        <div key={prod}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-stone-600 font-medium">{prod}</span>
                            <span className="text-stone-800 font-semibold">{formatCurrency(amt)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${maxProd > 0 ? (amt / maxProd) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold text-stone-800 mb-4">Monthly breakdown</h3>
                  {monthlyIncome.length === 0 ? (
                    <p className="text-sm text-stone-400 py-6 text-center">No data.</p>
                  ) : (
                    <div className="space-y-2">
                      {monthlyIncome.map(([m, amt]) => (
                        <div key={m} className="flex items-center justify-between text-sm">
                          <span className="text-stone-600">{m}</span>
                          <span className="text-stone-800 font-semibold">{formatCurrency(amt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}

          {/* Profitability Report */}
          {tab === 'profitability' && (
            <>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <StatCard label="Revenue" value={formatCurrency(profitability.totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
                <StatCard label="Expenses" value={formatCurrency(profitability.totalExpenses)} icon={<TrendingDown className="h-5 w-5" />} tone="error" />
                <StatCard
                  label={includeCapital ? 'Net result' : 'Operating profit'}
                  value={formatCurrency(includeCapital ? profitability.netResult : profitability.operatingProfit)}
                  icon={<Wallet className="h-5 w-5" />}
                  tone={(includeCapital ? profitability.netResult : profitability.operatingProfit) >= 0 ? 'success' : 'error'}
                />
              </div>

              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-5 w-5 text-stone-500" />
                  <h3 className="font-semibold text-stone-800">Per-area & per-kg metrics</h3>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Metric label="Cost per bigha" value={formatOrNull(profitability.costPerBigha, '₹')} />
                  <Metric label="Cost per acre" value={formatOrNull(profitability.costPerAcre, '₹')} />
                  <Metric label="Cost per hectare" value={formatOrNull(profitability.costPerHectare, '₹')} />
                  <Metric label="Revenue per bigha" value={formatOrNull(profitability.revenuePerBigha, '₹')} />
                  <Metric label="Revenue per acre" value={formatOrNull(profitability.revenuePerAcre, '₹')} />
                  <Metric label="Revenue per hectare" value={formatOrNull(profitability.revenuePerHectare, '₹')} />
                  <Metric label="Profit per bigha" value={formatOrNull(profitability.profitPerBigha, '₹')} />
                  <Metric label="Profit per acre" value={formatOrNull(profitability.profitPerAcre, '₹')} />
                  <Metric label="Profit per hectare" value={formatOrNull(profitability.profitPerHectare, '₹')} />
                  <Metric label="Cost per kg" value={formatOrNull(profitability.costPerKg, '₹')} />
                  <Metric label="Revenue per kg" value={formatOrNull(profitability.revenuePerKg, '₹')} />
                  <Metric label="Profit per kg" value={formatOrNull(profitability.profitPerKg, '₹')} />
                </div>
                <p className="mt-4 text-xs text-stone-400">A dash (—) means the data needed for that metric is missing.</p>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-stone-800">{value}</p>
    </div>
  );
}
