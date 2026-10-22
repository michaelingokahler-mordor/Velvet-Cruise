// The fifteen stages: palettes, scenery, weather and traffic. Stages 0-4 are the
// coast road (the sea on the right); 5-10 are the inland routes reached by
// taking a fork (10 = Neon City: building canyons and tunnels at night). The sun sinks a little further with every column — the run
// literally chases the horizon.
import { Col, rgb } from "../core/fb";
import type { TerrainStyle } from "./terrain";

export type WallKind = "cliff" | "hill" | "forest" | "town" | "sound" | "city" | "none";
export type Weather = "clear" | "rain" | "fog" | "sand" | "heat" | "night" | "snow";

/** A prop repeated at a fixed rhythm (lamp posts, telephone poles, vine rows). */
export interface Rhythm { name: string; every: number; x: number[]; flipRight?: boolean; jitter?: number }

export interface Prop { name: string; w: number; scale: number; solid?: boolean }

export interface Theme {
  id: string;            // stable id (leaderboards, analytics)
  nameKey: string;       // localisation id
  sky: string;           // background layer keys
  far: string;
  skyGrad: Col[];        // fallback sky (top → horizon)
  haze: Col;
  seaH: Col; seaN: Col;  // sea at the horizon / near the road
  seaA: Col; seaB: Col;  // alternating near-sea bands
  foam: Col;
  glitter: Col; glitter2: Col;
  sunX: number;          // window x of the sun (reflection column)
  sunGlow: number;       // 0..1 strength of reflections
  asphaltA: Col; asphaltB: Col;
  lane: Col; rumbleA: Col; rumbleB: Col;
  sandA: Col; sandB: Col;         // shoulders / beach
  groundA: Col; groundB: Col;     // land-side ground before the wall
  wall: WallKind;
  wallBands: [Col, Col][];        // bottom → top, each [A, B] stripe pair
  wallTop: [Col, Col];            // vegetation fringe
  railBeam: Col; railShade: Col; railPost: Col;
  tint: [number, number, number];
  landProps: [string, number][];  // weighted prop names on the land side
  topProps: [string, number][];   // props standing on top of the wall
  seaProps: [string, number][];   // props on the beach/sea side
  traffic: number;                // cars per 100 segments of road ahead
  carSpeed: [number, number];     // fraction of max speed
  lanesChange: number;            // chance per second a car changes lane
  // ---- route stages (all optional: the coast stages use the defaults) ----
  /** "sea" = beach and ocean on the right (default); "land" = ground on both sides. */
  side?: "sea" | "land";
  /** Land below the horizon, at the horizon / near the road (land stages). */
  landH?: Col; landN?: Col;
  /** Wall on the right-hand side (land stages). */
  wallR?: WallKind;
  /** Props on the right-hand side of land stages (sea stages use seaProps). */
  rightProps?: [string, number][];
  rhythm?: Rhythm[];
  /** Overhead sign gantry every this many segments (highways). */
  gantry?: number;
  /** Sprite used for those overhead structures (default "gantry"). */
  gantryName?: string;
  /** Tunnels through the stage: how many, and their length range in segments. */
  tunnels?: { count: number; min: number; max: number };
  /** "city" walls: lit window colours, unlit glass, and neon accents (roof trims, tunnel strips). */
  windows?: Col[];
  windowDark?: Col;
  neon?: Col[];
  weather?: Weather;
  /** How dark it is (0 = daylight, 1 = night): cars switch their lights on as it rises. */
  dark?: number;
  /** Destination icon (sprite) on fork signs, the HUD and the course map. */
  icon?: string;
  /** Road shape: 0 = gentle .. 4 = twisty, hill size multiplier, chance of long straights. */
  shape?: { twist: number; hills: number; straights: number };
  /** Off-road surface dust colour (defaults to sandA). */
  dust?: Col;
  /** Sea-side stages: no guardrail, a wider shore (a lake you can drive along). */
  noRail?: boolean;
  /** Props floating on the water beyond the shore (lily pads, reeds). */
  waterProps?: [string, number][];
  /** Painted slope forms for "hill" / "cliff" walls (terrain.ts). Without it the old banded walls are drawn. */
  terrain?: TerrainStyle;
  /** Buildings and palms gather in small clusters with free stretches between them (scenery placement only). */
  groups?: boolean;
}

const c = rgb;

export const THEMES: Theme[] = [
  {
    id: "palm-cove", nameKey: "stage.1", sky: "sky_s1", far: "far_s1",
    skyGrad: [c(0x3a6fd8), c(0x5d94ec), c(0x8fbdf2), c(0xc6dff0), c(0xf3e2b0)],
    haze: c(0xe9e0bc), seaH: c(0x6fa8d8), seaN: c(0x1f5aa8), seaA: c(0x2a66b4), seaB: c(0x2560ae), foam: c(0xf4faff),
    glitter: c(0xffffff), glitter2: c(0xbfe3ff), sunX: 235, sunGlow: 0.55,
    asphaltA: c(0x7c7c88), asphaltB: c(0x767682), lane: c(0xf4f4f0), rumbleA: c(0xd8382c), rumbleB: c(0xf4f0e8),
    sandA: c(0xddc68f), sandB: c(0xdac28b), groundA: c(0x889e59), groundB: c(0x889e59),
    wall: "hill",
    wallBands: [[c(0x6f9a3a), c(0x679236)], [c(0x7caa42), c(0x74a03e)], [c(0x8ab84a), c(0x82ae46)]],
    wallTop: [c(0x5a8a30), c(0x52822c)],
    railBeam: c(0xe8ecf0), railShade: c(0x9aa2b0), railPost: c(0x7a8290),
    tint: [1, 1, 1],
    landProps: [["palm_a", 5], ["palm_b", 3], ["palm_c", 3], ["bush_a", 4], ["bush_b", 2], ["billboard_b", 0.5], ["house", 0.7]],
    topProps: [["palm_a", 3], ["palm_c", 2], ["bush_a", 4], ["house", 1]],
    seaProps: [["palm_c", 2], ["palm_b", 2], ["grass_a", 3], ["umbrella_a", 1], ["rock_b", 1]],
    traffic: 1.8, carSpeed: [0.38, 0.62], lanesChange: 0.03,
    terrain: {
      low: c(0x607b50), mid: c(0x889e59), high: c(0xa3af6b), light: c(0x9eac64), light2: c(0xb8bc7c),
      shade: c(0x688353), shade2: c(0x4c694d),
      rock: [c(0x5c4c4a), c(0x8a7a6a), c(0xb09c82), c(0xd6c6a2)], stone: [c(0xa99a84), c(0xcdbf9f), c(0xf1e8cc)],
      rim: c(0x9ccb4e), meadows: 0.8, hollows: 0.7, outcrops: 0.6, terraces: 0.8,
      lean: 0.9,
      dry: c(0xc4c45e), olive: c(0x6a9455), hedge: [c(0x2c6634), c(0x4c8a3e)], path: [c(0xcfc48a), c(0x9c9a5a)],
      scene: {
        trees: [["palm_a", 3], ["palm_b", 2], ["palm_c", 2], ["palm_d", 1.5], ["palm_e", 2], ["palm_f", 1], ["palm_g", 1.6], ["palm_h", 1.2]],
        shrubs: [["bush_a", 2], ["bush_b", 1], ["bush_c", 1.6], ["bush_d", 1], ["bush_e", 0.8], ["bush_f", 1.1]],
        roadside: [["palm_a", 3.9], ["palm_b", 2.6], ["palm_c", 2.6], ["palm_d", 1.95], ["palm_e", 2.6], ["palm_f", 1.3], ["palm_g", 2.1], ["palm_h", 1.6],
          ["bush_a", 2], ["bush_b", 1], ["bush_c", 1.6], ["bush_d", 1], ["bush_e", 0.8], ["bush_f", 1.1]],
        rocks: ["cove_rock_a", "cove_rock_b", "cove_rock_c", "cove_rock_d"], tufts: ["cove_tuft_a", "cove_tuft_b"],
        modules: ["cove_villa_a", "cove_villa_b", "cove_cottage", "cove_cube", "cove_row", "cove_villa_a", "cove_villa_b", "cove_cottage", "cove_cube", "cove_chapel"],
        villages: ["cove_village_a", "cove_village_b"],
      },
    },
  },
  {
    id: "coral-bluffs", nameKey: "stage.2", sky: "sky_s2", far: "far_s2",
    skyGrad: [c(0x4a7fd6), c(0x86aee6), c(0xc8c0c0), c(0xe9c7a0), c(0xffb466)],
    haze: c(0xf6c08a), seaH: c(0x8fb0d0), seaN: c(0x27559a), seaA: c(0x2f62a8), seaB: c(0x2b5ca2), foam: c(0xfff4e0),
    glitter: c(0xfff2c0), glitter2: c(0xffd890), sunX: 225, sunGlow: 0.7,
    asphaltA: c(0x7a7680), asphaltB: c(0x74707a), lane: c(0xfaf0e0), rumbleA: c(0xd8382c), rumbleB: c(0xf6eee0),
    sandA: c(0xe6c48e), sandB: c(0xdcb880), groundA: c(0xb5a16b), groundB: c(0xb5a16b),
    wall: "cliff",
    wallBands: [[c(0xa86c3c), c(0x9c6236)], [c(0xc38650), c(0xb67c48)], [c(0xd9a066), c(0xcd955e)], [c(0xe6b47a), c(0xdaa86e)]],
    wallTop: [c(0x6b9a3a), c(0x5f8e34)],
    railBeam: c(0xf0ece6), railShade: c(0xa8a0a0), railPost: c(0x84787a),
    tint: [1.02, 0.98, 0.94],
    landProps: [["rock_a", 3], ["bush_a", 3], ["palm_b", 1.5], ["sign_left", 0], ["lighthouse", 0]],
    topProps: [["bush_a", 5], ["palm_a", 2], ["palm_c", 1], ["lighthouse", 0.15], ["house", 0.5]],
    seaProps: [["rock_a", 2], ["rock_b", 3], ["grass_a", 3], ["bush_a", 1]],
    traffic: 2.2, carSpeed: [0.4, 0.66], lanesChange: 0.06,
    terrain: {
      low: c(0x948357), mid: c(0xb5a16b), high: c(0xc2ab79), light: c(0xc8b47b), light2: c(0xdfc78d),
      shade: c(0x8c8a62), shade2: c(0x646d50),
      rock: [c(0x5a3030), c(0xa4724e), c(0xcf9a6c), c(0xf2c994)], stone: [c(0xa97a58), c(0xd8aa78), c(0xf8dcae)],
      rim: c(0x7ea63e), meadows: 0.3, hollows: 0.8, outcrops: 1, terraces: 1,
      scene: {
        trees: [["palm_a", 2], ["palm_b", 2], ["palm_g", 1], ["palm_h", 1.4], ["palm_e", 1]],
        shrubs: [["bush_a", 2], ["bush_c", 1.4], ["bush_e", 1.8], ["bush_f", 1.2], ["bush_b", 0.8]],
        roadside: [["palm_b", 1.6], ["palm_h", 1.2], ["palm_e", 1], ["bush_a", 2], ["bush_e", 1.4], ["bush_c", 1], ["rock_a", 1.6], ["rock_b", 1.2]],
        rocks: ["bluff_rock_a", "bluff_rock_b", "bluff_rock_c", "bluff_rock_d"], tufts: ["cove_tuft_a", "cove_tuft_b"],
        modules: ["cove_villa_a", "cove_villa_b", "cove_cottage", "cove_row", "cove_cube", "cove_chapel"],
        villages: ["cove_village_a", "cove_village_b"], zones: [0.2, 0.42, 0.72],
      },
    },
  },
  {
    id: "surfside", nameKey: "stage.3", sky: "sky_s3", far: "far_s3",
    skyGrad: [c(0x4b3fc8), c(0x7a4fcc), c(0xb85bc0), c(0xe46fa8), c(0xff9a5a), c(0xffd25a)],
    haze: c(0xffc070), seaH: c(0xa070b8), seaN: c(0x2a4fb8), seaA: c(0x3358be), seaB: c(0x2e52b6), foam: c(0xffe8d8),
    glitter: c(0xffe066), glitter2: c(0xffb040), sunX: 222, sunGlow: 1,
    asphaltA: c(0x6e6a7c), asphaltB: c(0x686476), lane: c(0xfff0dc), rumbleA: c(0xd0342e), rumbleB: c(0xfaece0),
    sandA: c(0xf0c48a), sandB: c(0xe8ba7e), groundA: c(0xe8b67a), groundB: c(0xdeac70),
    wall: "town",
    wallBands: [[c(0xb07a5a), c(0xa47052)], [c(0xc88a62), c(0xbc805a)]],
    wallTop: [c(0x5f8a3a), c(0x578234)],
    railBeam: c(0xfae8e0), railShade: c(0xb090a0), railPost: c(0x8a7088),
    tint: [1.06, 0.9, 0.9],
    landProps: [["palm_a", 4], ["palm_c", 3], ["shack", 1.2], ["house", 1], ["billboard_a", 0.8], ["bush_b", 2], ["surfboards", 1]],
    topProps: [["palm_a", 1]],
    seaProps: [["umbrella_a", 3], ["umbrella_b", 3], ["lifeguard", 1], ["surfboards", 1.5], ["palm_c", 1.5], ["grass_a", 1]],
    groups: true,
    traffic: 2.6, carSpeed: [0.36, 0.66], lanesChange: 0.08,
  },
  {
    id: "cypress-point", nameKey: "stage.4", sky: "sky_s4", far: "far_s4",
    skyGrad: [c(0x2e2470), c(0x5a3090), c(0xa0408e), c(0xe05a6a), c(0xff8a3a)],
    haze: c(0xe8705a), seaH: c(0xb05a78), seaN: c(0x2e2a70), seaA: c(0x353078), seaB: c(0x312c72), foam: c(0xf8d0d0),
    glitter: c(0xffa050), glitter2: c(0xff7040), sunX: 215, sunGlow: 0.85,
    asphaltA: c(0x5e5670), asphaltB: c(0x58506a), lane: c(0xf8dcd0), rumbleA: c(0xc83030), rumbleB: c(0xf0d8d0),
    sandA: c(0xb89070), sandB: c(0xae8668), groundA: c(0x4f6a3e), groundB: c(0x486238),
    wall: "forest",
    wallBands: [[c(0x6a4a4a), c(0x624444)], [c(0x7a5650), c(0x704e4a)], [c(0x3e5a36), c(0x385232)]],
    wallTop: [c(0x2e4a2e), c(0x2a442a)],
    railBeam: c(0xe8d0d0), railShade: c(0x987890), railPost: c(0x705a70),
    tint: [1.0, 0.8, 0.84],
    landProps: [["cypress", 4], ["rock_a", 2], ["bush_a", 2], ["rock_b", 1]],
    topProps: [["cypress", 4], ["bush_a", 2]],
    seaProps: [["cypress", 1.5], ["rock_a", 2], ["rock_b", 3], ["grass_a", 2]],
    traffic: 2.9, carSpeed: [0.42, 0.7], lanesChange: 0.1,
    terrain: {
      low: c(0x2a4430), mid: c(0x3a5c3a), high: c(0x587a44), light: c(0x789a4c), light2: c(0x9ab460),
      shade: c(0x223a2a), shade2: c(0x182a22),
      rock: [c(0x3a2a34), c(0x6e5a62), c(0x9c8688), c(0xcab4aa)], stone: [c(0x6e5a62), c(0x9c8688), c(0xcab4aa)],
      rim: c(0x86a458), meadows: 0.9, hollows: 0.9, outcrops: 0.8, terraces: 0,
      scene: {
        trees: [["cypress", 3], ["cyp_c", 2], ["cyp_d", 1.6], ["cyp_e", 1.6], ["stone_pine", 1.4], ["cypress_tall", 1.5]],
        shrubs: [["bush_a", 2], ["bush_b", 1], ["bush_f", 1.2], ["bush_c", 1]],
        roadside: [["cypress", 3.9], ["cyp_c", 2.6], ["cyp_d", 2.1], ["cyp_e", 2.1], ["stone_pine", 1.8], ["cypress_tall", 2], ["bush_a", 2], ["bush_b", 1], ["rock_a", 1.4], ["rock_b", 1]],
        rocks: ["point_rock_a", "point_rock_b", "point_rock_c", "point_rock_d"], tufts: ["grass_a", "cove_tuft_b"],
        zones: [0.18, 0.72, 0.72],
      },
    },
  },
  {
    id: "twilight-bay", nameKey: "stage.5", sky: "sky_s5", far: "far_s5",
    skyGrad: [c(0x0e1236), c(0x1e2058), c(0x3a2a78), c(0x6a3a8a), c(0xb04f8a), c(0xe8789a)],
    haze: c(0x9a5a8e), seaH: c(0x6a4a8a), seaN: c(0x1a1a40), seaA: c(0x1e1e48), seaB: c(0x1b1b44), foam: c(0xb0a0d0),
    glitter: c(0xffd080), glitter2: c(0xff9a70), sunX: 210, sunGlow: 0.45,
    asphaltA: c(0x4a4660), asphaltB: c(0x46425a), lane: c(0xe8dcf0), rumbleA: c(0xa83040), rumbleB: c(0xd8cce4),
    sandA: c(0x8a7488), sandB: c(0x826c80), groundA: c(0x3a3a5a), groundB: c(0x363654),
    wall: "hill",
    wallBands: [[c(0x3a3458), c(0x363052)], [c(0x423a62), c(0x3e365c)], [c(0x2e3a50), c(0x2a364a)]],
    wallTop: [c(0x24304a), c(0x202c44)],
    railBeam: c(0xc8c0e0), railShade: c(0x7a7098), railPost: c(0x5a5078),
    tint: [0.62, 0.6, 0.86],
    landProps: [["lamp_lit", 3], ["house_lit", 1.5], ["palm_b", 2], ["palm_c", 2], ["bush_a", 1]],
    topProps: [["house_lit", 3], ["palm_c", 1]],
    seaProps: [["lamp_lit", 2], ["palm_c", 2], ["rock_b", 1]],
    traffic: 3.2, carSpeed: [0.42, 0.72], lanesChange: 0.12,
    dark: 1,
  },
  // ------------------------------------------------------------ inland routes
  {
    // 5: a stormy interstate — rain, wet road, lightning
    id: "thunder-highway", nameKey: "stage.6", sky: "sky_s6", far: "far_s6",
    skyGrad: [c(0x2a2e48), c(0x3a3e5a), c(0x4e5068), c(0x6a6474), c(0xc08a5a)],
    haze: c(0x6a7384), seaH: c(0x4a5560), seaN: c(0x2e3a34), seaA: c(0x2e3a34), seaB: c(0x2e3a34), foam: c(0xc0c8d0),
    glitter: c(0xffffff), glitter2: c(0xc0c8d0), sunX: 225, sunGlow: 0,
    asphaltA: c(0x4c4e5c), asphaltB: c(0x484a58), lane: c(0xf2ecd0), rumbleA: c(0xd8dade), rumbleB: c(0x8a8e98),
    sandA: c(0x70747c), sandB: c(0x6a6e76), groundA: c(0x3e5a3e), groundB: c(0x3a543a),
    wall: "sound",
    wallBands: [[c(0x7a7e88), c(0x74787f)], [c(0x8a8e96), c(0x84888f)], [c(0x9a9ea4), c(0x94989e)]],
    wallTop: [c(0x5a5e66), c(0x565a62)],
    railBeam: c(0xd8dce0), railShade: c(0x8a929e), railPost: c(0x6a727e),
    tint: [0.74, 0.78, 0.9],
    landProps: [["pylon", 0.6], ["hwy_sign", 0.8], ["bush_a", 2], ["billboard_a", 0.7], ["billboard_b", 0.7]],
    topProps: [],
    seaProps: [],
    rightProps: [["pylon", 0.5], ["bush_a", 2], ["barrier", 1], ["hwy_sign", 0.4]],
    rhythm: [{ name: "hwy_lamp_lit", every: 14, x: [-1.42, 1.42], flipRight: true }],
    gantry: 640,
    side: "land", landH: c(0x4a5560), landN: c(0x2e3a34), wallR: "sound",
    weather: "rain", dark: 0.62, icon: "icon_highway",
    shape: { twist: 0.5, hills: 0.6, straights: 0.35 },
    traffic: 3.0, carSpeed: [0.46, 0.72], lanesChange: 0.1,
  },
  {
    // 6: wine country at sunset
    id: "vineyard-valley", nameKey: "stage.7", sky: "sky_s7", far: "far_s7",
    skyGrad: [c(0x3a2c8a), c(0x7a3c9a), c(0xd05a8a), c(0xff8a5a), c(0xffc060)],
    haze: c(0xf0b070), seaH: c(0x7a7a3a), seaN: c(0x4f6a2a), seaA: c(0x4f6a2a), seaB: c(0x4f6a2a), foam: c(0xfff0d0),
    glitter: c(0xffe066), glitter2: c(0xffb040), sunX: 222, sunGlow: 0,
    asphaltA: c(0x6e6a72), asphaltB: c(0x68646c), lane: c(0xfff0dc), rumbleA: c(0xd0342e), rumbleB: c(0xfaece0),
    sandA: c(0xc8a06a), sandB: c(0xbe9862), groundA: c(0x6a8a32), groundB: c(0x587826),
    wall: "hill",
    wallBands: [[c(0x6a8a32), c(0x5e7e2c)], [c(0x7e9a3a), c(0x6e8a32)], [c(0x96a446), c(0x86963e)]],
    wallTop: [c(0x4e6a26), c(0x486224)],
    railBeam: c(0xf0e8e0), railShade: c(0xa89a90), railPost: c(0x84786e),
    tint: [1.06, 0.93, 0.88],
    landProps: [["cypress_tall", 3], ["olive", 2], ["winery", 0.5], ["barrels", 1], ["haybale", 1.2], ["windmill", 0.25]],
    topProps: [["cypress_tall", 4], ["olive", 2], ["winery", 0.6]],
    seaProps: [],
    rightProps: [["cypress_tall", 2], ["olive", 2], ["haybale", 1.5], ["barrels", 0.8], ["windmill", 0.3], ["winery", 0.3]],
    rhythm: [{ name: "vines", every: 3, x: [-1.55, -2.25, 1.55, 2.25, 2.95], jitter: 0.04 }],
    side: "land", landH: c(0x7a7a3a), landN: c(0x4f6a2a), wallR: "none",
    weather: "clear", icon: "icon_vineyard",
    shape: { twist: 1.5, hills: 1.5, straights: 0.15 },
    traffic: 2.4, carSpeed: [0.38, 0.64], lanesChange: 0.07,
  },
  {
    // 7: giant redwoods in thick fog
    id: "redwood-pass", nameKey: "stage.8", sky: "sky_s8", far: "far_s8",
    skyGrad: [c(0x6a6a80), c(0x8a8a98), c(0xb0a8ac), c(0xd0c0b8), c(0xe0c8b8)],
    haze: c(0xa4a8a0), seaH: c(0x8a8e8a), seaN: c(0x3a4a3a), seaA: c(0x3a4a3a), seaB: c(0x3a4a3a), foam: c(0xe0e0e0),
    glitter: c(0xffffff), glitter2: c(0xe0e0e0), sunX: 222, sunGlow: 0,
    asphaltA: c(0x5a5a64), asphaltB: c(0x56565f), lane: c(0xece8dc), rumbleA: c(0xc83030), rumbleB: c(0xe8e0d8),
    sandA: c(0x6e5a46), sandB: c(0x685442), groundA: c(0x34502e), groundB: c(0x304a2a),
    wall: "forest",
    wallBands: [[c(0x5a3a2e), c(0x54362a)], [c(0x2e4a2c), c(0x2a4428)], [c(0x223c24), c(0x1e3620)]],
    wallTop: [c(0x1a301c), c(0x182c1a)],
    railBeam: c(0xd8d4cc), railShade: c(0x8a8a84), railPost: c(0x6a6a64),
    tint: [0.8, 0.86, 0.84],
    landProps: [["redwood", 5], ["pine", 3], ["fern", 3], ["log", 1], ["cabin_lit", 0.35]],
    topProps: [["pine", 4], ["redwood", 2]],
    seaProps: [],
    rightProps: [["redwood", 5], ["pine", 3], ["fern", 3], ["log", 1], ["cabin_lit", 0.25]],
    side: "land", landH: c(0x8a8e8a), landN: c(0x3a4a3a), wallR: "forest",
    weather: "fog", dark: 0.5, icon: "icon_forest",
    shape: { twist: 3.2, hills: 1.1, straights: 0.1 },
    traffic: 2.2, carSpeed: [0.36, 0.6], lanesChange: 0.05,
  },
  {
    // 8: red-rock desert in a sandstorm
    id: "painted-desert", nameKey: "stage.9", sky: "sky_s9", far: "far_s9",
    skyGrad: [c(0x8a5a3a), c(0xb87a4a), c(0xd8985a), c(0xe8b878), c(0xf0d0a0)],
    haze: c(0xd09a64), seaH: c(0xc08a5a), seaN: c(0xb06a3a), seaA: c(0xb06a3a), seaB: c(0xb06a3a), foam: c(0xf0d8b0),
    glitter: c(0xfff0c0), glitter2: c(0xffd090), sunX: 222, sunGlow: 0,
    asphaltA: c(0x6a5c5c), asphaltB: c(0x645656), lane: c(0xffe8c0), rumbleA: c(0xd0402e), rumbleB: c(0xf0e0c8),
    sandA: c(0xdca46a), sandB: c(0xd49c62), groundA: c(0xc8804c), groundB: c(0xbe7646),
    wall: "none",
    wallBands: [[c(0xb0603a), c(0xa45836)], [c(0xc87446), c(0xbc6c40)]],
    wallTop: [c(0xd88a50), c(0xcc8248)],
    railBeam: c(0xf0e0d0), railShade: c(0xb09080), railPost: c(0x8a7060),
    tint: [1.04, 0.9, 0.8],
    landProps: [["saguaro", 4], ["cactus", 3], ["desert_bush", 3], ["mesa_rock", 1.2], ["tumbleweed", 1.5], ["gas_station", 0.12]],
    topProps: [],
    seaProps: [],
    rightProps: [["saguaro", 4], ["cactus", 3], ["desert_bush", 3], ["mesa_rock", 1.4], ["tumbleweed", 1.5], ["gas_station", 0.1]],
    side: "land", landH: c(0xc08a5a), landN: c(0xb06a3a), wallR: "none",
    weather: "sand", dark: 0.38, icon: "icon_desert",
    shape: { twist: 0.8, hills: 1.4, straights: 0.4 },
    traffic: 2.0, carSpeed: [0.42, 0.68], lanesChange: 0.05,
  },
  {
    // 9: salt flats and badlands, shimmering with heat
    id: "death-valley", nameKey: "stage.10", sky: "sky_s10", far: "far_s10",
    skyGrad: [c(0x3a2470), c(0x7a3088), c(0xc8487a), c(0xf07a50), c(0xff9a40)],
    haze: c(0xe8a890), seaH: c(0xd8b8b0), seaN: c(0xb89a8a), seaA: c(0xb89a8a), seaB: c(0xb89a8a), foam: c(0xfff0f0),
    glitter: c(0xffe0c0), glitter2: c(0xffc0a0), sunX: 215, sunGlow: 0,
    asphaltA: c(0x5e5662), asphaltB: c(0x58505c), lane: c(0xfff0e0), rumbleA: c(0xc83030), rumbleB: c(0xf0dcd0),
    sandA: c(0xd8c2b8), sandB: c(0xd0bab0), groundA: c(0xe6d6cc), groundB: c(0xdccbc0),
    wall: "cliff",
    wallBands: [[c(0x4a3040), c(0x442c3a)], [c(0x5a3a48), c(0x523442)], [c(0x6e4650), c(0x664049)], [c(0x84564e), c(0x7a4e48)]],
    wallTop: [c(0x5a3a40), c(0x54363c)],
    railBeam: c(0xf0e0e0), railShade: c(0xa89098), railPost: c(0x806870),
    tint: [1.02, 0.86, 0.86],
    landProps: [["dead_tree", 3], ["rock_dark", 3], ["skull_post", 1.5], ["wreck", 0.4], ["pump_windmill", 0.5]],
    topProps: [],
    seaProps: [],
    rightProps: [["dead_tree", 2.5], ["rock_dark", 2.5], ["skull_post", 1.2], ["wreck", 0.5], ["pump_windmill", 0.6]],
    rhythm: [{ name: "tele_pole", every: 18, x: [1.62] }],
    side: "land", landH: c(0xd8b8b0), landN: c(0xb89a8a), wallR: "none",
    weather: "heat", dark: 0.22, icon: "icon_valley",
    shape: { twist: 0.6, hills: 0.7, straights: 0.5 },
    traffic: 2.4, carSpeed: [0.46, 0.74], lanesChange: 0.08,
  },
  {
    // 10: downtown at night — canyons of lit towers, neon signs and tunnels
    id: "neon-city", nameKey: "stage.11", sky: "sky_s11", far: "far_s11",
    skyGrad: [c(0x070820), c(0x12103a), c(0x2a1458), c(0x5a1a78), c(0xa02a8a), c(0xd0508e)],
    haze: c(0x40285e), seaH: c(0x2a1e44), seaN: c(0x18142a), seaA: c(0x18142a), seaB: c(0x18142a), foam: c(0xd0c0f0),
    glitter: c(0xffffff), glitter2: c(0xffc0e0), sunX: 222, sunGlow: 0,
    asphaltA: c(0x38344e), asphaltB: c(0x34304a), lane: c(0xece4ff), rumbleA: c(0xd8308a), rumbleB: c(0x2ab4d8),
    sandA: c(0x544e6a), sandB: c(0x504a66), groundA: c(0x3e3856), groundB: c(0x3a3452),
    wall: "city",
    wallBands: [[c(0x2c2e52), c(0x282a4c)], [c(0x3c2c56), c(0x382850)], [c(0x203648), c(0x1e3244)], [c(0x44344e), c(0x3e3048)], [c(0x302c42), c(0x2c283e)]],
    wallTop: [c(0xff3ab0), c(0x3af0ff)],
    railBeam: c(0xc8c0e0), railShade: c(0x7a7098), railPost: c(0x5a5078),
    tint: [0.8, 0.74, 0.98],
    landProps: [["neon_palm_lit", 3], ["hydrant", 1.2], ["food_cart_lit", 0.8], ["bus_stop_lit", 0.7], ["neon_billboard_lit", 0.5], ["signal_lit", 0.6]],
    topProps: [["neon_blade_a_lit", 1], ["neon_blade_b_lit", 1], ["neon_blade_c_lit", 1], ["neon_blade_d_lit", 1]],
    seaProps: [],
    rightProps: [["neon_palm_lit", 3], ["hydrant", 1.2], ["food_cart_lit", 0.8], ["bus_stop_lit", 0.7], ["neon_billboard_lit", 0.5], ["signal_lit", 0.6]],
    rhythm: [{ name: "city_lamp_lit", every: 12, x: [-1.5, 1.5], flipRight: true }],
    gantry: 460, gantryName: "neon_arch_lit",
    tunnels: { count: 3, min: 130, max: 230 },
    windows: [c(0xffd890), c(0xffe8b8), c(0x9af0ff), c(0xff9ad8), c(0xfff4d8)],
    windowDark: c(0x161830),
    neon: [c(0xff3ab0), c(0x3af0ff), c(0xffe04a), c(0xb46aff)],
    side: "land", landH: c(0x221838), landN: c(0x120c22), wallR: "city",
    weather: "night", dark: 1, icon: "icon_city",
    shape: { twist: 1.4, hills: 0.45, straights: 0.3 },
    traffic: 3.4, carSpeed: [0.4, 0.68], lanesChange: 0.11,
  },
  // ------------------------------------- added with the Out Run triangle (provisional looks:
  // recoloured backdrops and existing roadside props until each stage gets its own art)
  {
    // 11: a snowy mountain pass in the late-afternoon cold
    id: "snowcap-pass", nameKey: "stage.12", sky: "sky_s12", far: "far_s12",
    skyGrad: [c(0x2a3a78), c(0x4a5ca0), c(0x8a8cc0), c(0xd8a0b0), c(0xf0b890)],
    haze: c(0xc8cce0), seaH: c(0xb8c0d8), seaN: c(0x8a94b0), seaA: c(0x8a94b0), seaB: c(0x8a94b0), foam: c(0xffffff),
    glitter: c(0xffffff), glitter2: c(0xe0e8ff), sunX: 218, sunGlow: 0,
    asphaltA: c(0x5a5a6c), asphaltB: c(0x56566a), lane: c(0xf4f4f8), rumbleA: c(0xc83038), rumbleB: c(0xf0f0f8),
    sandA: c(0xdce4f0), sandB: c(0xd2dbea), groundA: c(0xeef2fa), groundB: c(0xe4eaf4),
    wall: "cliff",
    wallBands: [[c(0x6a7088), c(0x646a82)], [c(0x8a90a8), c(0x8288a0)], [c(0xc8d0e4), c(0xbec6dc)], [c(0xeef2fa), c(0xe6ecf6)]],
    wallTop: [c(0xf8fbff), c(0xeef2fa)],
    railBeam: c(0xe0e4f0), railShade: c(0x8a90a8), railPost: c(0x6a7088),
    tint: [0.9, 0.95, 1.08],
    landProps: [["snow_pine", 5], ["snow_fir", 3], ["snow_rock", 2], ["snow_drift", 3], ["snowman", 0.22], ["snow_log", 0.8], ["cabin_snow_lit", 0.3], ["snow_dead_tree", 0.8]],
    topProps: [["snow_pine", 4], ["snow_fir", 3]],
    seaProps: [],
    rightProps: [["snow_pine", 5], ["snow_fir", 3], ["snow_rock", 2], ["snow_drift", 3], ["snowman", 0.18], ["snow_log", 0.8], ["cabin_snow_lit", 0.25], ["snow_dead_tree", 0.8]],
    rhythm: [{ name: "snow_pole", every: 12, x: [-1.45, 1.45] }],
    side: "land", landH: c(0xc8d0e4), landN: c(0xdce4f0), wallR: "cliff",
    weather: "snow", dark: 0.35, icon: "icon_snow", dust: c(0xf4f8ff),
    shape: { twist: 2.8, hills: 1.8, straights: 0.12 },
    traffic: 2.0, carSpeed: [0.36, 0.62], lanesChange: 0.05,
  },
  {
    // 12: a dusty gold-rush town at dusk (goal B)
    id: "gold-rush-town", nameKey: "stage.13", sky: "sky_s13", far: "far_s13",
    skyGrad: [c(0x2a1a5a), c(0x6a2a78), c(0xb8486a), c(0xe87a4a), c(0xffa040)],
    haze: c(0xd8906a), seaH: c(0xc88a6a), seaN: c(0xa86a4a), seaA: c(0xa86a4a), seaB: c(0xa86a4a), foam: c(0xf0d8b0),
    glitter: c(0xfff0c0), glitter2: c(0xffd090), sunX: 214, sunGlow: 0,
    asphaltA: c(0x6a5a5a), asphaltB: c(0x645454), lane: c(0xffe8c8), rumbleA: c(0xc83a2a), rumbleB: c(0xf0e0c8),
    sandA: c(0xd89a62), sandB: c(0xd09258), groundA: c(0xc4844e), groundB: c(0xba7a46),
    wall: "hill",
    wallBands: [[c(0x8a3e30), c(0x803a2c)], [c(0xa8503a), c(0x9e4a36)], [c(0xc06a44), c(0xb6623e)]],
    wallTop: [c(0xa86a3a), c(0x9e6236)],
    railBeam: c(0xf0e0d0), railShade: c(0xb09080), railPost: c(0x8a7060),
    tint: [1.04, 0.86, 0.82],
    landProps: [["saloon_lit", 1.3], ["store_lit", 1.2], ["water_tower", 0.6], ["wagon", 1], ["mine_cart", 0.8], ["hitch_rail", 1.4], ["red_rock", 2], ["saguaro", 2.5], ["cactus", 1.6], ["barrels", 1.2], ["haybale", 0.9], ["tumbleweed", 1.5], ["wreck", 0.3], ["pump_windmill", 0.5]],
    topProps: [["red_rock", 1], ["saguaro", 2]],
    seaProps: [],
    rightProps: [["saloon_lit", 1.3], ["store_lit", 1.2], ["water_tower", 0.6], ["wagon", 1], ["mine_cart", 0.8], ["hitch_rail", 1.4], ["red_rock", 2], ["saguaro", 2.5], ["cactus", 1.6], ["barrels", 1.2], ["haybale", 0.9], ["tumbleweed", 1.5], ["wreck", 0.3], ["pump_windmill", 0.5]],
    rhythm: [{ name: "gas_lamp_lit", every: 14, x: [-1.55, 1.55], flipRight: true }],
    side: "land", landH: c(0xc88a5a), landN: c(0xb87444), wallR: "none",
    weather: "heat", dark: 0.6, icon: "icon_western",
    shape: { twist: 1.2, hills: 1.2, straights: 0.35 },
    traffic: 2.2, carSpeed: [0.42, 0.7], lanesChange: 0.06,
  },
  {
    // 13: a mountain lake in the twilight, pines along the shore (goal C)
    id: "crystal-lake", nameKey: "stage.14", sky: "sky_s14", far: "far_s14",
    skyGrad: [c(0x101a40), c(0x1e2e60), c(0x34407a), c(0x5a4a8a), c(0x9a5a8a), c(0xd0789a)],
    haze: c(0x6a6a9a), seaH: c(0x5a6a9a), seaN: c(0x14304a), seaA: c(0x183650), seaB: c(0x16324c), foam: c(0xc0e0f0),
    glitter: c(0xfff4c8), glitter2: c(0xc4d0f0), sunX: 205, sunGlow: 0.95,
    asphaltA: c(0x4a4c60), asphaltB: c(0x464858), lane: c(0xe8eef8), rumbleA: c(0xb03040), rumbleB: c(0xdce4f0),
    sandA: c(0x7a8270), sandB: c(0x727a68), groundA: c(0x2e4a3e), groundB: c(0x2a4438),
    wall: "forest",
    wallBands: [[c(0x3a3a4a), c(0x36364a)], [c(0x24443a), c(0x204036)], [c(0x1a3a32), c(0x18362e)]],
    wallTop: [c(0x14302a), c(0x122c26)],
    railBeam: c(0xc8d0e0), railShade: c(0x7a8098), railPost: c(0x5a6078),
    tint: [0.7, 0.76, 0.9],
    landProps: [["lake_spruce", 5], ["birch", 2.2], ["lake_rock", 1.4], ["cabin_lit", 0.5], ["fern", 2]],
    topProps: [["lake_spruce", 4]],
    seaProps: [["reeds", 4], ["lake_rock", 1.4], ["rowboat", 0.6], ["campfire_lit", 0.45], ["grass_a", 2], ["birch", 1]],
    waterProps: [["lily", 4], ["reeds", 1.6]],
    rhythm: [{ name: "lantern_lit", every: 16, x: [1.45] }],
    noRail: true,
    weather: "clear", dark: 0.85, icon: "icon_lake",
    shape: { twist: 2.0, hills: 1.0, straights: 0.2 },
    traffic: 2.6, carSpeed: [0.4, 0.68], lanesChange: 0.08,
  },
  {
    // 14: a mountain road up to the observatory under the stars (goal D)
    id: "starlight-summit", nameKey: "stage.15", sky: "sky_s15", far: "far_s15",
    skyGrad: [c(0x05061a), c(0x0c1030), c(0x1a1a48), c(0x2e2a62), c(0x4a3a7a)],
    haze: c(0x2a2a50), seaH: c(0x30365a), seaN: c(0x26304a), seaA: c(0x26304a), seaB: c(0x26304a), foam: c(0xc0c0e0),
    glitter: c(0xffffff), glitter2: c(0xc0c0ff), sunX: 220, sunGlow: 0,
    asphaltA: c(0x3e3e52), asphaltB: c(0x3a3a4e), lane: c(0xdcdcf0), rumbleA: c(0xa02a3a), rumbleB: c(0xc8c8e0),
    sandA: c(0x4a4a62), sandB: c(0x46465c), groundA: c(0x26304a), groundB: c(0x232c44),
    wall: "hill",
    wallBands: [[c(0x1e2038), c(0x1c1e34)], [c(0x2a2c4a), c(0x272944)], [c(0x363a5c), c(0x323656)], [c(0x444a70), c(0x40466a)]],
    wallTop: [c(0x2a3050), c(0x262c4a)],
    railBeam: c(0xc8c8e0), railShade: c(0x6a6a90), railPost: c(0x4a4a70),
    tint: [0.56, 0.58, 0.82],
    landProps: [["rock_dark", 3], ["pine", 3], ["dead_tree", 1.2]],
    topProps: [["pine", 3]],
    seaProps: [],
    rightProps: [["rock_dark", 3], ["pine", 2.5], ["dead_tree", 1]],
    rhythm: [{ name: "lamp_lit", every: 16, x: [1.5] }],
    side: "land", landH: c(0x30365a), landN: c(0x26304a), wallR: "hill",
    weather: "night", dark: 1, icon: "icon_star",
    shape: { twist: 3.0, hills: 2.0, straights: 0.1 },
    traffic: 1.8, carSpeed: [0.36, 0.62], lanesChange: 0.05,
    terrain: {
      low: c(0x1f2642), mid: c(0x2c3558), high: c(0x3c466e), light: c(0x4a5886), light2: c(0x6874a6),
      shade: c(0x181e36), shade2: c(0x121828),
      rock: [c(0x141a2c), c(0x2c3350), c(0x4a5476), c(0x7886a8)], stone: [c(0x38426a), c(0x56628a), c(0x8894b6)],
      rim: c(0x5c6a94), meadows: 0.7, hollows: 0.8, outcrops: 0.9, terraces: 0,
      scene: {
        trees: [["night_pine", 3], ["night_pine_b", 2], ["night_pine_c", 2], ["night_pine_d", 1.6], ["night_pine_e", 1.4], ["dead_tree", 0.8]],
        shrubs: [["bush_a", 1], ["bush_f", 1]],
        roadside: [["night_pine", 3.9], ["night_pine_b", 2.6], ["night_pine_c", 2.6], ["night_pine_d", 2], ["night_pine_e", 1.8], ["dead_tree", 1], ["rock_dark", 3]],
        rocks: ["summit_rock_a", "summit_rock_b", "summit_rock_c", "summit_rock_d"], tufts: [],
        zones: [0.22, 0.68, 0.68],
      },
    },
  },
];

/** Default shape of the coast stages: twist grows with the column like the original road. */
export function themeShape(th: Theme, col: number): { twist: number; hills: number; straights: number } {
  return th.shape ?? { twist: col, hills: 1, straights: 0.18 };
}

/** Prop footprint widths (world-relative collision half widths are derived in track.ts). */
export const PROP_INFO: Record<string, { scale: number; solid: boolean; hit: number }> = {
  // painted-slope stage modules (art: tools/art/scenery/make_cove.py)
  palm_d: { scale: 2.0, solid: true, hit: 0.22 }, palm_e: { scale: 2.0, solid: true, hit: 0.2 }, palm_f: { scale: 2.0, solid: true, hit: 0.3 },
  palm_g: { scale: 2.0, solid: true, hit: 0.2 }, palm_h: { scale: 2.0, solid: true, hit: 0.26 },
  bush_c: { scale: 1.6, solid: false, hit: 0 }, bush_d: { scale: 1.6, solid: false, hit: 0 }, bush_e: { scale: 1.5, solid: false, hit: 0 }, bush_f: { scale: 1.5, solid: false, hit: 0 },
  cove_villa_a: { scale: 2.0, solid: false, hit: 0 }, cove_villa_b: { scale: 2.0, solid: false, hit: 0 }, cove_cottage: { scale: 2.0, solid: false, hit: 0 },
  cove_cube: { scale: 2.0, solid: false, hit: 0 }, cove_row: { scale: 2.0, solid: false, hit: 0 }, cove_chapel: { scale: 2.0, solid: false, hit: 0 },
  cove_village_a: { scale: 3.4, solid: false, hit: 0 }, cove_village_b: { scale: 3.4, solid: false, hit: 0 },
  cove_rock_a: { scale: 2.3, solid: false, hit: 0 }, cove_rock_b: { scale: 2.3, solid: false, hit: 0 }, cove_rock_c: { scale: 2.3, solid: false, hit: 0 }, cove_rock_d: { scale: 2.3, solid: false, hit: 0 },
  cove_wall_a: { scale: 2.2, solid: false, hit: 0 }, cove_wall_b: { scale: 2.2, solid: false, hit: 0 }, cove_wall_c: { scale: 2.2, solid: false, hit: 0 },
  cove_tuft_a: { scale: 1.8, solid: false, hit: 0 }, cove_tuft_b: { scale: 1.8, solid: false, hit: 0 },
  // Coral Bluffs / Cypress Point / Starlight Summit variants (tools/art/scenery/make_stage_variants.py)
  bluff_rock_a: { scale: 2.3, solid: false, hit: 0 }, bluff_rock_b: { scale: 2.3, solid: false, hit: 0 }, bluff_rock_c: { scale: 2.3, solid: false, hit: 0 }, bluff_rock_d: { scale: 2.3, solid: false, hit: 0 },
  point_rock_a: { scale: 2.3, solid: false, hit: 0 }, point_rock_b: { scale: 2.3, solid: false, hit: 0 }, point_rock_c: { scale: 2.3, solid: false, hit: 0 }, point_rock_d: { scale: 2.3, solid: false, hit: 0 },
  summit_rock_a: { scale: 2.3, solid: false, hit: 0 }, summit_rock_b: { scale: 2.3, solid: false, hit: 0 }, summit_rock_c: { scale: 2.3, solid: false, hit: 0 }, summit_rock_d: { scale: 2.3, solid: false, hit: 0 },
  cyp_c: { scale: 2.6, solid: true, hit: 0.3 }, cyp_d: { scale: 2.4, solid: true, hit: 0.3 }, cyp_e: { scale: 2.4, solid: true, hit: 0.22 }, stone_pine: { scale: 2.6, solid: true, hit: 0.22 },
  night_pine_b: { scale: 2.6, solid: true, hit: 0.2 }, night_pine_c: { scale: 2.6, solid: true, hit: 0.25 }, night_pine_d: { scale: 2.6, solid: true, hit: 0.32 }, night_pine_e: { scale: 2.6, solid: true, hit: 0.2 },
  palm_a: { scale: 2.0, solid: true, hit: 0.22 }, palm_b: { scale: 2.0, solid: true, hit: 0.22 }, palm_c: { scale: 2.0, solid: true, hit: 0.22 },
  bush_a: { scale: 1.6, solid: false, hit: 0 }, bush_b: { scale: 1.6, solid: false, hit: 0 }, grass_a: { scale: 1.6, solid: false, hit: 0 },
  rock_a: { scale: 1.8, solid: true, hit: 0.7 }, rock_b: { scale: 1.6, solid: true, hit: 0.6 },
  sea_stack: { scale: 4.5, solid: false, hit: 0 }, cypress: { scale: 2.6, solid: true, hit: 0.25 },
  umbrella_a: { scale: 1.6, solid: false, hit: 0 }, umbrella_b: { scale: 1.6, solid: false, hit: 0 }, surfboards: { scale: 1.6, solid: true, hit: 0.6 },
  lifeguard: { scale: 2.2, solid: true, hit: 0.7 }, shack: { scale: 2.8, solid: true, hit: 0.85 }, house: { scale: 3.0, solid: true, hit: 0.85 },
  house_lit: { scale: 3.0, solid: true, hit: 0.85 }, lamp: { scale: 2.2, solid: true, hit: 0.25 }, lamp_lit: { scale: 2.2, solid: true, hit: 0.25 },
  lighthouse: { scale: 3.2, solid: true, hit: 0.6 }, billboard_a: { scale: 2.5, solid: true, hit: 0.85 }, billboard_b: { scale: 2.5, solid: true, hit: 0.85 },
  sign_left: { scale: 1.8, solid: true, hit: 0.35 }, sign_right: { scale: 1.8, solid: true, hit: 0.35 }, crowd: { scale: 1.6, solid: true, hit: 0.8 },
  gate: { scale: 2.32, solid: false, hit: 0 }, gate_goal: { scale: 2.32, solid: false, hit: 0 },
  // route stages
  hwy_lamp_lit: { scale: 2.6, solid: true, hit: 0.2 }, pylon: { scale: 3.2, solid: true, hit: 0.5 },
  hwy_sign: { scale: 2.2, solid: true, hit: 0.6 }, barrier: { scale: 1.8, solid: true, hit: 0.5 },
  gantry: { scale: 2.32, solid: false, hit: 0 },
  vines: { scale: 1.9, solid: true, hit: 0.5 }, cypress_tall: { scale: 2.6, solid: true, hit: 0.18 },
  olive: { scale: 2.2, solid: true, hit: 0.3 }, winery: { scale: 3.0, solid: true, hit: 0.9 },
  barrels: { scale: 1.8, solid: true, hit: 0.4 }, windmill: { scale: 3.2, solid: true, hit: 0.6 },
  haybale: { scale: 1.8, solid: true, hit: 0.35 },
  redwood: { scale: 3.0, solid: true, hit: 0.35 }, pine: { scale: 2.6, solid: true, hit: 0.25 },
  fern: { scale: 1.7, solid: false, hit: 0 }, log: { scale: 1.9, solid: true, hit: 0.6 },
  cabin_lit: { scale: 2.8, solid: true, hit: 0.9 },
  saguaro: { scale: 2.4, solid: true, hit: 0.22 }, cactus: { scale: 1.8, solid: true, hit: 0.3 },
  mesa_rock: { scale: 3.4, solid: true, hit: 0.95 }, tumbleweed: { scale: 1.6, solid: false, hit: 0 },
  gas_station: { scale: 3.0, solid: true, hit: 1.1 }, desert_bush: { scale: 1.7, solid: false, hit: 0 },
  dead_tree: { scale: 2.4, solid: true, hit: 0.22 }, tele_pole: { scale: 2.6, solid: true, hit: 0.15 },
  skull_post: { scale: 1.7, solid: true, hit: 0.2 }, rock_dark: { scale: 1.9, solid: true, hit: 0.6 },
  wreck: { scale: 2.0, solid: true, hit: 0.75 }, pump_windmill: { scale: 2.8, solid: true, hit: 0.3 },
  fork_sign: { scale: 2.2, solid: true, hit: 0.55 },
  // snowcap pass
  snow_pine: { scale: 2.6, solid: true, hit: 0.25 }, snow_fir: { scale: 2.4, solid: true, hit: 0.2 },
  snow_rock: { scale: 1.8, solid: true, hit: 0.7 }, snow_drift: { scale: 1.7, solid: false, hit: 0 },
  snowman: { scale: 1.5, solid: true, hit: 0.2 }, snow_dead_tree: { scale: 2.4, solid: true, hit: 0.22 },
  snow_log: { scale: 1.9, solid: true, hit: 0.6 }, cabin_snow_lit: { scale: 2.8, solid: true, hit: 0.9 },
  snow_pole: { scale: 2.0, solid: true, hit: 0.1 }, ice_sign: { scale: 2.7, solid: true, hit: 0.3 },
  // gold rush town
  saloon_lit: { scale: 2.7, solid: true, hit: 0.95 }, store_lit: { scale: 2.6, solid: true, hit: 0.8 },
  water_tower: { scale: 2.6, solid: true, hit: 0.4 }, wagon: { scale: 1.9, solid: true, hit: 0.7 },
  mine_cart: { scale: 1.7, solid: true, hit: 0.45 }, hitch_rail: { scale: 1.8, solid: true, hit: 0.5 },
  red_rock: { scale: 1.8, solid: true, hit: 0.7 }, gas_lamp_lit: { scale: 2.4, solid: true, hit: 0.15 },
  // starlight summit
  observatory_lit: { scale: 2.8, solid: true, hit: 0.95 }, radio_dish: { scale: 2.2, solid: true, hit: 0.35 },
  antenna_lit: { scale: 2.8, solid: true, hit: 0.12 }, night_pine: { scale: 2.6, solid: true, hit: 0.25 },
  crystal_lit: { scale: 2.1, solid: true, hit: 0.45 }, tent_lit: { scale: 1.9, solid: true, hit: 0.6 },
  telescope: { scale: 1.9, solid: true, hit: 0.2 },
  // crystal lake
  lake_spruce: { scale: 2.6, solid: true, hit: 0.25 }, birch: { scale: 2.3, solid: true, hit: 0.2 },
  lake_rock: { scale: 1.8, solid: true, hit: 0.5 }, reeds: { scale: 1.8, solid: false, hit: 0 },
  lily: { scale: 1.9, solid: false, hit: 0 }, rowboat: { scale: 1.8, solid: true, hit: 0.5 },
  campfire_lit: { scale: 1.6, solid: false, hit: 0 }, lantern_lit: { scale: 2.4, solid: true, hit: 0.15 },
  // neon city
  city_lamp_lit: { scale: 2.5, solid: true, hit: 0.2 }, neon_palm_lit: { scale: 2.0, solid: true, hit: 0.22 },
  neon_blade_a_lit: { scale: 2.6, solid: false, hit: 0 }, neon_blade_b_lit: { scale: 2.6, solid: false, hit: 0 },
  neon_blade_c_lit: { scale: 2.6, solid: false, hit: 0 }, neon_blade_d_lit: { scale: 2.6, solid: false, hit: 0 },
  neon_billboard_lit: { scale: 2.5, solid: true, hit: 0.85 }, food_cart_lit: { scale: 1.8, solid: true, hit: 0.45 },
  bus_stop_lit: { scale: 2.2, solid: true, hit: 0.8 }, hydrant: { scale: 1.6, solid: true, hit: 0.12 },
  signal_lit: { scale: 2.4, solid: true, hit: 0.15 },
  neon_arch_lit: { scale: 2.32, solid: false, hit: 0 },
};

/** Sprite names drawn on top of the road like the gate banner (overhead structures). */
export const OVERHEAD = new Set(["gate", "gate_goal", "gantry", "neon_arch_lit"]);
