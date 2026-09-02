import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, CalendarClock, TrendingDown, TrendingUp, Sprout, BarChart3, FileText, Leaf } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Cultivation, CropType, CropVariety, Farm, Plot, PaddySeason, Expense, Income, Activity, CropHarvest, Settings, AreaUnit } from '@/lib/types';
import { CULTIVATION_STATUSES, CROP_ACTIVITY_TYPES, QUALITY_GRADES, AREA_UNITS, DEFAULT_BIGHA_SQFT } from '@/lib/constants';
import { AREA_UNIT_LABELS } from '@/lib/area';
import { formatCurrency, formatDate, todayISO, num } from '@/lib/format';
import { calcPlannedProfitability, calcActualProfitability, summarizeHarvests } from '@/lib/cropCalc';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface CropRecordDetailProps {
  recordId: string;
  onBack: () => void;
}

type Tab = 'overview' | 'planning' | 'activities' | 'expenses' | 'income' | 'production' | 'profitability' | 'notes';

export function CropRecordDetail({ recordId, onBack }: CropRecordDetailProps) {
  const [cultivation, setCultivation] = useState<Cultivation | null>(null);
  const [cropType, setCropType] = useState<CropType | null>(null);
  const [variety, setVariety] = useState<CropVariety | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [plot, setPlot] = useState<Plot | null>(null);
  const [season, setSeason] = useState<PaddySeason | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [harvests, setHarvests] = useState<CropHarvest[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [harvestModal, setHarvestModal] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<CropHarvest | null>(null);
  const [deletingHarvest, setDeletingHarvest] = useState<CropHarvest | null>(null);
  const [activityModal, setActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, setRes] = await Promise.all([
      supabase.from('cultivations').select('*').eq('id', recordId).maybeSingle(),
      supabase.from('settings').select('*').maybeSingle(),
    ]);
    if (cRes.error) { setError(cRes.error.message); setLoading(false); return; }
    const c = cRes.data as Cultivation | null;
    setCultivation(c);
    if (setRes.data) setSettings(setRes.data as Settings);

    if (c) {
      const [ct, v, f, p, s, e, inc, act, h] = await Promise.all([
        c.crop_type_id ? supabase.from('crop_types').select('*').eq('id', c.crop_type_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        c.variety_id ? supabase.from('crop_varieties').select('*').eq('id', c.variety_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        c.farm_id ? supabase.from('farms').select('*').eq('id', c.farm_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        c.plot_id ? supabase.from('plots').select('*').eq('id', c.plot_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        c.season_id ? supabase.from('paddy_seasons').select('*').eq('id', c.season_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from('expenses').select('*').eq('cultivation_id', recordId).order('date', { ascending: false }),
        supabase.from('income').select('*').eq('cultivation_id', recordId).order('date', { ascending: false }),
        supabase.from('activities').select('*').eq('cultivation_id', recordId).order('date', { ascending: false }),
        supabase.from('crop_harvests').select('*').eq('cultivation_id', recordId).order('harvest_date', { ascending: false }),
      ]);
      setCropType(ct.data as CropType | null);
      setVariety(v.data as CropVariety | null);
      setFarm(f.data as Farm | null);
      setPlot(p.data as Plot | null);
      setSeason(s.data as PaddySeason | null);
      setExpenses((e.data ?? []) as Expense[]);
      setIncome((inc.data ?? []) as Income[]);
      setActivities((act.data ?? []) as Activity[]);
      setHarvests((h.data ?? []) as CropHarvest[]);
    }
    setLoading(false);
  }, [recordId]);

  useEffect(() => { load(); }, [load]);

  const saveHarvest = async (data: Partial<CropHarvest>) => {
    setBusy(true);
    if (editingHarvest) {
      const { error } = await supabase.from('crop_harvests').update(data).eq('id', editingHarvest.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('crop_harvests').insert({ ...data, cultivation_id: recordId });
      if (error) setError(error.message);
    }
    setBusy(false);
    setHarvestModal(false);
    setEditingHarvest(null);
    load();
  };

  const deleteHarvest = async () => {
    if (!deletingHarvest) return;
    setBusy(true);
    const { error } = await supabase.from('crop_harvests').delete().eq('id', deletingHarvest.id);
    if (error) setError(error.message);
    setBusy(false);
    setDeletingHarvest(null);
    load();
  };

  const saveActivity = async (data: Partial<Activity>) => {
    setBusy(true);
    if (editingActivity) {
      const { error } = await supabase.from('activities').update(data).eq('id', editingActivity.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('activities').insert({
        ...data,
        cultivation_id: recordId,
        farm_id: cultivation?.farm_id ?? null,
        plot_id: cultivation?.plot_id ?? null,
        status: data.status ?? 'planned',
      });
      if (error) setError(error.message);
    }
    setBusy(false);
    setActivityModal(false);
    setEditingActivity(null);
    load();
  };

  const deleteActivity = async () => {
    if (!deletingActivity) return;
    setBusy(true);
    const { error } = await supabase.from('activities').delete().eq('id', deletingActivity.id);
    if (error) setError(error.message);
    setBusy(false);
    setDeletingActivity(null);
    load();
  };

  if (loading) return <LoadingState />;
  if (!cultivation) return <ErrorState message="Cultivation record not found." />;

  const bighaSqft = settings?.bigha_sqft ?? DEFAULT_BIGHA_SQFT;
  const planned = calcPlannedProfitability(cultivation, bighaSqft);
  const actual = calcActualProfitability(expenses, income, cultivation.area, cultivation.area_unit, bighaSqft);
  const harvestSummary = summarizeHarvests(harvests, cultivation.expected_yield);
  const si = CULTIVATION_STATUSES.find((x) => x.value === cultivation.status);

  const tabs: { key: Tab; label: string; icon: typeof Leaf }[] = [
    { key: 'overview', label: 'Overview', icon: Leaf },
    { key: 'planning', label: 'Planning', icon: Sprout },
    { key: 'activities', label: 'Activities', icon: CalendarClock },
    { key: 'expenses', label: 'Expenses', icon: TrendingDown },
    { key: 'income', label: 'Income', icon: TrendingUp },
    { key: 'production', label: 'Production', icon: BarChart3 },
    { key: 'profitability', label: 'Profitability', icon: BarChart3 },
    { key: 'notes', label: 'Notes', icon: FileText },
  ];

  return (
    <div className="animate-fadeIn">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to crops
      </button>

      {error && <ErrorState message={error} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">{cropType?.name ?? 'Unknown crop'}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          {variety && <span className="text-sm text-stone-500">{variety.name}</span>}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${si?.color ?? 'bg-stone-100 text-stone-600'}`}>{si?.label ?? cultivation.status}</span>
          {cultivation.is_perennial && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">Perennial</span>}
          {cultivation.intercrop_role && cultivation.intercrop_role !== 'primary' && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-sky-700">Intercrop</span>}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 overflow-x-auto border-b border-stone-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-xs text-stone-500 font-medium">Farm</p>
              <p className="mt-1 text-sm font-semibold text-stone-800">{farm?.name ?? '—'}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-stone-500 font-medium">Plot</p>
              <p className="mt-1 text-sm font-semibold text-stone-800">{plot?.name ?? '—'}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-stone-500 font-medium">Season</p>
              <p className="mt-1 text-sm font-semibold text-stone-800">{season?.name ?? '—'}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-stone-500 font-medium">Area</p>
              <p className="mt-1 text-sm font-semibold text-stone-800">{cultivation.area != null ? `${cultivation.area} ${AREA_UNIT_LABELS[cultivation.area_unit]}` : '—'}</p>
            </Card>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-xs text-stone-500 font-medium">Start date</p>
              <p className="mt-1 text-sm font-semibold text-stone-800">{formatDate(cultivation.start_date)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-stone-500 font-medium">Expected harvest</p>
              <p className="mt-1 text-sm font-semibold text-stone-800">{formatDate(cultivation.expected_harvest_date)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-stone-500 font-medium">Actual harvest</p>
              <p className="mt-1 text-sm font-semibold text-stone-800">{formatDate(cultivation.actual_harvest_date)}</p>
            </Card>
          </div>
          {cultivation.is_perennial && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-3">Perennial details</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><p className="text-xs text-stone-500">Planting date</p><p className="text-sm font-medium text-stone-800">{formatDate(cultivation.planting_date)}</p></div>
                <div><p className="text-xs text-stone-500">Plant age</p><p className="text-sm font-medium text-stone-800">{cultivation.plant_age_years != null ? `${cultivation.plant_age_years} years` : '—'}</p></div>
                <div><p className="text-xs text-stone-500">Plant count</p><p className="text-sm font-medium text-stone-800">{cultivation.plant_count ?? '—'}</p></div>
                <div><p className="text-xs text-stone-500">Production year</p><p className="text-sm font-medium text-stone-800">{cultivation.production_year ?? '—'}</p></div>
              </div>
              {cultivation.spacing && <p className="mt-3 text-xs text-stone-500">Spacing: <span className="text-stone-700">{cultivation.spacing}</span></p>}
            </Card>
          )}
        </div>
      )}

      {tab === 'planning' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Expected yield" value={cultivation.expected_yield != null ? `${cultivation.expected_yield} ${cultivation.expected_yield_unit ?? ''}` : '—'} />
            <StatCard label="Expected selling price" value={cultivation.expected_selling_price != null ? formatCurrency(cultivation.expected_selling_price) : '—'} />
            <StatCard label="Expected cost" value={planned.expectedCost != null ? formatCurrency(planned.expectedCost) : '—'} tone="warning" />
            <StatCard label="Expected revenue" value={planned.expectedRevenue != null ? formatCurrency(planned.expectedRevenue) : '—'} tone="success" />
            <StatCard label="Expected profit" value={planned.expectedProfit != null ? formatCurrency(planned.expectedProfit) : '—'} tone={(planned.expectedProfit ?? 0) >= 0 ? 'success' : 'error'} />
            <StatCard label="Expected profit / bigha" value={planned.profitPerBigha != null ? formatCurrency(planned.profitPerBigha) : '—'} tone={(planned.profitPerBigha ?? 0) >= 0 ? 'success' : 'error'} />
          </div>
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">Per-unit area breakdown</h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div><span className="text-stone-500">Revenue/bigha: </span><span className="font-semibold text-stone-800">{planned.revenuePerBigha != null ? formatCurrency(planned.revenuePerBigha) : '—'}</span></div>
              <div><span className="text-stone-500">Cost/bigha: </span><span className="font-semibold text-stone-800">{planned.costPerBigha != null ? formatCurrency(planned.costPerBigha) : '—'}</span></div>
              <div><span className="text-stone-500">Profit/bigha: </span><span className={`font-semibold ${(planned.profitPerBigha ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{planned.profitPerBigha != null ? formatCurrency(planned.profitPerBigha) : '—'}</span></div>
            </div>
          </Card>
          <p className="text-xs text-stone-400">Planned values are estimates only and do not affect actual financial records.</p>
        </div>
      )}

      {tab === 'activities' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingActivity(null); setActivityModal(true); }}><Plus className="h-4 w-4" /> Add activity</Button>
          </div>
          {activities.length === 0 ? (
            <Card><EmptyState icon={<CalendarClock className="h-7 w-7" />} title="No activities" description="Add activities like sowing, fertilization, irrigation, etc." /></Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Activity</th>
                      <th className="text-left px-4 py-3 font-medium">Type</th>
                      <th className="text-left px-4 py-3 font-medium">Planned date</th>
                      <th className="text-left px-4 py-3 font-medium">Actual date</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {activities.map((a) => (
                      <tr key={a.id} className="hover:bg-stone-50/60">
                        <td className="px-4 py-3 font-medium text-stone-800">{a.name}</td>
                        <td className="px-4 py-3 text-stone-500">{a.activity_type ?? '—'}</td>
                        <td className="px-4 py-3 text-stone-500">{formatDate(a.planned_date)}</td>
                        <td className="px-4 py-3 text-stone-500">{formatDate(a.actual_date ?? a.date)}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-600">{a.status}</span></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => { setEditingActivity(a); setActivityModal(true); }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setDeletingActivity(a)} className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'expenses' && (
        <div className="space-y-4">
          {expenses.length === 0 ? (
            <Card><EmptyState icon={<TrendingDown className="h-7 w-7" />} title="No expenses linked" description="Expenses linked to this cultivation will appear here." /></Card>
          ) : (
            <>
              <StatCard label="Total cost" value={formatCurrency(actual.totalCost)} icon={<TrendingDown className="h-5 w-5" />} tone="error" />
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Date</th>
                        <th className="text-left px-4 py-3 font-medium">Category</th>
                        <th className="text-left px-4 py-3 font-medium">Description</th>
                        <th className="text-right px-4 py-3 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-stone-50/60">
                          <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatDate(e.date)}</td>
                          <td className="px-4 py-3 text-stone-600">{e.category}{e.subcategory ? ` · ${e.subcategory}` : ''}</td>
                          <td className="px-4 py-3 text-stone-700 max-w-xs truncate">{e.description || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-stone-800 whitespace-nowrap">{formatCurrency(e.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === 'income' && (
        <div className="space-y-4">
          {income.length === 0 ? (
            <Card><EmptyState icon={<TrendingUp className="h-7 w-7" />} title="No income linked" description="Income linked to this cultivation will appear here." /></Card>
          ) : (
            <>
              <StatCard label="Total revenue" value={formatCurrency(actual.totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Date</th>
                        <th className="text-left px-4 py-3 font-medium">Product</th>
                        <th className="text-left px-4 py-3 font-medium">Buyer</th>
                        <th className="text-right px-4 py-3 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {income.map((i) => (
                        <tr key={i.id} className="hover:bg-stone-50/60">
                          <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatDate(i.date)}</td>
                          <td className="px-4 py-3 text-stone-700">{i.product}</td>
                          <td className="px-4 py-3 text-stone-500">{i.buyer ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-stone-800 whitespace-nowrap">{formatCurrency(i.total_income)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === 'production' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingHarvest(null); setHarvestModal(true); }}><Plus className="h-4 w-4" /> Add harvest</Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Expected production" value={cultivation.expected_yield != null ? `${cultivation.expected_yield} ${cultivation.expected_yield_unit ?? ''}` : '—'} />
            <StatCard label="Total harvested" value={`${harvestSummary.totalHarvested} ${harvests[0]?.unit ?? cultivation.expected_yield_unit ?? ''}`} tone="success" />
            <StatCard label="Remaining expected" value={harvestSummary.remainingExpected != null ? `${harvestSummary.remainingExpected} ${cultivation.expected_yield_unit ?? ''}` : '—'} tone="warning" />
            <StatCard label="Harvest status" value={harvestSummary.harvestStatus.replace('_', ' ')} tone={harvestSummary.harvestStatus === 'fully_harvested' ? 'success' : harvestSummary.harvestStatus === 'partially_harvested' ? 'warning' : 'default'} />
          </div>
          {harvests.length === 0 ? (
            <Card><EmptyState icon={<BarChart3 className="h-7 w-7" />} title="No harvest records" description="Add harvest records to track production. Multiple harvests are supported." /></Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="text-right px-4 py-3 font-medium">Quantity</th>
                      <th className="text-left px-4 py-3 font-medium">Grade</th>
                      <th className="text-right px-4 py-3 font-medium">Loss</th>
                      <th className="text-right px-4 py-3 font-medium">Final qty</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {harvests.map((h) => (
                      <tr key={h.id} className="hover:bg-stone-50/60">
                        <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatDate(h.harvest_date)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-stone-800 whitespace-nowrap">{h.quantity} {h.unit}</td>
                        <td className="px-4 py-3 text-stone-500">{h.quality_grade ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-stone-500">{h.loss_quantity ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-stone-700">{h.final_quantity ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => { setEditingHarvest(h); setHarvestModal(true); }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setDeletingHarvest(h)} className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'profitability' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <StatCard label="Total cost" value={formatCurrency(actual.totalCost)} icon={<TrendingDown className="h-5 w-5" />} tone="error" />
            <StatCard label="Total revenue" value={formatCurrency(actual.totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
            <StatCard label="Profit" value={formatCurrency(actual.profit)} icon={<BarChart3 className="h-5 w-5" />} tone={actual.profit >= 0 ? 'success' : 'error'} />
          </div>
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">Cost & revenue per unit area</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Metric</th>
                    <th className="text-right px-4 py-2 font-medium">Per bigha</th>
                    <th className="text-right px-4 py-2 font-medium">Per acre</th>
                    <th className="text-right px-4 py-2 font-medium">Per hectare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr><td className="px-4 py-2 text-stone-600">Cost</td><td className="px-4 py-2 text-right">{actual.costPerBigha != null ? formatCurrency(actual.costPerBigha) : '—'}</td><td className="px-4 py-2 text-right">{actual.costPerAcre != null ? formatCurrency(actual.costPerAcre) : '—'}</td><td className="px-4 py-2 text-right">{actual.costPerHectare != null ? formatCurrency(actual.costPerHectare) : '—'}</td></tr>
                  <tr><td className="px-4 py-2 text-stone-600">Revenue</td><td className="px-4 py-2 text-right">{actual.revenuePerBigha != null ? formatCurrency(actual.revenuePerBigha) : '—'}</td><td className="px-4 py-2 text-right">{actual.revenuePerAcre != null ? formatCurrency(actual.revenuePerAcre) : '—'}</td><td className="px-4 py-2 text-right">{actual.revenuePerHectare != null ? formatCurrency(actual.revenuePerHectare) : '—'}</td></tr>
                  <tr><td className="px-4 py-2 font-medium text-stone-800">Profit</td><td className="px-4 py-2 text-right font-semibold">{actual.profitPerBigha != null ? formatCurrency(actual.profitPerBigha) : '—'}</td><td className="px-4 py-2 text-right font-semibold">{actual.profitPerAcre != null ? formatCurrency(actual.profitPerAcre) : '—'}</td><td className="px-4 py-2 text-right font-semibold">{actual.profitPerHectare != null ? formatCurrency(actual.profitPerHectare) : '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'notes' && (
        <Card className="p-5">
          {cultivation.notes ? <p className="text-sm text-stone-700 whitespace-pre-wrap">{cultivation.notes}</p> : <p className="text-sm text-stone-400">No notes recorded.</p>}
        </Card>
      )}

      <HarvestFormModal open={harvestModal} onClose={() => { setHarvestModal(false); setEditingHarvest(null); }} onSave={saveHarvest} editing={editingHarvest} busy={busy} defaultUnit={cultivation.expected_yield_unit ?? 'kg'} />
      <ConfirmDialog open={!!deletingHarvest} title="Delete harvest" message="Delete this harvest record?" onConfirm={deleteHarvest} onCancel={() => setDeletingHarvest(null)} loading={busy} />
      <ActivityFormModal open={activityModal} onClose={() => { setActivityModal(false); setEditingActivity(null); }} onSave={saveActivity} editing={editingActivity} busy={busy} />
      <ConfirmDialog open={!!deletingActivity} title="Delete activity" message="Delete this activity?" onConfirm={deleteActivity} onCancel={() => setDeletingActivity(null)} loading={busy} />
    </div>
  );
}

function HarvestFormModal({ open, onClose, onSave, editing, busy, defaultUnit }: {
  open: boolean; onClose: () => void; onSave: (d: Partial<CropHarvest>) => void; editing: CropHarvest | null; busy: boolean; defaultUnit: string;
}) {
  const [harvestDate, setHarvestDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [qualityGrade, setQualityGrade] = useState('');
  const [moisture, setMoisture] = useState('');
  const [lossQuantity, setLossQuantity] = useState('');
  const [finalQuantity, setFinalQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setHarvestDate(editing?.harvest_date ?? todayISO());
    setQuantity(editing?.quantity != null ? String(editing.quantity) : '');
    setUnit(editing?.unit ?? defaultUnit);
    setQualityGrade(editing?.quality_grade ?? '');
    setMoisture(editing?.moisture_percentage != null ? String(editing.moisture_percentage) : '');
    setLossQuantity(editing?.loss_quantity != null ? String(editing.loss_quantity) : '');
    setFinalQuantity(editing?.final_quantity != null ? String(editing.final_quantity) : '');
    setNotes(editing?.notes ?? '');
    setErr(null);
  }, [open, editing, defaultUnit]);

  const submit = () => {
    if (!quantity) { setErr('Quantity is required.'); return; }
    if (Number(quantity) < 0) { setErr('Quantity cannot be negative.'); return; }
    if (lossQuantity && Number(lossQuantity) < 0) { setErr('Loss cannot be negative.'); return; }
    onSave({
      harvest_date: harvestDate || null,
      quantity: Number(quantity),
      unit: unit.trim() || 'kg',
      quality_grade: qualityGrade || null,
      moisture_percentage: moisture ? Number(moisture) : null,
      loss_quantity: lossQuantity ? Number(lossQuantity) : null,
      final_quantity: finalQuantity ? Number(finalQuantity) : null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit harvest' : 'Add harvest'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Harvest date"><TextInput type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} /></Field>
          <Field label="Quantity" required><TextInput type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={0} step="any" /></Field>
          <Field label="Unit"><TextInput value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Grade"><Select value={qualityGrade} onChange={(e) => setQualityGrade(e.target.value)}><option value="">—</option>{QUALITY_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</Select></Field>
          <Field label="Moisture %"><TextInput type="number" value={moisture} onChange={(e) => setMoisture(e.target.value)} min={0} step="any" /></Field>
          <Field label="Loss qty"><TextInput type="number" value={lossQuantity} onChange={(e) => setLossQuantity(e.target.value)} min={0} step="any" /></Field>
          <Field label="Final qty"><TextInput type="number" value={finalQuantity} onChange={(e) => setFinalQuantity(e.target.value)} min={0} step="any" /></Field>
        </div>
        <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function ActivityFormModal({ open, onClose, onSave, editing, busy }: {
  open: boolean; onClose: () => void; onSave: (d: Partial<Activity>) => void; editing: Activity | null; busy: boolean;
}) {
  const [name, setName] = useState('');
  const [activityType, setActivityType] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [actualDate, setActualDate] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('planned');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setActivityType(editing?.activity_type ?? '');
    setPlannedDate(editing?.planned_date ?? '');
    setActualDate(editing?.actual_date ?? '');
    setDate(editing?.date ?? todayISO());
    setStatus(editing?.status ?? 'planned');
    setNotes(editing?.notes ?? '');
    setErr(null);
  }, [open, editing]);

  const submit = () => {
    if (!name.trim()) { setErr('Activity name is required.'); return; }
    onSave({
      name: name.trim(),
      activity_type: activityType || null,
      planned_date: plannedDate || null,
      actual_date: actualDate || null,
      date: date || todayISO(),
      status,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit activity' : 'Add activity'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Activity name" required><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Type"><Select value={activityType} onChange={(e) => setActivityType(e.target.value)}><option value="">—</option>{CROP_ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Planned date"><TextInput type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} /></Field>
          <Field label="Actual date"><TextInput type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)} /></Field>
          <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="done">Done</option><option value="cancelled">Cancelled</option></Select></Field>
        </div>
        <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
