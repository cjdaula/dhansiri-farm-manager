import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, CalendarClock, TrendingDown, TrendingUp, Wheat, Sprout, Scissors, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type {
  PaddyCrop, PaddyVariety, PaddySeason, Farm, Plot, Expense, Income, Activity,
  PaddyNurseryBatch, PaddyHarvest, AreaUnit,
} from '@/lib/types';
import { AREA_UNITS, PADDY_STATUSES, ACTIVITY_TYPES, ACTIVITY_STATUSES, PLANTING_METHODS, DEFAULT_BIGHA_SQFT } from '@/lib/constants';
import { formatCurrency, formatNumber, formatDate, todayISO, num } from '@/lib/format';
import { calcProfitability, calcYield, formatOrNull } from '@/lib/paddyCalc';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface PaddyRecordDetailProps {
  recordId: string;
  onBack: () => void;
}

type Tab = 'overview' | 'nursery' | 'timeline' | 'expenses' | 'income' | 'harvest' | 'profitability';

const statusMeta = (s: string) => PADDY_STATUSES.find((p) => p.value === s) ?? PADDY_STATUSES[0];

export function PaddyRecordDetail({ recordId, onBack }: PaddyRecordDetailProps) {
  const [crop, setCrop] = useState<PaddyCrop | null>(null);
  const [variety, setVariety] = useState<PaddyVariety | null>(null);
  const [season, setSeason] = useState<PaddySeason | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [plot, setPlot] = useState<Plot | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [nurseryBatches, setNurseryBatches] = useState<PaddyNurseryBatch[]>([]);
  const [harvests, setHarvests] = useState<PaddyHarvest[]>([]);
  const [bighaSqft, setBighaSqft] = useState(DEFAULT_BIGHA_SQFT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  const [nurseryModal, setNurseryModal] = useState(false);
  const [editingNursery, setEditingNursery] = useState<PaddyNurseryBatch | null>(null);
  const [harvestModal, setHarvestModal] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<PaddyHarvest | null>(null);
  const [activityModal, setActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingNursery, setDeletingNursery] = useState<PaddyNurseryBatch | null>(null);
  const [deletingHarvest, setDeletingHarvest] = useState<PaddyHarvest | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, setRes] = await Promise.all([
      supabase.from('paddy_crops').select('*').eq('id', recordId).maybeSingle(),
      supabase.from('settings').select('bigha_sqft').eq('id', 1).maybeSingle(),
    ]);
    if (cRes.error) { setError(cRes.error.message); setLoading(false); return; }
    const c = cRes.data as PaddyCrop | null;
    setCrop(c);
    if (setRes.data) setBighaSqft((setRes.data as { bigha_sqft: number }).bigha_sqft);

    if (c) {
      const [vRes, sRes, fRes, pRes, eRes, iRes, aRes, nbRes, hRes] = await Promise.all([
        c.variety_id ? supabase.from('paddy_varieties').select('*').eq('id', c.variety_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        c.season_id ? supabase.from('paddy_seasons').select('*').eq('id', c.season_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        c.farm_id ? supabase.from('farms').select('*').eq('id', c.farm_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        c.plot_id ? supabase.from('plots').select('*').eq('id', c.plot_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from('expenses').select('*').eq('paddy_crop_id', recordId).order('date', { ascending: false }),
        supabase.from('income').select('*').eq('paddy_crop_id', recordId).order('date', { ascending: false }),
        supabase.from('activities').select('*').eq('paddy_crop_id', recordId).order('date', { ascending: false }),
        supabase.from('paddy_nursery_batches').select('*').eq('cultivation_id', recordId).order('nursery_date', { ascending: true }),
        supabase.from('paddy_harvests').select('*').eq('cultivation_id', recordId).order('created_at', { ascending: false }),
      ]);
      if (vRes.data) setVariety(vRes.data as PaddyVariety);
      if (sRes.data) setSeason(sRes.data as PaddySeason);
      if (fRes.data) setFarm(fRes.data as Farm);
      if (pRes.data) setPlot(pRes.data as Plot);
      setExpenses((eRes.data ?? []) as Expense[]);
      setIncome((iRes.data ?? []) as Income[]);
      setActivities((aRes.data ?? []) as Activity[]);
      setNurseryBatches((nbRes.data ?? []) as PaddyNurseryBatch[]);
      setHarvests((hRes.data ?? []) as PaddyHarvest[]);
    }
    setLoading(false);
  }, [recordId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveNurseryBatch = async (data: Partial<PaddyNurseryBatch>) => {
    setBusy(true);
    if (editingNursery) {
      const { error } = await supabase.from('paddy_nursery_batches').update(data).eq('id', editingNursery.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('paddy_nursery_batches').insert({ ...data, cultivation_id: recordId });
      if (error) setError(error.message);
    }
    setBusy(false); setNurseryModal(false); setEditingNursery(null); load();
  };

  const saveHarvest = async (data: Partial<PaddyHarvest>) => {
    setBusy(true);
    if (editingHarvest) {
      const { error } = await supabase.from('paddy_harvests').update(data).eq('id', editingHarvest.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('paddy_harvests').insert({ ...data, cultivation_id: recordId });
      if (error) setError(error.message);
    }
    setBusy(false); setHarvestModal(false); setEditingHarvest(null); load();
  };

  const saveActivity = async (data: Partial<Activity>) => {
    setBusy(true);
    if (editingActivity) {
      const { error } = await supabase.from('activities').update(data).eq('id', editingActivity.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('activities').insert({
        ...data,
        paddy_crop_id: recordId,
        farm_id: crop?.farm_id ?? null,
        plot_id: crop?.plot_id ?? null,
      });
      if (error) setError(error.message);
    }
    setBusy(false); setActivityModal(false); setEditingActivity(null); load();
  };

  const deleteNurseryBatch = async () => {
    if (!deletingNursery) return;
    setBusy(true);
    const { error } = await supabase.from('paddy_nursery_batches').delete().eq('id', deletingNursery.id);
    if (error) setError(error.message);
    setBusy(false); setDeletingNursery(null); load();
  };

  const deleteHarvest = async () => {
    if (!deletingHarvest) return;
    setBusy(true);
    const { error } = await supabase.from('paddy_harvests').delete().eq('id', deletingHarvest.id);
    if (error) setError(error.message);
    setBusy(false); setDeletingHarvest(null); load();
  };

  const deleteActivity = async () => {
    if (!deletingActivity) return;
    setBusy(true);
    const { error } = await supabase.from('activities').delete().eq('id', deletingActivity.id);
    if (error) setError(error.message);
    setBusy(false); setDeletingActivity(null); load();
  };

  if (loading) return <LoadingState />;
  if (!crop) return <ErrorState message="Record not found." />;

  const profitability = calcProfitability(crop, expenses, income, bighaSqft);
  const yieldData = calcYield(crop, harvests, bighaSqft);
  const sm = statusMeta(crop.status);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'nursery', label: 'Nursery' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'income', label: 'Income' },
    { key: 'harvest', label: 'Harvest' },
    { key: 'profitability', label: 'Profitability' },
  ];

  return (
    <div className="animate-fadeIn">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to paddy records
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
              {variety?.name ?? crop.variety ?? 'Unnamed variety'}
            </h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sm.color}`}>{sm.label}</span>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {season?.name ?? crop.season_year ?? '—'}
            {farm ? ` · ${farm.name}` : ''}
            {plot ? ` / ${plot.name}` : ''}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 overflow-x-auto border-b border-stone-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} />}

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-3">Cultivation information</h3>
            <dl className="space-y-2 text-sm">
              <DetailRow label="Season" value={season?.name ?? crop.season_year ?? '—'} />
              <DetailRow label="Variety" value={variety?.name ?? crop.variety ?? '—'} />
              <DetailRow label="Farm" value={farm?.name ?? '—'} />
              <DetailRow label="Plot" value={plot?.name ?? '—'} />
              <DetailRow label="Area" value={`${formatNumber(crop.area)} ${crop.area_unit}`} />
              <DetailRow label="Status" value={sm.label} />
            </dl>
            {crop.notes && <p className="mt-3 text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2">{crop.notes}</p>}
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-3">Key dates</h3>
            <dl className="space-y-2 text-sm">
              <DetailRow label="Nursery date" value={formatDate(crop.nursery_date)} />
              <DetailRow label="Transplanting date" value={formatDate(crop.transplanting_date)} />
              <DetailRow label="Expected harvest" value={formatDate(crop.expected_harvest_date)} />
              <DetailRow label="Actual harvest" value={formatDate(crop.actual_harvest_date)} />
            </dl>
          </Card>
          {crop.irrigation_notes || crop.fertilizer_notes || crop.crop_protection_notes || crop.observations ? (
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-semibold text-stone-800 mb-3">Crop growth notes</h3>
              <div className="space-y-3 text-sm">
                {crop.irrigation_notes && <NoteBlock label="Irrigation" value={crop.irrigation_notes} />}
                {crop.fertilizer_notes && <NoteBlock label="Fertilizer" value={crop.fertilizer_notes} />}
                {crop.crop_protection_notes && <NoteBlock label="Crop protection" value={crop.crop_protection_notes} />}
                {crop.observations && <NoteBlock label="Observations" value={crop.observations} />}
              </div>
            </Card>
          ) : null}
        </div>
      )}

      {/* Nursery */}
      {tab === 'nursery' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800">Nursery batches</h3>
            <Button size="sm" onClick={() => { setEditingNursery(null); setNurseryModal(true); }}>
              <Plus className="h-4 w-4" /> Add batch
            </Button>
          </div>
          {nurseryBatches.length === 0 ? (
            <Card>
              <EmptyState icon={<Sprout className="h-7 w-7" />} title="No nursery batches" description="Add multiple nursery batches for the same cultivation to track different sowing dates." />
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nurseryBatches.map((nb) => (
                <Card key={nb.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-stone-800">{nb.batch_number ?? 'Batch'}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{formatDate(nb.nursery_date)}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => { setEditingNursery(nb); setNurseryModal(true); }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeletingNursery(nb)} className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <DetailRow label="Area" value={`${formatNumber(nb.nursery_area)} ${nb.nursery_area_unit ?? ''}`} />
                    <DetailRow label="Seed" value={`${formatNumber(nb.seed_quantity)} ${nb.seed_unit ?? ''}`} />
                  </dl>
                  {nb.notes && <p className="mt-2 text-xs text-stone-600 bg-stone-50 rounded px-2 py-1.5">{nb.notes}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {tab === 'timeline' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800">Activity timeline</h3>
            <Button size="sm" onClick={() => { setEditingActivity(null); setActivityModal(true); }}>
              <Plus className="h-4 w-4" /> Add activity
            </Button>
          </div>
          {activities.length === 0 ? (
            <Card>
              <EmptyState icon={<CalendarClock className="h-7 w-7" />} title="No activities" description="Add nursery, land preparation, transplanting, fertilization, irrigation, weeding, pest management and harvest activities." />
            </Card>
          ) : (
            <Card className="p-5">
              <ul className="space-y-4">
                {activities.map((a) => {
                  const done = a.status === 'done';
                  return (
                    <li key={a.id} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${done ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-800">{a.name}</p>
                            <p className="text-xs text-stone-500">{formatDate(a.date)} · {a.activity_type ?? 'Activity'}</p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <span className={`text-xs px-2 py-0.5 rounded-md ${done ? 'bg-emerald-50 text-emerald-600' : a.status === 'cancelled' ? 'bg-rose-50 text-rose-500' : 'bg-stone-100 text-stone-500'}`}>
                              {a.status}
                            </span>
                            <button onClick={() => { setEditingActivity(a); setActivityModal(true); }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeletingActivity(a)} className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {a.notes && <p className="mt-1 text-sm text-stone-600">{a.notes}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Expenses */}
      {tab === 'expenses' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800">Linked expenses ({expenses.length})</h3>
            <span className="text-lg font-bold text-rose-600">{formatCurrency(profitability.totalCost)}</span>
          </div>
          {expenses.length === 0 ? (
            <Card><EmptyState icon={<TrendingDown className="h-7 w-7" />} title="No linked expenses" description="Add expenses from the Expenses page and link them to this cultivation record." /></Card>
          ) : (
            <Card className="overflow-hidden">
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
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-medium">{e.category}</span></td>
                      <td className="px-4 py-3 text-stone-700">{e.description ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-stone-800">{formatCurrency(e.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* Income */}
      {tab === 'income' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800">Linked income ({income.length})</h3>
            <span className="text-lg font-bold text-emerald-600">{formatCurrency(profitability.totalIncome)}</span>
          </div>
          {income.length === 0 ? (
            <Card><EmptyState icon={<TrendingUp className="h-7 w-7" />} title="No linked income" description="Add income from the Income page and link it to this cultivation record." /></Card>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Product</th>
                    <th className="text-left px-4 py-3 font-medium">Buyer</th>
                    <th className="text-right px-4 py-3 font-medium">Income</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {income.map((e) => (
                    <tr key={e.id} className="hover:bg-stone-50/60">
                      <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 text-stone-700 font-medium">{e.product}</td>
                      <td className="px-4 py-3 text-stone-500">{e.buyer ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrency(e.total_income)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* Harvest */}
      {tab === 'harvest' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800">Harvest records</h3>
            <Button size="sm" onClick={() => { setEditingHarvest(null); setHarvestModal(true); }}>
              <Plus className="h-4 w-4" /> Add harvest
            </Button>
          </div>
          {harvests.length === 0 ? (
            <Card><EmptyState icon={<Scissors className="h-7 w-7" />} title="No harvest records" description="Record harvest data including gross quantity, moisture %, drying loss and final quantity." /></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {harvests.map((h) => (
                <Card key={h.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-stone-800">{formatDate(h.harvest_date)}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{formatNumber(h.harvested_area)} {h.harvested_area_unit}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => { setEditingHarvest(h); setHarvestModal(true); }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeletingHarvest(h)} className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <DetailRow label="Gross quantity" value={`${formatNumber(h.gross_quantity)} ${h.quantity_unit ?? ''}`} />
                    <DetailRow label="Moisture %" value={formatNumber(h.moisture_percentage)} />
                    <DetailRow label="Drying loss" value={formatNumber(h.drying_loss)} />
                    <DetailRow label="Final quantity" value={`${formatNumber(h.final_quantity)} ${h.quantity_unit ?? ''}`} />
                  </dl>
                  {h.notes && <p className="mt-2 text-xs text-stone-600 bg-stone-50 rounded px-2 py-1.5">{h.notes}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profitability */}
      {tab === 'profitability' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-4">Summary</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-rose-50 p-3 text-center">
                <p className="text-xs text-rose-500 font-medium">Total cost</p>
                <p className="text-lg font-bold text-rose-700 mt-1">{formatCurrency(profitability.totalCost)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-500 font-medium">Total income</p>
                <p className="text-lg font-bold text-emerald-700 mt-1">{formatCurrency(profitability.totalIncome)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${profitability.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                <p className={`text-xs font-medium ${profitability.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>Net profit</p>
                <p className={`text-lg font-bold mt-1 ${profitability.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(profitability.netProfit)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-4">Per-unit metrics</h3>
            <dl className="space-y-2 text-sm">
              <DetailRow label="Cost per bigha" value={formatOrNull(profitability.costPerBigha, '₹')} />
              <DetailRow label="Cost per hectare" value={formatOrNull(profitability.costPerHectare, '₹')} />
              <DetailRow label="Cost per kg" value={formatOrNull(profitability.costPerKg, '₹')} />
              <DetailRow label="Revenue per bigha" value={formatOrNull(profitability.revenuePerBigha, '₹')} />
              <DetailRow label="Revenue per hectare" value={formatOrNull(profitability.revenuePerHectare, '₹')} />
              <DetailRow label="Profit per bigha" value={formatOrNull(profitability.profitPerBigha, '₹')} />
              <DetailRow label="Profit per hectare" value={formatOrNull(profitability.profitPerHectare, '₹')} />
              <DetailRow label="Profit per kg" value={formatOrNull(profitability.profitPerKg, '₹')} />
            </dl>
          </Card>
          <Card className="p-5 lg:col-span-2">
            <h3 className="font-semibold text-stone-800 mb-4">Yield analysis</h3>
            <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <DetailRow label="Total yield" value={yieldData.totalYield != null ? `${formatNumber(yieldData.totalYield)} ${yieldData.yieldUnit}` : '—'} />
              <DetailRow label="Yield per bigha" value={formatOrNull(yieldData.yieldPerBigha, '', ' ' + yieldData.yieldUnit)} />
              <DetailRow label="Yield per acre" value={formatOrNull(yieldData.yieldPerAcre, '', ' ' + yieldData.yieldUnit)} />
              <DetailRow label="Yield per hectare" value={formatOrNull(yieldData.yieldPerHectare, '', ' ' + yieldData.yieldUnit)} />
            </dl>
            <p className="mt-3 text-xs text-stone-400">Conversions use 1 Bigha = {bighaSqft.toLocaleString()} sq ft (configurable in Settings). Missing values show "—" where data is insufficient.</p>
          </Card>
        </div>
      )}

      {/* Modals */}
      <NurseryBatchModal
        open={nurseryModal}
        onClose={() => { setNurseryModal(false); setEditingNursery(null); }}
        onSave={saveNurseryBatch}
        editing={editingNursery}
        busy={busy}
      />
      <HarvestModal
        open={harvestModal}
        onClose={() => { setHarvestModal(false); setEditingHarvest(null); }}
        onSave={saveHarvest}
        editing={editingHarvest}
        busy={busy}
      />
      <ActivityModal
        open={activityModal}
        onClose={() => { setActivityModal(false); setEditingActivity(null); }}
        onSave={saveActivity}
        editing={editingActivity}
        busy={busy}
      />
      <ConfirmDialog open={!!deletingNursery} title="Delete batch" message="Delete this nursery batch?" onConfirm={deleteNurseryBatch} onCancel={() => setDeletingNursery(null)} loading={busy} />
      <ConfirmDialog open={!!deletingHarvest} title="Delete harvest" message="Delete this harvest record?" onConfirm={deleteHarvest} onCancel={() => setDeletingHarvest(null)} loading={busy} />
      <ConfirmDialog open={!!deletingActivity} title="Delete activity" message={`Delete "${deletingActivity?.name}"?`} onConfirm={deleteActivity} onCancel={() => setDeletingActivity(null)} loading={busy} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-stone-800 font-medium text-right">{value}</dd>
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-stone-400 mb-0.5">{label}</p>
      <p className="text-stone-600 bg-stone-50 rounded-lg px-3 py-2">{value}</p>
    </div>
  );
}

// --- Nursery Batch Modal ---
interface NurseryBatchModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<PaddyNurseryBatch>) => void;
  editing: PaddyNurseryBatch | null;
  busy: boolean;
}

function NurseryBatchModal({ open, onClose, onSave, editing, busy }: NurseryBatchModalProps) {
  const [batchNumber, setBatchNumber] = useState('');
  const [nurseryDate, setNurseryDate] = useState(todayISO());
  const [nurseryArea, setNurseryArea] = useState('');
  const [nurseryAreaUnit, setNurseryAreaUnit] = useState('bigha');
  const [seedQuantity, setSeedQuantity] = useState('');
  const [seedUnit, setSeedUnit] = useState('kg');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBatchNumber(editing?.batch_number ?? '');
    setNurseryDate(editing?.nursery_date ?? todayISO());
    setNurseryArea(editing?.nursery_area != null ? String(editing.nursery_area) : '');
    setNurseryAreaUnit(editing?.nursery_area_unit ?? 'bigha');
    setSeedQuantity(editing?.seed_quantity != null ? String(editing.seed_quantity) : '');
    setSeedUnit(editing?.seed_unit ?? 'kg');
    setNotes(editing?.notes ?? '');
    setErr(null);
  }, [open, editing]);

  const submit = () => {
    if (!nurseryDate) { setErr('Nursery date is required.'); return; }
    if (nurseryArea !== '' && Number(nurseryArea) < 0) { setErr('Area cannot be negative.'); return; }
    if (seedQuantity !== '' && Number(seedQuantity) < 0) { setErr('Seed quantity cannot be negative.'); return; }
    onSave({
      batch_number: batchNumber.trim() || null,
      nursery_date: nurseryDate,
      nursery_area: nurseryArea === '' ? null : Number(nurseryArea),
      nursery_area_unit: nurseryAreaUnit,
      seed_quantity: seedQuantity === '' ? null : Number(seedQuantity),
      seed_unit: seedUnit,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit nursery batch' : 'Add nursery batch'} footer={
      <><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>
    }>
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Batch number"><TextInput value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. Batch 1" /></Field>
          <Field label="Nursery date" required><TextInput type="date" value={nurseryDate} onChange={(e) => setNurseryDate(e.target.value)} /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Nursery area"><TextInput type="number" value={nurseryArea} onChange={(e) => setNurseryArea(e.target.value)} min={0} step="any" /></Field>
          <Field label="Area unit">
            <Select value={nurseryAreaUnit} onChange={(e) => setNurseryAreaUnit(e.target.value)}>
              {AREA_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </Select>
          </Field>
          <div />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Seed quantity"><TextInput type="number" value={seedQuantity} onChange={(e) => setSeedQuantity(e.target.value)} min={0} step="any" /></Field>
          <Field label="Seed unit"><TextInput value={seedUnit} onChange={(e) => setSeedUnit(e.target.value)} /></Field>
        </div>
        <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// --- Harvest Modal ---
interface HarvestModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<PaddyHarvest>) => void;
  editing: PaddyHarvest | null;
  busy: boolean;
}

function HarvestModal({ open, onClose, onSave, editing, busy }: HarvestModalProps) {
  const [harvestDate, setHarvestDate] = useState(todayISO());
  const [harvestedArea, setHarvestedArea] = useState('');
  const [harvestedAreaUnit, setHarvestedAreaUnit] = useState('bigha');
  const [grossQty, setGrossQty] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('kg');
  const [moisturePct, setMoisturePct] = useState('');
  const [dryingLoss, setDryingLoss] = useState('');
  const [finalQty, setFinalQty] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setHarvestDate(editing?.harvest_date ?? todayISO());
    setHarvestedArea(editing?.harvested_area != null ? String(editing.harvested_area) : '');
    setHarvestedAreaUnit(editing?.harvested_area_unit ?? 'bigha');
    setGrossQty(editing?.gross_quantity != null ? String(editing.gross_quantity) : '');
    setQuantityUnit(editing?.quantity_unit ?? 'kg');
    setMoisturePct(editing?.moisture_percentage != null ? String(editing.moisture_percentage) : '');
    setDryingLoss(editing?.drying_loss != null ? String(editing.drying_loss) : '');
    setFinalQty(editing?.final_quantity != null ? String(editing.final_quantity) : '');
    setNotes(editing?.notes ?? '');
    setErr(null);
  }, [open, editing]);

  const submit = () => {
    if (grossQty !== '' && Number(grossQty) < 0) { setErr('Gross quantity cannot be negative.'); return; }
    if (finalQty !== '' && Number(finalQty) < 0) { setErr('Final quantity cannot be negative.'); return; }
    onSave({
      harvest_date: harvestDate || null,
      harvested_area: harvestedArea === '' ? null : Number(harvestedArea),
      harvested_area_unit: harvestedAreaUnit,
      gross_quantity: grossQty === '' ? null : Number(grossQty),
      quantity_unit: quantityUnit,
      moisture_percentage: moisturePct === '' ? null : Number(moisturePct),
      drying_loss: dryingLoss === '' ? null : Number(dryingLoss),
      final_quantity: finalQty === '' ? null : Number(finalQty),
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit harvest' : 'Add harvest'} footer={
      <><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>
    }>
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <Field label="Harvest date"><TextInput type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} /></Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Harvested area"><TextInput type="number" value={harvestedArea} onChange={(e) => setHarvestedArea(e.target.value)} min={0} step="any" /></Field>
          <Field label="Area unit">
            <Select value={harvestedAreaUnit} onChange={(e) => setHarvestedAreaUnit(e.target.value)}>
              {AREA_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </Select>
          </Field>
          <div />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Gross paddy quantity"><TextInput type="number" value={grossQty} onChange={(e) => setGrossQty(e.target.value)} min={0} step="any" /></Field>
          <Field label="Quantity unit"><TextInput value={quantityUnit} onChange={(e) => setQuantityUnit(e.target.value)} /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Moisture %"><TextInput type="number" value={moisturePct} onChange={(e) => setMoisturePct(e.target.value)} min={0} step="any" /></Field>
          <Field label="Drying loss"><TextInput type="number" value={dryingLoss} onChange={(e) => setDryingLoss(e.target.value)} min={0} step="any" /></Field>
          <Field label="Final quantity"><TextInput type="number" value={finalQty} onChange={(e) => setFinalQty(e.target.value)} min={0} step="any" /></Field>
        </div>
        <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// --- Activity Modal ---
interface ActivityModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Activity>) => void;
  editing: Activity | null;
  busy: boolean;
}

function ActivityModal({ open, onClose, onSave, editing, busy }: ActivityModalProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayISO());
  const [activityType, setActivityType] = useState<string>(ACTIVITY_TYPES[0]);
  const [status, setStatus] = useState('planned');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setDate(editing?.date ?? todayISO());
    setActivityType(editing?.activity_type ?? ACTIVITY_TYPES[0]);
    setStatus(editing?.status ?? 'planned');
    setNotes(editing?.notes ?? '');
    setErr(null);
  }, [open, editing]);

  const submit = () => {
    if (!name.trim()) { setErr('Activity name is required.'); return; }
    if (!date) { setErr('Date is required.'); return; }
    onSave({
      name: name.trim(),
      date,
      activity_type: activityType,
      status,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit activity' : 'Add activity'} footer={
      <><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>
    }>
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Activity name" required><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Basal fertilizer" /></Field>
          <Field label="Date" required><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Activity type">
            <Select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
              {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
