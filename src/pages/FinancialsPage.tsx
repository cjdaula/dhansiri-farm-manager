import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, Banknote, PieChart, BarChart3,
  ArrowUpRight, ArrowDownRight, Layers, Calendar, Sprout, MapPin,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type {
  Expense, Income, Farm, Plot, PaddyCrop, Cultivation, CropType,
  ExpenseCategory, DragonFruitPlantation, AreaUnit,
} from '@/lib/types';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card, StatCard } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { DateRangeFilter, resolvePreset } from '@/components/DateRangeFilter';
import { calcPnL, calcReceivablesPayables } from '@/lib/financeCalc';
import type { DateRangePreset } from '@/lib/constants';
import { DEFAULT_BIGHA_SQFT } from '@/lib/constants';

export function FinancialsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [crops, setCrops] = useState<PaddyCrop[]>([]);
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [dfPlantations, setDfPlantations] = useState<DragonFruitPlantation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DateRangePreset>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [farmId, setFarmId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [cropTypeId, setCropTypeId] = useState('');
  const [cropId, setCropId] = useState('');
  const [cultivationId, setCultivationId] = useState('');
  const [dfPlantationId, setDfPlantationId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [includeCapital, setIncludeCapital] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [eRes, iRes, fRes, pRes, cRes, cultRes, ctRes, catRes, dfRes] = await Promise.all([
      supabase.from('expenses').select('*'),
      supabase.from('income').select('*'),
      supabase.from('farms').select('id, name').order('name'),
      supabase.from('plots').select('id, name, farm_id').order('name'),
      supabase.from('paddy_crops').select('id, season_year, variety').order('created_at', { ascending: false }),
      supabase.from('cultivations').select('id, crop_type_id, variety_id, status, notes').order('created_at', { ascending: false }),
      supabase.from('crop_types').select('id, name').order('name'),
      supabase.from('expense_categories').select('*').order('name'),
      supabase.from('dragon_fruit_plantations').select('id, name').order('name'),
    ]);
    if (eRes.error) setError(eRes.error.message);
    else setExpenses(eRes.data ?? []);
    if (iRes.error) setError(iRes.error.message);
    else setIncome(iRes.data ?? []);
    if (fRes.data) setFarms(fRes.data as Farm[]);
    if (pRes.data) setPlots(pRes.data as Plot[]);
    if (cRes.data) setCrops(cRes.data as PaddyCrop[]);
    if (cultRes.data) setCultivations(cultRes.data as Cultivation[]);
    if (ctRes.data) setCropTypes(ctRes.data as CropType[]);
    if (catRes.data) setCategories(catRes.data as ExpenseCategory[]);
    if (dfRes.data) setDfPlantations(dfRes.data as DragonFruitPlantation[]);
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
      if (cropTypeId && e.crop_type_id !== cropTypeId) return false;
      if (cropId && e.paddy_crop_id !== cropId) return false;
      if (cultivationId && e.cultivation_id !== cultivationId) return false;
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (paymentStatusFilter && e.payment_status !== paymentStatusFilter) return false;
      return true;
    });
  }, [expenses, from, to, farmId, plotId, cropTypeId, cropId, cultivationId, categoryFilter, paymentStatusFilter]);

  const filteredIncome = useMemo(() => {
    return income.filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      if (farmId && e.farm_id !== farmId) return false;
      if (plotId && e.plot_id !== plotId) return false;
      if (cropTypeId && e.crop_type_id !== cropTypeId) return false;
      if (cropId && e.paddy_crop_id !== cropId) return false;
      if (cultivationId && e.cultivation_id !== cultivationId) return false;
      if (paymentStatusFilter && e.payment_status !== paymentStatusFilter) return false;
      return true;
    });
  }, [income, from, to, farmId, plotId, cropTypeId, cropId, cultivationId, paymentStatusFilter]);

  const pnl = useMemo(() => calcPnL(
    includeCapital ? filteredExpenses : filteredExpenses.filter((e) => e.expense_type !== 'capital'),
    filteredIncome,
  ), [filteredExpenses, filteredIncome, includeCapital]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.total_amount ?? 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);
  const maxCat = byCategory.length > 0 ? Math.max(...byCategory.map((c) => c[1])) : 0;

  const monthlyData = useMemo(() => {
    const expMap = new Map<string, number>();
    const incMap = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      const m = e.date.slice(0, 7);
      expMap.set(m, (expMap.get(m) ?? 0) + Number(e.total_amount ?? 0));
    });
    filteredIncome.forEach((e) => {
      const m = e.date.slice(0, 7);
      incMap.set(m, (incMap.get(m) ?? 0) + Number(e.total_income ?? 0));
    });
    const months = new Set([...expMap.keys(), ...incMap.keys()]);
    return Array.from(months).sort().map((m) => ({
      month: m,
      expenses: expMap.get(m) ?? 0,
      income: incMap.get(m) ?? 0,
    }));
  }, [filteredExpenses, filteredIncome]);
  const maxMonthly = Math.max(1, ...monthlyData.map((d) => Math.max(d.expenses, d.income)));

  const receivablesDetail = useMemo(() => {
    return filteredIncome
      .filter((e) => {
        const due = Number(e.amount_due ?? 0);
        const received = Number(e.amount_received ?? 0);
        const total = Number(e.total_income ?? 0);
        return due > 0 || (total - received) > 0;
      })
      .map((e) => ({
        id: e.id,
        date: e.date,
        product: e.product,
        total: Number(e.total_income ?? 0),
        received: Number(e.amount_received ?? 0),
        balance: Number(e.amount_due ?? 0) > 0 ? Number(e.amount_due) : Math.max(0, Number(e.total_income ?? 0) - Number(e.amount_received ?? 0)),
        status: e.payment_status,
      }));
  }, [filteredIncome]);

  const payablesDetail = useMemo(() => {
    return filteredExpenses
      .filter((e) => {
        const due = Number(e.amount_due ?? 0);
        const paid = Number(e.amount_paid ?? 0);
        const total = Number(e.total_amount ?? 0);
        return due > 0 || (total - paid) > 0;
      })
      .map((e) => ({
        id: e.id,
        date: e.date,
        category: e.category,
        description: e.description,
        total: Number(e.total_amount ?? 0),
        paid: Number(e.amount_paid ?? 0),
        balance: Number(e.amount_due ?? 0) > 0 ? Number(e.amount_due) : Math.max(0, Number(e.total_amount ?? 0) - Number(e.amount_paid ?? 0)),
        status: e.payment_status,
      }));
  }, [filteredExpenses]);

  const filteredPlots = farmId ? plots.filter((p) => p.farm_id === farmId) : plots;
  const filteredCultivations = cropTypeId ? cultivations.filter((c) => c.crop_type_id === cropTypeId) : cultivations;
  const hasData = expenses.length > 0 || income.length > 0;

  const hasFilters = preset !== 'all' || farmId || plotId || cropTypeId || cropId || cultivationId || dfPlantationId || categoryFilter || paymentStatusFilter;

  const clearFilters = () => {
    setPreset('all'); setFrom(''); setTo('');
    setFarmId(''); setPlotId(''); setCropTypeId(''); setCropId(''); setCultivationId('');
    setDfPlantationId(''); setCategoryFilter(''); setPaymentStatusFilter('');
  };

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Financials"
        subtitle="Business profit & loss statement with receivables and payables."
      />
      {error && <ErrorState message={error} />}

      {!hasData ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="h-7 w-7" />}
            title="No financial data yet"
            description="Once you record income and expenses, your business P&L will appear here."
          />
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card className="p-4 mb-5">
            <div className="flex flex-wrap items-end gap-3">
              <DateRangeFilter
                preset={preset} from={from} to={to}
                onPresetChange={setPreset} onFromChange={setFrom} onToChange={setTo}
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
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Crop type</label>
                <Select value={cropTypeId} onChange={(e) => { setCropTypeId(e.target.value); setCultivationId(''); }}>
                  <option value="">All crop types</option>
                  {cropTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </Select>
              </div>
              <div className="w-44">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Paddy crop</label>
                <Select value={cropId} onChange={(e) => setCropId(e.target.value)}>
                  <option value="">All paddy crops</option>
                  {crops.map((c) => <option key={c.id} value={c.id}>{c.season_year} · {c.variety ?? 'Paddy'}</option>)}
                </Select>
              </div>
              <div className="w-44">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Cultivation</label>
                <Select value={cultivationId} onChange={(e) => setCultivationId(e.target.value)}>
                  <option value="">All cultivations</option>
                  {filteredCultivations.map((c) => {
                    const ct = cropTypes.find((ct) => ct.id === c.crop_type_id);
                    return <option key={c.id} value={c.id}>{ct?.name ?? 'Crop'} · {c.status}</option>;
                  })}
                </Select>
              </div>
              <div className="w-44">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">DF Plantation</label>
                <Select value={dfPlantationId} onChange={(e) => setDfPlantationId(e.target.value)}>
                  <option value="">All plantations</option>
                  {dfPlantations.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div className="w-44">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Category</label>
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">All categories</option>
                  {parentCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </Select>
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Payment status</label>
                <Select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="paid">Paid</option>
                  <option value="partially_paid">Partially paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="fully_received">Fully received</option>
                  <option value="partially_received">Partially received</option>
                  <option value="pending">Pending</option>
                </Select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={includeCapital} onChange={(e) => setIncludeCapital(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-sm text-stone-700">Include capital</span>
              </label>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium pb-2">
                  Clear filters
                </button>
              )}
            </div>
          </Card>

          {/* P&L Statement */}
          <Card className="p-5 mb-5">
            <div className="flex items-center gap-2 mb-5">
              <Layers className="h-5 w-5 text-stone-500" />
              <h3 className="font-semibold text-stone-800">Profit & Loss Statement</h3>
            </div>
            <div className="space-y-1">
              <PnLRow label="Total Revenue" value={formatCurrency(pnl.totalRevenue)} tone="success" bold />
              <PnLRow label="Production Cost (direct crop costs)" value={formatCurrency(pnl.productionCost)} tone="error" indent />
              <PnLRow label="Gross Profit" value={formatCurrency(pnl.grossProfit)} tone={pnl.grossProfit >= 0 ? 'success' : 'error'} bold separator />
              <PnLRow label="Operating Expenses" value={formatCurrency(pnl.operatingExpenses)} tone="error" indent />
              <PnLRow label="Operating Profit" value={formatCurrency(pnl.operatingProfit)} tone={pnl.operatingProfit >= 0 ? 'success' : 'error'} bold separator />
              {includeCapital && (
                <PnLRow label="Capital Expenses" value={formatCurrency(pnl.capitalExpenses)} tone="error" indent />
              )}
              <PnLRow
                label="Net Result"
                value={formatCurrency(pnl.netResult)}
                tone={pnl.netResult >= 0 ? 'success' : 'error'}
                bold
                separator
              />
              <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-stone-200">
                <span className="text-sm font-medium text-stone-600">Profit Margin</span>
                <span className={`text-lg font-bold ${pnl.profitMargin != null ? (pnl.profitMargin >= 0 ? 'text-emerald-700' : 'text-rose-700') : 'text-stone-400'}`}>
                  {pnl.profitMargin != null ? `${pnl.profitMargin.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100">
              <p className="text-xs text-stone-400 leading-relaxed">
                Production Cost = operating expenses linked to a specific crop, cultivation, or crop type.
                Operating Expenses = general operating costs not linked to a specific crop.
                Capital Expenses are shown separately and excluded from operating profit.
                Net Result = Revenue − Production Cost − Operating Expenses{includeCapital ? ' − Capital Expenses' : ''}.
              </p>
            </div>
          </Card>

          {/* Summary cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Revenue" value={formatCurrency(pnl.totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
            <StatCard label="Total expenses" value={formatCurrency(pnl.productionCost + pnl.operatingExpenses + (includeCapital ? pnl.capitalExpenses : 0))} icon={<TrendingDown className="h-5 w-5" />} tone="error" />
            <StatCard
              label="Net result"
              value={formatCurrency(pnl.netResult)}
              icon={pnl.netResult >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              tone={pnl.netResult >= 0 ? 'success' : 'error'}
            />
            <StatCard
              label="Profit margin"
              value={pnl.profitMargin != null ? `${pnl.profitMargin.toFixed(1)}%` : '—'}
              icon={<Wallet className="h-5 w-5" />}
              tone={pnl.profitMargin != null && pnl.profitMargin >= 0 ? 'success' : 'error'}
            />
          </div>

          {/* Receivables & Payables */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <StatCard label="Receivables" value={formatCurrency(pnl.totalReceivables)} icon={<Banknote className="h-5 w-5" />} tone="warning" />
            <StatCard label="Payables" value={formatCurrency(pnl.totalPayables)} icon={<Banknote className="h-5 w-5" />} tone="error" />
          </div>

          {/* Category breakdown + Monthly trend */}
          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            <Card className="p-5">
              <h3 className="font-semibold text-stone-800 mb-4">Expense by category</h3>
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
              <h3 className="font-semibold text-stone-800 mb-4">Monthly income vs expense</h3>
              {monthlyData.length === 0 ? (
                <p className="text-sm text-stone-400 py-6 text-center">No data for the selected period.</p>
              ) : (
                <div className="space-y-3">
                  {monthlyData.map((d) => (
                    <div key={d.month}>
                      <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                        <span>{d.month}</span>
                        <span className={d.income - d.expenses >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                          {formatCurrency(d.income - d.expenses)}
                        </span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div className="h-full rounded-l-full bg-emerald-400 transition-all" style={{ width: `${(d.income / maxMonthly) * 50}%` }} />
                        <div className="h-full rounded-r-full bg-rose-400 transition-all" style={{ width: `${(d.expenses / maxMonthly) * 50}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-stone-400 mt-0.5">
                        <span className="text-emerald-600">{formatCurrency(d.income)}</span>
                        <span className="text-rose-600">{formatCurrency(d.expenses)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Receivables detail */}
          <Card className="p-5 mb-5">
            <h3 className="font-semibold text-stone-800 mb-4">Receivables (pending income)</h3>
            {receivablesDetail.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">No outstanding receivables.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 pr-4 font-medium">Product</th>
                      <th className="pb-2 pr-4 font-medium text-right">Total</th>
                      <th className="pb-2 pr-4 font-medium text-right">Received</th>
                      <th className="pb-2 pr-4 font-medium text-right">Balance</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivablesDetail.map((r) => (
                      <tr key={r.id} className="border-b border-stone-100">
                        <td className="py-2.5 pr-4 text-stone-600">{formatDate(r.date)}</td>
                        <td className="py-2.5 pr-4 text-stone-800 font-medium">{r.product}</td>
                        <td className="py-2.5 pr-4 text-right text-stone-600">{formatCurrency(r.total)}</td>
                        <td className="py-2.5 pr-4 text-right text-emerald-600">{formatCurrency(r.received)}</td>
                        <td className="py-2.5 pr-4 text-right text-amber-600 font-semibold">{formatCurrency(r.balance)}</td>
                        <td className="py-2.5 text-stone-500 capitalize">{r.status.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Payables detail */}
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-4">Payables (unpaid expenses)</h3>
            {payablesDetail.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">No outstanding payables.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 pr-4 font-medium">Category</th>
                      <th className="pb-2 pr-4 font-medium">Description</th>
                      <th className="pb-2 pr-4 font-medium text-right">Total</th>
                      <th className="pb-2 pr-4 font-medium text-right">Paid</th>
                      <th className="pb-2 pr-4 font-medium text-right">Balance</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payablesDetail.map((p) => (
                      <tr key={p.id} className="border-b border-stone-100">
                        <td className="py-2.5 pr-4 text-stone-600">{formatDate(p.date)}</td>
                        <td className="py-2.5 pr-4 text-stone-800 font-medium">{p.category}</td>
                        <td className="py-2.5 pr-4 text-stone-500">{p.description ?? '—'}</td>
                        <td className="py-2.5 pr-4 text-right text-stone-600">{formatCurrency(p.total)}</td>
                        <td className="py-2.5 pr-4 text-right text-emerald-600">{formatCurrency(p.paid)}</td>
                        <td className="py-2.5 pr-4 text-right text-rose-600 font-semibold">{formatCurrency(p.balance)}</td>
                        <td className="py-2.5 text-stone-500 capitalize">{p.status.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function PnLRow({
  label, value, tone, bold, indent, separator,
}: {
  label: string;
  value: string;
  tone: 'success' | 'error' | 'neutral';
  bold?: boolean;
  indent?: boolean;
  separator?: boolean;
}) {
  const toneClass = tone === 'success' ? 'text-emerald-700' : tone === 'error' ? 'text-rose-700' : 'text-stone-800';
  return (
    <div className={`flex items-center justify-between py-2 ${separator ? 'border-t border-stone-200 mt-1' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-stone-800' : 'text-stone-600'} ${indent ? 'pl-4' : ''}`}>
        {label}
      </span>
      <span className={`${bold ? 'text-base font-bold' : 'text-sm font-medium'} ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}
