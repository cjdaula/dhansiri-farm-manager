import { useState, lazy, Suspense } from 'react';
import { AppShell, type PageKey } from '@/components/AppShell';

const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const FarmsPage = lazy(() => import('@/pages/FarmsPage').then(m => ({ default: m.FarmsPage })));
const PaddyPage = lazy(() => import('@/pages/PaddyPage').then(m => ({ default: m.PaddyPage })));
const PaddyRecordDetail = lazy(() => import('@/pages/PaddyRecordDetail').then(m => ({ default: m.PaddyRecordDetail })));
const PaddyVarietiesPage = lazy(() => import('@/pages/PaddyVarietiesPage').then(m => ({ default: m.PaddyVarietiesPage })));
const PaddySeasonsPage = lazy(() => import('@/pages/PaddySeasonsPage').then(m => ({ default: m.PaddySeasonsPage })));
const CropTypesPage = lazy(() => import('@/pages/CropTypesPage').then(m => ({ default: m.CropTypesPage })));
const CropVarietiesPage = lazy(() => import('@/pages/CropVarietiesPage').then(m => ({ default: m.CropVarietiesPage })));
const CropsPage = lazy(() => import('@/pages/CropsPage').then(m => ({ default: m.CropsPage })));
const CropPlanningPage = lazy(() => import('@/pages/CropPlanningPage').then(m => ({ default: m.CropPlanningPage })));
const CropRecordDetail = lazy(() => import('@/pages/CropRecordDetail').then(m => ({ default: m.CropRecordDetail })));
const CropCalendarPage = lazy(() => import('@/pages/CropCalendarPage').then(m => ({ default: m.CropCalendarPage })));
const CropDashboardPage = lazy(() => import('@/pages/CropDashboardPage').then(m => ({ default: m.CropDashboardPage })));
const CropComparisonPage = lazy(() => import('@/pages/CropComparisonPage').then(m => ({ default: m.CropComparisonPage })));
const DragonFruitDashboardPage = lazy(() => import('@/pages/DragonFruitDashboardPage').then(m => ({ default: m.DragonFruitDashboardPage })));
const DragonFruitPlantationsPage = lazy(() => import('@/pages/DragonFruitPlantationsPage').then(m => ({ default: m.DragonFruitPlantationsPage })));
const DragonFruitPlantationDetail = lazy(() => import('@/pages/DragonFruitPlantationDetail').then(m => ({ default: m.DragonFruitPlantationDetail })));
const DragonFruitVarietiesPage = lazy(() => import('@/pages/DragonFruitVarietiesPage').then(m => ({ default: m.DragonFruitVarietiesPage })));
const DragonFruitReportsPage = lazy(() => import('@/pages/DragonFruitReportsPage').then(m => ({ default: m.DragonFruitReportsPage })));
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const IncomePage = lazy(() => import('@/pages/IncomePage').then(m => ({ default: m.IncomePage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const FinancialsPage = lazy(() => import('@/pages/FinancialsPage').then(m => ({ default: m.FinancialsPage })));
const ActivitiesPage = lazy(() => import('@/pages/ActivitiesPage').then(m => ({ default: m.ActivitiesPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

function App() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [activeCropRecordId, setActiveCropRecordId] = useState<string | null>(null);
  const [activePlantationId, setActivePlantationId] = useState<string | null>(null);

  const openRecord = (id: string) => setActiveRecordId(id);
  const backToPaddy = () => setActiveRecordId(null);
  const openCropRecord = (id: string) => setActiveCropRecordId(id);
  const backToCrops = () => setActiveCropRecordId(null);
  const openPlantation = (id: string) => setActivePlantationId(id);
  const backToPlantations = () => setActivePlantationId(null);

  const navigate = (p: PageKey) => {
    setPage(p);
    setActiveRecordId(null);
    setActiveCropRecordId(null);
    setActivePlantationId(null);
  };

  return (
    <AppShell current={page} onNavigate={navigate}>
      <Suspense fallback={<div className="flex items-center justify-center py-20 text-stone-400 text-sm">Loading…</div>}>
        {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
        {page === 'farms' && <FarmsPage />}
        {page === 'paddy' && (
          activeRecordId
            ? <PaddyRecordDetail recordId={activeRecordId} onBack={backToPaddy} />
            : <PaddyPage onOpenRecord={openRecord} />
        )}
        {page === 'paddy-varieties' && <PaddyVarietiesPage />}
        {page === 'paddy-seasons' && <PaddySeasonsPage />}
        {page === 'crop-types' && <CropTypesPage />}
        {page === 'crop-varieties' && <CropVarietiesPage />}
        {page === 'crops' && (
          activeCropRecordId
            ? <CropRecordDetail recordId={activeCropRecordId} onBack={backToCrops} />
            : <CropsPage onOpenRecord={openCropRecord} />
        )}
        {page === 'crop-planning' && <CropPlanningPage />}
        {page === 'crop-dashboard' && <CropDashboardPage />}
        {page === 'crop-calendar' && <CropCalendarPage />}
        {page === 'crop-comparison' && <CropComparisonPage />}
        {page === 'dragonfruit-dashboard' && <DragonFruitDashboardPage onNavigate={navigate} />}
        {page === 'dragonfruit-plantations' && (
          activePlantationId
            ? <DragonFruitPlantationDetail plantationId={activePlantationId} onBack={backToPlantations} />
            : <DragonFruitPlantationsPage onOpenPlantation={openPlantation} />
        )}
        {page === 'dragonfruit-varieties' && <DragonFruitVarietiesPage />}
        {page === 'dragonfruit-reports' && <DragonFruitReportsPage />}
        {page === 'expenses' && <ExpensesPage />}
        {page === 'income' && <IncomePage />}
        {page === 'financials' && <FinancialsPage />}
        {page === 'reports' && <ReportsPage />}
        {page === 'activities' && <ActivitiesPage />}
        {page === 'settings' && <SettingsPage />}
      </Suspense>
    </AppShell>
  );
}

export default App;
