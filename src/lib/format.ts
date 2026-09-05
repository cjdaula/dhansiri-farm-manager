export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '₹0';
  const n = Number(amount);
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '0';
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: digits });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function num(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function formatFarmPlot(
  farmName: string | null | undefined,
  plotName: string | null | undefined,
): string {
  const farm = farmName?.trim() || '';
  const plot = plotName?.trim() || '';
  if (!farm && !plot) return '—';
  if (!plot) return farm;
  if (!farm) return plot;
  return `${farm} / ${plot}`;
}
