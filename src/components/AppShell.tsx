import { type ReactNode, useEffect, useState } from 'react';
// X icon removed; using Menu only for mobile
import {
  LayoutDashboard,
  Map,
  Wheat,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Settings as SettingsIcon,
  Leaf,
  Menu,
  CalendarClock,
  Sprout,
  CalendarDays,
  ClipboardList,
  GitCompareArrows,
  Flame,
  Wallet,
} from 'lucide-react';

export type PageKey =
  | 'dashboard'
  | 'farms'
  | 'paddy'
  | 'paddy-varieties'
  | 'paddy-seasons'
  | 'crop-types'
  | 'crop-varieties'
  | 'crops'
  | 'crop-planning'
  | 'crop-dashboard'
  | 'crop-calendar'
  | 'crop-comparison'
  | 'dragonfruit-dashboard'
  | 'dragonfruit-plantations'
  | 'dragonfruit-varieties'
  | 'dragonfruit-reports'
  | 'expenses'
  | 'income'
  | 'financials'
  | 'reports'
  | 'activities'
  | 'settings';

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { key: 'farms', label: 'Farms & Plots', icon: <Map className="h-5 w-5" /> },
  { key: 'paddy', label: 'Paddy', icon: <Wheat className="h-5 w-5" /> },
  { key: 'paddy-varieties', label: 'Varieties', icon: <Sprout className="h-5 w-5" /> },
  { key: 'paddy-seasons', label: 'Seasons', icon: <CalendarDays className="h-5 w-5" /> },
  { key: 'crop-dashboard', label: 'Crop Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { key: 'crops', label: 'Crops', icon: <Leaf className="h-5 w-5" /> },
  { key: 'crop-planning', label: 'Crop Planning', icon: <ClipboardList className="h-5 w-5" /> },
  { key: 'crop-types', label: 'Crop Types', icon: <Sprout className="h-5 w-5" /> },
  { key: 'crop-varieties', label: 'Crop Varieties', icon: <Sprout className="h-5 w-5" /> },
  { key: 'crop-calendar', label: 'Crop Calendar', icon: <CalendarClock className="h-5 w-5" /> },
  { key: 'crop-comparison', label: 'Crop Comparison', icon: <GitCompareArrows className="h-5 w-5" /> },
  { key: 'dragonfruit-dashboard', label: 'Dragon Fruit', icon: <Flame className="h-5 w-5" /> },
  { key: 'dragonfruit-plantations', label: 'Plantations', icon: <Sprout className="h-5 w-5" /> },
  { key: 'dragonfruit-varieties', label: 'Varieties', icon: <Sprout className="h-5 w-5" /> },
  { key: 'dragonfruit-reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" /> },
  { key: 'expenses', label: 'Expenses', icon: <TrendingDown className="h-5 w-5" /> },
  { key: 'income', label: 'Income', icon: <TrendingUp className="h-5 w-5" /> },
  { key: 'financials', label: 'Financials', icon: <Wallet className="h-5 w-5" /> },
  { key: 'reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" /> },
  { key: 'activities', label: 'Activities', icon: <CalendarClock className="h-5 w-5" /> },
  { key: 'settings', label: 'Settings', icon: <SettingsIcon className="h-5 w-5" /> },
];

interface AppShellProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

export function AppShell({ current, onNavigate, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [current]);


  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-stone-200 bg-white">
        <SidebarContent current={current} onNavigate={onNavigate} />
      </aside>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 flex flex-col border-r border-stone-200 bg-white animate-[slideIn_0.2s_ease-out]">
            <SidebarContent current={current} onNavigate={onNavigate} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-stone-200 bg-white/90 backdrop-blur px-4 py-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-stone-600 hover:bg-stone-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-stone-800">Dhansiri</span>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav (compact) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-stone-200 flex">
        {NAV.slice(0, 5).map((item) => {
          const isActive = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-emerald-600' : 'text-stone-400'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
      <div className="lg:hidden h-14" aria-hidden />
    </div>
  );
}

function SidebarContent({ current, onNavigate }: { current: PageKey; onNavigate: (p: PageKey) => void }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-stone-800">Dhansiri</p>
            <p className="text-[11px] text-stone-400">Farm Manager</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const isActive = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
              }`}
            >
              <span className={isActive ? 'text-emerald-600' : 'text-stone-400'}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-stone-100">
        <p className="text-[11px] text-stone-400 leading-relaxed">
          Integrated Farm
          <br />
          Management System
        </p>
      </div>
    </>
  );
}

export { NAV };
