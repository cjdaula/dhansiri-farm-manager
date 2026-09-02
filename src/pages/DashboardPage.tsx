import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Map, MapPin, Wheat, CalendarClock, Leaf,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Farm, Plot, PaddyCrop, Cultivation, CropType, Expense, Income, Activity, Settings, AreaUnit } from '@/lib/types';
import { toSqft, fromSqft, AREA_UNIT_LABELS } from '@/lib/area';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Card, StatCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { FinancialSummaryCards } from '@/components/FinancialSummaryCards';
import { DateRangeFilter, resolvePreset, type DateRange } from '@/components/DateRangeFilter';
import { calcReceivablesPayables } from '@/lib/financeCalc';
import type { DateRangePreset } from '@/lib/constants';
import { DEFAULT_BIGHA_SQFT } from '@/lib/constants';
import type { PageKey } from '@/components/AppShell';

interface DashboardProps {
  onNavigate: (p: PageKey) => void;
}

export function DashboardPage({ onNavigate }: DashboardProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [crops, setCrops] = useState<PaddyCrop[]>([]);
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DateRangePreset>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [fRes, pRes, cRes, eRes, iRes, aRes, sRes, cultRes, ctRes] = await Promise.all([
      supabase.from('farms').select('*'),
      supabase.from('plots').select('*'),
      supabase.from('paddy_crops').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('income').select('*'),
      supabase.from('activities').select('*'),
      supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('cultivations').select('*'),
      supabase.from('crop_types').select('*'),
    ]);
    if (fRes.error) setError(fRes.error.message);
    setFarms(fRes.data ?? []);
    setPlots(pRes.data ?? []);
    setCrops(cRes.data ?? []);
    setExpenses(eRes.data ?? []);
    setIncome(iRes.data ?? []);
    setActivities(aRes.data ?? []);
    if (sRes.data) setSettings(sRes.data as Settings);
    if (cultRes.data) setCultivations(cultRes.data as Cultivation[]);
    if (ctRes.data) setCropTypes(ctRes.data as CropType[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (preset !== 'custom') {
      const r = resolvePreset(preset);
      setFrom(r.from);
      setTo(r.to);
    }
  }, [preset]);

  const bighaSqft = settings?.bigha_sqft ?? DEFAULT_BIGHA_SQFT;

  const totalAreaSqft = useMemo(() => {
    return farms.reduce((acc, f) => acc + (toSqft(f.total_area, f.area_unit as AreaUnit, bighaSqft) ?? 0), 0);
  }, [farms, bighaSqft]);

  const totalAreaBigha = fromSqft(totalAreaSqft, 'bigha', bighaSqft);
  const totalAreaAcre = fromSqft(totalAreaSqft, 'acre', bighaSqft);

  const activeCrops = useMemo(
    () => crops.filter((c) => !['harvested', 'completed'].includes(c.status)),
    [crops],
  );

  const activeCultivations = useMemo(
    () => cultivations.filter((c) => !['completed', 'cancelled', 'harvested'].includes(c.status)),
    [cultivations],
  );
  const plannedCultivations = useMemo(
    () => cultivations.filter((c) => c.status === 'planned' || c.status === 'prepared'),
    [cultivations],
  );
  const areaUnderCultivation = useMemo(
    () => activeCultivations.reduce((s, c) => s + Number(c.area ?? 0), 0),
    [activeCultivations],
  );
  const areaPlanned = useMemo(
    () => plannedCultivations.reduce((s, c) => s + Number(c.area ?? 0), 0),
    [plannedCultivations],
  );
  const totalPlotArea = useMemo(
    () => plots.reduce((s, p) => s + (toSqft(p.area, p.area_unit as AreaUnit, bighaSqft) ?? 0), 0),
    [plots, bighaSqft],
  );
  const totalPlotAreaBigha = fromSqft(totalPlotArea, 'bigha', bighaSqft);
  const areaAvailable = Math.max(0, (totalPlotAreaBigha ?? 0) - areaUnderCultivation);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    });
  }, [expenses, from, to]);

  const filteredIncome = useMemo(() => {
    return income.filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    });
  }, [income, from, to]);

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((s, e) => s + Number(e.total_amount ?? 0), 0),
    [filteredExpenses],
  );
  const totalIncome = useMemo(
    () => filteredIncome.reduce((s, e) => s + Number(e.total_income ?? 0), 0),
    [filteredIncome],
  );
  const operatingExpenses = useMemo(
    () => filteredExpenses.filter((e) => (e.expense_type ?? 'operating') === 'operating').reduce((s, e) => s + Number(e.total_amount ?? 0), 0),
    [filteredExpenses],
  );
  const operatingProfit = totalIncome - operatingExpenses;
  const netResult = totalIncome - totalExpenses;

  const { totalReceivables, totalPayables } = useMemo(
    () => calcReceivablesPayables(filteredExpenses, filteredIncome),
    [filteredExpenses, filteredIncome],
  );

  const today = new Date().toISOString().slice(0, 10);

  const recentActivities = useMemo(
    () => [...activities].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    [activities],
  );

  const upcomingActivities = useMemo(
    () => activities.filter((a) => a.date >= today && a.status === 'planned').sort((a, b) => (a.date > b.date ? 1 : -1)).slice(0, 5),
    [activities, today],
  );

  const hasAnyData = farms.length > 0 || plots.length > 0 || crops.length > 0 || cultivations.length > 0 || expenses.length > 0 || income.length > 0;

  if (loading) return <LoadingState />;

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title={settings?.farm_name ? settings.farm_name : 'Dashboard'}
        subtitle="Overview of your farm business at a glance."
      />
      {error && <ErrorState message={error} />}

      {!hasAnyData ? (
        <Card>
          <EmptyState
            icon={<Leaf className="h-7 w-7" />}
            title="Welcome to Dhansiri Farm Manager"
            description="Start by adding your first farm. Then you can record plots, paddy crops, expenses and income."
            action={<Button onClick={() => onNavigate('farms')}><Map className="h-4 w-4" /> Add your first farm</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Total farm area"
              value={totalAreaSqft > 0 ? `${formatNumber(totalAreaBigha)} ${AREA_UNIT_LABELS.bigha}` : '—'}
              hint={totalAreaSqft > 0 ? `${formatNumber(totalAreaAcre, 2)} ${AREA_UNIT_LABELS.acre}` : undefined}
              icon={<Map className="h-5 w-5" />}
            />
            <StatCard label="Plots" value={String(plots.length)} icon={<MapPin className="h-5 w-5" />} />
            <StatCard label="Active crops" value={String(activeCrops.length + activeCultivations.length)} icon={<Wheat className="h-5 w-5" />} />
          </div>

          {(areaUnderCultivation > 0 || areaPlanned > 0) && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Area under cultivation" value={`${formatNumber(areaUnderCultivation)} bigha`} icon={<Leaf className="h-5 w-5" />} tone="success" />
              <StatCard label="Area planned" value={`${formatNumber(areaPlanned)} bigha`} icon={<Leaf className="h-5 w-5" />} tone="warning" />
              <StatCard label="Area available" value={`${formatNumber(areaAvailable)} bigha`} icon={<Map className="h-5 w-5" />} />
              <StatCard label="Total plot area" value={totalPlotAreaBigha != null ? `${formatNumber(totalPlotAreaBigha)} bigha` : '—'} icon={<MapPin className="h-5 w-5" />} />
            </div>
          )}

          <Card className="p-4 mb-6">
            <DateRangeFilter
              preset={preset}
              from={from}
              to={to}
              onPresetChange={setPreset}
              onFromChange={setFrom}
              onToChange={setTo}
            />
          </Card>

          <div className="mb-6">
            <FinancialSummaryCards
              totalRevenue={totalIncome}
              totalExpenses={totalExpenses}
              operatingProfit={operatingProfit}
              netResult={netResult}
              receivables={totalReceivables}
              payables={totalPayables}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-stone-800">Recent activities</h3>
                <button onClick={() => onNavigate('activities')} className="text-xs text-emerald-600 font-medium hover:text-emerald-700">
                  View all
                </button>
              </div>
              {recentActivities.length === 0 ? (
                <p className="text-sm text-stone-400 py-6 text-center">No activities recorded yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recentActivities.map((a) => (
                    <li key={a.id} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{a.name}</p>
                        <p className="text-xs text-stone-500">
                          {formatDate(a.date)} · {a.activity_type ?? 'Activity'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-stone-800">Upcoming activities</h3>
                <button onClick={() => onNavigate('activities')} className="text-xs text-emerald-600 font-medium hover:text-emerald-700">
                  View all
                </button>
              </div>
              {upcomingActivities.length === 0 ? (
                <p className="text-sm text-stone-400 py-6 text-center">Nothing planned. Add upcoming activities to stay on schedule.</p>
              ) : (
                <ul className="space-y-3">
                  {upcomingActivities.map((a) => (
                    <li key={a.id} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{a.name}</p>
                        <p className="text-xs text-stone-500">
                          {formatDate(a.date)} · {a.activity_type ?? 'Activity'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
