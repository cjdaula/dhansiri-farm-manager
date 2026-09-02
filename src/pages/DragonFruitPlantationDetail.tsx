import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  DragonFruitPlantation, DFProductionYear, DFSection, DFHarvest, DFHealthRecord,
  DFObservation, DFInfrastructure, DFPlantingMaterial, DFVariety, DFPlantationVariety,
  Farm, Plot, PaddySeason, Expense, Income, Activity, AreaUnit,
} from '@/lib/types';
import { AREA_UNIT_LABELS, AREA_UNITS } from '@/lib/area';
import { formatCurrency, formatNumber, formatDate, todayISO, num } from '@/lib/format';
import { calcActivePlants, calcPlantationAge, summarizeDFHarvests, calcDFProfitability, getDFPlantationStatusLabel } from '@/lib/dragonCalc';
import {
  DF_PLANTATION_STATUSES, DF_PRODUCTION_YEAR_STATUSES, DF_SPACING_UNITS,
  DF_PROBLEM_TYPES, DF_SEVERITY_LEVELS, DF_IRRIGATION_METHODS,
  DF_PLANTING_MATERIAL_TYPES, DF_INFRASTRUCTURE_TYPES, DF_FERTILIZER_TYPES,
  DF_POLLINATION_METHODS, DF_OBSERVATION_TYPES, DF_HARVEST_UNITS,
  DF_ESTABLISHMENT_EXPENSE_CATEGORIES, QUALITY_GRADES, DEFAULT_BIGHA_SQFT,
} from '@/lib/constants';
import { Card, StatCard } from '@/components/ui/Card';
import { PageHeader, LoadingState, ErrorState } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, Select, Textarea } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ArrowLeft, Plus, Pencil, Trash2, Sprout, MapPin, Calendar, Package,
  Wheat, TrendingUp, TrendingDown, Activity as ActivityIcon, HeartPulse,
  Droplets, FlaskConical, Scissors, Flower2, Bug, Eye, ClipboardList,
} from 'lucide-react';

type Tab =
  | 'overview' | 'sections' | 'plants' | 'spacing' | 'varieties' | 'infrastructure'
  | 'planting_material' | 'production_years' | 'harvests' | 'health'
  | 'observations' | 'activities' | 'expenses' | 'income' | 'profitability' | 'timeline';

const TABS: { key: Tab; label: string; icon: typeof Sprout }[] = [
  { key: 'overview', label: 'Overview', icon: Sprout },
  { key: 'sections', label: 'Sections', icon: MapPin },
  { key: 'plants', label: 'Plants', icon: Sprout },
  { key: 'spacing', label: 'Spacing', icon: MapPin },
  { key: 'varieties', label: 'Varieties', icon: Sprout },
  { key: 'infrastructure', label: 'Infrastructure', icon: Package },
  { key: 'planting_material', label: 'Planting Material', icon: Sprout },
  { key: 'production_years', label: 'Production Years', icon: Calendar },
  { key: 'harvests', label: 'Harvests', icon: Wheat },
  { key: 'health', label: 'Plant Health', icon: HeartPulse },
  { key: 'observations', label: 'Observations', icon: Eye },
  { key: 'activities', label: 'Activities', icon: ActivityIcon },
  { key: 'expenses', label: 'Expenses', icon: TrendingDown },
  { key: 'income', label: 'Income', icon: TrendingUp },
  { key: 'profitability', label: 'Profitability', icon: TrendingUp },
  { key: 'timeline', label: 'Timeline', icon: ClipboardList },
];

interface Props {
  plantationId: string;
  onBack: () => void;
}

export function DragonFruitPlantationDetail({ plantationId, onBack }: Props) {
  const [plantation, setPlantation] = useState<DragonFruitPlantation | null>(null);
  const [productionYears, setProductionYears] = useState<DFProductionYear[]>([]);
  const [sections, setSections] = useState<DFSection[]>([]);
  const [harvests, setHarvests] = useState<DFHarvest[]>([]);
  const [healthRecords, setHealthRecords] = useState<DFHealthRecord[]>([]);
  const [observations, setObservations] = useState<DFObservation[]>([]);
  const [infra, setInfra] = useState<DFInfrastructure[]>([]);
  const [plantingMaterial, setPlantingMaterial] = useState<DFPlantingMaterial[]>([]);
  const [dfVarieties, setDfVarieties] = useState<DFVariety[]>([]);
  const [plantationVarieties, setPlantationVarieties] = useState<DFPlantationVariety[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [modalState, setModalState] = useState<{ type: string; data: unknown } | null>(null);
  const [deleteState, setDeleteState] = useState<{ table: string; id: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, pyRes, sRes, hRes, hrRes, oRes, iRes, pmRes, pvRes, dfvRes, eRes, incRes, aRes, fRes, plRes] = await Promise.all([
      supabase.from('dragon_fruit_plantations').select('*').eq('id', plantationId).maybeSingle(),
      supabase.from('dragon_fruit_production_years').select('*').eq('plantation_id', plantationId).order('production_year', { ascending: false }),
      supabase.from('dragon_fruit_sections').select('*').eq('plantation_id', plantationId).order('name'),
      supabase.from('dragon_fruit_harvests').select('*').eq('plantation_id', plantationId).order('harvest_date', { ascending: false }),
      supabase.from('dragon_fruit_health_records').select('*').eq('plantation_id', plantationId).order('record_date', { ascending: false }),
      supabase.from('dragon_fruit_observations').select('*').eq('plantation_id', plantationId).order('observation_date', { ascending: false }),
      supabase.from('dragon_fruit_infrastructure').select('*').eq('plantation_id', plantationId).order('created_at', { ascending: false }),
      supabase.from('dragon_fruit_planting_material').select('*').eq('plantation_id', plantationId).order('created_at', { ascending: false }),
      supabase.from('dragon_fruit_plantation_varieties').select('*').eq('plantation_id', plantationId),
      supabase.from('dragon_fruit_varieties').select('*').eq('is_active', true).order('name'),
      supabase.from('expenses').select('*'),
      supabase.from('income').select('*'),
      supabase.from('activities').select('*'),
      supabase.from('farms').select('*'),
      supabase.from('plots').select('*'),
    ]);
    if (pRes.error) setError(pRes.error.message);
    setPlantation(pRes.data as DragonFruitPlantation);
    setProductionYears((pyRes.data ?? []) as DFProductionYear[]);
    setSections((sRes.data ?? []) as DFSection[]);
    setHarvests((hRes.data ?? []) as DFHarvest[]);
    setHealthRecords((hrRes.data ?? []) as DFHealthRecord[]);
    setObservations((oRes.data ?? []) as DFObservation[]);
    setInfra((iRes.data ?? []) as DFInfrastructure[]);
    setPlantingMaterial((pmRes.data ?? []) as DFPlantingMaterial[]);
    setPlantationVarieties((pvRes.data ?? []) as DFPlantationVariety[]);
    setDfVarieties((dfvRes.data ?? []) as DFVariety[]);
    setExpenses((eRes.data ?? []) as Expense[]);
    setIncome((incRes.data ?? []) as Income[]);
    setActivities((aRes.data ?? []) as Activity[]);
    setFarms((fRes.data ?? []) as Farm[]);
    setPlots((plRes.data ?? []) as Plot[]);
    setLoading(false);
  }, [plantationId]);

  useEffect(() => { load(); }, [load]);

  const cultivationId = plantation?.cultivation_id ?? null;
  const dfExpenses = useMemo(() => expenses.filter((e) => e.cultivation_id === cultivationId), [expenses, cultivationId]);
  const dfIncome = useMemo(() => income.filter((i) => i.cultivation_id === cultivationId), [income, cultivationId]);
  const dfActivities = useMemo(() => activities.filter((a) => a.cultivation_id === cultivationId), [activities, cultivationId]);

  const farmName = useMemo(() => farms.find((f) => f.id === plantation?.farm_id)?.name ?? '—', [farms, plantation]);
  const plotName = useMemo(() => plots.find((p) => p.id === plantation?.plot_id)?.name ?? '—', [plots, plantation]);
  const plotArea = useMemo(() => plots.find((p) => p.id === plantation?.plot_id)?.area ?? null, [plots, plantation]);

  const activePlants = plantation ? calcActivePlants(plantation) : 0;
  const age = plantation ? calcPlantationAge(plantation.plantation_start_date) : null;
  const totalHarvestQty = harvests.reduce((s, h) => s + Number(h.quantity ?? 0), 0);

  const profitability = useMemo(() => {
    if (!plantation) return null;
    return calcDFProfitability(dfExpenses, dfIncome, totalHarvestQty, plantation.area, plantation.area_unit as AreaUnit, DEFAULT_BIGHA_SQFT);
  }, [plantation, dfExpenses, dfIncome, totalHarvestQty]);

  const handleDelete = async () => {
    if (!deleteState) return;
    await supabase.from(deleteState.table).delete().eq('id', deleteState.id);
    setDeleteState(null);
    load();
  };

  const saveRecord = async (table: string, payload: Record<string, unknown>, id?: string) => {
    if (id) {
      await supabase.from(table).update(payload).eq('id', id);
    } else {
      await supabase.from(table).insert(payload);
    }
    setModalState(null);
    load();
  };

  if (loading) return <LoadingState label="Loading plantation…" />;
  if (!plantation) return <ErrorState message={error || 'Plantation not found'} />;

  const statusInfo = DF_PLANTATION_STATUSES.find((s) => s.value === plantation.status);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to plantations
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">{plantation.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {farmName} / {plotName} · {formatDate(plantation.plantation_start_date)} · {age?.label ?? '—'}
          </p>
        </div>
        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium shrink-0 ${statusInfo?.color ?? 'bg-stone-100 text-stone-600'}`}>
          {statusInfo?.label ?? getDFPlantationStatusLabel(plantation.status)}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Area" value={`${formatNumber(plantation.area)} ${AREA_UNIT_LABELS[plantation.area_unit as AreaUnit] ?? plantation.area_unit}`} icon={<MapPin className="h-5 w-5" />} />
            <StatCard label="Total poles" value={formatNumber(plantation.total_poles ?? 0, 0)} icon={<Package className="h-5 w-5" />} />
            <StatCard label="Total plants" value={formatNumber(plantation.total_plants ?? 0, 0)} icon={<Sprout className="h-5 w-5" />} />
            <StatCard label="Active plants" value={formatNumber(activePlants, 0)} icon={<Sprout className="h-5 w-5" />} tone="success" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Plantation age" value={age?.label ?? '—'} icon={<Calendar className="h-5 w-5" />} />
            <StatCard label="Production years" value={String(productionYears.length)} icon={<Calendar className="h-5 w-5" />} />
            <StatCard label="Total harvests" value={String(harvests.length)} icon={<Wheat className="h-5 w-5" />} />
            <StatCard label="Total harvest qty" value={`${formatNumber(totalHarvestQty)} kg`} icon={<Package className="h-5 w-5" />} />
          </div>
          {plotArea != null && plantation.area != null && (
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-stone-700 mb-2">Area allocation</h4>
              <div className="space-y-1 text-sm text-stone-500">
                <p>Plot total area: {formatNumber(plotArea)} {AREA_UNIT_LABELS[plantation.area_unit as AreaUnit] ?? plantation.area_unit}</p>
                <p>Dragon Fruit plantation: {formatNumber(plantation.area)} {AREA_UNIT_LABELS[plantation.area_unit as AreaUnit] ?? plantation.area_unit}</p>
                <p>Available: {formatNumber(Math.max(0, Number(plotArea) - Number(plantation.area)))} {AREA_UNIT_LABELS[plantation.area_unit as AreaUnit] ?? plantation.area_unit}</p>
              </div>
            </Card>
          )}
          {plantation.notes && (
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-stone-700 mb-2">Notes</h4>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">{plantation.notes}</p>
            </Card>
          )}
        </div>
      )}

      {tab === 'sections' && (
        <SectionList
          sections={sections}
          onAdd={() => setModalState({ type: 'section', data: null })}
          onEdit={(s) => setModalState({ type: 'section', data: s })}
          onDelete={(s) => setDeleteState({ table: 'dragon_fruit_sections', id: s.id })}
        />
      )}

      {tab === 'plants' && (
        <Card className="p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total plants" value={formatNumber(plantation.total_plants ?? 0, 0)} icon={<Sprout className="h-5 w-5" />} />
            <StatCard label="Missing plants" value={formatNumber(plantation.missing_plants, 0)} icon={<Sprout className="h-5 w-5" />} tone="warning" />
            <StatCard label="Dead plants" value={formatNumber(plantation.dead_plants, 0)} icon={<Sprout className="h-5 w-5" />} tone="error" />
            <StatCard label="Replacement plants" value={formatNumber(plantation.replacement_plants, 0)} icon={<Sprout className="h-5 w-5" />} />
          </div>
          <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-700">
              <span className="font-semibold">Active plants:</span> {formatNumber(activePlants, 0)}
              {' '}
              (Total − Missing − Dead + Replacements)
            </p>
            {plantation.total_plants != null && plantation.total_plants > 0 && (
              <p className="mt-1 text-xs text-emerald-600">
                Survival rate: {formatNumber((activePlants / plantation.total_plants) * 100, 1)}%
              </p>
            )}
          </div>
        </Card>
      )}

      {tab === 'spacing' && (
        <Card className="p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><p className="text-sm text-stone-400">Row-to-row spacing</p><p className="text-lg font-medium text-stone-700">{plantation.row_spacing != null ? `${formatNumber(plantation.row_spacing)} ${plantation.spacing_unit}` : '—'}</p></div>
            <div><p className="text-sm text-stone-400">Pole-to-pole spacing</p><p className="text-lg font-medium text-stone-700">{plantation.pole_spacing != null ? `${formatNumber(plantation.pole_spacing)} ${plantation.spacing_unit}` : '—'}</p></div>
            <div><p className="text-sm text-stone-400">Plants per pole</p><p className="text-lg font-medium text-stone-700">{plantation.plants_per_pole ?? '—'}</p></div>
            <div><p className="text-sm text-stone-400">Border spacing</p><p className="text-lg font-medium text-stone-700">{plantation.border_spacing != null ? `${formatNumber(plantation.border_spacing)} ${plantation.spacing_unit}` : '—'}</p></div>
            <div><p className="text-sm text-stone-400">Alley width</p><p className="text-lg font-medium text-stone-700">{plantation.alley_width != null ? `${formatNumber(plantation.alley_width)} ${plantation.spacing_unit}` : '—'}</p></div>
            <div><p className="text-sm text-stone-400">Spacing unit</p><p className="text-lg font-medium text-stone-700">{plantation.spacing_unit}</p></div>
          </div>
        </Card>
      )}

      {tab === 'varieties' && (
        <VarietyList
          plantationVarieties={plantationVarieties}
          dfVarieties={dfVarieties}
          onAdd={() => setModalState({ type: 'plantation_variety', data: null })}
          onDelete={(pv) => setDeleteState({ table: 'dragon_fruit_plantation_varieties', id: pv.id })}
        />
      )}

      {tab === 'infrastructure' && (
        <InfrastructureList
          infra={infra}
          onAdd={() => setModalState({ type: 'infrastructure', data: null })}
          onEdit={(i) => setModalState({ type: 'infrastructure', data: i })}
          onDelete={(i) => setDeleteState({ table: 'dragon_fruit_infrastructure', id: i.id })}
        />
      )}

      {tab === 'planting_material' && (
        <PlantingMaterialList
          items={plantingMaterial}
          onAdd={() => setModalState({ type: 'planting_material', data: null })}
          onEdit={(pm) => setModalState({ type: 'planting_material', data: pm })}
          onDelete={(pm) => setDeleteState({ table: 'dragon_fruit_planting_material', id: pm.id })}
        />
      )}

      {tab === 'production_years' && (
        <ProductionYearList
          productionYears={productionYears}
          harvests={harvests}
          onAdd={() => setModalState({ type: 'production_year', data: null })}
          onEdit={(py) => setModalState({ type: 'production_year', data: py })}
          onDelete={(py) => setDeleteState({ table: 'dragon_fruit_production_years', id: py.id })}
        />
      )}

      {tab === 'harvests' && (
        <HarvestList
          harvests={harvests}
          productionYears={productionYears}
          sections={sections}
          plantation={plantation}
          onAdd={() => setModalState({ type: 'harvest', data: null })}
          onEdit={(h) => setModalState({ type: 'harvest', data: h })}
          onDelete={(h) => setDeleteState({ table: 'dragon_fruit_harvests', id: h.id })}
        />
      )}

      {tab === 'health' && (
        <HealthList
          records={healthRecords}
          sections={sections}
          onAdd={() => setModalState({ type: 'health', data: null })}
          onEdit={(hr) => setModalState({ type: 'health', data: hr })}
          onDelete={(hr) => setDeleteState({ table: 'dragon_fruit_health_records', id: hr.id })}
        />
      )}

      {tab === 'observations' && (
        <ObservationList
          observations={observations}
          sections={sections}
          onAdd={() => setModalState({ type: 'observation', data: null })}
          onEdit={(o) => setModalState({ type: 'observation', data: o })}
          onDelete={(o) => setDeleteState({ table: 'dragon_fruit_observations', id: o.id })}
        />
      )}

      {tab === 'activities' && (
        <ActivityList
          activities={dfActivities}
          onAdd={() => setModalState({ type: 'activity', data: null })}
          onDelete={(a) => setDeleteState({ table: 'activities', id: a.id })}
        />
      )}

      {tab === 'expenses' && (
        <ExpenseList
          expenses={dfExpenses}
          plantation={plantation}
          onAdd={() => setModalState({ type: 'expense', data: null })}
          onDelete={(e) => setDeleteState({ table: 'expenses', id: e.id })}
        />
      )}

      {tab === 'income' && (
        <IncomeList
          income={dfIncome}
          onAdd={() => setModalState({ type: 'income', data: null })}
          onDelete={(i) => setDeleteState({ table: 'income', id: i.id })}
        />
      )}

      {tab === 'profitability' && profitability && (
        <ProfitabilityView p={profitability} plantation={plantation} harvestQty={totalHarvestQty} />
      )}

      {tab === 'timeline' && (
        <TimelineView activities={dfActivities} harvests={harvests} observations={observations} healthRecords={healthRecords} />
      )}

      {/* Modals */}
      {modalState && (
        <DetailModal
          modalState={modalState}
          plantation={plantation}
          sections={sections}
          productionYears={productionYears}
          dfVarieties={dfVarieties}
          cultivationId={cultivationId}
          onClose={() => setModalState(null)}
          onSave={saveRecord}
        />
      )}

      <ConfirmDialog
        open={!!deleteState}
        title="Delete record"
        message="Are you sure you want to delete this record? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteState(null)}
      />
    </div>
  );
}

// ===== Sub-components =====

function SectionList({ sections, onAdd, onEdit, onDelete }: {
  sections: DFSection[];
  onAdd: () => void;
  onEdit: (s: DFSection) => void;
  onDelete: (s: DFSection) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-stone-800">Sections</h3>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> Add section</Button>
      </div>
      {sections.length === 0 ? (
        <p className="text-sm text-stone-400">No sections defined. Sections help track activities, health, and harvests by area within the plantation.</p>
      ) : (
        <div className="space-y-2">
          {sections.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-stone-50">
              <div>
                <p className="text-sm font-medium text-stone-700">{s.name}</p>
                <p className="text-xs text-stone-400">{formatNumber(s.area)} {AREA_UNIT_LABELS[s.area_unit as AreaUnit] ?? s.area_unit}{s.notes && ` · ${s.notes}`}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(s)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function VarietyList({ plantationVarieties, dfVarieties, onAdd, onDelete }: {
  plantationVarieties: DFPlantationVariety[];
  dfVarieties: DFVariety[];
  onAdd: () => void;
  onDelete: (pv: DFPlantationVariety) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-stone-800">Varieties in this plantation</h3>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> Add variety</Button>
      </div>
      {plantationVarieties.length === 0 ? (
        <p className="text-sm text-stone-400">No varieties assigned to this plantation yet.</p>
      ) : (
        <div className="space-y-2">
          {plantationVarieties.map((pv) => {
            const v = dfVarieties.find((dv) => dv.id === pv.variety_id);
            return (
              <div key={pv.id} className="flex items-center justify-between p-3 rounded-lg bg-stone-50">
                <div>
                  <p className="text-sm font-medium text-stone-700">{v?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-stone-400">
                    {v?.flesh_color && `Flesh: ${v.flesh_color} · `}
                    {v?.skin_color && `Skin: ${v.skin_color} · `}
                    {pv.plant_count != null && `${formatNumber(pv.plant_count, 0)} plants`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onDelete(pv)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function InfrastructureList({ infra, onAdd, onEdit, onDelete }: {
  infra: DFInfrastructure[];
  onAdd: () => void;
  onEdit: (i: DFInfrastructure) => void;
  onDelete: (i: DFInfrastructure) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-stone-800">Infrastructure</h3>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> Add</Button>
      </div>
      {infra.length === 0 ? (
        <p className="text-sm text-stone-400">No infrastructure recorded.</p>
      ) : (
        <div className="space-y-2">
          {infra.map((i) => (
            <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-stone-50">
              <div>
                <p className="text-sm font-medium text-stone-700">{i.infrastructure_type}</p>
                <p className="text-xs text-stone-400">
                  {i.quantity != null && `${formatNumber(i.quantity)} ${i.unit ?? ''} · `}
                  {formatDate(i.installation_date)}
                  {i.cost != null && ` · ${formatCurrency(i.cost)}`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(i)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PlantingMaterialList({ items, onAdd, onEdit, onDelete }: {
  items: DFPlantingMaterial[];
  onAdd: () => void;
  onEdit: (pm: DFPlantingMaterial) => void;
  onDelete: (pm: DFPlantingMaterial) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-stone-800">Planting Material</h3>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> Add</Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-stone-400">No planting material recorded.</p>
      ) : (
        <div className="space-y-2">
          {items.map((pm) => (
            <div key={pm.id} className="flex items-center justify-between p-3 rounded-lg bg-stone-50">
              <div>
                <p className="text-sm font-medium text-stone-700">{pm.material_type}</p>
                <p className="text-xs text-stone-400">
                  {pm.quantity != null && `${formatNumber(pm.quantity, 0)} plants · `}
                  {pm.source && `${pm.source} · `}
                  {formatDate(pm.planting_date)}
                  {pm.total_cost != null && ` · ${formatCurrency(pm.total_cost)}`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(pm)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(pm)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ProductionYearList({ productionYears, harvests, onAdd, onEdit, onDelete }: {
  productionYears: DFProductionYear[];
  harvests: DFHarvest[];
  onAdd: () => void;
  onEdit: (py: DFProductionYear) => void;
  onDelete: (py: DFProductionYear) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-stone-800">Production Years</h3>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> Add year</Button>
      </div>
      {productionYears.length === 0 ? (
        <p className="text-sm text-stone-400">No production years defined. A plantation can produce across multiple years without being recreated.</p>
      ) : (
        <div className="space-y-3">
          {productionYears.map((py) => {
            const pyHarvests = harvests.filter((h) => h.production_year_id === py.id);
            const actualQty = pyHarvests.reduce((s, h) => s + Number(h.quantity ?? 0), 0);
            const remaining = py.expected_production != null ? Math.max(0, py.expected_production - actualQty) : null;
            const statusInfo = DF_PRODUCTION_YEAR_STATUSES.find((s) => s.value === py.status);
            return (
              <div key={py.id} className="p-4 rounded-lg bg-stone-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-stone-700">Year {py.production_year}</p>
                    <p className="text-xs text-stone-400">{formatDate(py.start_date)} – {formatDate(py.end_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo?.color ?? 'bg-stone-100 text-stone-600'}`}>{statusInfo?.label ?? py.status}</span>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(py)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(py)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div><p className="text-xs text-stone-400">Expected</p><p className="font-medium text-stone-600">{py.expected_production != null ? `${formatNumber(py.expected_production)} ${py.expected_unit}` : '—'}</p></div>
                  <div><p className="text-xs text-stone-400">Actual</p><p className="font-medium text-stone-600">{actualQty > 0 ? `${formatNumber(actualQty)} kg` : '—'}</p></div>
                  <div><p className="text-xs text-stone-400">Remaining</p><p className="font-medium text-stone-600">{remaining != null ? `${formatNumber(remaining)} kg` : '—'}</p></div>
                  <div><p className="text-xs text-stone-400">Harvests</p><p className="font-medium text-stone-600">{pyHarvests.length}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function HarvestList({ harvests, productionYears, sections, plantation, onAdd, onEdit, onDelete }: {
  harvests: DFHarvest[];
  productionYears: DFProductionYear[];
  sections: DFSection[];
  plantation: DragonFruitPlantation;
  onAdd: () => void;
  onEdit: (h: DFHarvest) => void;
  onDelete: (h: DFHarvest) => void;
}) {
  const harvestSummary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentPY = productionYears.find((py) => py.production_year === currentYear);
    const pyHarvests = currentPY ? harvests.filter((h) => h.production_year_id === currentPY.id) : harvests;
    return summarizeDFHarvests(pyHarvests, currentPY?.expected_production ?? null, plantation.area, plantation.area_unit as AreaUnit, DEFAULT_BIGHA_SQFT);
  }, [harvests, productionYears, plantation]);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total harvests" value={String(harvests.length)} icon={<Wheat className="h-5 w-5" />} />
        <StatCard label="Total quantity" value={`${formatNumber(harvestSummary.totalQuantity)} kg`} icon={<Package className="h-5 w-5" />} />
        <StatCard label="Avg per harvest" value={harvestSummary.avgPerHarvest != null ? `${formatNumber(harvestSummary.avgPerHarvest)} kg` : '—'} icon={<Wheat className="h-5 w-5" />} />
        <StatCard label="Total fruits" value={harvestSummary.totalFruitCount != null ? formatNumber(harvestSummary.totalFruitCount, 0) : '—'} icon={<Wheat className="h-5 w-5" />} />
      </div>
      {harvestSummary.productionPerBigha != null && (
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Production per bigha" value={`${formatNumber(harvestSummary.productionPerBigha)} kg`} icon={<MapPin className="h-5 w-5" />} tone="success" />
          <StatCard label="Production per acre" value={harvestSummary.productionPerAcre != null ? `${formatNumber(harvestSummary.productionPerAcre)} kg` : '—'} icon={<MapPin className="h-5 w-5" />} />
          <StatCard label="Production per hectare" value={harvestSummary.productionPerHectare != null ? `${formatNumber(harvestSummary.productionPerHectare)} kg` : '—'} icon={<MapPin className="h-5 w-5" />} />
        </div>
      )}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-stone-800">Harvest Records</h3>
          <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> Add harvest</Button>
        </div>
        {harvests.length === 0 ? (
          <p className="text-sm text-stone-400">No harvests recorded. Dragon Fruit supports multiple harvests per production year.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Year</th>
                  <th className="pb-2 font-medium">Section</th>
                  <th className="pb-2 font-medium text-right">Quantity</th>
                  <th className="pb-2 font-medium text-right">Fruits</th>
                  <th className="pb-2 font-medium text-right">Avg wt</th>
                  <th className="pb-2 font-medium">Grade</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {harvests.map((h) => {
                  const py = productionYears.find((p) => p.id === h.production_year_id);
                  const sec = sections.find((s) => s.id === h.section_id);
                  return (
                    <tr key={h.id} className="border-b border-stone-50 last:border-0">
                      <td className="py-2.5 text-stone-600">{formatDate(h.harvest_date)}</td>
                      <td className="py-2.5 text-stone-600">{py?.production_year ?? '—'}</td>
                      <td className="py-2.5 text-stone-500">{sec?.name ?? '—'}</td>
                      <td className="py-2.5 text-right text-stone-600 font-medium">{formatNumber(h.quantity)} {h.unit}</td>
                      <td className="py-2.5 text-right text-stone-500">{h.fruit_count ?? '—'}</td>
                      <td className="py-2.5 text-right text-stone-500">{h.avg_fruit_weight != null ? `${formatNumber(h.avg_fruit_weight)} g` : '—'}</td>
                      <td className="py-2.5 text-stone-500">{h.quality_grade ?? '—'}</td>
                      <td className="py-2.5">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(h)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => onDelete(h)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function HealthList({ records, sections, onAdd, onEdit, onDelete }: {
  records: DFHealthRecord[];
  sections: DFSection[];
  onAdd: () => void;
  onEdit: (hr: DFHealthRecord) => void;
  onDelete: (hr: DFHealthRecord) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-stone-800">Plant Health Records</h3>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> Add record</Button>
      </div>
      {records.length === 0 ? (
        <p className="text-sm text-stone-400">No health records. Track pests, diseases, nutrient issues, and treatments here.</p>
      ) : (
        <div className="space-y-3">
          {records.map((hr) => {
            const sec = sections.find((s) => s.id === hr.section_id);
            return (
              <div key={hr.id} className="p-4 rounded-lg bg-stone-50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-700">{formatDate(hr.record_date)} · {hr.problem_type ?? 'Other'}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {sec?.name && `Section: ${sec.name} · `}
                      {hr.severity && `Severity: ${hr.severity}`}
                    </p>
                    {hr.observation && <p className="text-sm text-stone-600 mt-1">{hr.observation}</p>}
                    {hr.action_taken && <p className="text-xs text-stone-500 mt-1">Action: {hr.action_taken}{hr.product_used && ` · ${hr.product_used}`}{hr.cost != null && ` · ${formatCurrency(hr.cost)}`}</p>}
                    {hr.follow_up_date && <p className="text-xs text-amber-600 mt-1">Follow-up: {formatDate(hr.follow_up_date)}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(hr)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(hr)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ObservationList({ observations, sections, onAdd, onEdit, onDelete }: {
  observations: DFObservation[];
  sections: DFSection[];
  onAdd: () => void;
  onEdit: (o: DFObservation) => void;
  onDelete: (o: DFObservation) => void;
}) {
  const obsTypeLabel = (t: string) => DF_OBSERVATION_TYPES.find((o) => o.value === t)?.label ?? t;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-stone-800">Observations</h3>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> Add observation</Button>
      </div>
      {observations.length === 0 ? (
        <p className="text-sm text-stone-400">No observations recorded. Track flowering, pollination, and fruit development here.</p>
      ) : (
        <div className="space-y-3">
          {observations.map((o) => {
            const sec = sections.find((s) => s.id === o.section_id);
            return (
              <div key={o.id} className="p-4 rounded-lg bg-stone-50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-700">{obsTypeLabel(o.observation_type)} · {formatDate(o.observation_date)}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {sec?.name && `Section: ${sec.name} · `}
                      {o.flower_count != null && `${formatNumber(o.flower_count, 0)} flowers · `}
                      {o.fruit_count != null && `${formatNumber(o.fruit_count, 0)} fruits`}
                      {o.pollination_method && ` · ${o.pollination_method}`}
                    </p>
                    {o.notes && <p className="text-sm text-stone-600 mt-1">{o.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(o)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(o)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ActivityList({ activities, onAdd, onDelete }: {
  activities: Activity[];
  onAdd: () => void;
  onDelete: (a: Activity) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-stone-800">Activities</h3>
        <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> Add activity</Button>
      </div>
      {activities.length === 0 ? (
        <p className="text-sm text-stone-400">No activities recorded. Track irrigation, fertilization, pruning, training, and other tasks here.</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-stone-50">
              <div>
                <p className="text-sm font-medium text-stone-700">{a.name}</p>
                <p className="text-xs text-stone-400">
                  {a.activity_type ?? 'Other'} · {formatDate(a.actual_date ?? a.planned_date ?? a.date)} · {a.status}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onDelete(a)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ExpenseList({ expenses, plantation, onAdd, onDelete }: {
  expenses: Expense[];
  plantation: DragonFruitPlantation;
  onAdd: () => void;
  onDelete: (e: Expense) => void;
}) {
  const totalCost = expenses.reduce((s, e) => s + Number(e.total_amount ?? 0), 0);
  const establishment = expenses.filter((e) => e.expense_type === 'capital').reduce((s, e) => s + Number(e.total_amount ?? 0), 0);
  const operating = expenses.filter((e) => e.expense_type === 'operating').reduce((s, e) => s + Number(e.total_amount ?? 0), 0);
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total expenses" value={formatCurrency(totalCost)} icon={<TrendingDown className="h-5 w-5" />} tone="error" />
        <StatCard label="Establishment (capital)" value={formatCurrency(establishment)} icon={<Package className="h-5 w-5" />} tone="warning" />
        <StatCard label="Operating" value={formatCurrency(operating)} icon={<TrendingDown className="h-5 w-5" />} />
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-stone-800">Expense Records</h3>
          <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> Add expense</Button>
        </div>
        {expenses.length === 0 ? (
          <p className="text-sm text-stone-400">No expenses recorded. All expenses are linked through the central Financial Engine.</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-stone-50">
                <div>
                  <p className="text-sm font-medium text-stone-700">{e.category}{e.subcategory && ` · ${e.subcategory}`}</p>
                  <p className="text-xs text-stone-400">{formatDate(e.date)} · {e.expense_type} · {e.description ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stone-700">{formatCurrency(e.total_amount)}</p>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(e)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function IncomeList({ income, onAdd, onDelete }: {
  income: Income[];
  onAdd: () => void;
  onDelete: (i: Income) => void;
}) {
  const totalRevenue = income.reduce((s, i) => s + Number(i.total_income ?? 0), 0);
  return (
    <div className="space-y-6">
      <StatCard label="Total revenue" value={formatCurrency(totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-stone-800">Income / Sales Records</h3>
          <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4" /> Add sale</Button>
        </div>
        {income.length === 0 ? (
          <p className="text-sm text-stone-400">No sales recorded. All income is linked through the central Financial Engine.</p>
        ) : (
          <div className="space-y-2">
            {income.map((i) => (
              <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-stone-50">
                <div>
                  <p className="text-sm font-medium text-stone-700">{i.product}</p>
                  <p className="text-xs text-stone-400">{formatDate(i.date)} · {i.quantity ?? '—'} {i.unit ?? ''} · {i.buyer ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-stone-700">{formatCurrency(i.total_income)}</p>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(i)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ProfitabilityView({ p, plantation, harvestQty }: {
  p: ReturnType<typeof calcDFProfitability>;
  plantation: DragonFruitPlantation;
  harvestQty: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Establishment cost" value={formatCurrency(p.establishmentCost)} icon={<Package className="h-5 w-5" />} tone="warning" />
        <StatCard label="Operating cost" value={formatCurrency(p.operatingCost)} icon={<TrendingDown className="h-5 w-5" />} tone="error" />
        <StatCard label="Revenue" value={formatCurrency(p.totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
      </div>
      <Card className="p-5">
        <h3 className="text-base font-semibold text-stone-800 mb-4">Profitability Summary</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-stone-400">Total cost</p><p className="text-lg font-semibold text-stone-700">{formatCurrency(p.totalCost)}</p></div>
          <div><p className="text-xs text-stone-400">Total revenue</p><p className="text-lg font-semibold text-stone-700">{formatCurrency(p.totalRevenue)}</p></div>
          <div><p className="text-xs text-stone-400">Profit</p><p className={`text-lg font-semibold ${p.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(p.profit)}</p></div>
          <div><p className="text-xs text-stone-400">Total harvest</p><p className="text-lg font-semibold text-stone-700">{formatNumber(harvestQty)} kg</p></div>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                <th className="pb-2 font-medium">Metric</th>
                <th className="pb-2 font-medium text-right">Per bigha</th>
                <th className="pb-2 font-medium text-right">Per acre</th>
                <th className="pb-2 font-medium text-right">Per hectare</th>
                <th className="pb-2 font-medium text-right">Per kg</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-stone-50">
                <td className="py-2.5 font-medium text-stone-600">Cost</td>
                <td className="py-2.5 text-right text-stone-600">{p.costPerBigha != null ? formatCurrency(p.costPerBigha) : '—'}</td>
                <td className="py-2.5 text-right text-stone-600">{p.costPerAcre != null ? formatCurrency(p.costPerAcre) : '—'}</td>
                <td className="py-2.5 text-right text-stone-600">{p.costPerHectare != null ? formatCurrency(p.costPerHectare) : '—'}</td>
                <td className="py-2.5 text-right text-stone-600">{p.costPerKg != null ? formatCurrency(p.costPerKg) : '—'}</td>
              </tr>
              <tr className="border-b border-stone-50">
                <td className="py-2.5 font-medium text-stone-600">Revenue</td>
                <td className="py-2.5 text-right text-stone-600">{p.revenuePerBigha != null ? formatCurrency(p.revenuePerBigha) : '—'}</td>
                <td className="py-2.5 text-right text-stone-600">{p.revenuePerAcre != null ? formatCurrency(p.revenuePerAcre) : '—'}</td>
                <td className="py-2.5 text-right text-stone-600">{p.revenuePerHectare != null ? formatCurrency(p.revenuePerHectare) : '—'}</td>
                <td className="py-2.5 text-right text-stone-600">{p.revenuePerKg != null ? formatCurrency(p.revenuePerKg) : '—'}</td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-stone-600">Profit</td>
                <td className={`py-2.5 text-right font-medium ${p.profitPerBigha != null && p.profitPerBigha >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{p.profitPerBigha != null ? formatCurrency(p.profitPerBigha) : '—'}</td>
                <td className={`py-2.5 text-right font-medium ${p.profitPerAcre != null && p.profitPerAcre >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{p.profitPerAcre != null ? formatCurrency(p.profitPerAcre) : '—'}</td>
                <td className={`py-2.5 text-right font-medium ${p.profitPerHectare != null && p.profitPerHectare >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{p.profitPerHectare != null ? formatCurrency(p.profitPerHectare) : '—'}</td>
                <td className={`py-2.5 text-right font-medium ${p.profitPerKg != null && p.profitPerKg >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{p.profitPerKg != null ? formatCurrency(p.profitPerKg) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-stone-400">
          Establishment/infrastructure costs are shown separately and are not automatically spread across production years.
        </p>
      </Card>
    </div>
  );
}

function TimelineView({ activities, harvests, observations, healthRecords }: {
  activities: Activity[];
  harvests: DFHarvest[];
  observations: DFObservation[];
  healthRecords: DFHealthRecord[];
}) {
  type TLEntry = { date: string; type: string; label: string; icon: typeof Sprout };
  const entries: TLEntry[] = [
    ...activities.map((a) => ({ date: a.actual_date ?? a.planned_date ?? a.date, type: a.activity_type ?? 'Activity', label: a.name, icon: ActivityIcon })),
    ...harvests.map((h) => ({ date: h.harvest_date ?? '', type: 'Harvest', label: `${formatNumber(h.quantity)} ${h.unit}`, icon: Wheat })),
    ...observations.map((o) => ({ date: o.observation_date, type: o.observation_type, label: o.observation_type, icon: Eye })),
    ...healthRecords.map((hr) => ({ date: hr.record_date, type: hr.problem_type ?? 'Health', label: hr.observation ?? 'Health record', icon: HeartPulse })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card className="p-5">
      <h3 className="text-base font-semibold text-stone-800 mb-4">Plantation Timeline</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-stone-400">No timeline events yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((e, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                <e.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-700">{e.label}</p>
                <p className="text-xs text-stone-400">{formatDate(e.date)} · {e.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ===== Modal dispatcher =====

function DetailModal({ modalState, plantation, sections, productionYears, dfVarieties, cultivationId, onClose, onSave }: {
  modalState: { type: string; data: unknown };
  plantation: DragonFruitPlantation;
  sections: DFSection[];
  productionYears: DFProductionYear[];
  dfVarieties: DFVariety[];
  cultivationId: string | null;
  onClose: () => void;
  onSave: (table: string, payload: Record<string, unknown>, id?: string) => void;
}) {
  const { type, data } = modalState;
  const pid = plantation.id;

  if (type === 'section') {
    const s = data as DFSection | null;
    return <SimpleRecordModal title={s ? 'Edit section' : 'Add section'} onClose={onClose} onSave={(payload) => onSave('dragon_fruit_sections', { plantation_id: pid, ...payload }, s?.id)} initial={s ? { name: s.name, area: s.area != null ? String(s.area) : '', area_unit: s.area_unit, notes: s.notes ?? '' } : { name: '', area: '', area_unit: 'bigha', notes: '' }} fields={[
      { key: 'name', label: 'Section name', type: 'text', required: true },
      { key: 'area', label: 'Area', type: 'number' },
      { key: 'area_unit', label: 'Area unit', type: 'select', options: AREA_UNITS.map((u) => ({ value: u.value, label: u.label })) },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]} />;
  }

  if (type === 'plantation_variety') {
    return <SimpleRecordModal title="Add variety to plantation" onClose={onClose} onSave={(payload) => onSave('dragon_fruit_plantation_varieties', { plantation_id: pid, ...payload })} initial={{ variety_id: '', plant_count: '', notes: '' }} fields={[
      { key: 'variety_id', label: 'Variety', type: 'select', required: true, options: dfVarieties.map((v) => ({ value: v.id, label: v.name })) },
      { key: 'plant_count', label: 'Plant count', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]} />;
  }

  if (type === 'infrastructure') {
    const i = data as DFInfrastructure | null;
    return <SimpleRecordModal title={i ? 'Edit infrastructure' : 'Add infrastructure'} onClose={onClose} onSave={(payload) => onSave('dragon_fruit_infrastructure', { plantation_id: pid, ...payload }, i?.id)} initial={i ? { infrastructure_type: i.infrastructure_type, quantity: i.quantity != null ? String(i.quantity) : '', unit: i.unit ?? '', installation_date: i.installation_date ?? '', cost: i.cost != null ? String(i.cost) : '', notes: i.notes ?? '' } : { infrastructure_type: '', quantity: '', unit: '', installation_date: '', cost: '', notes: '' }} fields={[
      { key: 'infrastructure_type', label: 'Type', type: 'select', required: true, options: DF_INFRASTRUCTURE_TYPES.map((t) => ({ value: t, label: t })) },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'unit', label: 'Unit', type: 'text' },
      { key: 'installation_date', label: 'Installation date', type: 'date' },
      { key: 'cost', label: 'Cost', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]} />;
  }

  if (type === 'planting_material') {
    const pm = data as DFPlantingMaterial | null;
    return <SimpleRecordModal title={pm ? 'Edit planting material' : 'Add planting material'} onClose={onClose} onSave={(payload) => onSave('dragon_fruit_planting_material', { plantation_id: pid, ...payload }, pm?.id)} initial={pm ? { material_type: pm.material_type, quantity: pm.quantity != null ? String(pm.quantity) : '', source: pm.source ?? '', cost_per_plant: pm.cost_per_plant != null ? String(pm.cost_per_plant) : '', total_cost: pm.total_cost != null ? String(pm.total_cost) : '', planting_date: pm.planting_date ?? '', notes: pm.notes ?? '' } : { material_type: '', quantity: '', source: '', cost_per_plant: '', total_cost: '', planting_date: '', notes: '' }} fields={[
      { key: 'material_type', label: 'Material type', type: 'select', required: true, options: DF_PLANTING_MATERIAL_TYPES.map((t) => ({ value: t, label: t })) },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'source', label: 'Source', type: 'text' },
      { key: 'cost_per_plant', label: 'Cost per plant', type: 'number' },
      { key: 'total_cost', label: 'Total cost', type: 'number' },
      { key: 'planting_date', label: 'Planting date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]} />;
  }

  if (type === 'production_year') {
    const py = data as DFProductionYear | null;
    return <SimpleRecordModal title={py ? 'Edit production year' : 'Add production year'} onClose={onClose} onSave={(payload) => onSave('dragon_fruit_production_years', { plantation_id: pid, ...payload }, py?.id)} initial={py ? { production_year: String(py.production_year), start_date: py.start_date ?? '', end_date: py.end_date ?? '', status: py.status, expected_production: py.expected_production != null ? String(py.expected_production) : '', expected_unit: py.expected_unit, notes: py.notes ?? '' } : { production_year: String(new Date().getFullYear()), start_date: '', end_date: '', status: 'planned', expected_production: '', expected_unit: 'kg', notes: '' }} fields={[
      { key: 'production_year', label: 'Production year', type: 'number', required: true },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: DF_PRODUCTION_YEAR_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
      { key: 'expected_production', label: 'Expected production', type: 'number' },
      { key: 'expected_unit', label: 'Expected unit', type: 'select', options: [{ value: 'kg', label: 'kg' }, { value: 'quintal', label: 'Quintal' }, { value: 'tonne', label: 'Tonne' }] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]} />;
  }

  if (type === 'harvest') {
    const h = data as DFHarvest | null;
    return <SimpleRecordModal title={h ? 'Edit harvest' : 'Add harvest'} onClose={onClose} onSave={(payload) => onSave('dragon_fruit_harvests', { plantation_id: pid, cultivation_id: cultivationId, ...payload }, h?.id)} initial={h ? { harvest_date: h.harvest_date ?? '', production_year_id: h.production_year_id ?? '', section_id: h.section_id ?? '', quantity: String(h.quantity), unit: h.unit, fruit_count: h.fruit_count != null ? String(h.fruit_count) : '', avg_fruit_weight: h.avg_fruit_weight != null ? String(h.avg_fruit_weight) : '', avg_fruit_size: h.avg_fruit_size != null ? String(h.avg_fruit_size) : '', quality_grade: h.quality_grade ?? '', quality_notes: h.quality_notes ?? '', notes: h.notes ?? '' } : { harvest_date: todayISO(), production_year_id: '', section_id: '', quantity: '', unit: 'kg', fruit_count: '', avg_fruit_weight: '', avg_fruit_size: '', quality_grade: '', quality_notes: '', notes: '' }} fields={[
      { key: 'harvest_date', label: 'Harvest date', type: 'date', required: true },
      { key: 'production_year_id', label: 'Production year', type: 'select', options: productionYears.map((py) => ({ value: py.id, label: String(py.production_year) })) },
      { key: 'section_id', label: 'Section', type: 'select', options: sections.map((s) => ({ value: s.id, label: s.name })) },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'unit', label: 'Unit', type: 'select', options: DF_HARVEST_UNITS.map((u) => ({ value: u, label: u })) },
      { key: 'fruit_count', label: 'Fruit count', type: 'number' },
      { key: 'avg_fruit_weight', label: 'Avg fruit weight (g)', type: 'number' },
      { key: 'avg_fruit_size', label: 'Avg fruit size', type: 'number' },
      { key: 'quality_grade', label: 'Grade', type: 'select', options: QUALITY_GRADES.map((g) => ({ value: g, label: g })) },
      { key: 'quality_notes', label: 'Quality notes', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]} />;
  }

  if (type === 'health') {
    const hr = data as DFHealthRecord | null;
    return <SimpleRecordModal title={hr ? 'Edit health record' : 'Add health record'} onClose={onClose} onSave={(payload) => onSave('dragon_fruit_health_records', { plantation_id: pid, ...payload }, hr?.id)} initial={hr ? { record_date: hr.record_date, section_id: hr.section_id ?? '', observation: hr.observation ?? '', problem_type: hr.problem_type ?? '', severity: hr.severity ?? '', action_taken: hr.action_taken ?? '', product_used: hr.product_used ?? '', quantity: hr.quantity != null ? String(hr.quantity) : '', cost: hr.cost != null ? String(hr.cost) : '', follow_up_date: hr.follow_up_date ?? '', notes: hr.notes ?? '' } : { record_date: todayISO(), section_id: '', observation: '', problem_type: '', severity: '', action_taken: '', product_used: '', quantity: '', cost: '', follow_up_date: '', notes: '' }} fields={[
      { key: 'record_date', label: 'Date', type: 'date', required: true },
      { key: 'section_id', label: 'Section', type: 'select', options: sections.map((s) => ({ value: s.id, label: s.name })) },
      { key: 'observation', label: 'Observation', type: 'textarea' },
      { key: 'problem_type', label: 'Problem type', type: 'select', options: DF_PROBLEM_TYPES.map((t) => ({ value: t, label: t })) },
      { key: 'severity', label: 'Severity', type: 'select', options: DF_SEVERITY_LEVELS.map((s) => ({ value: s.value, label: s.label })) },
      { key: 'action_taken', label: 'Action taken', type: 'text' },
      { key: 'product_used', label: 'Product / treatment', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'cost', label: 'Cost', type: 'number' },
      { key: 'follow_up_date', label: 'Follow-up date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]} />;
  }

  if (type === 'observation') {
    const o = data as DFObservation | null;
    return <SimpleRecordModal title={o ? 'Edit observation' : 'Add observation'} onClose={onClose} onSave={(payload) => onSave('dragon_fruit_observations', { plantation_id: pid, ...payload }, o?.id)} initial={o ? { observation_date: o.observation_date, observation_type: o.observation_type, section_id: o.section_id ?? '', flower_count: o.flower_count != null ? String(o.flower_count) : '', flower_cluster_count: o.flower_cluster_count != null ? String(o.flower_cluster_count) : '', pollination_method: o.pollination_method ?? '', pollination_type: o.pollination_type ?? '', fruit_count: o.fruit_count != null ? String(o.fruit_count) : '', avg_fruit_size: o.avg_fruit_size != null ? String(o.avg_fruit_size) : '', avg_fruit_weight: o.avg_fruit_weight != null ? String(o.avg_fruit_weight) : '', notes: o.notes ?? '' } : { observation_date: todayISO(), observation_type: 'flowering', section_id: '', flower_count: '', flower_cluster_count: '', pollination_method: '', pollination_type: '', fruit_count: '', avg_fruit_size: '', avg_fruit_weight: '', notes: '' }} fields={[
      { key: 'observation_date', label: 'Date', type: 'date', required: true },
      { key: 'observation_type', label: 'Type', type: 'select', required: true, options: DF_OBSERVATION_TYPES.map((t) => ({ value: t.value, label: t.label })) },
      { key: 'section_id', label: 'Section', type: 'select', options: sections.map((s) => ({ value: s.id, label: s.name })) },
      { key: 'flower_count', label: 'Flower count', type: 'number' },
      { key: 'flower_cluster_count', label: 'Flower cluster count', type: 'number' },
      { key: 'pollination_method', label: 'Pollination method', type: 'select', options: DF_POLLINATION_METHODS.map((m) => ({ value: m, label: m })) },
      { key: 'pollination_type', label: 'Pollination type', type: 'text' },
      { key: 'fruit_count', label: 'Fruit count', type: 'number' },
      { key: 'avg_fruit_size', label: 'Avg fruit size', type: 'number' },
      { key: 'avg_fruit_weight', label: 'Avg fruit weight (g)', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]} />;
  }

  if (type === 'activity') {
    return <SimpleRecordModal title="Add activity" onClose={onClose} onSave={(payload) => onSave('activities', { cultivation_id: cultivationId, ...payload })} initial={{ name: '', activity_type: '', date: todayISO(), planned_date: '', actual_date: '', status: 'planned', notes: '' }} fields={[
      { key: 'name', label: 'Activity name', type: 'text', required: true },
      { key: 'activity_type', label: 'Type', type: 'select', options: [
        ...DF_ESTABLISHMENT_EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
        { value: 'Irrigation', label: 'Irrigation' },
        { value: 'Pruning', label: 'Pruning' },
        { value: 'Training', label: 'Training' },
        { value: 'Flowering', label: 'Flowering' },
        { value: 'Harvest', label: 'Harvest' },
        { value: 'Other', label: 'Other' },
      ]},
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'planned_date', label: 'Planned date', type: 'date' },
      { key: 'actual_date', label: 'Actual date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: [{ value: 'planned', label: 'Planned' }, { value: 'done', label: 'Done' }, { value: 'cancelled', label: 'Cancelled' }] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]} />;
  }

  if (type === 'expense') {
    return <SimpleRecordModal title="Add expense" onClose={onClose} onSave={(payload) => onSave('expenses', { cultivation_id: cultivationId, farm_id: plantation.farm_id, plot_id: plantation.plot_id, ...payload })} initial={{ date: todayISO(), category: '', subcategory: '', description: '', total_amount: '', expense_type: 'operating', payment_status: 'paid', notes: '' }} fields={[
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'category', label: 'Category', type: 'select', required: true, options: DF_ESTABLISHMENT_EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })) },
      { key: 'subcategory', label: 'Subcategory', type: 'text' },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'total_amount', label: 'Total amount', type: 'number', required: true },
      { key: 'expense_type', label: 'Expense type', type: 'select', options: [{ value: 'operating', label: 'Operating' }, { value: 'capital', label: 'Capital (establishment)' }] },
      { key: 'payment_status', label: 'Payment status', type: 'select', options: [{ value: 'paid', label: 'Paid' }, { value: 'partially_paid', label: 'Partially paid' }, { value: 'unpaid', label: 'Unpaid' }] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]} />;
  }

  if (type === 'income') {
    return <SimpleRecordModal title="Add sale / income" onClose={onClose} onSave={(payload) => onSave('income', { cultivation_id: cultivationId, farm_id: plantation.farm_id, plot_id: plantation.plot_id, income_type: 'sale', ...payload })} initial={{ date: todayISO(), product: 'Dragon Fruit', quantity: '', unit: 'kg', price_per_unit: '', total_income: '', buyer: '', payment_status: 'fully_received', notes: '' }} fields={[
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'product', label: 'Product', type: 'text', required: true },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'unit', label: 'Unit', type: 'select', options: DF_HARVEST_UNITS.map((u) => ({ value: u, label: u })) },
      { key: 'price_per_unit', label: 'Price per unit', type: 'number' },
      { key: 'total_income', label: 'Total income', type: 'number', required: true },
      { key: 'buyer', label: 'Buyer', type: 'text' },
      { key: 'payment_status', label: 'Payment status', type: 'select', options: [{ value: 'pending', label: 'Pending' }, { value: 'partially_received', label: 'Partially received' }, { value: 'fully_received', label: 'Fully received' }] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ]} />;
  }

  return null;
}

// ===== Generic modal for simple record forms =====

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  options?: { value: string; label: string }[];
}

function SimpleRecordModal({ title, fields, initial, onClose, onSave }: {
  title: string;
  fields: FieldDef[];
  initial: Record<string, string>;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = () => {
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        setErr(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = values[f.key];
      if (f.type === 'number') {
        payload[f.key] = v === '' ? null : Number(v);
      } else {
        payload[f.key] = v?.trim() || null;
      }
    }
    onSave(payload);
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={title} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} required={f.required} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
            {f.type === 'textarea' ? (
              <Textarea rows={2} value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            ) : f.type === 'select' ? (
              <Select value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}>
                <option value="">— Select —</option>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            ) : (
              <TextInput type={f.type} value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            )}
          </Field>
        ))}
      </div>
      {err && <p className="mt-4 text-sm text-rose-500">{err}</p>}
    </Modal>
  );
}
