import { useEffect, useState } from 'react';
import { Save, Ruler } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Settings } from '@/lib/types';
import { DEFAULT_BIGHA_SQFT } from '@/lib/constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bighaSqft, setBighaSqft] = useState(String(DEFAULT_BIGHA_SQFT));
  const [farmName, setFarmName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else if (data) {
        setSettings(data);
        setBighaSqft(String(data.bigha_sqft));
        setFarmName(data.farm_name ?? '');
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const value = Number(bighaSqft);
    if (!value || value <= 0) {
      setMessage({ type: 'error', text: 'Bigha conversion must be a positive number.' });
      setSaving(false);
      return;
    }
    const { data, error } = await supabase
      .from('settings')
      .upsert({ id: 1, bigha_sqft: value, farm_name: farmName || null, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setSettings(data);
      setMessage({ type: 'success', text: 'Settings saved.' });
    }
    setSaving(false);
  };

  if (loading) return <PageHeader title="Settings" />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Settings"
        subtitle="Configure units and farm-wide preferences."
      />
      <div className="max-w-2xl space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Ruler className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-800">Area units</h3>
              <p className="text-sm text-stone-500">Set the local Bigha conversion used across the app.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="1 Bigha = (square feet)"
              required
              hint="Default for Assam: 14,400 sq ft"
            >
              <TextInput
                type="number"
                value={bighaSqft}
                onChange={(e) => setBighaSqft(e.target.value)}
                min={1}
              />
            </Field>
            <Field label="Reference conversions" hint="Fixed values, shown for reference">
              <div className="text-sm text-stone-600 space-y-1 pt-2">
                <p>1 Acre = 43,560 sq ft</p>
                <p>1 Hectare = 107,639.1 sq ft</p>
              </div>
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-stone-800 mb-4">Farm identity</h3>
          <Field label="Farm business name" hint="Shown on the dashboard and reports. Optional.">
            <TextInput
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="e.g. Dhansiri Agro Farms"
            />
          </Field>
        </Card>

        {message && (
          <div
            className={`text-sm rounded-lg px-4 py-3 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
