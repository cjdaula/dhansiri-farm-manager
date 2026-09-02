import type { Expense, Income, AreaUnit } from './types';
import { toSqft, fromSqft } from './area';

export interface ProfitabilityInput {
  expenses: Expense[];
  income: Income[];
  area?: number | null;
  areaUnit?: AreaUnit | string | null;
  bighaSqft: number;
  totalProduction?: number | null;
  includeCapital?: boolean;
}

export interface ProfitabilityResult {
  totalRevenue: number;
  totalExpenses: number;
  operatingExpenses: number;
  capitalExpenses: number;
  operatingProfit: number;
  netResult: number;
  costPerBigha: number | null;
  costPerAcre: number | null;
  costPerHectare: number | null;
  revenuePerBigha: number | null;
  revenuePerAcre: number | null;
  revenuePerHectare: number | null;
  profitPerBigha: number | null;
  profitPerAcre: number | null;
  profitPerHectare: number | null;
  costPerKg: number | null;
  revenuePerKg: number | null;
  profitPerKg: number | null;
}

export function calcProfitability(input: ProfitabilityInput): ProfitabilityResult {
  const includeCapital = input.includeCapital ?? true;

  const operatingExpenses = input.expenses
    .filter((e) => (e.expense_type ?? 'operating') === 'operating')
    .reduce((s, e) => s + Number(e.total_amount ?? 0), 0);
  const capitalExpenses = input.expenses
    .filter((e) => e.expense_type === 'capital')
    .reduce((s, e) => s + Number(e.total_amount ?? 0), 0);
  const totalExpenses = includeCapital ? operatingExpenses + capitalExpenses : operatingExpenses;
  const totalRevenue = input.income.reduce((s, e) => s + Number(e.total_income ?? 0), 0);
  const operatingProfit = totalRevenue - operatingExpenses;
  const netResult = totalRevenue - totalExpenses;

  const areaSqft = toSqft(input.area ?? null, (input.areaUnit ?? 'bigha') as AreaUnit, input.bighaSqft);
  const hasArea = areaSqft != null && areaSqft > 0;
  const bighaArea = hasArea ? fromSqft(areaSqft, 'bigha', input.bighaSqft) : null;
  const acreArea = hasArea ? fromSqft(areaSqft, 'acre', input.bighaSqft) : null;
  const hectareArea = hasArea ? fromSqft(areaSqft, 'hectare', input.bighaSqft) : null;

  const totalProduction = input.totalProduction;
  const hasYield = totalProduction != null && totalProduction > 0;

  return {
    totalRevenue,
    totalExpenses,
    operatingExpenses,
    capitalExpenses,
    operatingProfit,
    netResult,
    costPerBigha: hasArea && bighaArea ? totalExpenses / bighaArea : null,
    costPerAcre: hasArea && acreArea ? totalExpenses / acreArea : null,
    costPerHectare: hasArea && hectareArea ? totalExpenses / hectareArea : null,
    revenuePerBigha: hasArea && bighaArea ? totalRevenue / bighaArea : null,
    revenuePerAcre: hasArea && acreArea ? totalRevenue / acreArea : null,
    revenuePerHectare: hasArea && hectareArea ? totalRevenue / hectareArea : null,
    profitPerBigha: hasArea && bighaArea ? netResult / bighaArea : null,
    profitPerAcre: hasArea && acreArea ? netResult / acreArea : null,
    profitPerHectare: hasArea && hectareArea ? netResult / hectareArea : null,
    costPerKg: hasYield ? totalExpenses / totalProduction! : null,
    revenuePerKg: hasYield ? totalRevenue / totalProduction! : null,
    profitPerKg: hasYield ? netResult / totalProduction! : null,
  };
}

export interface ReceivablesPayables {
  totalReceivables: number;
  totalPayables: number;
}

export function calcReceivablesPayables(expenses: Expense[], income: Income[]): ReceivablesPayables {
  const totalReceivables = income.reduce((s, e) => {
    const due = Number(e.amount_due ?? 0);
    const received = Number(e.amount_received ?? 0);
    const total = Number(e.total_income ?? 0);
    const balance = due > 0 ? due : Math.max(0, total - received);
    return s + balance;
  }, 0);

  const totalPayables = expenses.reduce((s, e) => {
    const due = Number(e.amount_due ?? 0);
    const paid = Number(e.amount_paid ?? 0);
    const total = Number(e.total_amount ?? 0);
    const balance = due > 0 ? due : Math.max(0, total - paid);
    return s + balance;
  }, 0);

  return { totalReceivables, totalPayables };
}

export interface PnLResult {
  totalRevenue: number;
  productionCost: number;
  grossProfit: number;
  operatingExpenses: number;
  capitalExpenses: number;
  operatingProfit: number;
  netResult: number;
  profitMargin: number | null;
  totalReceivables: number;
  totalPayables: number;
}

export function calcPnL(expenses: Expense[], income: Income[]): PnLResult {
  const totalRevenue = income.reduce((s, e) => s + Number(e.total_income ?? 0), 0);

  const productionCost = expenses
    .filter((e) => (e.expense_type ?? 'operating') === 'operating' && isDirectCropCost(e))
    .reduce((s, e) => s + Number(e.total_amount ?? 0), 0);

  const operatingExpenses = expenses
    .filter((e) => (e.expense_type ?? 'operating') === 'operating' && !isDirectCropCost(e))
    .reduce((s, e) => s + Number(e.total_amount ?? 0), 0);

  const capitalExpenses = expenses
    .filter((e) => e.expense_type === 'capital')
    .reduce((s, e) => s + Number(e.total_amount ?? 0), 0);

  const grossProfit = totalRevenue - productionCost;
  const operatingProfit = grossProfit - operatingExpenses;
  const netResult = totalRevenue - productionCost - operatingExpenses - capitalExpenses;
  const profitMargin = totalRevenue > 0 ? (netResult / totalRevenue) * 100 : null;

  const { totalReceivables, totalPayables } = calcReceivablesPayables(expenses, income);

  return {
    totalRevenue,
    productionCost,
    grossProfit,
    operatingExpenses,
    capitalExpenses,
    operatingProfit,
    netResult,
    profitMargin,
    totalReceivables,
    totalPayables,
  };
}

function isDirectCropCost(e: Expense): boolean {
  return e.paddy_crop_id != null || e.cultivation_id != null || e.crop_type_id != null;
}

export function formatOrNull(value: number | null, prefix = '', suffix = '', digits = 2): string {
  if (value == null) return '—';
  return `${prefix}${Number(value).toLocaleString('en-IN', { maximumFractionDigits: digits })}${suffix}`;
}
