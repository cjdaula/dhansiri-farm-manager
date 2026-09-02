import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown, Wallet, Banknote, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/format';

interface FinancialSummaryCardsProps {
  totalRevenue: number;
  totalExpenses: number;
  operatingProfit: number;
  netResult: number;
  receivables: number;
  payables: number;
}

interface ItemProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone: 'default' | 'success' | 'error' | 'warning';
}

function toneClasses(tone: string): string {
  switch (tone) {
    case 'success': return 'bg-emerald-50 text-emerald-700';
    case 'error': return 'bg-rose-50 text-rose-700';
    case 'warning': return 'bg-amber-50 text-amber-700';
    default: return 'bg-stone-50 text-stone-700';
  }
}

function valueTone(tone: string): string {
  switch (tone) {
    case 'success': return 'text-emerald-700';
    case 'error': return 'text-rose-700';
    case 'warning': return 'text-amber-700';
    default: return 'text-stone-800';
  }
}

function MiniCard({ label, value, icon, tone }: ItemProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-stone-500">{label}</p>
          <p className={`mt-1 text-xl font-bold tracking-tight truncate ${valueTone(tone)}`}>{value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses(tone)}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function FinancialSummaryCards({
  totalRevenue,
  totalExpenses,
  operatingProfit,
  netResult,
  receivables,
  payables,
}: FinancialSummaryCardsProps) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <MiniCard
        label="Total revenue"
        value={formatCurrency(totalRevenue)}
        icon={<TrendingUp className="h-5 w-5" />}
        tone="success"
      />
      <MiniCard
        label="Total expenses"
        value={formatCurrency(totalExpenses)}
        icon={<TrendingDown className="h-5 w-5" />}
        tone="error"
      />
      <MiniCard
        label="Operating profit"
        value={formatCurrency(operatingProfit)}
        icon={operatingProfit >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
        tone={operatingProfit >= 0 ? 'success' : 'error'}
      />
      <MiniCard
        label="Net result"
        value={formatCurrency(netResult)}
        icon={<Wallet className="h-5 w-5" />}
        tone={netResult >= 0 ? 'success' : 'error'}
      />
      <MiniCard
        label="Receivables"
        value={formatCurrency(receivables)}
        icon={<Banknote className="h-5 w-5" />}
        tone="warning"
      />
      <MiniCard
        label="Payables"
        value={formatCurrency(payables)}
        icon={<Banknote className="h-5 w-5" />}
        tone="error"
      />
    </div>
  );
}
