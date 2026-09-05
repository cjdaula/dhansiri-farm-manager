import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, CalendarClock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Activity, Farm, Plot, PaddyCrop } from '@/lib/types';
import { ACTIVITY_TYPES, ACTIVITY_STATUSES } from '@/lib/constants';
import { formatDate, todayISO, formatFarmPlot } from '@/lib/format';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const STATUS_META: Record<string, { label: string; color: string }> = {
  planned: { label: 'Planned', color: 'bg-slate-100 text-slate-700' },
  done: { label: 'Done', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-100 text-rose-700' },
};

export function ActivitiesPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [crops, setCrops] = useState<PaddyCrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [aRes, fRes, pRes, cRes] = await Promise.all([
      supabase.from('activities').select('*').order('date', { ascending: false }),
      supabase.from('farms').select('id, name').order('name'),
      supabase.from('plots').select('id, name, farm_id').order('name'),
      supabase.from('paddy_crops').select('id, season_year, variety').order('created_at', { ascending: false }),
    ]);
    if (aRes.error) setError(aRes.error.message);
    else setItems(aRes.data ?? []);
    if (fRes.data) setFarms(fRes.data as Farm[]);
    if (pRes.data) setPlots(pRes.data as Plot[]);
    if (cRes.data) setCrops(cRes.data as PaddyCrop[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const farmName = (id: string | null) => farms.find((f) => f.id === id)?.name ?? '—';
  const plotName = (id: string | null) => plots.find((p) => p.id === id)?.name ?? '—';

  const save = async (data: Partial<Activity>) => {
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from('activities').update(data).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('activities').insert(data);
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
    const { error } = await supabase.from('activities').delete().eq('id', deleting.id);
    if (error) setError(error.message);
    setBusy(false);
    setDeleting(null);
    load();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Activities"
        subtitle="Farm activities and events. Will support a full calendar later."
        actions={
          <Button onClick={() => { setEditing(null); setModal(true); }}>
            <Plus className="h-4 w-4" /> Add activity
          </Button>
        }
      />
      {error && <ErrorState message={error} />}

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarClock className="h-7 w-7" />}
            title="No activities yet"
            description="Record land preparation, sowing, fertilization, harvest and other farm activities."
            action={<Button onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Add activity</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Activity</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Farm / Plot</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((a) => {
                  const sm = STATUS_META[a.status] ?? STATUS_META.planned;
                  return (
                    <tr key={a.id} className="hover:bg-stone-50/60">
                      <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatDate(a.date)}</td>
                      <td className="px-4 py-3 text-stone-700 font-medium">{a.name}</td>
                      <td className="px-4 py-3 text-stone-500">{a.activity_type ?? '—'}</td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{formatFarmPlot(farmName(a.farm_id), plotName(a.plot_id))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${sm.color}`}>{sm.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => { setEditing(a); setModal(true); }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleting(a)} className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50">
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

      <ActivityFormModal
        open={modal}
        onClose={() => { setModal(false); setEditing(null); }}
        onSave={save}
        editing={editing}
        farms={farms}
        plots={plots}
        crops={crops}
        busy={busy}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete activity"
        message={`Delete "${deleting?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={busy}
      />
    </div>
  );
}

interface ActivityFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Activity>) => void;
  editing: Activity | null;
  farms: Farm[];
  plots: Plot[];
  crops: PaddyCrop[];
  busy: boolean;
}

function ActivityFormModal({ open, onClose, onSave, editing, farms, plots, crops, busy }: ActivityFormModalProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayISO());
  const [farmId, setFarmId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [cropId, setCropId] = useState('');
  const [activityType, setActivityType] = useState<string>(ACTIVITY_TYPES[0]);
  const [status, setStatus] = useState<string>('planned');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setDate(editing?.date ?? todayISO());
    setFarmId(editing?.farm_id ?? '');
    setPlotId(editing?.plot_id ?? '');
    setCropId(editing?.paddy_crop_id ?? '');
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
      farm_id: farmId || null,
      plot_id: plotId || null,
      paddy_crop_id: cropId || null,
      activity_type: activityType,
      status,
      notes: notes.trim() || null,
    });
  };

  const filteredPlots = farmId ? plots.filter((p) => p.farm_id === farmId) : plots;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit activity' : 'Add activity'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save activity'}</Button>
        </>
      }
    >
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Activity name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Basal fertilizer application" />
          </Field>
          <Field label="Date" required>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Activity type">
            <Select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
              {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
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
          <Field label="Crop (paddy)">
            <Select value={cropId} onChange={(e) => setCropId(e.target.value)}>
              <option value="">None</option>
              {crops.map((c) => <option key={c.id} value={c.id}>{c.season_year} · {c.variety ?? 'Paddy'}</option>)}
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
