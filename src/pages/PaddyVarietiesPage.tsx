import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Wheat, Archive, ArchiveRestore } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PaddyVariety } from '@/lib/types';
import { VARIETY_TYPES, GRAIN_TYPES, RICE_TYPES } from '@/lib/constants';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function PaddyVarietiesPage() {
  const [varieties, setVarieties] = useState<PaddyVariety[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<PaddyVariety | null>(null);
  const [deleting, setDeleting] = useState<PaddyVariety | null>(null);
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('paddy_varieties')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setVarieties(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (data: Partial<PaddyVariety>) => {
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from('paddy_varieties').update(data).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('paddy_varieties').insert(data);
      if (error) setError(error.message);
    }
    setBusy(false);
    setModal(false);
    setEditing(null);
    load();
  };

  const toggleArchive = async (v: PaddyVariety) => {
    setBusy(true);
    const { error } = await supabase
      .from('paddy_varieties')
      .update({ is_active: !v.is_active })
      .eq('id', v.id);
    if (error) setError(error.message);
    setBusy(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from('paddy_varieties').delete().eq('id', deleting.id);
    if (error) setError(error.message);
    setBusy(false);
    setDeleting(null);
    load();
  };

  const visible = varieties.filter((v) => showArchived || v.is_active);

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Paddy Varieties"
        subtitle="Manage your paddy variety master list. Archived varieties are hidden from new records."
        actions={
          <Button onClick={() => { setEditing(null); setModal(true); }}>
            <Plus className="h-4 w-4" /> Add variety
          </Button>
        }
      />
      {error && <ErrorState message={error} />}

      {varieties.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wheat className="h-7 w-7" />}
            title="No varieties yet"
            description="Add paddy varieties like Ranjit, CR Dhan 801, Pusa Basmati 1847, Joha, Bora, Black rice and more."
            action={<Button onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Add variety</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {showArchived ? 'Hide archived' : `Show archived (${varieties.filter(v => !v.is_active).length})`}
            </button>
          </div>

          {visible.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Archive className="h-7 w-7" />}
                title="No active varieties"
                description="All varieties are archived. Toggle archived view to see them."
              />
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((v) => (
                <Card key={v.id} className={`p-5 flex flex-col ${!v.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-stone-800 truncate">{v.name}</h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {v.variety_type ?? '—'}
                        {v.duration_days ? ` · ${v.duration_days} days` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      v.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {v.is_active ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    {v.rice_type && <Row label="Rice type" value={v.rice_type} />}
                    {v.grain_type && <Row label="Grain" value={v.grain_type} />}
                    {v.suitable_season && <Row label="Season" value={v.suitable_season} />}
                    {v.expected_yield != null && (
                      <Row label="Exp. yield" value={`${v.expected_yield} ${v.expected_yield_unit ?? 'kg'}`} />
                    )}
                  </dl>
                  {v.notes && (
                    <p className="mt-3 text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2">{v.notes}</p>
                  )}
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleArchive(v)} disabled={busy}>
                      {v.is_active ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(v); setModal(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(v)}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <VarietyFormModal
        open={modal}
        onClose={() => { setModal(false); setEditing(null); }}
        onSave={save}
        editing={editing}
        busy={busy}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete variety"
        message={`Delete "${deleting?.name}"? This cannot be undone.`}
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

interface VarietyFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<PaddyVariety>) => void;
  editing: PaddyVariety | null;
  busy: boolean;
}

function VarietyFormModal({ open, onClose, onSave, editing, busy }: VarietyFormModalProps) {
  const [name, setName] = useState('');
  const [varietyType, setVarietyType] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [grainType, setGrainType] = useState('');
  const [riceType, setRiceType] = useState('');
  const [expectedYield, setExpectedYield] = useState('');
  const [expectedYieldUnit, setExpectedYieldUnit] = useState('kg');
  const [suitableSeason, setSuitableSeason] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setVarietyType(editing?.variety_type ?? '');
    setDurationDays(editing?.duration_days != null ? String(editing.duration_days) : '');
    setGrainType(editing?.grain_type ?? '');
    setRiceType(editing?.rice_type ?? '');
    setExpectedYield(editing?.expected_yield != null ? String(editing.expected_yield) : '');
    setExpectedYieldUnit(editing?.expected_yield_unit ?? 'kg');
    setSuitableSeason(editing?.suitable_season ?? '');
    setNotes(editing?.notes ?? '');
    setErr(null);
  }, [open, editing]);

  const submit = () => {
    if (!name.trim()) { setErr('Variety name is required.'); return; }
    onSave({
      name: name.trim(),
      variety_type: varietyType || null,
      duration_days: durationDays === '' ? null : Number(durationDays),
      grain_type: grainType || null,
      rice_type: riceType || null,
      expected_yield: expectedYield === '' ? null : Number(expectedYield),
      expected_yield_unit: expectedYieldUnit,
      suitable_season: suitableSeason || null,
      notes: notes.trim() || null,
      is_active: editing?.is_active ?? true,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit variety' : 'Add variety'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save variety'}</Button>
        </>
      }
    >
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <Field label="Variety name" required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ranjit, CR Dhan 801" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Variety type">
            <Select value={varietyType} onChange={(e) => setVarietyType(e.target.value)}>
              <option value="">—</option>
              {VARIETY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Duration (days)">
            <TextInput type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} min={0} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Grain type">
            <Select value={grainType} onChange={(e) => setGrainType(e.target.value)}>
              <option value="">—</option>
              {GRAIN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Rice type">
            <Select value={riceType} onChange={(e) => setRiceType(e.target.value)}>
              <option value="">—</option>
              {RICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Expected yield">
            <TextInput type="number" value={expectedYield} onChange={(e) => setExpectedYield(e.target.value)} min={0} />
          </Field>
          <Field label="Yield unit">
            <TextInput value={expectedYieldUnit} onChange={(e) => setExpectedYieldUnit(e.target.value)} />
          </Field>
        </div>
        <Field label="Suitable season">
          <TextInput value={suitableSeason} onChange={(e) => setSuitableSeason(e.target.value)} placeholder="e.g. Sali, Ahu, Boro" />
        </Field>
        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
