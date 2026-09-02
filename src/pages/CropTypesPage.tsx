import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Sprout } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CropType } from '@/lib/types';
import { CROP_CATEGORIES, CROP_NATURES } from '@/lib/constants';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function CropTypesPage() {
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CropType | null>(null);
  const [deleting, setDeleting] = useState<CropType | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('crop_types').select('*').order('name');
    if (error) setError(error.message);
    else setCropTypes(data as CropType[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (data: Partial<CropType>) => {
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from('crop_types').update(data).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('crop_types').insert(data);
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
    const { error } = await supabase.from('crop_types').delete().eq('id', deleting.id);
    if (error) setError(error.message);
    setBusy(false);
    setDeleting(null);
    load();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Crop Types"
        subtitle="Master list of all crops grown on the farm."
        actions={<Button onClick={() => { setEditing(null); setModal(true); }}><Plus className="h-4 w-4" /> Add crop type</Button>}
      />
      {error && <ErrorState message={error} />}

      {cropTypes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sprout className="h-7 w-7" />}
            title="No crop types yet"
            description="Add crop types like Paddy, Dragon Fruit, Turmeric, etc. to start managing crops."
            action={<Button onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Add crop type</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Crop</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Nature</th>
                  <th className="text-left px-4 py-3 font-medium">Default unit</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {cropTypes.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/60">
                    <td className="px-4 py-3 font-medium text-stone-800">{c.name}</td>
                    <td className="px-4 py-3 text-stone-600">{c.category ?? '—'}</td>
                    <td className="px-4 py-3 text-stone-600">{c.crop_nature ?? '—'}</td>
                    <td className="px-4 py-3 text-stone-500">{c.default_unit ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CropTypeFormModal open={modal} onClose={() => { setModal(false); setEditing(null); }} onSave={save} editing={editing} busy={busy} />
      <ConfirmDialog open={!!deleting} title="Delete crop type" message={`Delete "${deleting?.name}"? This cannot be undone.`} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} loading={busy} />
    </div>
  );
}

interface CropTypeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<CropType>) => void;
  editing: CropType | null;
  busy: boolean;
}

function CropTypeFormModal({ open, onClose, onSave, editing, busy }: CropTypeFormModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [cropNature, setCropNature] = useState('');
  const [defaultUnit, setDefaultUnit] = useState('');
  const [typicalProductionUnit, setTypicalProductionUnit] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setCategory(editing?.category ?? '');
    setCropNature(editing?.crop_nature ?? '');
    setDefaultUnit(editing?.default_unit ?? '');
    setTypicalProductionUnit(editing?.typical_production_unit ?? '');
    setIsActive(editing?.is_active ?? true);
    setNotes(editing?.notes ?? '');
    setErr(null);
  }, [open, editing]);

  const submit = () => {
    if (!name.trim()) { setErr('Crop name is required.'); return; }
    onSave({
      name: name.trim(),
      category: category || null,
      crop_nature: cropNature || null,
      default_unit: defaultUnit.trim() || null,
      typical_production_unit: typicalProductionUnit.trim() || null,
      is_active: isActive,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit crop type' : 'Add crop type'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Crop name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paddy, Turmeric, Dragon Fruit" />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">—</option>
              {CROP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Crop nature">
            <Select value={cropNature} onChange={(e) => setCropNature(e.target.value)}>
              <option value="">—</option>
              {CROP_NATURES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </Select>
          </Field>
          <Field label="Default unit">
            <TextInput value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value)} placeholder="e.g. kg" />
          </Field>
          <Field label="Typical production unit">
            <TextInput value={typicalProductionUnit} onChange={(e) => setTypicalProductionUnit(e.target.value)} placeholder="e.g. kg" />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" />
          <span className="text-sm text-stone-700">Active</span>
        </label>
      </div>
    </Modal>
  );
}
