import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DragonFruitPlantation, Farm, Plot, PaddySeason, AreaUnit, Cultivation } from '@/lib/types';
import { AREA_UNITS, AREA_UNIT_LABELS } from '@/lib/area';
import { formatNumber, formatDate, todayISO, num, formatFarmPlot } from '@/lib/format';
import { calcActivePlants, calcPlantationAge, getDFPlantationStatusLabel } from '@/lib/dragonCalc';
import { DF_PLANTATION_STATUSES, DF_SPACING_UNITS } from '@/lib/constants';
import { Card, StatCard } from '@/components/ui/Card';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Sprout, Plus, Pencil, Trash2, MapPin, Calendar, Search } from 'lucide-react';

interface Props {
  onOpenPlantation: (id: string) => void;
}

export function DragonFruitPlantationsPage({ onOpenPlantation }: Props) {
  const [plantations, setPlantations] = useState<DragonFruitPlantation[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [seasons, setSeasons] = useState<PaddySeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DragonFruitPlantation | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [form, setForm] = useState({
    name: '',
    farm_id: '',
    plot_id: '',
    season_id: '',
    plantation_start_date: '',
    establishment_year: '',
    area: '',
    area_unit: 'bigha',
    status: 'planned',
    total_poles: '',
    plants_per_pole: '',
    total_plants: '',
    missing_plants: '0',
    dead_plants: '0',
    replacement_plants: '0',
    row_spacing: '',
    pole_spacing: '',
    border_spacing: '',
    alley_width: '',
    spacing_unit: 'feet',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [pRes, fRes, plRes, sRes] = await Promise.all([
      supabase.from('dragon_fruit_plantations').select('*').order('created_at', { ascending: false }),
      supabase.from('farms').select('*').order('name'),
      supabase.from('plots').select('*').order('name'),
      supabase.from('paddy_seasons').select('*').order('agri_year', { ascending: false }),
    ]);
    if (pRes.error) setError(pRes.error.message);
    setPlantations((pRes.data ?? []) as DragonFruitPlantation[]);
    setFarms((fRes.data ?? []) as Farm[]);
    setPlots((plRes.data ?? []) as Plot[]);
    setSeasons((sRes.data ?? []) as PaddySeason[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const farmName = useCallback((id: string | null) => farms.find((f) => f.id === id)?.name ?? '—', [farms]);
  const plotName = useCallback((id: string | null) => plots.find((p) => p.id === id)?.name ?? '—', [plots]);

  const filteredPlots = useMemo(() => {
    if (!form.farm_id) return plots;
    return plots.filter((p) => p.farm_id === form.farm_id);
  }, [plots, form.farm_id]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '', farm_id: '', plot_id: '', season_id: '',
      plantation_start_date: todayISO(), establishment_year: String(new Date().getFullYear()),
      area: '', area_unit: 'bigha', status: 'planned',
      total_poles: '', plants_per_pole: '', total_plants: '',
      missing_plants: '0', dead_plants: '0', replacement_plants: '0',
      row_spacing: '', pole_spacing: '', border_spacing: '', alley_width: '',
      spacing_unit: 'feet', notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (p: DragonFruitPlantation) => {
    setEditing(p);
    setForm({
      name: p.name,
      farm_id: p.farm_id ?? '',
      plot_id: p.plot_id ?? '',
      season_id: p.season_id ?? '',
      plantation_start_date: p.plantation_start_date ?? '',
      establishment_year: p.establishment_year != null ? String(p.establishment_year) : '',
      area: p.area != null ? String(p.area) : '',
      area_unit: p.area_unit,
      status: p.status,
      total_poles: p.total_poles != null ? String(p.total_poles) : '',
      plants_per_pole: p.plants_per_pole != null ? String(p.plants_per_pole) : '',
      total_plants: p.total_plants != null ? String(p.total_plants) : '',
      missing_plants: String(p.missing_plants),
      dead_plants: String(p.dead_plants),
      replacement_plants: String(p.replacement_plants),
      row_spacing: p.row_spacing != null ? String(p.row_spacing) : '',
      pole_spacing: p.pole_spacing != null ? String(p.pole_spacing) : '',
      border_spacing: p.border_spacing != null ? String(p.border_spacing) : '',
      alley_width: p.alley_width != null ? String(p.alley_width) : '',
      spacing_unit: p.spacing_unit ?? 'feet',
      notes: p.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Plantation name is required'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      farm_id: form.farm_id || null,
      plot_id: form.plot_id || null,
      season_id: form.season_id || null,
      plantation_start_date: form.plantation_start_date || null,
      establishment_year: num(form.establishment_year),
      area: num(form.area),
      area_unit: form.area_unit,
      status: form.status,
      total_poles: num(form.total_poles) != null ? Number(num(form.total_poles)) : null,
      plants_per_pole: num(form.plants_per_pole) != null ? Number(num(form.plants_per_pole)) : null,
      total_plants: num(form.total_plants) != null ? Number(num(form.total_plants)) : null,
      missing_plants: Number(form.missing_plants || 0),
      dead_plants: Number(form.dead_plants || 0),
      replacement_plants: Number(form.replacement_plants || 0),
      row_spacing: num(form.row_spacing),
      pole_spacing: num(form.pole_spacing),
      border_spacing: num(form.border_spacing),
      alley_width: num(form.alley_width),
      spacing_unit: form.spacing_unit,
      notes: form.notes.trim() || null,
    };

    if (editing) {
      const { error: e } = await supabase.from('dragon_fruit_plantations').update(payload).eq('id', editing.id);
      if (e) setError(e.message);
    } else {
      // Create cultivation record for this plantation
      const { data: cultData, error: cultErr } = await supabase.from('cultivations').insert({
        crop_type_id: null,
        is_perennial: true,
        farm_id: payload.farm_id,
        plot_id: payload.plot_id,
        season_id: payload.season_id,
        area: payload.area,
        area_unit: payload.area_unit,
        start_date: payload.plantation_start_date,
        status: 'planned',
        planting_date: payload.plantation_start_date,
        plant_count: payload.total_plants,
        spacing: payload.row_spacing != null && payload.pole_spacing != null
          ? `${payload.row_spacing} × ${payload.pole_spacing} ${payload.spacing_unit}`
          : null,
        notes: `Dragon Fruit plantation: ${payload.name}`,
      } as Partial<Cultivation>).select().single();
      if (cultErr) { setError(cultErr.message); setSaving(false); return; }
      const cultivationId = (cultData as Cultivation).id;
      const { error: pErr } = await supabase.from('dragon_fruit_plantations').insert({ ...payload, cultivation_id: cultivationId });
      if (pErr) setError(pErr.message);
    }
    setSaving(false);
    if (!error) {
      setModalOpen(false);
      load();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const plantation = plantations.find((p) => p.id === deleteId);
    if (plantation?.cultivation_id) {
      await supabase.from('cultivations').delete().eq('id', plantation.cultivation_id);
    }
    await supabase.from('dragon_fruit_plantations').delete().eq('id', deleteId);
    setDeleting(false);
    setDeleteId(null);
    load();
  };

  if (loading) return <LoadingState label="Loading plantations…" />;
  if (error && plantations.length === 0) return <ErrorState message={error} />;

  const filteredPlantations = useMemo(() => {
    return plantations.filter((p) => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }, [plantations, searchQuery, statusFilter]);

  const totalArea = filteredPlantations.reduce((s, p) => s + Number(p.area ?? 0), 0);
  const totalPlants = filteredPlantations.reduce((s, p) => s + calcActivePlants(p), 0);

  return (
    <div>
      <PageHeader
        title="Dragon Fruit Plantations"
        subtitle="Manage perennial plantations and their production cycles"
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add plantation</Button>}
      />

      {plantations.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={<Sprout className="h-7 w-7" />}
            title="No plantations yet"
            description="Create a Dragon Fruit plantation to track establishment, production years, harvests, and profitability."
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add plantation</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Plantations" value={String(filteredPlantations.length)} icon={<Sprout className="h-5 w-5" />} />
            <StatCard label="Total area" value={`${formatNumber(totalArea)} bigha`} icon={<MapPin className="h-5 w-5" />} />
            <StatCard label="Active plants" value={formatNumber(totalPlants, 0)} icon={<Sprout className="h-5 w-5" />} tone="success" />
          </div>

          <Card className="p-4 mb-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-56">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Search</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Plantation name…" className="pl-8" />
                </div>
              </div>
              <div className="w-44">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">Status</label>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  {DF_PLANTATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </div>
              {(searchQuery || statusFilter) && (
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium pb-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlantations.map((p) => {
              const statusInfo = DF_PLANTATION_STATUSES.find((s) => s.value === p.status);
              const age = calcPlantationAge(p.plantation_start_date);
              const activePlants = calcActivePlants(p);
              return (
                <Card key={p.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer" >
                  <div onClick={() => onOpenPlantation(p.id)}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-stone-800 truncate">{p.name}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusInfo?.color ?? 'bg-stone-100 text-stone-600'}`}>
                        {statusInfo?.label ?? getDFPlantationStatusLabel(p.status)}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-sm text-stone-500">
                      <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {formatFarmPlot(farmName(p.farm_id), plotName(p.plot_id))}</p>
                      <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatDate(p.plantation_start_date)} · {age?.label ?? '—'}</p>
                      <p>Area: {formatNumber(p.area)} {AREA_UNIT_LABELS[p.area_unit as AreaUnit] ?? p.area_unit}</p>
                      <p>Plants: {formatNumber(activePlants, 0)}{p.total_poles != null && ` · ${formatNumber(p.total_poles, 0)} poles`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-100">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(p.id)} className="text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
          {filteredPlantations.length === 0 && (
            <Card className="p-0">
              <EmptyState
                icon={<Sprout className="h-7 w-7" />}
                title="No plantations found"
                description="Try adjusting your search or filter."
              />
            </Card>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit plantation' : 'New plantation'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Plantation name" required>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. North Block Dragon Fruit" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {DF_PLANTATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Farm">
            <Select value={form.farm_id} onChange={(e) => setForm({ ...form, farm_id: e.target.value, plot_id: '' })}>
              <option value="">— Select farm —</option>
              {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
          <Field label="Plot">
            <Select value={form.plot_id} onChange={(e) => setForm({ ...form, plot_id: e.target.value })}>
              <option value="">— Select plot —</option>
              {filteredPlots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Season / establishment year">
            <Select value={form.season_id} onChange={(e) => setForm({ ...form, season_id: e.target.value })}>
              <option value="">— Select season —</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.agri_year})</option>)}
            </Select>
          </Field>
          <Field label="Plantation start date">
            <TextInput type="date" value={form.plantation_start_date} onChange={(e) => setForm({ ...form, plantation_start_date: e.target.value })} />
          </Field>
          <Field label="Area">
            <TextInput type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Area unit">
            <Select value={form.area_unit} onChange={(e) => setForm({ ...form, area_unit: e.target.value })}>
              {AREA_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </Select>
          </Field>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-stone-700 mb-3">Plant count</h4>
          <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <Field label="Total poles">
              <TextInput type="number" value={form.total_poles} onChange={(e) => setForm({ ...form, total_poles: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Plants per pole">
              <TextInput type="number" value={form.plants_per_pole} onChange={(e) => setForm({ ...form, plants_per_pole: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Total plants">
              <TextInput type="number" value={form.total_plants} onChange={(e) => setForm({ ...form, total_plants: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Missing plants">
              <TextInput type="number" value={form.missing_plants} onChange={(e) => setForm({ ...form, missing_plants: e.target.value })} />
            </Field>
            <Field label="Dead plants">
              <TextInput type="number" value={form.dead_plants} onChange={(e) => setForm({ ...form, dead_plants: e.target.value })} />
            </Field>
            <Field label="Replacement plants">
              <TextInput type="number" value={form.replacement_plants} onChange={(e) => setForm({ ...form, replacement_plants: e.target.value })} />
            </Field>
          </div>
          {(() => {
            const total = num(form.total_plants) ?? 0;
            const missing = Number(form.missing_plants || 0);
            const dead = Number(form.dead_plants || 0);
            const replacement = Number(form.replacement_plants || 0);
            const active = Math.max(0, total - missing - dead + replacement);
            return (
              <p className="mt-2 text-sm text-emerald-600 font-medium">
                Active plants: {formatNumber(active, 0)}
              </p>
            );
          })()}
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-stone-700 mb-3">Spacing</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Field label="Row-to-row spacing">
              <TextInput type="number" value={form.row_spacing} onChange={(e) => setForm({ ...form, row_spacing: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Pole-to-pole spacing">
              <TextInput type="number" value={form.pole_spacing} onChange={(e) => setForm({ ...form, pole_spacing: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Border spacing">
              <TextInput type="number" value={form.border_spacing} onChange={(e) => setForm({ ...form, border_spacing: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Alley width">
              <TextInput type="number" value={form.alley_width} onChange={(e) => setForm({ ...form, alley_width: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Spacing unit">
              <Select value={form.spacing_unit} onChange={(e) => setForm({ ...form, spacing_unit: e.target.value })}>
                {DF_SPACING_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </Select>
            </Field>
          </div>
        </div>

        <div className="mt-6">
          <Field label="Notes">
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes about this plantation…" />
          </Field>
        </div>
        {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete plantation"
        message="This will permanently delete the plantation and all related production years, sections, harvests, health records, and observations. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
