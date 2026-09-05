import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, Wheat, Search, Eye, Archive, ArchiveRestore } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PaddyCrop, PaddyVariety, PaddySeason, Farm, Plot, AreaUnit, PaddyStatus } from '@/lib/types';
import { AREA_UNITS, PADDY_STATUSES, PLANTING_METHODS, DEFAULT_BIGHA_SQFT } from '@/lib/constants';
import { formatNumber, formatDate, formatCurrency, formatFarmPlot } from '@/lib/format';
import { calcYield, yieldLabel } from '@/lib/paddyCalc';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const statusMeta = (s: string) => PADDY_STATUSES.find((p) => p.value === s) ?? PADDY_STATUSES[0];

type SortKey = 'season' | 'variety' | 'area' | 'nursery_date' | 'transplanting_date' | 'expected_harvest_date' | 'actual_harvest_date' | 'status';

interface PaddyPageProps {
  onOpenRecord: (id: string) => void;
}

export function PaddyPage({ onOpenRecord }: PaddyPageProps) {
  const [crops, setCrops] = useState<PaddyCrop[]>([]);
  const [varieties, setVarieties] = useState<PaddyVariety[]>([]);
  const [seasons, setSeasons] = useState<PaddySeason[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [settings, setSettings] = useState<{ bigha_sqft: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<PaddyCrop | null>(null);
  const [deleting, setDeleting] = useState<PaddyCrop | null>(null);
  const [busy, setBusy] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterVariety, setFilterVariety] = useState('');
  const [filterFarm, setFilterFarm] = useState('');
  const [filterPlot, setFilterPlot] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('season');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, vRes, sRes, fRes, pRes, setRes] = await Promise.all([
      supabase.from('paddy_crops').select('*').order('created_at', { ascending: false }),
      supabase.from('paddy_varieties').select('*').order('name'),
      supabase.from('paddy_seasons').select('*').order('created_at', { ascending: false }),
      supabase.from('farms').select('id, name').order('name'),
      supabase.from('plots').select('id, name, farm_id').order('name'),
      supabase.from('settings').select('bigha_sqft').eq('id', 1).maybeSingle(),
    ]);
    if (cRes.error) setError(cRes.error.message);
    else setCrops(cRes.data ?? []);
    setVarieties((vRes.data ?? []) as PaddyVariety[]);
    setSeasons((sRes.data ?? []) as PaddySeason[]);
    setFarms((fRes.data ?? []) as Farm[]);
    setPlots((pRes.data ?? []) as Plot[]);
    if (setRes.data) setSettings(setRes.data as { bigha_sqft: number });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bighaSqft = settings?.bigha_sqft ?? DEFAULT_BIGHA_SQFT;

  const varietyName = (id: string | null) => varieties.find((v) => v.id === id)?.name ?? null;
  const seasonName = (id: string | null) => seasons.find((s) => s.id === id)?.name ?? null;
  const farmName = (id: string | null) => farms.find((f) => f.id === id)?.name ?? null;
  const plotName = (id: string | null) => plots.find((p) => p.id === id)?.name ?? null;

  const filtered = useMemo(() => {
    let result = crops.filter((c) => {
      if (!showArchived && c.archived) return false;
      if (showArchived && !c.archived) return false;
      if (filterSeason && c.season_id !== filterSeason) return false;
      if (filterVariety && c.variety_id !== filterVariety) return false;
      if (filterFarm && c.farm_id !== filterFarm) return false;
      if (filterPlot && c.plot_id !== filterPlot) return false;
      if (filterStatus && c.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const vn = varietyName(c.variety_id) ?? c.variety ?? '';
        const sn = seasonName(c.season_id) ?? c.season_year ?? '';
        const fn = farmName(c.farm_id) ?? '';
        const pn = plotName(c.plot_id) ?? '';
        const hay = `${vn} ${sn} ${fn} ${pn} ${c.notes ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    result = result.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (sortKey) {
        case 'season': av = seasonName(a.season_id) ?? a.season_year ?? ''; bv = seasonName(b.season_id) ?? b.season_year ?? ''; break;
        case 'variety': av = varietyName(a.variety_id) ?? a.variety ?? ''; bv = varietyName(b.variety_id) ?? b.variety ?? ''; break;
        case 'area': av = a.area ?? 0; bv = b.area ?? 0; break;
        case 'nursery_date': av = a.nursery_date ?? ''; bv = b.nursery_date ?? ''; break;
        case 'transplanting_date': av = a.transplanting_date ?? ''; bv = b.transplanting_date ?? ''; break;
        case 'expected_harvest_date': av = a.expected_harvest_date ?? ''; bv = b.expected_harvest_date ?? ''; break;
        case 'actual_harvest_date': av = a.actual_harvest_date ?? ''; bv = b.actual_harvest_date ?? ''; break;
        case 'status': av = a.status; bv = b.status; break;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [crops, showArchived, filterSeason, filterVariety, filterFarm, filterPlot, filterStatus, search, sortKey, sortDir, varieties, seasons, farms, plots]);

  const save = async (data: Partial<PaddyCrop>) => {
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from('paddy_crops').update(data).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('paddy_crops').insert(data);
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
    const { error } = await supabase.from('paddy_crops').delete().eq('id', deleting.id);
    if (error) setError(error.message);
    setBusy(false);
    setDeleting(null);
    load();
  };

  const toggleArchive = async (c: PaddyCrop) => {
    setBusy(true);
    const { error } = await supabase.from('paddy_crops').update({ archived: !c.archived }).eq('id', c.id);
    if (error) setError(error.message);
    setBusy(false);
    load();
  };

  const hasFilters = filterSeason || filterVariety || filterFarm || filterPlot || filterStatus || search;
  const clearFilters = () => {
    setFilterSeason(''); setFilterVariety(''); setFilterFarm(''); setFilterPlot(''); setFilterStatus(''); setSearch('');
  };

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Paddy Records"
        subtitle="Search, filter and manage all paddy cultivation records."
        actions={
          <Button onClick={() => { setEditing(null); setModal(true); }}>
            <Plus className="h-4 w-4" /> Add record
          </Button>
        }
      />
      {error && <ErrorState message={error} />}

      {crops.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wheat className="h-7 w-7" />}
            title="No paddy records yet"
            description="Create your first cultivation record. First add a variety and a season, then link them to a farm and plot."
            action={<Button onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Add record</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card className="p-4 mb-4">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by variety, season, farm, plot…"
                  className="w-full rounded-lg border border-stone-300 bg-white pl-10 pr-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
                  <option value="">All seasons</option>
                  {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Select value={filterVariety} onChange={(e) => setFilterVariety(e.target.value)}>
                  <option value="">All varieties</option>
                  {varieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Select>
                <Select value={filterFarm} onChange={(e) => { setFilterFarm(e.target.value); setFilterPlot(''); }}>
                  <option value="">All farms</option>
                  {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
                <Select value={filterPlot} onChange={(e) => setFilterPlot(e.target.value)}>
                  <option value="">All plots</option>
                  {(filterFarm ? plots.filter((p) => p.farm_id === filterFarm) : plots).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="!w-auto">
                  <option value="">All statuses</option>
                  {PADDY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
                <Select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="!w-auto">
                  <option value="season">Sort: Season</option>
                  <option value="variety">Sort: Variety</option>
                  <option value="area">Sort: Area</option>
                  <option value="nursery_date">Sort: Nursery date</option>
                  <option value="transplanting_date">Sort: Transplanting date</option>
                  <option value="expected_harvest_date">Sort: Expected harvest</option>
                  <option value="actual_harvest_date">Sort: Actual harvest</option>
                  <option value="status">Sort: Status</option>
                </Select>
                <button
                  onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                  className="text-sm text-stone-500 hover:text-stone-700 font-medium px-2 py-1.5"
                >
                  {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {showArchived ? 'Show active' : `Show archived (${crops.filter(c => c.archived).length})`}
                </button>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-sm text-rose-500 hover:text-rose-600 font-medium ml-auto">
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Search className="h-7 w-7" />}
                title="No records match"
                description="Try adjusting your search or filters."
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Season</th>
                      <th className="text-left px-4 py-3 font-medium">Variety</th>
                      <th className="text-left px-4 py-3 font-medium">Farm / Plot</th>
                      <th className="text-right px-4 py-3 font-medium">Area</th>
                      <th className="text-left px-4 py-3 font-medium">Nursery</th>
                      <th className="text-left px-4 py-3 font-medium">Transplanted</th>
                      <th className="text-left px-4 py-3 font-medium">Exp. harvest</th>
                      <th className="text-left px-4 py-3 font-medium">Actual</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Yield</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((c) => {
                      const sm = statusMeta(c.status);
                      const yd = calcYield(c, [], bighaSqft);
                      return (
                        <tr key={c.id} className={`hover:bg-stone-50/60 ${c.archived ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3 text-stone-600 whitespace-nowrap">
                            {seasonName(c.season_id) ?? c.season_year ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-stone-700 font-medium">
                            {varietyName(c.variety_id) ?? c.variety ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                            {formatFarmPlot(farmName(c.farm_id), plotName(c.plot_id))}
                          </td>
                          <td className="px-4 py-3 text-right text-stone-600 whitespace-nowrap">
                            {formatNumber(c.area)} {c.area_unit}
                          </td>
                          <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{formatDate(c.nursery_date)}</td>
                          <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{formatDate(c.transplanting_date)}</td>
                          <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{formatDate(c.expected_harvest_date)}</td>
                          <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{formatDate(c.actual_harvest_date)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${sm.color}`}>{sm.label}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-stone-600 whitespace-nowrap">
                            {yd.totalYield != null ? `${formatNumber(yd.totalYield)} ${yd.yieldUnit}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={() => onOpenRecord(c.id)} className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50" title="View details">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button onClick={() => toggleArchive(c)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100" title="Archive">
                                {c.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
          )}
        </>
      )}

      <PaddyFormModal
        open={modal}
        onClose={() => { setModal(false); setEditing(null); }}
        onSave={save}
        editing={editing}
        varieties={varieties}
        seasons={seasons}
        farms={farms}
        plots={plots}
        busy={busy}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete paddy record"
        message={`Delete "${varietyName(deleting?.variety_id ?? null) ?? deleting?.variety ?? 'this record'}"? All linked nursery batches and harvests will also be deleted.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={busy}
      />
    </div>
  );
}

interface PaddyFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<PaddyCrop>) => void;
  editing: PaddyCrop | null;
  varieties: PaddyVariety[];
  seasons: PaddySeason[];
  farms: Farm[];
  plots: Plot[];
  busy: boolean;
}

function PaddyFormModal({ open, onClose, onSave, editing, varieties, seasons, farms, plots, busy }: PaddyFormModalProps) {
  const [seasonId, setSeasonId] = useState('');
  const [seasonYear, setSeasonYear] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [varietyText, setVarietyText] = useState('');
  const [farmId, setFarmId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('bigha');
  const [status, setStatus] = useState<PaddyStatus>('planned');
  const [nurseryDate, setNurseryDate] = useState('');
  const [nurseryArea, setNurseryArea] = useState('');
  const [nurseryAreaUnit, setNurseryAreaUnit] = useState('bigha');
  const [nurseryBatchNumber, setNurseryBatchNumber] = useState('');
  const [seedQuantity, setSeedQuantity] = useState('');
  const [seedUnit, setSeedUnit] = useState('kg');
  const [nurseryNotes, setNurseryNotes] = useState('');
  const [transplantingDate, setTransplantingDate] = useState('');
  const [seedlingAgeDays, setSeedlingAgeDays] = useState('');
  const [plantingMethod, setPlantingMethod] = useState('');
  const [spacing, setSpacing] = useState('');
  const [labourUsed, setLabourUsed] = useState('');
  const [transplantingNotes, setTransplantingNotes] = useState('');
  const [expectedHarvest, setExpectedHarvest] = useState('');
  const [actualHarvest, setActualHarvest] = useState('');
  const [irrigationNotes, setIrrigationNotes] = useState('');
  const [fertilizerNotes, setFertilizerNotes] = useState('');
  const [cropProtectionNotes, setCropProtectionNotes] = useState('');
  const [observations, setObservations] = useState('');
  const [harvestedArea, setHarvestedArea] = useState('');
  const [harvestedAreaUnit, setHarvestedAreaUnit] = useState('bigha');
  const [grossQuantity, setGrossQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('kg');
  const [moisturePct, setMoisturePct] = useState('');
  const [dryingLoss, setDryingLoss] = useState('');
  const [finalQuantity, setFinalQuantity] = useState('');
  const [harvestNotes, setHarvestNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSeasonId(editing?.season_id ?? '');
    setSeasonYear(editing?.season_year ?? '');
    setVarietyId(editing?.variety_id ?? '');
    setVarietyText(editing?.variety ?? '');
    setFarmId(editing?.farm_id ?? '');
    setPlotId(editing?.plot_id ?? '');
    setArea(editing?.area != null ? String(editing.area) : '');
    setAreaUnit((editing?.area_unit ?? 'bigha') as AreaUnit);
    setStatus(editing?.status ?? 'planned');
    setNurseryDate(editing?.nursery_date ?? '');
    setNurseryArea(editing?.nursery_area != null ? String(editing.nursery_area) : '');
    setNurseryAreaUnit(editing?.nursery_area_unit ?? 'bigha');
    setNurseryBatchNumber(editing?.nursery_batch_number ?? '');
    setSeedQuantity(editing?.seed_quantity != null ? String(editing.seed_quantity) : '');
    setSeedUnit(editing?.seed_unit ?? 'kg');
    setNurseryNotes(editing?.nursery_notes ?? '');
    setTransplantingDate(editing?.transplanting_date ?? '');
    setSeedlingAgeDays(editing?.seedling_age_days != null ? String(editing.seedling_age_days) : '');
    setPlantingMethod(editing?.planting_method ?? '');
    setSpacing(editing?.spacing ?? '');
    setLabourUsed(editing?.labour_used != null ? String(editing.labour_used) : '');
    setTransplantingNotes(editing?.transplanting_notes ?? '');
    setExpectedHarvest(editing?.expected_harvest_date ?? '');
    setActualHarvest(editing?.actual_harvest_date ?? '');
    setIrrigationNotes(editing?.irrigation_notes ?? '');
    setFertilizerNotes(editing?.fertilizer_notes ?? '');
    setCropProtectionNotes(editing?.crop_protection_notes ?? '');
    setObservations(editing?.observations ?? '');
    setHarvestedArea(editing?.harvested_area != null ? String(editing.harvested_area) : '');
    setHarvestedAreaUnit(editing?.harvested_area_unit ?? 'bigha');
    setGrossQuantity(editing?.gross_quantity != null ? String(editing.gross_quantity) : '');
    setQuantityUnit(editing?.actual_yield_unit ?? 'kg');
    setMoisturePct(editing?.moisture_percentage != null ? String(editing.moisture_percentage) : '');
    setDryingLoss(editing?.drying_loss != null ? String(editing.drying_loss) : '');
    setFinalQuantity(editing?.final_quantity != null ? String(editing.final_quantity) : '');
    setHarvestNotes(editing?.harvest_notes ?? '');
    setNotes(editing?.notes ?? '');
    setErr(null);
  }, [open, editing]);

  const submit = () => {
    if (!seasonId && !seasonYear.trim()) { setErr('Please select a season or enter a season/year.'); return; }
    if (!varietyId && !varietyText.trim()) { setErr('Please select a variety or enter a variety name.'); return; }
    if (area !== '' && Number(area) < 0) { setErr('Area cannot be negative.'); return; }
    if (seedQuantity !== '' && Number(seedQuantity) < 0) { setErr('Seed quantity cannot be negative.'); return; }
    if (grossQuantity !== '' && Number(grossQuantity) < 0) { setErr('Gross quantity cannot be negative.'); return; }
    if (finalQuantity !== '' && Number(finalQuantity) < 0) { setErr('Final quantity cannot be negative.'); return; }
    if (nurseryDate && transplantingDate && transplantingDate < nurseryDate) {
      setErr('Transplanting date should not be before nursery date.'); return;
    }
    if (transplantingDate && actualHarvest && actualHarvest < transplantingDate) {
      setErr('Actual harvest date should not be before transplanting date.'); return;
    }

    onSave({
      season_id: seasonId || null,
      season_year: seasonYear.trim() || null,
      variety_id: varietyId || null,
      variety: varietyText.trim() || null,
      farm_id: farmId || null,
      plot_id: plotId || null,
      area: area === '' ? null : Number(area),
      area_unit: areaUnit,
      status,
      nursery_date: nurseryDate || null,
      nursery_area: nurseryArea === '' ? null : Number(nurseryArea),
      nursery_area_unit: nurseryAreaUnit,
      nursery_batch_number: nurseryBatchNumber.trim() || null,
      seed_quantity: seedQuantity === '' ? null : Number(seedQuantity),
      seed_unit: seedUnit,
      nursery_notes: nurseryNotes.trim() || null,
      transplanting_date: transplantingDate || null,
      seedling_age_days: seedlingAgeDays === '' ? null : Number(seedlingAgeDays),
      planting_method: plantingMethod || null,
      spacing: spacing.trim() || null,
      labour_used: labourUsed === '' ? null : Number(labourUsed),
      transplanting_notes: transplantingNotes.trim() || null,
      expected_harvest_date: expectedHarvest || null,
      actual_harvest_date: actualHarvest || null,
      irrigation_notes: irrigationNotes.trim() || null,
      fertilizer_notes: fertilizerNotes.trim() || null,
      crop_protection_notes: cropProtectionNotes.trim() || null,
      observations: observations.trim() || null,
      harvested_area: harvestedArea === '' ? null : Number(harvestedArea),
      harvested_area_unit: harvestedAreaUnit,
      gross_quantity: grossQuantity === '' ? null : Number(grossQuantity),
      actual_yield: grossQuantity === '' ? null : Number(grossQuantity),
      actual_yield_unit: quantityUnit,
      moisture_percentage: moisturePct === '' ? null : Number(moisturePct),
      drying_loss: dryingLoss === '' ? null : Number(dryingLoss),
      final_quantity: finalQuantity === '' ? null : Number(finalQuantity),
      harvest_notes: harvestNotes.trim() || null,
      notes: notes.trim() || null,
    });
  };

  const filteredPlots = farmId ? plots.filter((p) => p.farm_id === farmId) : plots;
  const activeVarieties = varieties.filter((v) => v.is_active);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit paddy record' : 'Add paddy record'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save record'}</Button>
        </>
      }
    >
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-6">
        {/* Basic */}
        <FormSection title="Basic information">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Season">
              <Select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
                <option value="">— Select season —</option>
                {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Or enter season/year text" hint="Used if no season is selected">
              <TextInput value={seasonYear} onChange={(e) => setSeasonYear(e.target.value)} placeholder="e.g. 2025 Sali" />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as PaddyStatus)}>
                {PADDY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Variety">
              <Select value={varietyId} onChange={(e) => { setVarietyId(e.target.value); setVarietyText(''); }}>
                <option value="">— Select variety —</option>
                {activeVarieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
            <Field label="Or enter variety name" hint="Used if no variety is selected">
              <TextInput value={varietyText} onChange={(e) => setVarietyText(e.target.value)} placeholder="e.g. Ranjit" />
            </Field>
            <div />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Farm">
              <Select value={farmId} onChange={(e) => { setFarmId(e.target.value); setPlotId(''); }}>
                <option value="">None</option>
                {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </Field>
            <Field label="Plot">
              <Select value={plotId} onChange={(e) => setPlotId(e.target.value)}>
                <option value="">None</option>
                {filteredPlots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Cultivation area">
              <TextInput type="number" value={area} onChange={(e) => setArea(e.target.value)} min={0} step="any" />
            </Field>
            <Field label="Area unit">
              <Select value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}>
                {AREA_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </FormSection>

        {/* Nursery */}
        <FormSection title="Nursery">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Nursery start date">
              <TextInput type="date" value={nurseryDate} onChange={(e) => setNurseryDate(e.target.value)} />
            </Field>
            <Field label="Nursery area">
              <TextInput type="number" value={nurseryArea} onChange={(e) => setNurseryArea(e.target.value)} min={0} step="any" />
            </Field>
            <Field label="Nursery area unit">
              <Select value={nurseryAreaUnit} onChange={(e) => setNurseryAreaUnit(e.target.value)}>
                {AREA_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </Select>
            </Field>
            <Field label="Batch number">
              <TextInput value={nurseryBatchNumber} onChange={(e) => setNurseryBatchNumber(e.target.value)} placeholder="e.g. Batch 1" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Seed quantity">
              <TextInput type="number" value={seedQuantity} onChange={(e) => setSeedQuantity(e.target.value)} min={0} step="any" />
            </Field>
            <Field label="Seed unit">
              <TextInput value={seedUnit} onChange={(e) => setSeedUnit(e.target.value)} />
            </Field>
          </div>
          <Field label="Nursery notes">
            <Textarea rows={2} value={nurseryNotes} onChange={(e) => setNurseryNotes(e.target.value)} />
          </Field>
        </FormSection>

        {/* Transplanting */}
        <FormSection title="Transplanting">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Transplanting date">
              <TextInput type="date" value={transplantingDate} onChange={(e) => setTransplantingDate(e.target.value)} />
            </Field>
            <Field label="Seedling age (days)">
              <TextInput type="number" value={seedlingAgeDays} onChange={(e) => setSeedlingAgeDays(e.target.value)} min={0} />
            </Field>
            <Field label="Planting method">
              <Select value={plantingMethod} onChange={(e) => setPlantingMethod(e.target.value)}>
                <option value="">—</option>
                {PLANTING_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Spacing">
              <TextInput value={spacing} onChange={(e) => setSpacing(e.target.value)} placeholder="e.g. 25x25 cm" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Labour used (person-days)">
              <TextInput type="number" value={labourUsed} onChange={(e) => setLabourUsed(e.target.value)} min={0} step="any" />
            </Field>
          </div>
          <Field label="Transplanting notes">
            <Textarea rows={2} value={transplantingNotes} onChange={(e) => setTransplantingNotes(e.target.value)} />
          </Field>
        </FormSection>

        {/* Crop growth */}
        <FormSection title="Crop growth">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Expected harvest date">
              <TextInput type="date" value={expectedHarvest} onChange={(e) => setExpectedHarvest(e.target.value)} />
            </Field>
            <Field label="Actual harvest date">
              <TextInput type="date" value={actualHarvest} onChange={(e) => setActualHarvest(e.target.value)} />
            </Field>
          </div>
          <Field label="Irrigation notes">
            <Textarea rows={2} value={irrigationNotes} onChange={(e) => setIrrigationNotes(e.target.value)} />
          </Field>
          <Field label="Fertilizer notes">
            <Textarea rows={2} value={fertilizerNotes} onChange={(e) => setFertilizerNotes(e.target.value)} />
          </Field>
          <Field label="Crop protection notes">
            <Textarea rows={2} value={cropProtectionNotes} onChange={(e) => setCropProtectionNotes(e.target.value)} />
          </Field>
          <Field label="General observations">
            <Textarea rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} />
          </Field>
        </FormSection>

        {/* Harvest */}
        <FormSection title="Harvest">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Harvested area">
              <TextInput type="number" value={harvestedArea} onChange={(e) => setHarvestedArea(e.target.value)} min={0} step="any" />
            </Field>
            <Field label="Harvested area unit">
              <Select value={harvestedAreaUnit} onChange={(e) => setHarvestedAreaUnit(e.target.value)}>
                {AREA_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </Select>
            </Field>
            <Field label="Gross paddy quantity">
              <TextInput type="number" value={grossQuantity} onChange={(e) => setGrossQuantity(e.target.value)} min={0} step="any" />
            </Field>
            <Field label="Quantity unit">
              <TextInput value={quantityUnit} onChange={(e) => setQuantityUnit(e.target.value)} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Moisture %">
              <TextInput type="number" value={moisturePct} onChange={(e) => setMoisturePct(e.target.value)} min={0} step="any" />
            </Field>
            <Field label="Drying/shrinkage loss">
              <TextInput type="number" value={dryingLoss} onChange={(e) => setDryingLoss(e.target.value)} min={0} step="any" />
            </Field>
            <Field label="Final paddy quantity">
              <TextInput type="number" value={finalQuantity} onChange={(e) => setFinalQuantity(e.target.value)} min={0} step="any" />
            </Field>
          </div>
          <Field label="Harvest notes">
            <Textarea rows={2} value={harvestNotes} onChange={(e) => setHarvestNotes(e.target.value)} />
          </Field>
        </FormSection>
      </div>
    </Modal>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-700 mb-3 pb-2 border-b border-stone-100">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
