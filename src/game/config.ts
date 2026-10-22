// World scale and handling constants.
export const HORIZON = 80;          // screen row of the sea horizon
export const FOCAL = 140;           // focal length in pixels
export const CAM_H = 1000;          // camera height above the road
export const PLAYER_Z = 1522;       // player car distance ahead of the camera (car base ≈ row 172)
export const SPR_S = PLAYER_Z / FOCAL; // world units per sprite pixel at scale 1 (sprite drawn 1:1 at the player)
export const SEG_LEN = 300;
export const ROAD_W = 2900;         // half width of the road
export const LANES = 4;
export const DRAW_DIST = 270;       // segments
export const FOG_START = 0.45;      // fraction of the draw distance where haze begins

export const MAX_SPEED = SEG_LEN * 92;  // world units per second (~92 segments/s)
export const KMH_AT_MAX = 293;
export const ACCEL = MAX_SPEED / 5.2;
export const BRAKE = -MAX_SPEED / 1.6;
export const DECEL = -MAX_SPEED / 7;
export const OFFROAD_DECEL = -MAX_SPEED / 1.3;
export const OFFROAD_LIMIT = MAX_SPEED * 0.42;
export const CENTRIFUGAL = 0.48;
export const STEER = 2.3;

export const CAR_W = 80 * SPR_S;    // player car width in world units
export const STAGE_COUNT = 5;
export const RAIL_X = 1.5;          // sea-side guardrail (road half-widths)
