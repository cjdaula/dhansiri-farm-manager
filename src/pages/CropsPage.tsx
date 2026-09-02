import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, Leaf, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Cultivation, CultivationStatus, CropType, CropVariety, Farm, Plot, PaddySeason, AreaUnit } from '@/lib/types';
import { CULTIVATION_STATUSES, AREA_UNITS } from '@/lib/constants';
import { AREA_UNIT_LABELS } from '@/lib/area';
import { formatCurrency, formatDate, todayISO, num } from '@/lib/format';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface CropsPageProps {
  onOpenRecord: (id: string) => void;
}

type SortKey = 'start_date' | 'expected_harvest_date' | 'area' | 'expected_yield' | 'created_at';

export function CropsPage({ onOpenRecord }: CropsPageProps) {
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [varieties, setVarieties] = useState<CropVariety[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [seasons, setSeasons] = useState<PaddySeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Cultivation | null>(null);
  const [deleting, setDeleting] = useState<Cultivation | null>(null);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCrop, setFilterCrop] = useState('');
  const [filterVariety, setFilterVariety] = useState('');
  const [filterFarm, setFilterFarm] = useState('');
  const [filterPlot, setFilterPlot] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPerennial, setFilterPerennial] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, ctRes, vRes, fRes, pRes, sRes] = await Promise.all([
      supabase.from('cultivations').select('*').order('created_at', { ascending: false }),
      supabase.from('crop_types').select('*').order('name'),
      supabase.from('crop_varieties').select('*').order('name'),
      supabase.from('farms').select('id, name').order('name'),
      supabase.from('plots').select('id, name, farm_id').order('name'),
      supabase.from('paddy_seasons').select('*').order('name'),
    ]);
    if (cRes.error) setError(cRes.error.message);
    else setCultivations(cRes.data as Cultivation[]);
    if (ctRes.data) setCropTypes(ctRes.data as CropType[]);
    if (vRes.data) setVarieties(vRes.data as CropVariety[]);
    if (fRes.data) setFarms(fRes.data as Farm[]);
    if (pRes.data) setPlots(pRes.data as Plot[]);
    if (sRes.data) setSeasons(sRes.data as PaddySeason[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cropName = (id: string | null) => cropTypes.find((c) => c.id === id)?.name ?? '—';
  const varietyName = (id: string | null) => varieties.find((v) => v.id === id)?.name ?? '—';
  const farmName = (id: string | null) => farms.find((f) => f.id === id)?.name ?? '—';
  const plotName = (id: string | null) => plots.find((p) => p.id === id)?.name ?? '—';
  const seasonName = (id: string | null) => seasons.find((s) => s.id === id)?.name ?? '—';
  const statusInfo = (s: string) => CULTIVATION_STATUSES.find((x) => x.value === s);

  const filteredVarieties = useMemo(
    () => filterCrop ? varieties.filter((v) => v.crop_type_id === filterCrop) : varieties,
    [varieties, filterCrop],
  );

  const filtered = useMemo(() => {
    let result = cultivations.filter((c) => {
      if (filterCrop && c.crop_type_id !== filterCrop) return false;
      if (filterVariety && c.variety_id !== filterVariety) return false;
      if (filterFarm && c.farm_id !== filterFarm) return false;
      if (filterPlot && c.plot_id !== filterPlot) return false;
      if (filterSeason && c.season_id !== filterSeason) return false;
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterPerennial === 'perennial' && !c.is_perennial) return false;
      if (filterPerennial === 'annual' && c.is_perennial) return false;
      if (search) {
        const q = search.toLowerCase();
        const text = `${cropName(c.crop_type_id)} ${varietyName(c.variety_id)} ${farmName(c.farm_id)} ${plotName(c.plot_id)} ${c.notes ?? ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortBy) {
        case 'start_date': av = a.start_date ?? ''; bv = b.start_date ?? ''; break;
        case 'expected_harvest_date': av = a.expected_harvest_date ?? ''; bv = b.expected_harvest_date ?? ''; break;
        case 'area': av = a.area ?? 0; bv = b.area ?? 0; break;
        case 'expected_yield': av = a.expected_yield ?? 0; bv = b.expected_yield ?? 0; break;
        case 'created_at': av = a.created_at; bv = b.created_at; break;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [cultivations, filterCrop, filterVariety, filterFarm, filterPlot, filterSeason, filterStatus, filterPerennial, search, sortBy, sortDir, cropTypes, varieties, farms, plots]);

  const save = async (data: Partial<Cultivation>) => {
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from('cultivations').update(data).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('cultivations').insert(data);
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

  const hasFilters = search || filterCrop || filterVariety || filterFarm || filterPlot || filterSeason || filterStatus || filterPerennial;

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Crops"
        subtitle="Manage all cultivation records across the farm."
        actions={<Button onClick={() => { setEditing(null); setModal(true); }}><Plus className="h-4 w-4" /> Add cultivation</Button>}
      />
      {error && <ErrorState message={error} />}

      {cultivations.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Leaf className="h-7 w-7" />}
            title="No cultivation records"
            description="Create a cultivation record to start tracking a crop on a plot."
            action={<Button onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Add cultivation</Button>}
          />
        </Card>
      ) : (
        <>
          <Card className="p-4 mb-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-56">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Search</label>
                <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Crop, variety, plot…" />
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Crop</label>
                <Select value={filterCrop} onChange={(e) => { setFilterCrop(e.target.value); setFilterVariety(''); }}>
                  <option value="">All crops</option>
                  {cropTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Variety</label>
                <Select value={filterVariety} onChange={(e) => setFilterVariety(e.target.value)}>
                  <option value="">All varieties</option>
                  {filteredVarieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Select>
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Farm</label>
                <Select value={filterFarm} onChange={(e) => setFilterFarm(e.target.value)}>
                  <option value="">All farms</option>
                  {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Plot</label>
                <Select value={filterPlot} onChange={(e) => setFilterPlot(e.target.value)}>
                  <option value="">All plots</option>
                  {plots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Season</label>
                <Select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
                  <option value="">All seasons</option>
                  {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Status</label>
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  {CULTIVATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Type</label>
                <Select value={filterPerennial} onChange={(e) => setFilterPerennial(e.target.value)}>
                  <option value="">All</option>
                  <option value="annual">Annual</option>
                  <option value="perennial">Perennial</option>
                </Select>
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Sort by</label>
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                  <option value="created_at">Date created</option>
                  <option value="start_date">Start date</option>
                  <option value="expected_harvest_date">Expected harvest</option>
                  <option value="area">Area</option>
                  <option value="expected_yield">Expected yield</option>
                </Select>
              </div>
              <button onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')} className="text-xs text-stone-500 hover:text-stone-700 font-medium pb-2">
                {sortDir === 'asc' ? 'Asc' : 'Desc'}
              </button>
              {hasFilters && (
                <button onClick={() => { setSearch(''); setFilterCrop(''); setFilterVariety(''); setFilterFarm(''); setFilterPlot(''); setFilterSeason(''); setFilterStatus(''); setFilterPerennial(''); }} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium pb-2">
                  Clear filters
                </button>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Crop / Variety</th>
                    <th className="text-left px-4 py-3 font-medium">Farm / Plot</th>
                    <th className="text-left px-4 py-3 font-medium">Season</th>
                    <th className="text-left px-4 py-3 font-medium">Area</th>
                    <th className="text-left px-4 py-3 font-medium">Start</th>
                    <th className="text-left px-4 py-3 font-medium">Expected harvest</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((c) => {
                    const si = statusInfo(c.status);
                    return (
                      <tr key={c.id} className="hover:bg-stone-50/60 cursor-pointer" onClick={() => onOpenRecord(c.id)}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-stone-800">{cropName(c.crop_type_id)}</div>
                          <div className="text-xs text-stone-500">{varietyName(c.variety_id)}</div>
                          {c.is_perennial && <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-medium">Perennial</span>}
                          {c.intercrop_role && c.intercrop_role !== 'primary' && <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 text-[10px] font-medium">Intercrop</span>}
                        </td>
                        <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{farmName(c.farm_id)} / {plotName(c.plot_id)}</td>
                        <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{seasonName(c.season_id)}</td>
                        <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{c.area != null ? `${c.area} ${AREA_UNIT_LABELS[c.area_unit]}` : '—'}</td>
                        <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{formatDate(c.start_date)}</td>
                        <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{formatDate(c.expected_harvest_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${si?.color ?? 'bg-stone-100 text-stone-600'}`}>{si?.label ?? c.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => onOpenRecord(c.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50">
                              <ChevronRight className="h-4 w-4" />
                            </button>
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
        </>
      )}

      <CultivationFormModal open={modal} onClose={() => { setModal(false); setEditing(null); }} onSave={save} editing={editing}
        cropTypes={cropTypes} varieties={varieties} farms={farms} plots={plots} seasons={seasons} busy={busy} />
      <ConfirmDialog open={!!deleting} title="Delete cultivation" message="Delete this cultivation record? Linked expenses, income, and harvests will remain but lose their link. This cannot be undone."
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} loading={busy} />
    </div>
  );
}

interface CultivationFormModalProps {
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

function CultivationFormModal({ open, onClose, onSave, editing, cropTypes, varieties, farms, plots, seasons, busy }: CultivationFormModalProps) {
  const [cropTypeId, setCropTypeId] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [farmId, setFarmId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('bigha');
  const [startDate, setStartDate] = useState('');
  const [expectedHarvest, setExpectedHarvest] = useState('');
  const [actualHarvest, setActualHarvest] = useState('');
  const [status, setStatus] = useState<CultivationStatus>('planned');
  const [isPerennial, setIsPerennial] = useState(false);
  const [plantingDate, setPlantingDate] = useState('');
  const [plantAgeYears, setPlantAgeYears] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [spacing, setSpacing] = useState('');
  const [productionYear, setProductionYear] = useState('');
  const [parentCultivationId, setParentCultivationId] = useState('');
  const [intercropRole, setIntercropRole] = useState('');
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
    setActualHarvest(editing?.actual_harvest_date ?? '');
    setStatus((editing?.status ?? 'planned') as CultivationStatus);
    setIsPerennial(editing?.is_perennial ?? false);
    setPlantingDate(editing?.planting_date ?? '');
    setPlantAgeYears(editing?.plant_age_years != null ? String(editing.plant_age_years) : '');
    setPlantCount(editing?.plant_count != null ? String(editing.plant_count) : '');
    setSpacing(editing?.spacing ?? '');
    setProductionYear(editing?.production_year != null ? String(editing.production_year) : '');
    setParentCultivationId(editing?.parent_cultivation_id ?? '');
    setIntercropRole(editing?.intercrop_role ?? '');
    setNotes(editing?.notes ?? '');
    setErr(null);
  }, [open, editing]);

  const filteredVarieties = cropTypeId ? varieties.filter((v) => v.crop_type_id === cropTypeId) : [];
  const filteredPlots = farmId ? plots.filter((p) => p.farm_id === farmId) : plots;

  const submit = () => {
    if (!cropTypeId) { setErr('Please select a crop.'); return; }
    if (area && Number(area) < 0) { setErr('Area cannot be negative.'); return; }
    if (expectedHarvest && startDate && expectedHarvest < startDate) { setErr('Expected harvest date cannot precede start date.'); return; }
    if (actualHarvest && startDate && actualHarvest < startDate) { setErr('Actual harvest date cannot precede start date.'); return; }

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
      actual_harvest_date: actualHarvest || null,
      status,
      is_perennial: isPerennial,
      planting_date: plantingDate || null,
      plant_age_years: plantAgeYears ? Number(plantAgeYears) : null,
      plant_count: plantCount ? Number(plantCount) : null,
      spacing: spacing.trim() || null,
      production_year: productionYear ? Number(productionYear) : null,
      parent_cultivation_id: parentCultivationId || null,
      intercrop_role: (intercropRole || null) as Cultivation['intercrop_role'],
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit cultivation' : 'Add cultivation'} size="xl"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as CultivationStatus)}>
              {CULTIVATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Area">
            <TextInput type="number" value={area} onChange={(e) => setArea(e.target.value)} min={0} step="any" />
          </Field>
          <Field label="Area unit">
            <Select value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}>
              {AREA_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </Select>
          </Field>
          <Field label="Start date">
            <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Expected harvest date">
            <TextInput type="date" value={expectedHarvest} onChange={(e) => setExpectedHarvest(e.target.value)} />
          </Field>
          <Field label="Actual harvest date">
            <TextInput type="date" value={actualHarvest} onChange={(e) => setActualHarvest(e.target.value)} />
          </Field>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isPerennial} onChange={(e) => setIsPerennial(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" />
          <span className="text-sm font-medium text-stone-700">Perennial crop</span>
        </label>

        {isPerennial && (
          <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-4">
            <h4 className="text-sm font-semibold text-stone-700">Perennial details</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Planting date">
                <TextInput type="date" value={plantingDate} onChange={(e) => setPlantingDate(e.target.value)} />
              </Field>
              <Field label="Plant age (years)">
                <TextInput type="number" value={plantAgeYears} onChange={(e) => setPlantAgeYears(e.target.value)} min={0} step="any" />
              </Field>
              <Field label="Plant count">
                <TextInput type="number" value={plantCount} onChange={(e) => setPlantCount(e.target.value)} min={0} />
              </Field>
              <Field label="Production year">
                <TextInput type="number" value={productionYear} onChange={(e) => setProductionYear(e.target.value)} min={0} />
              </Field>
            </div>
            <Field label="Spacing">
              <TextInput value={spacing} onChange={(e) => setSpacing(e.target.value)} placeholder="e.g. 8x8 ft" />
            </Field>
          </div>
        )}

        <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50">
          <h4 className="text-sm font-semibold text-stone-700 mb-3">Intercropping (optional)</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Intercrop role">
              <Select value={intercropRole} onChange={(e) => setIntercropRole(e.target.value)}>
                <option value="">—</option>
                <option value="primary">Primary crop</option>
                <option value="secondary">Secondary / intercrop</option>
                <option value="mixed">Mixed cropping</option>
              </Select>
            </Field>
          </div>
        </div>

        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
