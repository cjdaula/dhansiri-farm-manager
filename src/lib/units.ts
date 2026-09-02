import { supabase } from './supabase';
import type { Unit } from './types';

let unitsCache: Unit[] | null = null;

export async function loadUnits(): Promise<Unit[]> {
  if (unitsCache) return unitsCache;
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('is_active', true)
    .order('unit_group', { ascending: true })
    .order('name', { ascending: true });
  if (error || !data) return [];
  unitsCache = data as Unit[];
  return unitsCache;
}

export function groupUnits(units: Unit[]): Record<string, Unit[]> {
  const groups: Record<string, Unit[]> = { weight: [], area: [], volume: [], count: [] };
  for (const u of units) {
    if (!groups[u.unit_group]) groups[u.unit_group] = [];
    groups[u.unit_group].push(u);
  }
  return groups;
}

export function unitLabel(units: Unit[], name: string | null | undefined): string {
  if (!name) return '';
  const u = units.find((x) => x.name === name || x.symbol === name);
  return u ? u.name : name;
}
