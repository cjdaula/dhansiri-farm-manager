import type { Cultivation, CropHarvest, Expense, Income, AreaUnit } from './types';
import { toSqft, fromSqft } from './area';

export interface PlannedProfitability {
  expectedRevenue: number | null;
  expectedCost: number | null;
  expectedProfit: number | null;
  revenuePerBigha: number | null;
  costPerBigha: number | null;
  profitPerBigha: number | null;
}

export function calcPlannedProfitability(
  cultivation: Pick<
    Cultivation,
    'expected_yield' | 'expected_yield_unit' | 'expected_selling_price' | 'expected_cost' | 'area' | 'area_unit'
  >,
  bighaSqft: number,
): PlannedProfitability {
  const yieldVal = cultivation.expected_yield;
  const price = cultivation.expected_selling_price;
  const cost = cultivation.expected_cost;

  const expectedRevenue =
    yieldVal != null && price != null && yieldVal > 0 && price > 0 ? yieldVal * price : null;
  const expectedCost = cost != null && cost > 0 ? cost : null;
  const expectedProfit =
    expectedRevenue != null && expectedCost != null ? expectedRevenue - expectedCost : null;

  const areaSqft = toSqft(cultivation.area ?? null, (cultivation.area_unit ?? 'bigha') as AreaUnit, bighaSqft);
  const hasArea = areaSqft != null && areaSqft > 0;
  const bighaArea = hasArea ? fromSqft(areaSqft, 'bigha', bighaSqft) : null;

  return {
    expectedRevenue,
    expectedCost,
    expectedProfit,
    revenuePerBigha: hasArea && bighaArea && expectedRevenue != null ? expectedRevenue / bighaArea : null,
    costPerBigha: hasArea && bighaArea && expectedCost != null ? expectedCost / bighaArea : null,
    profitPerBigha: hasArea && bighaArea && expectedProfit != null ? expectedProfit / bighaArea : null,
  };
}

export interface ActualProfitability {
  totalCost: number;
  totalRevenue: number;
  profit: number;
  costPerBigha: number | null;
  costPerAcre: number | null;
  costPerHectare: number | null;
  revenuePerBigha: number | null;
  revenuePerAcre: number | null;
  revenuePerHectare: number | null;
  profitPerBigha: number | null;
  profitPerAcre: number | null;
  profitPerHectare: number | null;
}

export function calcActualProfitability(
  expenses: Expense[],
  income: Income[],
  area: number | null,
  areaUnit: AreaUnit,
  bighaSqft: number,
): ActualProfitability {
  const totalCost = expenses.reduce((s, e) => s + Number(e.total_amount ?? 0), 0);
  const totalRevenue = income.reduce((s, e) => s + Number(e.total_income ?? 0), 0);
  const profit = totalRevenue - totalCost;

  const areaSqft = toSqft(area, areaUnit, bighaSqft);
  const hasArea = areaSqft != null && areaSqft > 0;
  const bighaArea = hasArea ? fromSqft(areaSqft, 'bigha', bighaSqft) : null;
  const acreArea = hasArea ? fromSqft(areaSqft, 'acre', bighaSqft) : null;
  const hectareArea = hasArea ? fromSqft(areaSqft, 'hectare', bighaSqft) : null;

  return {
    totalCost,
    totalRevenue,
    profit,
    costPerBigha: hasArea && bighaArea ? totalCost / bighaArea : null,
    costPerAcre: hasArea && acreArea ? totalCost / acreArea : null,
    costPerHectare: hasArea && hectareArea ? totalCost / hectareArea : null,
    revenuePerBigha: hasArea && bighaArea ? totalRevenue / bighaArea : null,
    revenuePerAcre: hasArea && acreArea ? totalRevenue / acreArea : null,
    revenuePerHectare: hasArea && hectareArea ? totalRevenue / hectareArea : null,
    profitPerBigha: hasArea && bighaArea ? profit / bighaArea : null,
    profitPerAcre: hasArea && acreArea ? profit / acreArea : null,
    profitPerHectare: hasArea && hectareArea ? profit / hectareArea : null,
  };
}

export interface HarvestSummary {
  totalHarvested: number;
  harvestCount: number;
  totalLoss: number;
  totalFinal: number;
  remainingExpected: number | null;
  harvestStatus: 'not_harvested' | 'partially_harvested' | 'fully_harvested';
}

export function summarizeHarvests(
  harvests: CropHarvest[],
  expectedYield: number | null,
): HarvestSummary {
  const totalHarvested = harvests.reduce((s, h) => s + Number(h.quantity ?? 0), 0);
  const totalLoss = harvests.reduce((s, h) => s + Number(h.loss_quantity ?? 0), 0);
  const totalFinal = harvests.reduce((s, h) => s + Number(h.final_quantity ?? h.quantity ?? 0), 0);

  let remainingExpected: number | null = null;
  let harvestStatus: HarvestSummary['harvestStatus'] = 'not_harvested';

  if (expectedYield != null && expectedYield > 0) {
    remainingExpected = Math.max(0, expectedYield - totalHarvested);
    if (totalHarvested <= 0) harvestStatus = 'not_harvested';
    else if (remainingExpected <= 0) harvestStatus = 'fully_harvested';
    else harvestStatus = 'partially_harvested';
  } else {
    harvestStatus = totalHarvested > 0 ? 'partially_harvested' : 'not_harvested';
  }

  return {
    totalHarvested,
    harvestCount: harvests.length,
    totalLoss,
    totalFinal,
    remainingExpected,
    harvestStatus,
  };
}

export interface PlotAllocation {
  totalPlotArea: number | null;
  totalAllocated: number;
  remainingArea: number | null;
  overAllocated: boolean;
}

export function calcPlotAllocation(
  plotArea: number | null,
  cultivationsOnPlot: { area: number | null }[],
): PlotAllocation {
  const totalAllocated = cultivationsOnPlot.reduce(
    (s, c) => s + Number(c.area ?? 0),
    0,
  );
  const totalPlotArea = plotArea;
  const remainingArea =
    plotArea != null ? Math.max(0, plotArea - totalAllocated) : null;
  const overAllocated = plotArea != null ? totalAllocated > plotArea : false;

  return { totalPlotArea, totalAllocated, remainingArea, overAllocated };
}
