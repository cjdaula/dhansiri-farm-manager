import type { DragonFruitPlantation, DFHarvest, DFProductionYear, Expense, Income, AreaUnit } from './types';
import { toSqft, fromSqft } from './area';
import { calcProfitability } from './financeCalc';

export function calcActivePlants(p: Pick<DragonFruitPlantation, 'total_plants' | 'missing_plants' | 'dead_plants' | 'replacement_plants'>): number {
  const total = p.total_plants ?? 0;
  const missing = p.missing_plants ?? 0;
  const dead = p.dead_plants ?? 0;
  const replacement = p.replacement_plants ?? 0;
  return Math.max(0, total - missing - dead + replacement);
}

export interface PlantationAge {
  years: number;
  months: number;
  totalMonths: number;
  label: string;
}

export function calcPlantationAge(startDate: string | null, refDate: Date = new Date()): PlantationAge | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  let years = refDate.getFullYear() - start.getFullYear();
  let months = refDate.getMonth() - start.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (refDate.getDate() < start.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  if (years < 0) return null;
  const totalMonths = years * 12 + months;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  return { years, months, totalMonths, label: parts.length > 0 ? parts.join(' ') : '0m' };
}

export interface DFHarvestSummary {
  totalQuantity: number;
  harvestCount: number;
  totalFruitCount: number | null;
  avgFruitWeight: number | null;
  avgPerHarvest: number | null;
  productionPerBigha: number | null;
  productionPerAcre: number | null;
  productionPerHectare: number | null;
  remainingExpected: number | null;
}

export function summarizeDFHarvests(
  harvests: DFHarvest[],
  expectedProduction: number | null,
  area: number | null,
  areaUnit: AreaUnit,
  bighaSqft: number,
): DFHarvestSummary {
  const totalQuantity = harvests.reduce((s, h) => s + Number(h.quantity ?? 0), 0);
  const harvestCount = harvests.length;
  const fruitCounts = harvests.filter((h) => h.fruit_count != null);
  const totalFruitCount = fruitCounts.length > 0 ? fruitCounts.reduce((s, h) => s + Number(h.fruit_count ?? 0), 0) : null;
  const weights = harvests.filter((h) => h.avg_fruit_weight != null && h.avg_fruit_weight > 0);
  const avgFruitWeight = weights.length > 0
    ? weights.reduce((s, h) => s + Number(h.avg_fruit_weight ?? 0), 0) / weights.length
    : null;
  const avgPerHarvest = harvestCount > 0 ? totalQuantity / harvestCount : null;

  const areaSqft = toSqft(area, areaUnit, bighaSqft);
  const hasArea = areaSqft != null && areaSqft > 0;
  const bighaArea = hasArea ? fromSqft(areaSqft, 'bigha', bighaSqft) : null;
  const acreArea = hasArea ? fromSqft(areaSqft, 'acre', bighaSqft) : null;
  const hectareArea = hasArea ? fromSqft(areaSqft, 'hectare', bighaSqft) : null;

  let remainingExpected: number | null = null;
  if (expectedProduction != null && expectedProduction > 0) {
    remainingExpected = Math.max(0, expectedProduction - totalQuantity);
  }

  return {
    totalQuantity,
    harvestCount,
    totalFruitCount,
    avgFruitWeight,
    avgPerHarvest,
    productionPerBigha: hasArea && bighaArea && bighaArea > 0 ? totalQuantity / bighaArea : null,
    productionPerAcre: hasArea && acreArea && acreArea > 0 ? totalQuantity / acreArea : null,
    productionPerHectare: hasArea && hectareArea && hectareArea > 0 ? totalQuantity / hectareArea : null,
    remainingExpected,
  };
}

export interface DFProfitability {
  establishmentCost: number;
  operatingCost: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  costPerBigha: number | null;
  costPerAcre: number | null;
  costPerHectare: number | null;
  costPerKg: number | null;
  revenuePerBigha: number | null;
  revenuePerAcre: number | null;
  revenuePerHectare: number | null;
  revenuePerKg: number | null;
  profitPerBigha: number | null;
  profitPerAcre: number | null;
  profitPerHectare: number | null;
  profitPerKg: number | null;
}

export function calcDFProfitability(
  expenses: Expense[],
  income: Income[],
  totalHarvestQty: number,
  area: number | null,
  areaUnit: AreaUnit,
  bighaSqft: number,
): DFProfitability {
  const r = calcProfitability({
    expenses,
    income,
    area,
    areaUnit,
    bighaSqft,
    totalProduction: totalHarvestQty > 0 ? totalHarvestQty : null,
    includeCapital: true,
  });
  return {
    establishmentCost: r.capitalExpenses,
    operatingCost: r.operatingExpenses,
    totalRevenue: r.totalRevenue,
    totalCost: r.totalExpenses,
    profit: r.netResult,
    costPerBigha: r.costPerBigha,
    costPerAcre: r.costPerAcre,
    costPerHectare: r.costPerHectare,
    costPerKg: r.costPerKg,
    revenuePerBigha: r.revenuePerBigha,
    revenuePerAcre: r.revenuePerAcre,
    revenuePerHectare: r.revenuePerHectare,
    revenuePerKg: r.revenuePerKg,
    profitPerBigha: r.profitPerBigha,
    profitPerAcre: r.profitPerAcre,
    profitPerHectare: r.profitPerHectare,
    profitPerKg: r.profitPerKg,
  };
}

export function getDFPlantationStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}
