import type { PaddyCrop, Expense, Income, PaddyHarvest, AreaUnit } from './types';
import { toSqft, fromSqft, AREA_UNIT_LABELS } from './area';
import { calcProfitability as calcGenericProfitability, formatOrNull as genericFormatOrNull } from './financeCalc';
import { DEFAULT_BIGHA_SQFT } from './constants';

export interface PaddyProfitability {
  totalCost: number;
  totalIncome: number;
  netProfit: number;
  costPerBigha: number | null;
  costPerHectare: number | null;
  costPerKg: number | null;
  revenuePerBigha: number | null;
  revenuePerHectare: number | null;
  profitPerBigha: number | null;
  profitPerHectare: number | null;
  profitPerKg: number | null;
}

export interface PaddyYield {
  totalYield: number | null;
  yieldUnit: string;
  yieldPerBigha: number | null;
  yieldPerAcre: number | null;
  yieldPerHectare: number | null;
  yieldPerSqft: number | null;
}

export function calcProfitability(
  crop: PaddyCrop,
  expenses: Expense[],
  income: Income[],
  bighaSqft: number,
): PaddyProfitability {
  const totalYield = crop.final_quantity ?? crop.actual_yield;
  const r = calcGenericProfitability({
    expenses,
    income,
    area: crop.area,
    areaUnit: crop.area_unit,
    bighaSqft,
    totalProduction: totalYield,
    includeCapital: true,
  });
  return {
    totalCost: r.totalExpenses,
    totalIncome: r.totalRevenue,
    netProfit: r.netResult,
    costPerBigha: r.costPerBigha,
    costPerHectare: r.costPerHectare,
    costPerKg: r.costPerKg,
    revenuePerBigha: r.revenuePerBigha,
    revenuePerHectare: r.revenuePerHectare,
    profitPerBigha: r.profitPerBigha,
    profitPerHectare: r.profitPerHectare,
    profitPerKg: r.profitPerKg,
  };
}

export function calcYield(
  crop: PaddyCrop,
  harvests: PaddyHarvest[],
  bighaSqft: number,
): PaddyYield {
  const totalYield =
    harvests.length > 0
      ? harvests.reduce((s, h) => s + Number(h.final_quantity ?? h.gross_quantity ?? 0), 0)
      : crop.final_quantity ?? crop.actual_yield;

  const yieldUnit = harvests.length > 0
    ? harvests[0]?.quantity_unit ?? 'kg'
    : crop.actual_yield_unit ?? 'kg';

  const areaSqft = toSqft(crop.area, crop.area_unit as AreaUnit, bighaSqft);
  const hasArea = areaSqft != null && areaSqft > 0 && totalYield != null && totalYield > 0;

  return {
    totalYield,
    yieldUnit,
    yieldPerBigha: hasArea ? totalYield! / fromSqft(areaSqft, 'bigha', bighaSqft)! : null,
    yieldPerAcre: hasArea ? totalYield! / fromSqft(areaSqft, 'acre', bighaSqft)! : null,
    yieldPerHectare: hasArea ? totalYield! / fromSqft(areaSqft, 'hectare', bighaSqft)! : null,
    yieldPerSqft: hasArea ? totalYield! / areaSqft! : null,
  };
}

export function formatOrNull(value: number | null, prefix = '', suffix = '', digits = 2): string {
  return genericFormatOrNull(value, prefix, suffix, digits);
}

export function yieldLabel(yieldData: PaddyYield, displayUnit: AreaUnit, bighaSqft: number): string {
  if (yieldData.totalYield == null) return '—';
  const perUnit = yieldData.yieldPerBigha;
  if (perUnit == null) return `${Number(yieldData.totalYield).toLocaleString('en-IN')} ${yieldData.yieldUnit}`;
  let value: number | null = perUnit;
  if (displayUnit !== 'bigha') {
    value = fromSqft(yieldData.yieldPerSqft! * DEFAULT_BIGHA_SQFT, displayUnit, bighaSqft);
  }
  return `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${AREA_UNIT_LABELS[displayUnit]}`;
}
