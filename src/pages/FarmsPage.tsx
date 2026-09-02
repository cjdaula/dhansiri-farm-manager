import { useEffect, useState, useCallback } from 'react';
import { Plus, Map, MapPin, Trash2, Pencil, Droplets, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Farm, Plot, Cultivation, CropType, PaddySeason, AreaUnit } from '@/lib/types';
import { AREA_UNITS, CULTIVATION_STATUSES } from '@/lib/constants';
import { AREA_UNIT_LABELS } from '@/lib/area';
import { formatNumber, formatDate } from '@/lib/format';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [seasons, setSeasons] = useState<PaddySeason[]>([]);
  const [historyPlot, setHistoryPlot] = useState<Plot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [farmModal, setFarmModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [plotModal, setPlotModal] = useState(false);
  const [editingPlot, setPlotPlot] = useState<Plot | null>(null);
  const [plotFarm, setPlotFarm] = useState<Farm | null>(null);
  const [deleteFarm, setDeleteFarm] = useState<Farm | null>(null);
  const [deletePlot, setDeletePlot] = useState<Plot | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [fRes, pRes, cRes, ctRes, sRes] = await Promise.all([
      supabase.from('farms').select('*').order('created_at', { ascending: false }),
      supabase.from('plots').select('*').order('created_at', { ascending: false }),
      supabase.from('cultivations').select('*').order('start_date', { ascending: false }),
      supabase.from('crop_types').select('*').order('name'),
      supabase.from('paddy_seasons').select('*').order('name'),
    ]);
    if (fRes.error) setError(fRes.error.message);
    else setFarms(fRes.data ?? []);
    if (pRes.error) setError(pRes.error.message);
    else setPlots(pRes.data ?? []);
    if (cRes.data) setCultivations(cRes.data as Cultivation[]);
    if (ctRes.data) setCropTypes(ctRes.data as CropType[]);
    if (sRes.data) setSeasons(sRes.data as PaddySeason[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const plotsFor = (farmId: string) => plots.filter((p) => p.farm_id === farmId);

  const saveFarm = async (data: Partial<Farm>) => {
    setBusy(true);
    if (editingFarm) {
      const { error } = await supabase.from('farms').update(data).eq('id', editingFarm.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('farms').insert(data);
      if (error) setError(error.message);
    }
    setBusy(false);
    setFarmModal(false);
    setEditingFarm(null);
    load();
  };

  const savePlot = async (data: Partial<Plot>) => {
    setBusy(true);
    if (editingPlot) {
      const { error } = await supabase.from('plots').update(data).eq('id', editingPlot.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('plots').insert(data);
      if (error) setError(error.message);
    }
    setBusy(false);
    setPlotModal(false);
    setPlotPlot(null);
    load();
  };

  const confirmDeleteFarm = async () => {
    if (!deleteFarm) return;
    setBusy(true);
    const { error } = await supabase.from('farms').delete().eq('id', deleteFarm.id);
    if (error) setError(error.message);
    setBusy(false);
    setDeleteFarm(null);
    load();
  };

  const confirmDeletePlot = async () => {
    if (!deletePlot) return;
    setBusy(true);
    const { error } = await supabase.from('plots').delete().eq('id', deletePlot.id);
    if (error) setError(error.message);
    setBusy(false);
    setDeletePlot(null);
    load();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Farms & Plots"
        subtitle="Manage your farms and the individual plots within them."
        actions={
          <Button
            onClick={() => {
              setEditingFarm(null);
              setFarmModal(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add farm
          </Button>
        }
      />
      {error && <ErrorState message={error} />}

      {farms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Map className="h-7 w-7" />}
            title="No farms yet"
            description="Add your first farm to start managing plots, crops, expenses and income."
            action={
              <Button onClick={() => setFarmModal(true)}>
                <Plus className="h-4 w-4" /> Add farm
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {farms.map((farm) => {
            const fPlots = plotsFor(farm.id);
            return (
              <Card key={farm.id} className="overflow-hidden">
                <div className="p-5 border-b border-stone-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-stone-800 truncate">{farm.name}</h3>
                        <p className="text-sm text-stone-500 truncate">
                          {farm.location || 'No location set'}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          Total area: {formatNumber(farm.total_area)} {farm.area_unit}
                          {' · '}
                          {fPlots.length} plot{fPlots.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingFarm(farm);
                          setFarmModal(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteFarm(farm)}>
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                  {farm.notes && (
                    <p className="mt-3 text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2">
                      {farm.notes}
                    </p>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-stone-700">Plots</h4>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPlotFarm(farm);
                        setPlotPlot(null);
                        setPlotModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add plot
                    </Button>
                  </div>
                  {fPlots.length === 0 ? (
                    <p className="text-sm text-stone-400 py-4 text-center">
                      No plots in this farm yet.
                    </p>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {fPlots.map((plot) => (
                        <div
                          key={plot.id}
                          className="rounded-xl border border-stone-200 p-4 hover:border-emerald-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-stone-800 truncate">{plot.name}</p>
                              <p className="text-xs text-stone-500 mt-0.5">
                                {formatNumber(plot.area)} {plot.area_unit}
                                {plot.soil_type ? ` · ${plot.soil_type}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => {
                                  setPlotPlot(plot);
                                  setPlotFarm(farm);
                                  setPlotModal(true);
                                }}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletePlot(plot)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <Droplets
                              className={`h-3.5 w-3.5 ${
                                plot.irrigation_available ? 'text-sky-500' : 'text-stone-300'
                              }`}
                            />
                            <span className="text-xs text-stone-500">
                              {plot.irrigation_available ? 'Irrigation available' : 'No irrigation'}
                            </span>
                          </div>
                          {(() => {
                            const plotCults = cultivations.filter((c) => c.plot_id === plot.id && c.status !== 'cancelled');
                            if (plotCults.length === 0) return null;
                            const allocated = plotCults.reduce((s, c) => s + Number(c.area ?? 0), 0);
                            const over = plot.area != null && allocated > plot.area;
                            return (
                              <div className="mt-2 pt-2 border-t border-stone-100">
                                <button onClick={() => setHistoryPlot(plot)} className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                                  <History className="h-3.5 w-3.5" /> Crop history ({plotCults.length})
                                </button>
                                <p className={`mt-1 text-xs ${over ? 'text-rose-500 font-medium' : 'text-stone-400'}`}>
                                  Allocated: {formatNumber(allocated)} / {formatNumber(plot.area)} {plot.area_unit}
                                  {over && ' · Over-allocated'}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <FarmFormModal
        open={farmModal}
        onClose={() => {
          setFarmModal(false);
          setEditingFarm(null);
        }}
        onSave={saveFarm}
        editing={editingFarm}
        busy={busy}
      />
      <PlotFormModal
        open={plotModal}
        onClose={() => {
          setPlotModal(false);
          setPlotPlot(null);
        }}
        onSave={savePlot}
        editing={editingPlot}
        farm={plotFarm}
        farms={farms}
        busy={busy}
      />
      <ConfirmDialog
        open={!!deleteFarm}
        title="Delete farm"
        message={`Delete "${deleteFarm?.name}"? All plots in this farm will also be deleted.`}
        onConfirm={confirmDeleteFarm}
        onCancel={() => setDeleteFarm(null)}
        loading={busy}
      />
      <ConfirmDialog
        open={!!deletePlot}
        title="Delete plot"
        message={`Delete plot "${deletePlot?.name}"?`}
        onConfirm={confirmDeletePlot}
        onCancel={() => setDeletePlot(null)}
        loading={busy}
      />
      <PlotCropHistoryModal plot={historyPlot} cultivations={cultivations} cropTypes={cropTypes} seasons={seasons} onClose={() => setHistoryPlot(null)} />
    </div>
  );
}

function PlotCropHistoryModal({ plot, cultivations, cropTypes, seasons, onClose }: {
  plot: Plot | null;
  cultivations: Cultivation[];
  cropTypes: CropType[];
  seasons: PaddySeason[];
  onClose: () => void;
}) {
  if (!plot) return null;
  const plotCults = cultivations.filter((c) => c.plot_id === plot.id).sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? '') * -1);
  const cropName = (id: string | null) => cropTypes.find((c) => c.id === id)?.name ?? '—';
  const seasonName = (id: string | null) => seasons.find((s) => s.id === id)?.name ?? '—';
  const si = (s: string) => CULTIVATION_STATUSES.find((x) => x.value === s);

  return (
    <Modal open={!!plot} onClose={onClose} title={`Crop history — ${plot.name}`} size="lg">
      {plotCults.length === 0 ? (
        <p className="text-sm text-stone-400 py-6 text-center">No cultivation records for this plot.</p>
      ) : (
        <div className="space-y-3">
          {plotCults.map((c) => {
            const info = si(c.status);
            return (
              <div key={c.id} className="flex items-start gap-3 rounded-xl border border-stone-200 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <History className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-stone-800">{cropName(c.crop_type_id)}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${info?.color ?? 'bg-stone-100 text-stone-600'}`}>{info?.label ?? c.status}</span>
                    {c.is_perennial && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-medium">Perennial</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {seasonName(c.season_id)} · {c.area != null ? `${c.area} ${AREA_UNIT_LABELS[c.area_unit]}` : '—'} · Start: {formatDate(c.start_date)} · Harvest: {formatDate(c.actual_harvest_date ?? c.expected_harvest_date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

interface FarmFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Farm>) => void;
  editing: Farm | null;
  busy: boolean;
}

function FarmFormModal({ open, onClose, onSave, editing, busy }: FarmFormModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [totalArea, setTotalArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('bigha');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setLocation(editing?.location ?? '');
      setTotalArea(editing?.total_area != null ? String(editing.total_area) : '');
      setAreaUnit(editing?.area_unit ?? 'bigha');
      setNotes(editing?.notes ?? '');
      setErr(null);
    }
  }, [open, editing]);

  const submit = () => {
    if (!name.trim()) {
      setErr('Farm name is required.');
      return;
    }
    onSave({
      name: name.trim(),
      location: location.trim() || null,
      total_area: totalArea === '' ? null : Number(totalArea),
      area_unit: areaUnit,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit farm' : 'Add farm'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save farm'}
          </Button>
        </>
      }
    >
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <Field label="Farm name" required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Farm" />
        </Field>
        <Field label="Location">
          <TextInput
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Village / district"
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Total area">
            <TextInput
              type="number"
              value={totalArea}
              onChange={(e) => setTotalArea(e.target.value)}
              min={0}
            />
          </Field>
          <Field label="Area unit">
            <Select value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}>
              {AREA_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

interface PlotFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Plot>) => void;
  editing: Plot | null;
  farm: Farm | null;
  farms: Farm[];
  busy: boolean;
}

function PlotFormModal({ open, onClose, onSave, editing, farm, farms, busy }: PlotFormModalProps) {
  const [name, setName] = useState('');
  const [farmId, setFarmId] = useState('');
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('bigha');
  const [soilType, setSoilType] = useState('');
  const [irrigation, setIrrigation] = useState(false);
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setFarmId(editing?.farm_id ?? farm?.id ?? '');
      setArea(editing?.area != null ? String(editing.area) : '');
      setAreaUnit(editing?.area_unit ?? 'bigha');
      setSoilType(editing?.soil_type ?? '');
      setIrrigation(editing?.irrigation_available ?? false);
      setNotes(editing?.notes ?? '');
      setErr(null);
    }
  }, [open, editing, farm]);

  const submit = () => {
    if (!name.trim()) {
      setErr('Plot name is required.');
      return;
    }
    if (!farmId) {
      setErr('Please select a farm.');
      return;
    }
    onSave({
      name: name.trim(),
      farm_id: farmId,
      area: area === '' ? null : Number(area),
      area_unit: areaUnit,
      soil_type: soilType.trim() || null,
      irrigation_available: irrigation,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit plot' : 'Add plot'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save plot'}
          </Button>
        </>
      }
    >
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <Field label="Plot name / number" required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Plot A-1" />
        </Field>
        <Field label="Farm" required>
          <Select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
            <option value="">Select a farm</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Area">
            <TextInput type="number" value={area} onChange={(e) => setArea(e.target.value)} min={0} />
          </Field>
          <Field label="Area unit">
            <Select value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}>
              {AREA_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Soil type">
          <TextInput
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            placeholder="e.g. Loamy, Clay"
          />
        </Field>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={irrigation}
            onChange={(e) => setIrrigation(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-stone-700">Irrigation available</span>
        </label>
        <Field label="Notes">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
