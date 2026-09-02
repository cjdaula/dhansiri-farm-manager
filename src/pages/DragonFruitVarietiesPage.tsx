import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DFVariety } from '@/lib/types';
import { DF_PLANTING_MATERIAL_TYPES } from '@/lib/constants';
import { Card } from '@/components/ui/Card';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Plus, Pencil, Trash2, Sprout } from 'lucide-react';

export function DragonFruitVarietiesPage() {
  const [varieties, setVarieties] = useState<DFVariety[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DFVariety | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '', flesh_color: '', skin_color: '', source: '',
    planting_material_type: '', notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('dragon_fruit_varieties').select('*').order('name');
    if (error) setError(error.message);
    setVarieties((data ?? []) as DFVariety[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', flesh_color: '', skin_color: '', source: '', planting_material_type: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (v: DFVariety) => {
    setEditing(v);
    setForm({
      name: v.name,
      flesh_color: v.flesh_color ?? '',
      skin_color: v.skin_color ?? '',
      source: v.source ?? '',
      planting_material_type: v.planting_material_type ?? '',
      notes: v.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Variety name is required'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      flesh_color: form.flesh_color.trim() || null,
      skin_color: form.skin_color.trim() || null,
      source: form.source.trim() || null,
      planting_material_type: form.planting_material_type || null,
      notes: form.notes.trim() || null,
    };
    if (editing) {
      const { error: e } = await supabase.from('dragon_fruit_varieties').update(payload).eq('id', editing.id);
      if (e) setError(e.message);
    } else {
      const { error: e } = await supabase.from('dragon_fruit_varieties').insert(payload);
      if (e) setError(e.message);
    }
    setSaving(false);
    if (!error) { setModalOpen(false); load(); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from('dragon_fruit_varieties').delete().eq('id', deleteId);
    setDeleting(false);
    setDeleteId(null);
    load();
  };

  if (loading) return <LoadingState label="Loading varieties…" />;
  if (error && varieties.length === 0) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Dragon Fruit Varieties"
        subtitle="Manage cultivars — flesh colour, skin colour, source, and planting material type"
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add variety</Button>}
      />

      {varieties.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={<Sprout className="h-7 w-7" />}
            title="No varieties yet"
            description="Add Dragon Fruit cultivars to assign them to plantations."
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add variety</Button>}
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {varieties.map((v) => (
            <Card key={v.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-stone-800">{v.name}</h3>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${v.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                  {v.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-stone-500">
                {v.flesh_color && <p>Flesh: {v.flesh_color}</p>}
                {v.skin_color && <p>Skin: {v.skin_color}</p>}
                {v.source && <p>Source: {v.source}</p>}
                {v.planting_material_type && <p>Material: {v.planting_material_type}</p>}
                {v.notes && <p className="text-stone-400 mt-1">{v.notes}</p>}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-100">
                <Button variant="ghost" size="sm" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(v.id)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit variety' : 'New variety'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Cultivar name" required>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Red-fleshed" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Flesh colour">
              <TextInput value={form.flesh_color} onChange={(e) => setForm({ ...form, flesh_color: e.target.value })} placeholder="e.g. Red, White, Pink" />
            </Field>
            <Field label="Skin colour">
              <TextInput value={form.skin_color} onChange={(e) => setForm({ ...form, skin_color: e.target.value })} placeholder="e.g. Yellow, Red" />
            </Field>
          </div>
          <Field label="Source">
            <TextInput value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Where the planting material came from" />
          </Field>
          <Field label="Planting material type">
            <Select value={form.planting_material_type} onChange={(e) => setForm({ ...form, planting_material_type: e.target.value })}>
              <option value="">— Select —</option>
              {DF_PLANTING_MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete variety"
        message="This will permanently delete this variety. If it is assigned to any plantations, those links will also be removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
