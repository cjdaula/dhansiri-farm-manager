import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { DragonFruitPlantation, DFProductionYear, DFHarvest, DFPlantationVariety, DFVariety, Expense, Income, AreaUnit } from '@/lib/types';
import { AREA_UNIT_LABELS } from '@/lib/area';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import { calcActivePlants, calcPlantationAge, summarizeDFHarvests, calcDFProfitability, getDFPlantationStatusLabel } from '@/lib/dragonCalc';
import { DF_PLANTATION_STATUSES, DEFAULT_BIGHA_SQFT } from '@/lib/constants';
import { Card } from '@/components/ui/Card';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sprout, FileBarChart } from 'lucide-react';

type ReportTab = 'plantation' | 'production' | 'financial' | 'cultivar';

export function DragonFruitReportsPage() {
  const [plantations, setPlantations] = useState<DragonFruitPlantation[]>([]);
  const [productionYears, setProductionYears] = useState<DFProductionYear[]>([]);
  const [harvests, setHarvests] = useState<DFHarvest[]>([]);
  const [plantationVarieties, setPlantationVarieties] = useState<DFPlantationVariety[]>([]);
  const [dfVarieties, setDfVarieties] = useState<DFVariety[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ReportTab>('plantation');

  useEffect(() => {
    (async () => {
      const [pRes, pyRes, hRes, pvRes, dvRes, eRes, iRes] = await Promise.all([
        supabase.from('dragon_fruit_plantations').select('*').order('name'),
        supabase.from('dragon_fruit_production_years').select('*').order('production_year', { ascending: false }),
        supabase.from('dragon_fruit_harvests').select('*').order('harvest_date', { ascending: false }),
        supabase.from('dragon_fruit_plantation_varieties').select('*'),
        supabase.from('dragon_fruit_varieties').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('income').select('*'),
      ]);
      if (pRes.error) setError(pRes.error.message);
      setPlantations((pRes.data ?? []) as DragonFruitPlantation[]);
      setProductionYears((pyRes.data ?? []) as DFProductionYear[]);
      setHarvests((hRes.data ?? []) as DFHarvest[]);
      setPlantationVarieties((pvRes.data ?? []) as DFPlantationVariety[]);
      setDfVarieties((dvRes.data ?? []) as DFVariety[]);
      setExpenses((eRes.data ?? []) as Expense[]);
      setIncome((iRes.data ?? []) as Income[]);
      setLoading(false);
    })();
  }, []);

  const plantationExpenses = useMemo(() => {
    const m = new Map<string, Expense[]>();
    plantations.forEach((p) => {
      m.set(p.id, expenses.filter((e) => e.cultivation_id === p.cultivation_id));
    });
    return m;
  }, [plantations, expenses]);

  const plantationIncome = useMemo(() => {
    const m = new Map<string, Income[]>();
    plantations.forEach((p) => {
      m.set(p.id, income.filter((i) => i.cultivation_id === p.cultivation_id));
    });
    return m;
  }, [plantations, income]);

  if (loading) return <LoadingState label="Loading reports…" />;
  if (error) return <ErrorState message={error} />;
  if (plantations.length === 0) {
    return (
      <div>
        <PageHeader title="Dragon Fruit Reports" subtitle="Plantation, production, financial, and cultivar reports" />
        <Card className="p-0">
          <EmptyState icon={<FileBarChart className="h-7 w-7" />} title="No data to report" description="Create plantations and add records to generate reports." />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dragon Fruit Reports" subtitle="Plantation, production, financial, and cultivar reports" />

      <div className="flex flex-wrap gap-1 mb-6 border-b border-stone-200">
        {([
          { key: 'plantation', label: 'Plantation Report' },
          { key: 'production', label: 'Production Report' },
          { key: 'financial', label: 'Financial Report' },
          { key: 'cultivar', label: 'Cultivar Report' },
        ] as { key: ReportTab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plantation' && (
        <Card className="p-5">
          <h3 className="text-base font-semibold text-stone-800 mb-4">Plantation Report</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                  <th className="pb-2 font-medium">Plantation</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Area</th>
                  <th className="pb-2 font-medium text-right">Poles</th>
                  <th className="pb-2 font-medium text-right">Plants</th>
                  <th className="pb-2 font-medium text-right">Active</th>
                  <th className="pb-2 font-medium">Age</th>
                  <th className="pb-2 font-medium text-right">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {plantations.map((p) => {
                  const age = calcPlantationAge(p.plantation_start_date);
                  const statusInfo = DF_PLANTATION_STATUSES.find((s) => s.value === p.status);
                  const estCost = (plantationExpenses.get(p.id) ?? []).filter((e) => e.expense_type === 'capital').reduce((s, e) => s + Number(e.total_amount ?? 0), 0);
                  return (
                    <tr key={p.id} className="border-b border-stone-50 last:border-0">
                      <td className="py-2.5 font-medium text-stone-700">{p.name}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo?.color ?? 'bg-stone-100 text-stone-600'}`}>
                          {statusInfo?.label ?? getDFPlantationStatusLabel(p.status)}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-stone-600">{formatNumber(p.area)} {AREA_UNIT_LABELS[p.area_unit as AreaUnit] ?? p.area_unit}</td>
                      <td className="py-2.5 text-right text-stone-600">{formatNumber(p.total_poles ?? 0, 0)}</td>
                      <td className="py-2.5 text-right text-stone-600">{formatNumber(p.total_plants ?? 0, 0)}</td>
                      <td className="py-2.5 text-right text-stone-600">{formatNumber(calcActivePlants(p), 0)}</td>
                      <td className="py-2.5 text-stone-500">{age?.label ?? '—'}</td>
                      <td className="py-2.5 text-right text-stone-600">{estCost > 0 ? formatCurrency(estCost) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'production' && (
        <Card className="p-5">
          <h3 className="text-base font-semibold text-stone-800 mb-4">Production Report</h3>
          {productionYears.length === 0 ? (
            <p className="text-sm text-stone-400">No production years defined.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                    <th className="pb-2 font-medium">Plantation</th>
                    <th className="pb-2 font-medium">Year</th>
                    <th className="pb-2 font-medium text-right">Harvests</th>
                    <th className="pb-2 font-medium text-right">Quantity</th>
                    <th className="pb-2 font-medium text-right">Fruits</th>
                    <th className="pb-2 font-medium text-right">Avg wt</th>
                    <th className="pb-2 font-medium text-right">Per bigha</th>
                  </tr>
                </thead>
                <tbody>
                  {productionYears.map((py) => {
                    const p = plantations.find((pl) => pl.id === py.plantation_id);
                    const pyHarvests = harvests.filter((h) => h.production_year_id === py.id);
                    const summary = summarizeDFHarvests(pyHarvests, py.expected_production, p?.area ?? null, (p?.area_unit ?? 'bigha') as AreaUnit, DEFAULT_BIGHA_SQFT);
                    return (
                      <tr key={py.id} className="border-b border-stone-50 last:border-0">
                        <td className="py-2.5 font-medium text-stone-700">{p?.name ?? '—'}</td>
                        <td className="py-2.5 text-stone-600">{py.production_year}</td>
                        <td className="py-2.5 text-right text-stone-600">{summary.harvestCount}</td>
                        <td className="py-2.5 text-right text-stone-600">{formatNumber(summary.totalQuantity)} kg</td>
                        <td className="py-2.5 text-right text-stone-500">{summary.totalFruitCount != null ? formatNumber(summary.totalFruitCount, 0) : '—'}</td>
                        <td className="py-2.5 text-right text-stone-500">{summary.avgFruitWeight != null ? `${formatNumber(summary.avgFruitWeight)} g` : '—'}</td>
                        <td className="py-2.5 text-right text-stone-600">{summary.productionPerBigha != null ? `${formatNumber(summary.productionPerBigha)} kg` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'financial' && (
        <Card className="p-5">
          <h3 className="text-base font-semibold text-stone-800 mb-4">Financial Report</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                  <th className="pb-2 font-medium">Plantation</th>
                  <th className="pb-2 font-medium text-right">Establishment</th>
                  <th className="pb-2 font-medium text-right">Operating</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                  <th className="pb-2 font-medium text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {plantations.map((p) => {
                  const pExpenses = plantationExpenses.get(p.id) ?? [];
                  const pIncome = plantationIncome.get(p.id) ?? [];
                  const totalQty = harvests.filter((h) => h.plantation_id === p.id).reduce((s, h) => s + Number(h.quantity ?? 0), 0);
                  const prof = calcDFProfitability(pExpenses, pIncome, totalQty, p.area, p.area_unit as AreaUnit, DEFAULT_BIGHA_SQFT);
                  return (
                    <tr key={p.id} className="border-b border-stone-50 last:border-0">
                      <td className="py-2.5 font-medium text-stone-700">{p.name}</td>
                      <td className="py-2.5 text-right text-stone-600">{formatCurrency(prof.establishmentCost)}</td>
                      <td className="py-2.5 text-right text-stone-600">{formatCurrency(prof.operatingCost)}</td>
                      <td className="py-2.5 text-right text-stone-600">{formatCurrency(prof.totalRevenue)}</td>
                      <td className={`py-2.5 text-right font-medium ${prof.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(prof.profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'cultivar' && (
        <Card className="p-5">
          <h3 className="text-base font-semibold text-stone-800 mb-4">Cultivar Report</h3>
          {dfVarieties.length === 0 ? (
            <p className="text-sm text-stone-400">No varieties defined.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                    <th className="pb-2 font-medium">Cultivar</th>
                    <th className="pb-2 font-medium text-right">Plantations</th>
                    <th className="pb-2 font-medium text-right">Plants</th>
                    <th className="pb-2 font-medium text-right">Production</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {dfVarieties.map((v) => {
                    const pvLinks = plantationVarieties.filter((pv) => pv.variety_id === v.id);
                    const plantCount = pvLinks.reduce((s, pv) => s + Number(pv.plant_count ?? 0), 0);
                    const linkedPlantationIds = new Set(pvLinks.map((pv) => pv.plantation_id));
                    const linkedHarvests = harvests.filter((h) => linkedPlantationIds.has(h.plantation_id));
                    const production = linkedHarvests.reduce((s, h) => s + Number(h.quantity ?? 0), 0);
                    const linkedIncome = income.filter((i) =>
                      plantations.some((p) => linkedPlantationIds.has(p.id) && p.cultivation_id === i.cultivation_id)
                    );
                    const revenue = linkedIncome.reduce((s, i) => s + Number(i.total_income ?? 0), 0);
                    return (
                      <tr key={v.id} className="border-b border-stone-50 last:border-0">
                        <td className="py-2.5 font-medium text-stone-700">{v.name}</td>
                        <td className="py-2.5 text-right text-stone-600">{pvLinks.length}</td>
                        <td className="py-2.5 text-right text-stone-600">{plantCount > 0 ? formatNumber(plantCount, 0) : '—'}</td>
                        <td className="py-2.5 text-right text-stone-600">{production > 0 ? `${formatNumber(production)} kg` : '—'}</td>
                        <td className="py-2.5 text-right text-stone-600">{revenue > 0 ? formatCurrency(revenue) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-stone-400">Cultivar comparisons are only shown where actual data exists. Figures aggregate across all plantations using each cultivar.</p>
        </Card>
      )}
    </div>
  );
}
