// Stable saved car identities; all handle the same so rankings stay fair.
// `skin` is the sprite-name prefix in the atlas (tools/art/vehicles/make_*.py).
import { Col, rgb } from "../core/fb";

export interface CarDef {
  /** Stable id (remembered choice, analytics). */
  id: string;
  skin: string;
  nameKey: string;
  descKey: string;
  col: Col;
  goal?: string;
}

export const CARS: CarDef[] = [
  { id: "rosso", skin: "player", nameKey: "car.rosso", descKey: "car.rosso_desc", col: rgb(0xe8483a) },
  { id: "toro", skin: "player_yellow", nameKey: "car.toro", descKey: "car.toro_desc", col: rgb(0xfcd23a), goal: "A" },
  { id: "speedster", skin: "player_green", nameKey: "car.speedster", descKey: "car.speedster_desc", col: rgb(0x3cac58), goal: "C" },
  { id: "stallion", skin: "player_blue", nameKey: "car.stallion", descKey: "car.stallion_desc", col: rgb(0x3e7ae6), goal: "B" },
  { id: "comet", skin: "player_silver", nameKey: "car.comet", descKey: "car.comet_desc", col: rgb(0xaabbd0), goal: "D" },
  { id: "azure", skin: "player_azure", nameKey: "car.azure", descKey: "car.azure_desc", col: rgb(0x35c7bd), goal: "E" },
];

export function carUnlocked(car: CarDef, goals: ReadonlySet<string>): boolean {
  return !car.goal || goals.has(`goal-${car.goal.toLowerCase()}`);
}

/** Cache confirmed account rewards so choosing a car also works on the next offline launch. */
export function rememberCarGoals(account: Iterable<string>, storage: Pick<Storage, 'getItem' | 'setItem'>, key: string): Set<string> {
  const valid = new Set(CARS.flatMap(c => c.goal ? [`goal-${c.goal.toLowerCase()}`] : []));
  const goals = new Set([...account].filter(g => valid.has(g)));
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
    const saved: unknown = JSON.parse(raw || '[]');
    if (Array.isArray(saved)) for (const g of saved) if (typeof g === 'string' && valid.has(g)) goals.add(g);
  } catch { /* malformed/unavailable local storage must not hide confirmed account goals */ }
  try {
    const merged = JSON.stringify([...goals].sort());
    if (goals.size && merged !== raw) storage.setItem(key, merged);
  } catch { /* session unlocks still work when persistence is blocked */ }
  return goals;
}

export function carById(id: string | null | undefined): CarDef {
  return CARS.find((c) => c.id === id) ?? CARS[0];
}
