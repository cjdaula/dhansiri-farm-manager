import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { DragonFruitPlantation, DFProductionYear, DFHarvest, Expense, Income, Activity, Farm, Plot, Settings, AreaUnit } from '@/lib/types';
import { AREA_UNIT_LABELS } from '@/lib/area';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import { calcActivePlants, calcPlantationAge, getDFPlantationStatusLabel } from '@/lib/dragonCalc';
import { DF_PLANTATION_STATUSES, DEFAULT_BIGHA_SQFT } from '@/lib/constants';
import { Card, StatCard } from '@/components/ui/Card';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Sprout, MapPin, Calendar, TrendingUp, TrendingDown, Wheat, Activity as ActivityIcon, Package } from 'lucide-react';

interface Props {
  onNavigate: (page: 'dragonfruit-plantations' | 'dragonfruit-varieties' | 'dragonfruit-reports') => void;
}

export function DragonFruitDashboardPage({ onNavigate }: Props) {
  const [plantations, setPlantations] = useState<DragonFruitPlantation[]>([]);
  const [productionYears, setProductionYears] = useState<DFProductionYear[]>([]);
  const [harvests, setHarvests] = useState<DFHarvest[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      const [pRes, pyRes, hRes, eRes, iRes, aRes, fRes, plRes, sRes] = await Promise.all([
        supabase.from('dragon_fruit_plantations').select('*'),
        supabase.from('dragon_fruit_production_years').select('*'),
        supabase.from('dragon_fruit_harvests').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('income').select('*'),
        supabase.from('activities').select('*'),
        supabase.from('farms').select('*'),
        supabase.from('plots').select('*'),
        supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      ]);
      if (pRes.error) setError(pRes.error.message);
      setPlantations((pRes.data ?? []) as DragonFruitPlantation[]);
      setProductionYears((pyRes.data ?? []) as DFProductionYear[]);
      setHarvests((hRes.data ?? []) as DFHarvest[]);
      setExpenses((eRes.data ?? []) as Expense[]);
      setIncome((iRes.data ?? []) as Income[]);
      setActivities((aRes.data ?? []) as Activity[]);
      setFarms((fRes.data ?? []) as Farm[]);
      setPlots((plRes.data ?? []) as Plot[]);
      if (sRes.data) setSettings(sRes.data as Settings);
      setLoading(false);
    })();
  }, []);

  const bighaSqft = settings?.bigha_sqft ?? DEFAULT_BIGHA_SQFT;

  const plantationMap = useMemo(() => {
    const m = new Map<string, DragonFruitPlantation>();
    plantations.forEach((p) => m.set(p.id, p));
    return m;
  }, [plantations]);

  const farmName = (id: string | null) => farms.find((f) => f.id === id)?.name ?? '—';
  const plotName = (id: string | null) => plots.find((p) => p.id === id)?.name ?? '—';

  const totalArea = plantations.reduce((s, p) => s + Number(p.area ?? 0), 0);
  const totalPoles = plantations.reduce((s, p) => s + Number(p.total_poles ?? 0), 0);
  const totalPlants = plantations.reduce((s, p) => s + Number(p.total_plants ?? 0), 0);
  const totalActivePlants = plantations.reduce((s, p) => s + calcActivePlants(p), 0);

  const dfExpenses = expenses.filter((e) => plantationMap.has(e.cultivation_id ?? '') || plantations.some((p) => p.cultivation_id === e.cultivation_id));
  const dfIncome = income.filter((i) => plantationMap.has(i.cultivation_id ?? '') || plantations.some((p) => p.cultivation_id === i.cultivation_id));
  const totalRevenue = dfIncome.reduce((s, i) => s + Number(i.total_income ?? 0), 0);
  const totalOperatingCost = dfExpenses.filter((e) => e.expense_type === 'operating').reduce((s, e) => s + Number(e.total_amount ?? 0), 0);
  const totalEstablishmentCost = dfExpenses.filter((e) => e.expense_type === 'capital').reduce((s, e) => s + Number(e.total_amount ?? 0), 0);
  const profit = totalRevenue - totalOperatingCost - totalEstablishmentCost;

  const totalHarvestQty = harvests.reduce((s, h) => s + Number(h.quantity ?? 0), 0);

  const currentYear = new Date().getFullYear();
  const currentProdYears = productionYears.filter((py) => py.production_year === currentYear);
  const currentYearExpected = currentProdYears.reduce((s, py) => s + Number(py.expected_production ?? 0), 0);
  const currentYearHarvests = harvests.filter((h) => currentProdYears.some((py) => py.id === h.production_year_id));
  const currentYearActual = currentYearHarvests.reduce((s, h) => s + Number(h.quantity ?? 0), 0);

  const upcomingActivities = activities
    .filter((a) => {
      if (!a.cultivation_id) return false;
      return plantations.some((p) => p.cultivation_id === a.cultivation_id);
    })
    .filter((a) => a.status === 'planned' && a.planned_date)
    .sort((a, b) => (a.planned_date ?? '').localeCompare(b.planned_date ?? ''))
    .slice(0, 5);

  const recentHarvests = [...harvests]
    .sort((a, b) => (b.harvest_date ?? '').localeCompare(a.harvest_date ?? ''))
    .slice(0, 5);

  if (loading) return <LoadingState label="Loading Dragon Fruit dashboard…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Dragon Fruit Dashboard"
        subtitle="Plantation and production overview"
        actions={
          <Button onClick={() => onNavigate('dragonfruit-plantations')}>
            <Sprout className="h-4 w-4" /> Plantations
          </Button>
        }
      />

      {plantations.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={<Sprout className="h-7 w-7" />}
            title="No Dragon Fruit plantations yet"
            description="Create your first plantation to start tracking establishment, production, and profitability."
            action={<Button onClick={() => onNavigate('dragonfruit-plantations')}>Add plantation</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Plantations" value={String(plantations.length)} icon={<Sprout className="h-5 w-5" />} />
            <StatCard label="Total area" value={`${formatNumber(totalArea)} bigha`} icon={<MapPin className="h-5 w-5" />} />
            <StatCard label="Total poles" value={formatNumber(totalPoles, 0)} icon={<Package className="h-5 w-5" />} />
            <StatCard label="Active plants" value={formatNumber(totalActivePlants, 0)} icon={<Sprout className="h-5 w-5" />} tone="success" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Current year expected" value={currentYearExpected > 0 ? `${formatNumber(currentYearExpected)} kg` : '—'} icon={<Calendar className="h-5 w-5" />} tone="warning" />
            <StatCard label="Current year actual" value={currentYearActual > 0 ? `${formatNumber(currentYearActual)} kg` : '—'} icon={<Wheat className="h-5 w-5" />} tone="success" />
            <StatCard label="Total harvests" value={String(harvests.length)} icon={<Wheat className="h-5 w-5" />} />
            <StatCard label="Total harvest qty" value={`${formatNumber(totalHarvestQty)} kg`} icon={<Package className="h-5 w-5" />} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total revenue" value={formatCurrency(totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
            <StatCard label="Operating cost" value={formatCurrency(totalOperatingCost)} icon={<TrendingDown className="h-5 w-5" />} tone="error" />
            <StatCard
              label="Profit"
              value={formatCurrency(profit)}
              icon={profit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              tone={profit >= 0 ? 'success' : 'error'}
            />
          </div>

          {totalEstablishmentCost > 0 && (
            <Card className="p-4 mb-6">
              <p className="text-sm text-stone-500">
                <span className="font-medium text-stone-700">Establishment/infrastructure cost:</span>{' '}
                {formatCurrency(totalEstablishmentCost)}
                <span className="text-stone-400"> (capital expenses, not spread across years)</span>
              </p>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="text-base font-semibold text-stone-800 mb-4">Upcoming activities</h3>
              {upcomingActivities.length === 0 ? (
                <p className="text-sm text-stone-400">No scheduled activities.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingActivities.map((a) => {
                    const p = plantations.find((pl) => pl.cultivation_id === a.cultivation_id);
                    return (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <ActivityIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-700 truncate">{a.name}</p>
                          <p className="text-xs text-stone-400">
                            {formatDate(a.planned_date)} · {p?.name ?? '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-base font-semibold text-stone-800 mb-4">Recent harvests</h3>
              {recentHarvests.length === 0 ? (
                <p className="text-sm text-stone-400">No harvests recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentHarvests.map((h) => {
                    const p = plantationMap.get(h.plantation_id);
                    return (
                      <div key={h.id} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                          <Wheat className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-700 truncate">
                            {formatNumber(h.quantity)} {h.unit}
                          </p>
                          <p className="text-xs text-stone-400">
                            {formatDate(h.harvest_date)} · {p?.name ?? '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-5 mt-6">
            <h3 className="text-base font-semibold text-stone-800 mb-4">Plantation summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                    <th className="pb-2 font-medium">Plantation</th>
                    <th className="pb-2 font-medium">Farm / Plot</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Area</th>
                    <th className="pb-2 font-medium text-right">Plants</th>
                    <th className="pb-2 font-medium text-right">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {plantations.map((p) => {
                    const statusInfo = DF_PLANTATION_STATUSES.find((s) => s.value === p.status);
                    const age = calcPlantationAge(p.plantation_start_date);
                    return (
                      <tr key={p.id} className="border-b border-stone-50 last:border-0">
                        <td className="py-2.5 font-medium text-stone-700">{p.name}</td>
                        <td className="py-2.5 text-stone-500">{farmName(p.farm_id)} / {plotName(p.plot_id)}</td>
                        <td className="py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo?.color ?? 'bg-stone-100 text-stone-600'}`}>
                            {statusInfo?.label ?? getDFPlantationStatusLabel(p.status)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-stone-600">{formatNumber(p.area)} {AREA_UNIT_LABELS[p.area_unit as AreaUnit] ?? p.area_unit}</td>
                        <td className="py-2.5 text-right text-stone-600">{formatNumber(calcActivePlants(p), 0)}</td>
                        <td className="py-2.5 text-right text-stone-500">{age?.label ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
