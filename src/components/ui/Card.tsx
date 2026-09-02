import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-200/80 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'error' | 'warning';
}

export function StatCard({ label, value, icon, hint, tone = 'default' }: StatCardProps) {
  const toneClasses: Record<string, string> = {
    default: 'bg-stone-50 text-stone-700',
    success: 'bg-emerald-50 text-emerald-700',
    error: 'bg-rose-50 text-rose-700',
    warning: 'bg-amber-50 text-amber-700',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-stone-800 tracking-tight truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
        </div>
        {icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
