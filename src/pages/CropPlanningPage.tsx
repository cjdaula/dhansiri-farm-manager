import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, ClipboardList, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Cultivation, CropType, CropVariety, Farm, Plot, PaddySeason, Settings, AreaUnit } from '@/lib/types';
import { AREA_UNITS, DEFAULT_BIGHA_SQFT } from '@/lib/constants';
import { AREA_UNIT_LABELS } from '@/lib/area';
import { formatCurrency, formatDate, todayISO, num } from '@/lib/format';
import { calcPlannedProfitability } from '@/lib/cropCalc';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function CropPlanningPage() {
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [varieties, setVarieties] = useState<CropVariety[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [seasons, setSeasons] = useState<PaddySeason[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Cultivation | null>(null);
  const [deleting, setDeleting] = useState<Cultivation | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, ctRes, vRes, fRes, pRes, sRes, setRes] = await Promise.all([
      supabase.from('cultivations').select('*').order('created_at', { ascending: false }),
      supabase.from('crop_types').select('*').order('name'),
      supabase.from('crop_varieties').select('*').order('name'),
      supabase.from('farms').select('id, name').order('name'),
      supabase.from('plots').select('id, name, farm_id').order('name'),
      supabase.from('paddy_seasons').select('*').order('name'),
      supabase.from('settings').select('*').maybeSingle(),
    ]);
    if (cRes.error) setError(cRes.error.message);
    else setCultivations(cRes.data as Cultivation[]);
    if (ctRes.data) setCropTypes(ctRes.data as CropType[]);
    if (vRes.data) setVarieties(vRes.data as CropVariety[]);
    if (fRes.data) setFarms(fRes.data as Farm[]);
    if (pRes.data) setPlots(pRes.data as Plot[]);
    if (sRes.data) setSeasons(sRes.data as PaddySeason[]);
    if (setRes.data) setSettings(setRes.data as Settings);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cropName = (id: string | null) => cropTypes.find((c) => c.id === id)?.name ?? '—';
  const varietyName = (id: string | null) => varieties.find((v) => v.id === id)?.name ?? '—';
  const farmName = (id: string | null) => farms.find((f) => f.id === id)?.name ?? '—';
  const plotName = (id: string | null) => plots.find((p) => p.id === id)?.name ?? '—';
  const seasonName = (id: string | null) => seasons.find((s) => s.id === id)?.name ?? '—';
  const bighaSqft = settings?.bigha_sqft ?? DEFAULT_BIGHA_SQFT;

  const plannedCrops = useMemo(
    () => cultivations.filter((c) => c.status === 'planned' || c.status === 'prepared'),
    [cultivations],
  );

  const totalExpectedRevenue = useMemo(
    () => plannedCrops.reduce((s, c) => {
      const p = calcPlannedProfitability(c, bighaSqft);
      return s + (p.expectedRevenue ?? 0);
    }, 0),
    [plannedCrops, bighaSqft],
  );

  const totalExpectedCost = useMemo(
    () => plannedCrops.reduce((s, c) => s + (c.expected_cost ?? 0), 0),
    [plannedCrops],
  );

  const totalExpectedProfit = totalExpectedRevenue - totalExpectedCost;

  const save = async (data: Partial<Cultivation>) => {
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from('cultivations').update(data).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('cultivations').insert({ ...data, status: 'planned' });
      if (error) setError(error.message);
    }
    setBusy(false);
    setModal(false);
    setEditing(null);
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from('cultivations').delete().eq('id', deleting.id);
    if (error) setError(error.message);
    setBusy(false);
    setDeleting(null);
    load();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Crop Planning"
        subtitle="Plan crops with expected yield, cost and revenue. Estimates are separate from actuals."
        actions={<Button onClick={() => { setEditing(null); setModal(true); }}><Plus className="h-4 w-4" /> Plan crop</Button>}
      />
      {error && <ErrorState message={error} />}

      {plannedCrops.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <StatCard label="Expected revenue" value={formatCurrency(totalExpectedRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
          <StatCard label="Expected cost" value={formatCurrency(totalExpectedCost)} icon={<ClipboardList className="h-5 w-5" />} tone="warning" />
          <StatCard label="Expected profit" value={formatCurrency(totalExpectedProfit)} icon={<TrendingUp className="h-5 w-5" />} tone={totalExpectedProfit >= 0 ? 'success' : 'error'} />
        </div>
      )}

      {plannedCrops.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            title="No planned crops"
            description="Plan a crop by selecting crop, variety, plot and entering expected yield and costs."
            action={<Button onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Plan crop</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Crop / Variety</th>
                  <th className="text-left px-4 py-3 font-medium">Plot</th>
                  <th className="text-left px-4 py-3 font-medium">Season</th>
                  <th className="text-left px-4 py-3 font-medium">Area</th>
                  <th className="text-left px-4 py-3 font-medium">Expected yield</th>
                  <th className="text-right px-4 py-3 font-medium">Exp. revenue</th>
                  <th className="text-right px-4 py-3 font-medium">Exp. cost</th>
                  <th className="text-right px-4 py-3 font-medium">Exp. profit</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {plannedCrops.map((c) => {
                  const p = calcPlannedProfitability(c, bighaSqft);
                  return (
                    <tr key={c.id} className="hover:bg-stone-50/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-800">{cropName(c.crop_type_id)}</div>
                        <div className="text-xs text-stone-500">{varietyName(c.variety_id)}</div>
                      </td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{farmName(c.farm_id)} / {plotName(c.plot_id)}</td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{seasonName(c.season_id)}</td>
                      <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{c.area != null ? `${c.area} ${AREA_UNIT_LABELS[c.area_unit]}` : '—'}</td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{c.expected_yield != null ? `${c.expected_yield} ${c.expected_yield_unit ?? ''}` : '—'}</td>
                      <td className="px-4 py-3 text-right text-stone-700 whitespace-nowrap">{p.expectedRevenue != null ? formatCurrency(p.expectedRevenue) : '—'}</td>
                      <td className="px-4 py-3 text-right text-stone-700 whitespace-nowrap">{p.expectedCost != null ? formatCurrency(p.expectedCost) : '—'}</td>
                      <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${(p.expectedProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{p.expectedProfit != null ? formatCurrency(p.expectedProfit) : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => { setEditing(c); setModal(true); }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleting(c)} className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PlanFormModal open={modal} onClose={() => { setModal(false); setEditing(null); }} onSave={save} editing={editing}
        cropTypes={cropTypes} varieties={varieties} farms={farms} plots={plots} seasons={seasons} busy={busy} />
      <ConfirmDialog open={!!deleting} title="Delete planned crop" message="Delete this planned crop? This cannot be undone."
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} loading={busy} />
    </div>
  );
}

interface PlanFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Cultivation>) => void;
  editing: Cultivation | null;
  cropTypes: CropType[];
  varieties: CropVariety[];
  farms: Farm[];
  plots: Plot[];
  seasons: PaddySeason[];
  busy: boolean;
}

function PlanFormModal({ open, onClose, onSave, editing, cropTypes, varieties, farms, plots, seasons, busy }: PlanFormModalProps) {
  const [cropTypeId, setCropTypeId] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [farmId, setFarmId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('bigha');
  const [startDate, setStartDate] = useState('');
  const [expectedHarvest, setExpectedHarvest] = useState('');
  const [expectedYield, setExpectedYield] = useState('');
  const [expectedYieldUnit, setExpectedYieldUnit] = useState('kg');
  const [expectedSellingPrice, setExpectedSellingPrice] = useState('');
  const [expectedCost, setExpectedCost] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCropTypeId(editing?.crop_type_id ?? '');
    setVarietyId(editing?.variety_id ?? '');
    setSeasonId(editing?.season_id ?? '');
    setFarmId(editing?.farm_id ?? '');
    setPlotId(editing?.plot_id ?? '');
    setArea(editing?.area != null ? String(editing.area) : '');
    setAreaUnit((editing?.area_unit ?? 'bigha') as AreaUnit);
    setStartDate(editing?.start_date ?? '');
    setExpectedHarvest(editing?.expected_harvest_date ?? '');
    setExpectedYield(editing?.expected_yield != null ? String(editing.expected_yield) : '');
    setExpectedYieldUnit(editing?.expected_yield_unit ?? 'kg');
    setExpectedSellingPrice(editing?.expected_selling_price != null ? String(editing.expected_selling_price) : '');
    setExpectedCost(editing?.expected_cost != null ? String(editing.expected_cost) : '');
    setNotes(editing?.notes ?? '');
    setErr(null);
  }, [open, editing]);

  const filteredVarieties = cropTypeId ? varieties.filter((v) => v.crop_type_id === cropTypeId) : [];
  const filteredPlots = farmId ? plots.filter((p) => p.farm_id === farmId) : plots;

  const computedRevenue = useMemo(() => {
    const y = num(expectedYield);
    const p = num(expectedSellingPrice);
    if (y != null && p != null) return y * p;
    return null;
  }, [expectedYield, expectedSellingPrice]);

  const submit = () => {
    if (!cropTypeId) { setErr('Please select a crop.'); return; }
    if (area && Number(area) < 0) { setErr('Area cannot be negative.'); return; }
    if (expectedHarvest && startDate && expectedHarvest < startDate) { setErr('Expected harvest cannot precede start date.'); return; }
    if (expectedYield && Number(expectedYield) < 0) { setErr('Expected yield cannot be negative.'); return; }
    if (expectedSellingPrice && Number(expectedSellingPrice) < 0) { setErr('Expected selling price cannot be negative.'); return; }
    if (expectedCost && Number(expectedCost) < 0) { setErr('Expected cost cannot be negative.'); return; }

    onSave({
      crop_type_id: cropTypeId || null,
      variety_id: varietyId || null,
      season_id: seasonId || null,
      farm_id: farmId || null,
      plot_id: plotId || null,
      area: area ? Number(area) : null,
      area_unit: areaUnit,
      start_date: startDate || null,
      expected_harvest_date: expectedHarvest || null,
      expected_yield: expectedYield ? Number(expectedYield) : null,
      expected_yield_unit: expectedYieldUnit.trim() || 'kg',
      expected_selling_price: expectedSellingPrice ? Number(expectedSellingPrice) : null,
      expected_cost: expectedCost ? Number(expectedCost) : null,
      notes: notes.trim() || null,
      status: 'planned',
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit planned crop' : 'Plan crop'} size="xl"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save plan'}</Button></>}>
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Crop" required>
            <Select value={cropTypeId} onChange={(e) => { setCropTypeId(e.target.value); setVarietyId(''); }}>
              <option value="">Select crop…</option>
              {cropTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Variety">
            <Select value={varietyId} onChange={(e) => setVarietyId(e.target.value)}>
              <option value="">—</option>
              {filteredVarieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label="Season">
            <Select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
              <option value="">—</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Farm">
            <Select value={farmId} onChange={(e) => { setFarmId(e.target.value); setPlotId(''); }}>
              <option value="">—</option>
              {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
          <Field label="Plot">
            <Select value={plotId} onChange={(e) => setPlotId(e.target.value)}>
              <option value="">—</option>
              {filteredPlots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Area">
            <TextInput type="number" value={area} onChange={(e) => setArea(e.target.value)} min={0} step="any" />
          </Field>
          <Field label="Area unit">
            <Select value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}>
              {AREA_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Planned start date">
            <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Expected harvest date">
            <TextInput type="date" value={expectedHarvest} onChange={(e) => setExpectedHarvest(e.target.value)} />
          </Field>
        </div>

        <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50">
          <h4 className="text-sm font-semibold text-stone-700 mb-3">Expected production & profitability</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Expected yield">
              <TextInput type="number" value={expectedYield} onChange={(e) => setExpectedYield(e.target.value)} min={0} step="any" />
            </Field>
            <Field label="Yield unit">
              <TextInput value={expectedYieldUnit} onChange={(e) => setExpectedYieldUnit(e.target.value)} />
            </Field>
            <Field label="Expected selling price / unit">
              <TextInput type="number" value={expectedSellingPrice} onChange={(e) => setExpectedSellingPrice(e.target.value)} min={0} step="any" />
            </Field>
            <Field label="Expected total cost">
              <TextInput type="number" value={expectedCost} onChange={(e) => setExpectedCost(e.target.value)} min={0} step="any" />
            </Field>
          </div>
          {computedRevenue != null && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-stone-500">Expected revenue: <span className="font-semibold text-stone-800">{formatCurrency(computedRevenue)}</span></span>
              <span className="text-stone-500">Expected profit: <span className={`font-semibold ${(computedRevenue - (num(expectedCost) ?? 0)) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(computedRevenue - (num(expectedCost) ?? 0))}</span></span>
            </div>
          )}
        </div>

        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
