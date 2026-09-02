import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, Sprout } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CropVariety, CropType } from '@/lib/types';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function CropVarietiesPage() {
  const [varieties, setVarieties] = useState<CropVariety[]>([]);
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CropVariety | null>(null);
  const [deleting, setDeleting] = useState<CropVariety | null>(null);
  const [busy, setBusy] = useState(false);
  const [filterCrop, setFilterCrop] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [vRes, cRes] = await Promise.all([
      supabase.from('crop_varieties').select('*').order('name'),
      supabase.from('crop_types').select('*').order('name'),
    ]);
    if (vRes.error) setError(vRes.error.message);
    else setVarieties(vRes.data as CropVariety[]);
    if (cRes.data) setCropTypes(cRes.data as CropType[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cropName = (id: string | null) => cropTypes.find((c) => c.id === id)?.name ?? '—';

  const filtered = useMemo(
    () => varieties.filter((v) => !filterCrop || v.crop_type_id === filterCrop),
    [varieties, filterCrop],
  );

  const save = async (data: Partial<CropVariety>) => {
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from('crop_varieties').update(data).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('crop_varieties').insert(data);
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
    const { error } = await supabase.from('crop_varieties').delete().eq('id', deleting.id);
    if (error) setError(error.message);
    setBusy(false);
    setDeleting(null);
    load();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Crop Varieties"
        subtitle="Manage varieties for all crop types."
        actions={<Button onClick={() => { setEditing(null); setModal(true); }}><Plus className="h-4 w-4" /> Add variety</Button>}
      />
      {error && <ErrorState message={error} />}

      {varieties.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sprout className="h-7 w-7" />}
            title="No varieties yet"
            description="Add varieties like CR Dhan 801 for Paddy, or a selected cultivar for Dragon Fruit."
            action={<Button onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Add variety</Button>}
          />
        </Card>
      ) : (
        <>
          <Card className="p-4 mb-5">
            <div className="w-52">
              <label className="block text-xs font-medium text-stone-500 mb-1.5">Filter by crop</label>
              <Select value={filterCrop} onChange={(e) => setFilterCrop(e.target.value)}>
                <option value="">All crops</option>
                {cropTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Variety</th>
                    <th className="text-left px-4 py-3 font-medium">Crop</th>
                    <th className="text-left px-4 py-3 font-medium">Code</th>
                    <th className="text-left px-4 py-3 font-medium">Duration (days)</th>
                    <th className="text-left px-4 py-3 font-medium">Expected yield</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((v) => (
                    <tr key={v.id} className="hover:bg-stone-50/60">
                      <td className="px-4 py-3 font-medium text-stone-800">{v.name}</td>
                      <td className="px-4 py-3 text-stone-600">{cropName(v.crop_type_id)}</td>
                      <td className="px-4 py-3 text-stone-500">{v.variety_code ?? '—'}</td>
                      <td className="px-4 py-3 text-stone-500">{v.duration_days ?? '—'}</td>
                      <td className="px-4 py-3 text-stone-500">{v.expected_yield != null ? `${v.expected_yield} ${v.yield_unit ?? ''}` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${v.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => { setEditing(v); setModal(true); }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleting(v)} className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50">
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
        </>
      )}

      <VarietyFormModal open={modal} onClose={() => { setModal(false); setEditing(null); }} onSave={save} editing={editing} cropTypes={cropTypes} busy={busy} />
      <ConfirmDialog open={!!deleting} title="Delete variety" message={`Delete "${deleting?.name}"? This cannot be undone.`} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} loading={busy} />
    </div>
  );
}

interface VarietyFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<CropVariety>) => void;
  editing: CropVariety | null;
  cropTypes: CropType[];
  busy: boolean;
}

function VarietyFormModal({ open, onClose, onSave, editing, cropTypes, busy }: VarietyFormModalProps) {
  const [cropTypeId, setCropTypeId] = useState('');
  const [name, setName] = useState('');
  const [varietyCode, setVarietyCode] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [maturityDays, setMaturityDays] = useState('');
  const [expectedYield, setExpectedYield] = useState('');
  const [yieldUnit, setYieldUnit] = useState('kg');
  const [suitableSeason, setSuitableSeason] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCropTypeId(editing?.crop_type_id ?? '');
    setName(editing?.name ?? '');
    setVarietyCode(editing?.variety_code ?? '');
    setDurationDays(editing?.duration_days != null ? String(editing.duration_days) : '');
    setMaturityDays(editing?.maturity_days != null ? String(editing.maturity_days) : '');
    setExpectedYield(editing?.expected_yield != null ? String(editing.expected_yield) : '');
    setYieldUnit(editing?.yield_unit ?? 'kg');
    setSuitableSeason(editing?.suitable_season ?? '');
    setNotes(editing?.notes ?? '');
    setIsActive(editing?.is_active ?? true);
    setErr(null);
  }, [open, editing]);

  const submit = () => {
    if (!name.trim()) { setErr('Variety name is required.'); return; }
    if (!cropTypeId) { setErr('Please select a crop type.'); return; }
    onSave({
      crop_type_id: cropTypeId,
      name: name.trim(),
      variety_code: varietyCode.trim() || null,
      duration_days: durationDays ? Number(durationDays) : null,
      maturity_days: maturityDays ? Number(maturityDays) : null,
      expected_yield: expectedYield ? Number(expectedYield) : null,
      yield_unit: yieldUnit.trim() || 'kg',
      suitable_season: suitableSeason.trim() || null,
      notes: notes.trim() || null,
      is_active: isActive,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit variety' : 'Add variety'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Crop type" required>
            <Select value={cropTypeId} onChange={(e) => setCropTypeId(e.target.value)}>
              <option value="">Select crop…</option>
              {cropTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Variety name" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CR Dhan 801" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Variety code">
            <TextInput value={varietyCode} onChange={(e) => setVarietyCode(e.target.value)} />
          </Field>
          <Field label="Duration (days)">
            <TextInput type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} min={0} />
          </Field>
          <Field label="Maturity (days)">
            <TextInput type="number" value={maturityDays} onChange={(e) => setMaturityDays(e.target.value)} min={0} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Expected yield">
            <TextInput type="number" value={expectedYield} onChange={(e) => setExpectedYield(e.target.value)} min={0} step="any" />
          </Field>
          <Field label="Yield unit">
            <TextInput value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)} />
          </Field>
          <Field label="Suitable season">
            <TextInput value={suitableSeason} onChange={(e) => setSuitableSeason(e.target.value)} placeholder="e.g. Sali" />
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
