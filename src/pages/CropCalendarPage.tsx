import { useEffect, useState, useCallback, useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Cultivation, CropType, CropVariety, Plot, PaddySeason, Activity } from '@/lib/types';
import { CULTIVATION_STATUSES } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';

export function CropCalendarPage() {
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [varieties, setVarieties] = useState<CropVariety[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [seasons, setSeasons] = useState<PaddySeason[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCrop, setFilterCrop] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterPlot, setFilterPlot] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, ctRes, vRes, pRes, sRes, aRes] = await Promise.all([
      supabase.from('cultivations').select('*').order('created_at', { ascending: false }),
      supabase.from('crop_types').select('*').order('name'),
      supabase.from('crop_varieties').select('*').order('name'),
      supabase.from('plots').select('id, name').order('name'),
      supabase.from('paddy_seasons').select('*').order('name'),
      supabase.from('activities').select('*').not('cultivation_id', 'is', null).order('date', { ascending: true }),
    ]);
    if (cRes.error) setError(cRes.error.message);
    else setCultivations(cRes.data as Cultivation[]);
    if (ctRes.data) setCropTypes(ctRes.data as CropType[]);
    if (vRes.data) setVarieties(vRes.data as CropVariety[]);
    if (pRes.data) setPlots(pRes.data as Plot[]);
    if (sRes.data) setSeasons(sRes.data as PaddySeason[]);
    if (aRes.data) setActivities(aRes.data as Activity[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cropName = (id: string | null) => cropTypes.find((c) => c.id === id)?.name ?? '—';
  const varietyName = (id: string | null) => varieties.find((v) => v.id === id)?.name ?? '';
  const plotName = (id: string | null) => plots.find((p) => p.id === id)?.name ?? '—';
  const seasonName = (id: string | null) => seasons.find((s) => s.id === id)?.name ?? '—';

  const cultById = useMemo(() => {
    const map: Record<string, Cultivation> = {};
    cultivations.forEach((c) => { map[c.id] = c; });
    return map;
  }, [cultivations]);

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      const cult = cultById[a.cultivation_id ?? ''];
      if (!cult) return false;
      if (filterCrop && cult.crop_type_id !== filterCrop) return false;
      if (filterSeason && cult.season_id !== filterSeason) return false;
      if (filterPlot && cult.plot_id !== filterPlot) return false;
      return true;
    });
  }, [activities, cultById, filterCrop, filterSeason, filterPlot]);

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader title="Crop Calendar" subtitle="Activity timeline across all cultivation records." />
      {error && <ErrorState message={error} />}

      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Crop</label>
            <Select value={filterCrop} onChange={(e) => setFilterCrop(e.target.value)}>
              <option value="">All crops</option>
              {cropTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Season</label>
            <Select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
              <option value="">All seasons</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Plot</label>
            <Select value={filterPlot} onChange={(e) => setFilterPlot(e.target.value)}>
              <option value="">All plots</option>
              {plots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          {(filterCrop || filterSeason || filterPlot) && (
            <button onClick={() => { setFilterCrop(''); setFilterSeason(''); setFilterPlot(''); }} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium pb-2">Clear filters</button>
          )}
        </div>
      </Card>

      {filteredActivities.length === 0 ? (
        <Card><EmptyState icon={<CalendarClock className="h-7 w-7" />} title="No activities" description="Activities linked to cultivation records will appear here as a calendar timeline." /></Card>
      ) : (
        <Card className="p-5">
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-stone-200" />
            <div className="space-y-4">
              {filteredActivities.map((a) => {
                const cult = cultById[a.cultivation_id ?? ''];
                const si = CULTIVATION_STATUSES.find((x) => x.value === cult?.status);
                return (
                  <div key={a.id} className="relative flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border-2 border-white shadow-sm z-10">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-stone-800">{a.name}</span>
                        {a.activity_type && <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-xs font-medium">{a.activity_type}</span>}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-500">{a.status}</span>
                      </div>
                      <div className="mt-1 text-xs text-stone-500">
                        {cropName(cult?.crop_type_id ?? null)}{varietyName(cult?.variety_id ?? null) ? ` · ${varietyName(cult?.variety_id ?? null)}` : ''} · {plotName(cult?.plot_id ?? null)} · {seasonName(cult?.season_id ?? null)}
                        {si && <span className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${si.color}`}>{si.label}</span>}
                      </div>
                      <div className="mt-1 text-xs text-stone-400">
                        Planned: {formatDate(a.planned_date)} · Actual: {formatDate(a.actual_date ?? a.date)}
                      </div>
                      {a.notes && <p className="mt-1 text-xs text-stone-500">{a.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
