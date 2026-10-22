// The cars the player can drive (all free, all handle the same so rankings stay fair).
// `skin` is the sprite-name prefix in the atlas (tools/art/vehicles/make_*.py).
import { Col, rgb } from "../core/fb";

export interface CarDef {
  /** Stable id (remembered choice, analytics). */
  id: string;
  skin: string;
  nameKey: string;
  descKey: string;
  col: Col;
}

export const CARS: CarDef[] = [
  { id: "rosso", skin: "player", nameKey: "car.rosso", descKey: "car.rosso_desc", col: rgb(0xe8483a) },
  { id: "toro", skin: "player_yellow", nameKey: "car.toro", descKey: "car.toro_desc", col: rgb(0xfcd23a) },
  { id: "speedster", skin: "player_green", nameKey: "car.speedster", descKey: "car.speedster_desc", col: rgb(0x3cac58) },
  { id: "stallion", skin: "player_blue", nameKey: "car.stallion", descKey: "car.stallion_desc", col: rgb(0x3e7ae6) },
];

export function carById(id: string | null | undefined): CarDef {
  return CARS.find((c) => c.id === id) ?? CARS[0];
}
