import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PaddySeason } from '@/lib/types';
import { SEASON_STATUSES } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const statusMeta = (s: string) => SEASON_STATUSES.find((x) => x.value === s) ?? SEASON_STATUSES[0];

export function PaddySeasonsPage() {
  const [seasons, setSeasons] = useState<PaddySeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<PaddySeason | null>(null);
  const [deleting, setDeleting] = useState<PaddySeason | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('paddy_seasons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setSeasons(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (data: Partial<PaddySeason>) => {
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from('paddy_seasons').update(data).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('paddy_seasons').insert(data);
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
    const { error } = await supabase.from('paddy_seasons').delete().eq('id', deleting.id);
    if (error) setError(error.message);
    setBusy(false);
    setDeleting(null);
    load();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Paddy Seasons"
        subtitle="Manage agricultural seasons so the same plot can have records across different years."
        actions={
          <Button onClick={() => { setEditing(null); setModal(true); }}>
            <Plus className="h-4 w-4" /> Add season
          </Button>
        }
      />
      {error && <ErrorState message={error} />}

      {seasons.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays className="h-7 w-7" />}
            title="No seasons yet"
            description="Create a season like '2026-27 Sali' to start organising cultivation records by agricultural year."
            action={<Button onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Add season</Button>}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasons.map((s) => {
            const sm = statusMeta(s.status);
            return (
              <Card key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-stone-800 truncate">{s.name}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">{s.agri_year}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${sm.color}`}>
                    {sm.label}
                  </span>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <Row label="Start" value={formatDate(s.start_date)} />
                  <Row label="End" value={formatDate(s.end_date)} />
                </dl>
                {s.notes && (
                  <p className="mt-3 text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2">{s.notes}</p>
                )}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setModal(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(s)}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SeasonFormModal
        open={modal}
        onClose={() => { setModal(false); setEditing(null); }}
        onSave={save}
        editing={editing}
        busy={busy}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete season"
        message={`Delete "${deleting?.name}"? Linked cultivation records will lose their season link.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={busy}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-stone-800 font-medium text-right">{value}</dd>
    </div>
  );
}

interface SeasonFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<PaddySeason>) => void;
  editing: PaddySeason | null;
  busy: boolean;
}

function SeasonFormModal({ open, onClose, onSave, editing, busy }: SeasonFormModalProps) {
  const [name, setName] = useState('');
  const [agriYear, setAgriYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('planned');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setAgriYear(editing?.agri_year ?? '');
    setStartDate(editing?.start_date ?? '');
    setEndDate(editing?.end_date ?? '');
    setStatus(editing?.status ?? 'planned');
    setNotes(editing?.notes ?? '');
    setErr(null);
  }, [open, editing]);

  const submit = () => {
    if (!name.trim()) { setErr('Season name is required.'); return; }
    if (!agriYear.trim()) { setErr('Agricultural year is required.'); return; }
    if (startDate && endDate && endDate < startDate) {
      setErr('End date should not be before start date.');
      return;
    }
    onSave({
      name: name.trim(),
      agri_year: agriYear.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      status,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit season' : 'Add season'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save season'}</Button>
        </>
      }
    >
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Season name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2026-27 Sali" />
          </Field>
          <Field label="Agricultural year" required>
            <TextInput value={agriYear} onChange={(e) => setAgriYear(e.target.value)} placeholder="e.g. 2026-27" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Start date">
            <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End date">
            <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {SEASON_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
