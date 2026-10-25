// Velvet Cruise — boot, screens and the frame loop. Every pixel is drawn by
// the software renderer into a 320x180 framebuffer that Phaser shows upscaled.
import Phaser from "phaser";
import { FB, W, H, rgb } from "./core/fb";
import { SpriteBank, AtlasJson } from "./core/assets";
import { drawText, setFontLocale, textWidth } from "./core/font";
import { Track } from "./game/track";
import { Race } from "./game/race";
import { Renderer } from "./game/render";
import { Hud, C, GRAD_SUN, GRAD_RED, GRAD_PINK, GRAD_CYAN, big, label, panel, button, fmtTime, fit, para, star, drawForkPanel } from "./game/ui";
import { CourseMap } from "./game/coursemap";
import { LinkLayer, LinkRect } from "./game/links";
import { COLS, COAST_PATH, GOAL_A_PATH, COLUMN_NODES, NEXT, NODE_COUNT, completePath, goalLetter, validPath } from "./game/routes";
import { DEMO_A, SAVE_PREFIX } from "./game/edition";
import { GameAudio, MusicJson } from "./audio/audio";
import { initTesana, onTesanaReady, servicesOnline, t, onLocaleChange, locale, track as analytics, submitScore, topScores, myBest, fmtNum, BoardEntry, isTestSdk } from "./platform/tesana";
import { Input, TOUCH, inRect, Rect, CONTROL_PREFS, ControlPref } from "./input";
import { THEMES } from "./game/themes";
import { STAGE_COUNT, MAX_SPEED } from "./game/config";
import type { Gate } from "./game/track";
import { Passenger, face } from "./game/passenger";
import { Shouts } from "./game/shouts";
import { DIFFS, Difficulty, DiffId, diffById } from "./game/difficulty";
import { boardId, STAGE_BEST_KEY } from "./game/rules";
import type { Car } from "./game/race";
import { CARS, CarDef, carById, carUnlocked, rememberCarGoals } from "./game/cars";
import { ArcadeEntry, ARCADE_SIZE, NAME_MAX, arcadeTable, arcadeRank, arcadeInsert, nameChar, cleanName, lastName, saveName } from "./game/arcade";
import { Badges, BADGES, BADGE_TYPES, BADGE_ROWS, GOAL_BASES, TIERS, TIER_RIM, NEAR_MISS_RUN, drawMedal, badgeName, badgeDesc, badgeId, statId, tierName } from "./game/badges";
import { GoalProgressStore, GOAL_PROGRESS_KEY, GOAL_LETTERS, goalCount, type GoalLetter } from './game/goal-progress';

type Mode = "title" | "garage" | "rankings" | "badges" | "controls" | "difficulty" | "radio" | "race" | "ending" | "results" | "name" | "map" | "credits";

/** The credits page: its two web addresses (shown exactly as written, opened in a new tab). */
const CREDIT_LINKS = [
  { text: "sabnockworks.com", href: "https://sabnockworks.com" },
  { text: "tesana.com", href: "https://tesana.com" },
];

/** Every difficulty has its own rankings: a shared high score and full-run board (online, under
 *  the account name), plus this device's arcade top 10 (entered names) and the player's stage bests. */
type BoardKind = "score" | "arcade" | "run" | "stages";
const BOARD_KINDS: { kind: BoardKind; label: string }[] = [
  { kind: "score", label: "rank.board_score" },
  { kind: "arcade", label: "rank.board_arcade" },
  { kind: "run", label: "rank.board_run" },
  { kind: "stages", label: "rank.board_stages" },
];
/** Letter keys of the name-entry keyboard; a last row holds Space / Delete / OK. */
const NAME_ROWS = ["ABCDEFGHIJ", "KLMNOPQRST", "UVWXYZ-.!?", "0123456789"];
const STAGES_CLEARED_KEY = `${SAVE_PREFIX}.stages-cleared`;
const GOALS_REACHED_KEY = `${SAVE_PREFIX}.goals-reached`;

const SONG_KEYS = ["music_coastline", "music_golden", "music_wave", "music_twist", "music_highway", "music_riptide"];
const SONG_NAME_IDS = ["song.coastline", "song.golden", "song.wave", "song.twist", "song.highway", "song.riptide"];
/** Decoded songs kept in memory at once (each is ~20 MB decoded; phones stay comfortable at three). */
const SONGS_KEPT = 3;
const JINGLES = ["checkpoint", "stage", "gameover", "goal"];
const STORE_KEY = `${SAVE_PREFIX}.station`;
const DIFF_KEY = `${SAVE_PREFIX}.difficulty`;
const CAR_KEY = `${SAVE_PREFIX}.car`;

function savedCar(): CarDef {
  try { return carById(localStorage.getItem(CAR_KEY)); } catch { return CARS[0]; }
}
/** Every stage's sky and far backdrop (each loaded once). */
const BACKDROPS = [...new Set(THEMES.flatMap((th) => [th.sky, th.far]))];
/** What she shouts from the sand after a tumble crash. */
const TUMBLE_LINES = ["pass.tumble1", "pass.tumble2", "pass.tumble3", "pass.tumble4", "pass.tumble5"];
const MOOD_NAME = ["mood.terrified", "mood.nervous", "mood.happy", "mood.love"];
const MOOD_COL = [rgb(0x5aa8ff), rgb(0xffd040), rgb(0x7cf06a), rgb(0xff5a9a)];
// test hooks (URL hash only): #autopilot drives the run, #sim=N runs N steps per frame
const HASH = typeof location !== "undefined" ? location.hash : "";
const AUTOPILOT = HASH.includes("autopilot");
const YELLTEST = HASH.includes("yelltest");
const RADIOTEST = HASH.includes("radiotest");
const TUMBLETEST = HASH.includes("tumbletest");
const WARP = Number((/stage=(\d+)/.exec(HASH) || [])[1] || 0);
const SIM = Math.max(1, Number((/sim=(\d+)/.exec(HASH) || [])[1] || 1));
const NAMETEST = HASH.includes("nametest");
const ENDTEST = HASH.includes("endtest");
// #path=0,5,8,9,4 plans the route (warps land on it, the autopilot takes it); #maptest opens the course map after a fake run
const PATH_HASH = ((/path=([0-9,]+)/.exec(HASH) || [])[1] || "").split(",").filter(Boolean).map(Number);
const PLAN = PATH_HASH.length ? (DEMO_A ? GOAL_A_PATH.slice() : completePath(PATH_HASH)) : null;
const MAPTEST = HASH.includes("maptest");
const TEST_HOOKS = AUTOPILOT || WARP > 0 || SIM > 1 || YELLTEST || TUMBLETEST || NAMETEST || ENDTEST || !!PLAN || MAPTEST;
/** What she says at the finish, by her mood level (terrified … in love). */
const END_LINES = ["end.line0", "end.line1", "end.line2", "end.line3"];
const FIREWORK_COLS = [0xff4a5a, 0xffd040, 0x4ad0ff, 0xff7ac8, 0x7cf06a, 0xffa040];

/** One goal's celebration: its scene, trophy, how the trophy arrives, the light show and what she says. */
interface Finale {
  bg: string; trophy: string; glow: string;
  /** Rise: the trophy comes up out of this line (sea, lake, street). Drop: it comes down from the sky and lands. */
  entry: "rise" | "drop";
  /** y of the line it rises from (rise) */
  clip: number;
  /** y of the trophy's foot once it is up */
  rest: number;
  /** extra light show, drawn over the scene: sea glitter, searchlights, tumbleweed, lanterns, shooting stars */
  fx: "sea" | "neon" | "west" | "lake" | "stars";
  cols: number[]; confetti: number[]; coin?: boolean; star?: boolean;
  /** seconds between rockets (min, extra) and what the bursts look like */
  every: [number, number]; ring?: boolean; willow?: boolean;
  title: string; sub: string; lines: string[];
}
const FINALES: Record<string, Finale> = {
  // E, Twilight Bay: the sunset on the coast road (the original finale)
  E: { bg: "ending_bg", trophy: "trophy", glow: "trophy_glow", entry: "rise", clip: 96, rest: 86, fx: "sea", cols: FIREWORK_COLS, confetti: FIREWORK_COLS,
    every: [0.45, 0.55], title: "end.title", sub: "end.sub", lines: END_LINES },
  // A, Neon City: ring bursts in neon colours under sweeping searchlights, a hovering neon trophy
  A: { bg: "ending_bg_a", trophy: "trophy_a", glow: "trophy_glow_a", entry: "drop", clip: 0, rest: 92, fx: "neon",
    cols: [0xff3ad0, 0x4adcf4, 0xb06aff, 0xffffff, 0x7affc8], confetti: [0xff3ad0, 0x4adcf4, 0xb06aff, 0xffffff],
    every: [0.4, 0.45], ring: true, title: "end.a_title", sub: "end.a_sub", lines: ["end.a_line0", "end.a_line1", "end.a_line2", "end.a_line3"] },
  // B, Gold Rush Town: gold and red bursts, coins instead of confetti, a tumbleweed rolls through
  B: { bg: "ending_bg_b", trophy: "trophy_b", glow: "trophy_glow_b", entry: "rise", clip: 124, rest: 116, fx: "west",
    cols: [0xffd040, 0xff8a2a, 0xe83a2a, 0xfff0a0, 0xffffff], confetti: [0xffd040, 0xffc020, 0xe8a020, 0xfff0a0], coin: true,
    every: [0.5, 0.6], title: "end.b_title", sub: "end.b_sub", lines: ["end.b_line0", "end.b_line1", "end.b_line2", "end.b_line3"] },
  // C, Crystal Lake: the trophy rises out of the lake, paper lanterns float up, soft drooping fireworks
  C: { bg: "ending_bg_c", trophy: "trophy_c", glow: "trophy_glow_c", entry: "rise", clip: 114, rest: 106, fx: "lake",
    cols: [0x8af0ff, 0xffffff, 0xb8ffd8, 0xfff0a0, 0x9ab8ff], confetti: [0xffffff, 0xcdf4ff, 0xfff4c0, 0xb8ffd8],
    every: [0.8, 0.9], willow: true, title: "end.c_title", sub: "end.c_sub", lines: ["end.c_line0", "end.c_line1", "end.c_line2", "end.c_line3"] },
  // D, Starlight Summit: the trophy falls from the sky like a star; shooting stars and a shower of star glitter
  D: { bg: "ending_bg_d", trophy: "trophy_d", glow: "trophy_glow_d", entry: "drop", clip: 0, rest: 131, fx: "stars",
    cols: [0xffe488, 0xffffff, 0xb8a8ff, 0x8ad0ff], confetti: [0xffe488, 0xffffff, 0xcfc6ff, 0xffd040], star: true,
    every: [0.9, 0.9], willow: true, title: "end.d_title", sub: "end.d_sub", lines: ["end.d_line0", "end.d_line1", "end.d_line2", "end.d_line3"] },
};

interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; col: number; /** gravity (default 22) and drag (default 1.2) */ g?: number; d?: number }
interface Streak { x: number; y: number; vx: number; vy: number; life: number }
interface Rocket { x: number; y: number; vy: number; ty: number; col: number }
interface Confetti { x: number; y: number; vy: number; ph: number; sp: number; col: number }

class MainScene extends Phaser.Scene {
  private fb = new FB();
  private bank = new SpriteBank();
  private painter!: Renderer;
  private track!: Track;
  private demo!: Race;
  private race: Race | null = null;
  private hud = new Hud();
  private lady = new Passenger();
  private diff: Difficulty = DIFFS[1];
  /** The car the player drives (picked in the garage, remembered). */
  private car: CarDef = savedCar();
  private carSel = 0;
  private carSwapT = 9;
  private carSwapDir = 1;
  private diffSel = 1;
  private shouts = new Shouts();
  private cleanT = 0;
  private roughT = 0;
  private wasOffroad = false;
  private calmT = 0;
  private passTotal = 0;
  private tumbleCount = 0;
  // road-trip badges: this run's clean driving and near misses
  private badges = new Badges();
  private goalProgress = new GoalProgressStore(undefined, GOAL_PROGRESS_KEY, !TEST_HOOKS);
  private badgeSel = 0;
  private stageClean = true;
  private runClean = true;
  private nearRun = 0;
  private nearPending = 0;
  private audio = new GameAudio();
  private input2!: Input;
  private ctx2d!: CanvasRenderingContext2D;
  private screenTex!: Phaser.Textures.CanvasTexture;
  private mode: Mode = "title";
  private modeT = 0;
  private time2 = 0;
  private menuSel = 0;
  /** Clickable web links over the credits page. */
  private links!: LinkLayer;
  private station = 0;
  private paused = false;
  private pauseSel = 0;
  private lastBeep = 99;
  private lastTick = 99;
  private songsLoaded = false;
  // songs stream in one at a time, only when their station is picked
  private songFiles: string[] = [];
  private songLoading = new Set<string>();
  private songFailed = new Set<string>();
  private tunedAt = -9;
  /** The player's best score on each difficulty (shown on the title screen). */
  private bestScore = new Map<DiffId, number>();
  private ctlSel = 0;
  // results
  private result = { goal: false, score: 0, stage: 0, stageTimes: [] as number[], path: [0] as number[], run: 0, bonus: 0, passBonus: 0, moodLevel: 2, diff: "normal" as DiffId, newBest: new Set<string>(), top: [] as BoardEntry[], topLoaded: false, arcade: -1 };
  // course map: browsing from the title, or showing the route of the run just finished
  private courseMap = new CourseMap();
  private mapRun = false;
  private mapProg = 0;
  // arcade name entry
  private nameBuf = "";
  private nameRow = 0;
  private nameCol = 0;
  private namePhase: "enter" | "table" = "enter";
  private nameAt = -1;
  // finish-line ending scene
  private sparks: Spark[] = [];
  private rockets: Rocket[] = [];
  private confetti: Confetti[] = [];
  /** per-goal extras: floating lanterns (lake), shooting stars (summit) */
  private floats: Confetti[] = [];
  private streaks: Streak[] = [];
  private fin: Finale = FINALES.E;
  private finLanded = false;
  private finFlash = 0;
  private nextRocket = 0;
  private endStep = 0;
  // rankings
  private rankSel = 0;
  private rankDiff = 1;
  private rankCache = new Map<string, BoardEntry[] | null>();
  private rankFrom: Mode = "title";

  constructor() { super("main"); }

  preload(): void {
    // a loading screen from the very first frame: the window is never blank while the art loads
    this.screenTex = this.textures.createCanvas("screen", W, H)!;
    this.ctx2d = this.screenTex.getContext();
    this.add.image(0, 0, "screen").setOrigin(0, 0);
    const drawLoading = (p: number) => {
      const fb = this.fb;
      for (let y = 0; y < H; y++) fb.hline(y, 0, W, y < 100 ? [rgb(0x1a0e3a), rgb(0x3a1858), rgb(0x7a2a6a), rgb(0xd0507a)][Math.min(3, Math.floor(y / 25))] : rgb(0x120c24));
      fb.rect(W / 2 - 34, 82, 68, 18, rgb(0xffb040));
      fb.rect(W / 2 - 28, 76, 56, 6, rgb(0xffd060));
      for (let i = 0; i < 4; i++) fb.rect(0, 100 + i * 3, W, 1, [rgb(0xff4a7a), rgb(0xff7a4a), rgb(0xffa040), rgb(0xffd050)][i]);
      big(fb, t("game.title"), W / 2, 34, 3, GRAD_SUN);
      const bw = 160, bx = W / 2 - bw / 2;
      fb.frame(bx - 1, 129, bw + 2, 7, rgb(0xff9a3c));
      fb.rect(bx, 130, Math.round(bw * Math.max(0, Math.min(1, p))), 5, rgb(0xffd050));
      drawText(fb, t("boot.loading"), W / 2, 142, C.grey, { align: "center", outline: C.ink });
      this.ctx2d.putImageData(fb.img, 0, 0);
      this.screenTex.refresh();
    };
    drawLoading(0);
    this.load.on("progress", drawLoading);
    this.load.image("atlas", "assets/sprites/atlas.png");
    this.load.json("atlas_json", "assets/sprites/atlas.json");
    for (const key of BACKDROPS) this.load.image(key, `assets/bg/${key}.png`);
    this.load.json("music_json", "assets/audio/music.json");
    this.load.image("ending_bg", "assets/bg/ending.png");
    for (const k of "abcd") this.load.image(`ending_bg_${k}`, `assets/bg/ending_${k}.png`);
    this.load.image("course_map", "assets/bg/course_map.png");
    this.load.json("course_map_json", "assets/bg/course_map.json");
  }

  create(): void {
    // sprites → raw pixel arrays for the software renderer
    if (this.textures.exists("atlas") && this.cache.json.get("atlas_json")) {
      this.bank.addAtlas(this.textures.get("atlas"), this.cache.json.get("atlas_json") as AtlasJson);
    }
    for (const key of BACKDROPS) if (this.textures.exists(key)) this.bank.addImage(key, this.textures.get(key), key.startsWith("sky"));
    if (this.textures.exists("ending_bg")) this.bank.addImage("ending_bg", this.textures.get("ending_bg"), true);
    for (const k of "abcd") if (this.textures.exists(`ending_bg_${k}`)) this.bank.addImage(`ending_bg_${k}`, this.textures.get(`ending_bg_${k}`), true);
    if (this.textures.exists("course_map")) this.bank.addImage("course_map", this.textures.get("course_map"), true);
    this.courseMap.load(this.cache.json.get("course_map_json"));
    this.load.off("progress"); // the loading screen's job is done

    this.painter = new Renderer(this.fb, this.bank);
    this.painter.label = (id) => t(id);
    this.track = new Track();
    this.newDemo();

    const canvas = this.game.canvas;
    this.links = new LinkLayer(canvas);
    this.input2 = new Input(canvas, (cx, cy) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
    });
    const snd = this.sound as Phaser.Sound.WebAudioSoundManager;
    this.audio.attach(snd.context);
    this.input2.onGesture = () => {
      const c = this.audio.ctx;
      if (c && c.state === "suspended") c.resume().catch(() => {});
    };

    try { const v = Number(localStorage.getItem(STORE_KEY)); if (v >= 0 && v < SONG_KEYS.length) this.station = v | 0; } catch { /* storage blocked */ }
    try { this.diff = diffById(localStorage.getItem(DIFF_KEY)); } catch { /* storage blocked */ }

    setFontLocale(locale());
    onLocaleChange(() => { setFontLocale(locale()); this.painter.clearGateCache(); });
    // best scores and badges arrive whenever the play service answers (the game never waits for it;
    // desktop builds read them from this computer instead)
    this.badges.enabled = !TEST_HOOKS;
    this.badges.onShow = () => this.audio.badge();
    this.badges.goalProgress = () => this.goalProgress.current;
    this.badges.onChange = () => this.syncGoalProgress();
    this.syncGoalProgress();
    onTesanaReady(() => {
      for (const d of DIFFS) myBest(boardId("score", d.id)).then((b) => { if (b !== null) this.bestScore.set(d.id, Math.max(b, this.bestScore.get(d.id) ?? b)); });
      // a bot-driven test run must never earn the player a badge
      this.badges.enabled = !TEST_HOOKS || isTestSdk();
      this.syncGoalProgress();
      if (this.badges.state !== "ok") { this.badges.state = "idle"; this.badges.refresh(); }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.mode === "race" && this.race && (this.race.state === "race" || this.race.state === "countdown")) this.paused = true;
    });

    this.loadAudio();
    // test hook: window.__ending() jumps straight to the finish-line celebration
    // test hook: how long building a road network takes (ms)
    if (TEST_HOOKS) (window as unknown as Record<string, unknown>).__trackBench = () => {
      const t0 = performance.now();
      const tr = new Track([0, 5, 8, 9, 4]);
      const t1 = performance.now();
      tr.choose(2, 7);
      return [Math.round(t1 - t0), Math.round(performance.now() - t1), tr.segs.length];
    };
    // test hook: window.__edge(x) puts the car x road half-widths from the centre (race only); returns what it feels
    if (TEST_HOOKS) (window as unknown as Record<string, unknown>).__edge = (x?: number, clean = false) => {
      const r = this.race;
      if (!r) return null;
      if (typeof x === "number") r.playerX = x;
      if (clean) { r.cars.length = 0; for (const sg of r.track.segs) if (sg.sprites.length) sg.sprites = sg.sprites.filter((q) => q.hit <= 0); }
      return { x: Math.round(r.playerX * 100) / 100, kmh: Math.round(r.kmh), off: r.offroad, edge: Math.round(r.edge * 100) / 100, depth: Math.round(r.offDepth * 100) / 100 };
    };
    // test hook: window.__fork() reports the split ahead (car position, road taken, how far the view has turned)
    if (TEST_HOOKS) (window as unknown as Record<string, unknown>).__fork = () => this.race?.forkProbe() ?? null;
    // test hook: roadside census of a route, per stage: [props, solid props, solid props whose edge is inside 1.2 road half-widths]
    if (TEST_HOOKS) (window as unknown as Record<string, unknown>).__props = (path: number[]) => {
      const tr = new Track(path);
      const skip = new Set(["portal", "crowd", "gate", "gate_goal", "gantry", "neon_arch_lit", "fork_sign"]);
      return tr.stages.map((st) => {
        let all = 0, solid = 0, close = 0, minClear = 9;
        for (let i = st.startSeg; i < st.endSeg; i++) {
          const sg = tr.segs[i];
          if (sg.tunnel || sg.fork >= 0) continue;
          for (const q of sg.sprites) {
            if (skip.has(q.name) || q.y > 0) continue;
            all++;
            if (q.hit > 0) { solid++; const c = Math.abs(q.x) - q.hit; minClear = Math.min(minClear, c); if (c < 1.2) close++; }
          }
        }
        return [st.index, all, solid, close, Math.round(minClear * 100) / 100];
      });
    };
    // test hook: tunnels of a route as [column, start, end] (segments from that stage's start)
    if (TEST_HOOKS) (window as unknown as Record<string, unknown>).__tunnels = (path: number[]) => {
      const tr = new Track(path);
      const out: number[][] = [];
      for (const st of tr.stages) {
        let a = -1;
        for (let i = st.startSeg; i <= st.endSeg; i++) {
          const t = tr.segs[i].tunnel;
          if (t && a < 0) a = i;
          if (!t && a >= 0) { out.push([st.index, a - st.startSeg, i - st.startSeg]); a = -1; }
        }
      }
      return out;
    };
    if (MAPTEST) (window as unknown as Record<string, unknown>).__map = (path: number[], goal = true) => {
      const p = DEMO_A ? GOAL_A_PATH.slice() : validPath(completePath(path)) ? completePath(path) : COAST_PATH;
      const n = goal ? COLS : Math.max(1, Math.min(COLS, path.length));
      Object.assign(this.result, { goal, path: p.slice(0, n), stage: n - 1, stageTimes: p.slice(0, goal ? COLS : n - 1).map((_v, i) => 52 + i * 3.3), diff: this.diff.id });
      this.openMap(true);
    };
    if (ENDTEST) (window as unknown as Record<string, unknown>).__ending = (letter?: string, mood?: number) => {
      if (!this.race) { this.race = new Race(this.track, false, 0, this.diff); this.race.skin = this.car.skin; }
      if (typeof mood === "number") this.lady.mood = mood;
      this.startEnding(DEMO_A ? "A" : letter);
    };
    // test hook: window.__name(score, diff) opens the name entry as if a run had just ended
    if (NAMETEST) (window as unknown as Record<string, unknown>).__name = (score: number, diff: DiffId) => {
      const res = this.result;
      res.score = score;
      res.diff = diff;
      res.arcade = arcadeRank(diff, score);
      if (res.arcade >= 0) this.openName();
      return res.arcade;
    };
  }

  /** Jingles and the remembered station stream in after the first frame so the game starts
   *  instantly; every other song loads only when its station is tuned in. */
  private loadAudio(): void {
    const mj = this.cache.json.get("music_json") as MusicJson | undefined;
    if (!mj || !mj.songs || !mj.songs.length) { this.songsLoaded = true; return; }
    this.audio.music = mj;
    mj.songs.forEach((s, i) => { if (SONG_KEYS[i]) this.songFiles[i] = s.file; });
    for (const j of JINGLES) if (mj.jingles?.[j]) this.load.audio("jingle_" + j, mj.jingles[j]);
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, (key: string) => {
      const buf = this.cache.audio.get(key);
      if (buf && typeof (buf as AudioBuffer).getChannelData === "function") this.audio.buffers.set(key, buf as AudioBuffer);
      this.songLoading.delete(key);
      if (!SONG_KEYS.includes(key)) return;
      this.dropSpareSongs(key);
      const racing = this.mode === "race" && this.race && (this.race.state === "race" || this.race.state === "countdown");
      if (key === SONG_KEYS[this.station] && (this.mode === "radio" || racing)) this.audio.playSong(key);
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      if (this.songLoading.delete(file.key)) this.songFailed.add(file.key);
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, () => { this.songsLoaded = true; });
    this.requestSong(this.station, false);
    this.load.start();
  }

  /** Start streaming a station's song if it isn't in memory (or on its way) yet. */
  private requestSong(i: number, start = true): void {
    const key = SONG_KEYS[i], file = this.songFiles[i];
    if (!key || !file || this.audio.buffers.has(key) || this.songLoading.has(key)) return;
    this.songFailed.delete(key);
    this.songLoading.add(key);
    this.load.audio(key, file);
    if (start) this.load.start(); // no-op while the loader is already busy: the file just joins the queue
  }

  /** True once the station's song can play (or will never come, so the radio stops "tuning"). */
  private songReady(i: number): boolean {
    const key = SONG_KEYS[i];
    return !this.audio.music || !this.songFiles[i] || this.audio.buffers.has(key) || this.songFailed.has(key);
  }

  /** Keep memory small on phones: forget songs that aren't playing or picked. */
  private dropSpareSongs(justLoaded: string): void {
    const keep = new Set([justLoaded, SONG_KEYS[this.station], this.audio.currentSong]);
    const held = SONG_KEYS.filter((k) => this.audio.buffers.has(k));
    for (const k of held) {
      if (held.filter((h) => this.audio.buffers.has(h)).length <= SONGS_KEPT) break;
      if (keep.has(k)) continue;
      this.audio.buffers.delete(k);
      if (this.cache.audio.exists(k)) this.cache.audio.remove(k);
    }
  }

  private newDemo(): void {
    // attract mode shows a random stage of a random route
    const path = [0];
    for (let c = 1; c < COLS; c++) { const nx = NEXT[path[c - 1]]; path.push(DEMO_A ? GOAL_A_PATH[c] : nx[Math.floor(Math.random() * nx.length)]); }
    this.track = new Track(path);
    const st = Math.floor(Math.random() * COLS);
    this.demo = new Race(this.track, true, st);
    this.demo.skin = this.car.skin;
  }

  /** A fresh road network for a run (test hooks may plan the route). */
  private newRace(): Race {
    const race = new Race(new Track(PLAN ?? COAST_PATH), false, 0, this.diff);
    if (PLAN) race.aiPlan = PLAN.map((n, c) => (c === 0 ? 0 : NEXT[PLAN[c - 1]][0] === n && NEXT[PLAN[c - 1]].length > 1 ? -1 : 1));
    return race;
  }

  private setMode(m: Mode): void {
    this.input2.textMode = false; // only the name entry types text (it switches it back on)
    this.mode = m;
    this.modeT = 0;
    this.menuSel = 0;
  }

  // ------------------------------------------------------------- frame
  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.time2 += dt;
    this.modeT += dt;
    this.painter.time = this.time2;
    this.input2.poll();
    this.input2.tiltRect = null;
    if (this.input2.tiltToggled) { this.input2.tiltToggled = false; this.audio.uiSelect(); }
    const taps = this.input2.takeTaps();

    switch (this.mode) {
      case "title": this.title(dt, taps); break;
      case "garage": this.garage(dt, taps); break;
      case "rankings": this.rankings(dt, taps); break;
      case "badges": this.badgeScreen(dt, taps); break;
      case "controls": this.controls(dt, taps); break;
      case "difficulty": this.difficulty(dt, taps); break;
      case "radio": this.radio(dt, taps); break;
      case "race": this.racing(dt, taps); break;
      case "ending": this.ending(dt, taps); break;
      case "results": this.results(dt, taps); break;
      case "name": this.nameEntry(dt, taps); break;
      case "map": this.mapScreen(dt, taps); break;
      case "credits": this.credits(dt, taps); break;
    }
    this.links.endFrame(); // web links only exist while the credits page shows them
    // badge pop-ups wait while a big race message or the pause menu owns the screen
    const busy = this.mode === "race" && (this.paused || this.hud.msgs.some((m) => m.scale >= 2));
    this.badges.update(dt, !busy);
    // radio hiss while the picked station is still tuning in
    this.audio.setStatic(this.mode === "radio" && !this.songReady(this.station));
    this.badges.drawToast(this.fb, this.mode === "race" ? 44 : H - 39);
    this.input2.endFrame();
    this.ctx2d.putImageData(this.fb.img, 0, 0);
    this.screenTex.refresh();
  }

  private tapped(taps: { x: number; y: number }[], r: Rect): boolean {
    return taps.some((p) => inRect(r, p.x, p.y));
  }

  // ------------------------------------------------------------- title
  private title(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const d = this.demo;
    d.update(dt, { steer: 0, throttle: 0, brake: 0 });
    const st = this.track.stages[d.playerSeg.stage];
    if (d.playerSeg.i > st.endSeg - 120 || d.crashT > 0) this.newDemo();
    this.painter.render(d);
    const fb = this.fb;
    // darken the top for the logo
    for (let y = 0; y < 64; y++) fb.rectA(0, y, W, 1, rgb(0x1a0a30), 0.5 * (1 - y / 64));

    // logo
    const bob = Math.round(Math.sin(this.time2 * 2) * 1.5);
    big(fb, t("game.title"), W / 2, 12 + bob, 3, GRAD_SUN);
    for (let i = 0; i < 4; i++) fb.rect(W / 2 - 110 + i * 3, 38 + bob + i * 2, 220 - i * 6, 1, [rgb(0xff4a7a), rgb(0xff7a4a), rgb(0xffa040), rgb(0xffd050)][i]);
    para(fb, t(DEMO_A ? "demo.tagline" : "title.tagline"), W / 2, 49 + bob, C.pink, W - 10);
    const best = this.bestScore.get(this.diff.id);
    if (best !== undefined) drawText(fb, t("title.best", { d: t(this.diff.nameKey), n: fmtNum(best) }), W / 2, 61, C.yellow, { align: "center", outline: C.ink, maxW: W - 10 });

    const bStart: Rect = { x: W / 2 - 60, y: 70, w: 120, h: 12 };
    const bGarage: Rect = { x: W / 2 - 60, y: 83, w: 120, h: 12 };
    const bMap: Rect = { x: W / 2 - 60, y: 96, w: 120, h: 12 };
    const bRank: Rect = { x: W / 2 - 60, y: 109, w: 120, h: 12 };
    const bBadge: Rect = { x: W / 2 - 60, y: 122, w: 120, h: 12 };
    const bCredits: Rect = { x: W / 2 - 60, y: 135, w: 120, h: 12 };
    if (inp.hit("up")) { this.menuSel = (this.menuSel + 5) % 6; this.audio.uiMove(); }
    if (inp.hit("down")) { this.menuSel = (this.menuSel + 1) % 6; this.audio.uiMove(); }
    button(fb, bStart, t("radio.drive"), this.menuSel === 0);
    button(fb, bGarage, t("title.garage"), this.menuSel === 1);
    button(fb, bMap, t("title.map"), this.menuSel === 2);
    button(fb, bRank, t("title.rankings"), this.menuSel === 3);
    button(fb, bBadge, t("title.badges"), this.menuSel === 4);
    button(fb, bCredits, t("title.credits"), this.menuSel === 5);
    // a tiny map pin on the course map button
    {
      const mx = bMap.x + 6, my = bMap.y + 2;
      fb.rect(mx - 1, my, 7, 6, C.ink); fb.rect(mx, my + 1, 5, 4, rgb(0xff3a2a)); fb.rect(mx + 1, my + 6, 3, 2, C.ink); fb.pset(mx + 2, my + 8, C.ink);
      fb.pset(mx + 2, my + 2, rgb(0xffffff));
    }
    // a little car in the chosen colour on the garage button
    fb.rect(bGarage.x + 4, bGarage.y + 4, 11, 5, C.ink);
    fb.rect(bGarage.x + 5, bGarage.y + 5, 9, 3, this.car.col);
    fb.rect(bGarage.x + 7, bGarage.y + 3, 5, 2, C.ink);
    fb.rect(bGarage.x + 8, bGarage.y + 4, 3, 1, this.car.col);
    fb.rect(bGarage.x + 5, bGarage.y + 8, 2, 2, C.ink);
    fb.rect(bGarage.x + 12, bGarage.y + 8, 2, 2, C.ink);
    // little gold medal on the badges button
    drawMedal(fb, bBadge.x + 9, bBadge.y + 6, BADGE_TYPES[9], true, 5);
    if (Math.floor(this.time2 * 2) % 2 === 0) {
      drawText(fb, inp.touchMode ? t("title.start_tap") : t("title.start_key"), W / 2, 150, C.white, { align: "center", outline: C.ink, maxW: W - 10 });
    }
    // the developer
    drawText(fb, t("title.copyright"), W / 2, inp.touchMode ? H - 10 : 159, rgb(0xc8b8e8), { align: "center", outline: C.ink, maxW: W - 10 });
    if (!inp.touchMode) {
      fb.rectA(0, H - 12, W, 12, rgb(0x100820), 0.6);
      drawText(fb, `${t("ctl.steer")} ← →    ${t("ctl.gas")} ↑ / ${t("ctl.space")}    ${t("ctl.brake")} ↓`, W / 2, H - 9, C.white, { align: "center", outline: C.ink, maxW: W - 10 });
    }

    let go = -1;
    if (inp.hit("confirm")) go = this.menuSel;
    if (this.tapped(taps, bStart)) go = 0;
    else if (this.tapped(taps, bGarage)) go = 1;
    else if (this.tapped(taps, bMap)) go = 2;
    else if (this.tapped(taps, bRank)) go = 3;
    else if (this.tapped(taps, bBadge)) go = 4;
    else if (this.tapped(taps, bCredits)) go = 5;
    if (go === 0) { this.audio.uiSelect(); this.toControls(); }
    else if (go === 1) { this.audio.uiSelect(); this.openGarage(); }
    else if (go === 2) { this.audio.uiSelect(); this.openMap(false); }
    else if (go === 3) { this.audio.uiSelect(); this.openRankings("title"); }
    else if (go === 4) { this.audio.uiSelect(); this.openBadges(); }
    else if (go === 5) { this.audio.uiSelect(); this.setMode("credits"); this.menuSel = CREDIT_LINKS.length; }
  }

  // ----------------------------------------------------------- credits
  /** Who made the game. Up/down picks a web address or Back; the addresses are real links (new tab). */
  private credits(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const fb = this.fb;
    this.demo.update(dt, { steer: 0, throttle: 0, brake: 0 });
    this.painter.render(this.demo);
    fb.rectA(0, 0, W, H, rgb(0x0c0618), 0.55);
    const x0 = 14, w = W - 28;
    panel(fb, x0, 3, w, 156);
    big(fb, t("credits.title"), W / 2, 6, 2, GRAD_SUN, "center", w - 8);
    const n = CREDIT_LINKS.length; // menuSel: 0..n-1 = a link, n = Back
    if (inp.hit("up")) { this.menuSel = (this.menuSel + n) % (n + 1); this.audio.uiMove(); }
    if (inp.hit("down")) { this.menuSel = (this.menuSel + 1) % (n + 1); this.audio.uiMove(); }
    const role = (key: string, y: number) => drawText(fb, t(key), W / 2, y, C.orange, { align: "center", outline: C.ink, maxW: w - 12 });
    const name = (key: string, y: number) => drawText(fb, t(key), W / 2, y, C.white, { align: "center", outline: C.ink, maxW: w - 12 });
    const link = (k: number, y: number) => {
      const L = CREDIT_LINKS[k];
      const tw = textWidth(L.text);
      const r: LinkRect = { x: W / 2 - tw / 2 - 4, y: y - 3, w: tw + 8, h: 13 };
      const sel = this.menuSel === k;
      if (sel) { fb.rectA(r.x, r.y, r.w, r.h, rgb(0xff7a30), 0.35); fb.frame(r.x, r.y, r.w, r.h, rgb(0xfff0a0)); }
      drawText(fb, L.text, W / 2, y, sel ? C.yellow : C.cyan, { align: "center", outline: C.ink });
      fb.rect(W / 2 - tw / 2, y + 8, tw, 1, sel ? C.yellow : C.cyan);
      this.links.place(L.href, L.text, r);
    };
    let y = 25;
    y += para(fb, t("credits.copyright"), W / 2, y, rgb(0xffd8a0), w - 16) * 9 + 6;
    role("credits.idea", y); name("credits.idea_by", y + 10); y += 25;
    role("credits.studio", y); name("credits.studio_name", y + 10); link(0, y + 21); y += 37;
    role("credits.producer", y); name("credits.producer_name", y + 10); y += 25;
    role("credits.made", y); link(1, y + 11);
    const back: Rect = { x: W / 2 - 40, y: 162, w: 80, h: 14 };
    button(fb, back, t("credits.back"), this.menuSel === n);
    let leave = inp.hit("back") || this.tapped(taps, back);
    if (inp.hit("confirm")) {
      if (this.menuSel < n) { this.audio.uiSelect(); this.links.open(CREDIT_LINKS[this.menuSel].href); }
      else leave = true;
    }
    if (leave) {
      this.audio.uiSelect();
      this.setMode("title");
      this.menuSel = 5;
    }
  }

  // ------------------------------------------------------------ garage
  private openGarage(): void {
    this.setMode("garage");
    this.carSel = Math.max(0, CARS.indexOf(this.car));
    this.carSwapT = 9;
  }

  /** Saved goals and account badges both count; no new progress key or difficulty restriction. */
  private carGoals(): Set<string> {
    const goals = new Set(GOAL_BASES.filter(g => this.badges.has(g)));
    try {
      return rememberCarGoals(goals, localStorage, GOALS_REACHED_KEY);
    } catch { /* local storage unavailable */ }
    return goals;
  }

  /** Browse every reward; only an unlocked car can become the remembered choice. */
  private garage(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const fb = this.fb;
    this.demo.update(dt, { steer: 0, throttle: 0, brake: 0 });
    this.painter.render(this.demo);
    fb.rectA(0, 0, W, H, rgb(0x0c0618), 0.5);
    const x0 = 14, w = W - 28;
    panel(fb, x0, 3, w, 156);
    big(fb, t("garage.title"), W / 2, 4, 2, GRAD_SUN, "center", w - 8);
    const n = CARS.length;
    const prev: Rect = { x: x0 + 8, y: 56, w: 18, h: 18 };
    const next: Rect = { x: x0 + w - 26, y: 56, w: 18, h: 18 };
    let dir = 0;
    if (inp.hit("left") || inp.hit("up") || this.tapped(taps, prev)) dir = -1;
    if (inp.hit("right") || inp.hit("down") || this.tapped(taps, next)) dir = 1;
    if (dir) {
      this.carSel = (this.carSel + dir + n) % n;
      this.carSwapT = 0;
      this.carSwapDir = dir;
      this.demo.skin = CARS[this.carSel].skin;
      this.audio.uiMove();
    }
    this.carSwapT += dt;
    button(fb, prev, "<", false);
    button(fb, next, ">", false);
    const car = CARS[this.carSel];
    const available = carUnlocked(car, this.carGoals());
    // the car on show at double size: hair in the wind, a glance left and right now and then,
    // and a dab of the brakes when it rolls in
    const tt = this.time2 % 6;
    const view = tt > 2.2 && tt < 2.9 ? "left" : tt > 4.6 && tt < 5.3 ? "right" : "straight";
    const frame = Math.floor(this.time2 * 6) & 1;
    const spr = this.bank.get(`${car.skin}_${view}_${frame}`) ?? this.bank.get(`${car.skin}_straight_0`);
    const cy = 115;
    const slide = this.carSwapT < 0.25 ? Math.round((1 - this.carSwapT / 0.25) * 18 * this.carSwapDir) : 0;
    fb.rectA(W / 2 - 84, cy - 6, 168, 8, rgb(0x0a0410), 0.55);
    if (spr) {
      fb.blit(spr, W / 2 + slide, cy, 2);
      const br = this.carSwapT < 0.6 ? this.bank.get(`${car.skin}_brake_${view}`) : undefined;
      if (br) fb.blit(br, W / 2 + slide, cy, 2);
    }
    // which car of how many
    for (let i = 0; i < n; i++) {
      const dx = Math.round(W / 2 + (i - (n - 1) / 2) * 10);
      fb.rect(dx - 3, 118, 6, 5, C.ink);
      fb.rect(dx - 2, 119, 4, 3, i === this.carSel ? CARS[i].col : rgb(0x4a3a62));
    }
    drawText(fb, t(car.nameKey), W / 2, 126, car.col, { align: "center", outline: C.ink, maxW: w - 10 });
    const lines = para(fb, t(car.descKey), W / 2, 136, C.white, w - 14);
    // one more line when there's room: how to browse (keyboard) or that every car drives the same
    if (lines === 1) para(fb, inp.touchMode ? t("garage.same") : t("garage.hint"), W / 2, 146, C.grey, w - 8);
    const pick: Rect = { x: W / 2 - 50, y: 162, w: 100, h: 15 };
    button(fb, pick, available ? t("garage.choose") : `${t("garage.locked")} ${car.goal}`, available && Math.floor(this.time2 * 3) % 2 === 0);
    const choose = available && (inp.hit("confirm") || this.tapped(taps, pick));
    if (choose) {
      this.car = car;
      try { localStorage.setItem(CAR_KEY, this.car.id); } catch { /* storage blocked */ }
    }
    if (inp.hit("back") || choose) {
      this.demo.skin = this.car.skin;
      this.audio.uiSelect();
      analytics.event("car_pick", { name: this.car.id });
      this.setMode("title");
      this.menuSel = 0;
    }
  }

  // ---------------------------------------------------------- controls
  private toControls(): void {
    this.setMode("controls");
    this.ctlSel = Math.max(0, CONTROL_PREFS.indexOf(this.input2.pref));
  }

  /** "Choose your controls": auto-detect, keyboard or the touch pads (remembered for next time). */
  private controls(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const fb = this.fb;
    this.demo.update(dt, { steer: 0, throttle: 0, brake: 0 });
    this.painter.render(this.demo);
    fb.rectA(0, 0, W, H, rgb(0x0c0618), 0.45);
    const x0 = 40, w = W - 80;
    panel(fb, x0, 10, w, 146);
    big(fb, t("ctl.title"), W / 2, 16, 2, GRAD_SUN, "center", w - 8);
    const n = CONTROL_PREFS.length;
    const btns: Rect[] = CONTROL_PREFS.map((_p, i) => ({ x: W / 2 - 70, y: 38 + i * 18, w: 140, h: 15 }));
    if (inp.hit("up") || inp.hit("left")) { this.ctlSel = (this.ctlSel + n - 1) % n; this.audio.uiMove(); }
    if (inp.hit("down") || inp.hit("right")) { this.ctlSel = (this.ctlSel + 1) % n; this.audio.uiMove(); }
    btns.forEach((r, i) => {
      if (this.tapped(taps, r) && i !== this.ctlSel) { this.ctlSel = i; this.audio.uiMove(); }
      button(fb, r, t(`ctl.${CONTROL_PREFS[i]}`), i === this.ctlSel);
      this.controlIcon(r.x + 4, r.y + 2, CONTROL_PREFS[i]);
    });
    const p = CONTROL_PREFS[this.ctlSel];
    const lines = para(fb, t(`ctl.${p}_desc`), W / 2, 96, C.white, w - 14);
    if (p === "auto") {
      const dev = t(inp.autoTouch ? "ctl.touch" : "ctl.keyboard");
      drawText(fb, t("ctl.detected", { d: dev }), W / 2, 96 + lines * 9 + 3, C.yellow, { align: "center", outline: C.ink, maxW: w - 10 });
    }
    const next: Rect = { x: W / 2 - 40, y: 160, w: 80, h: 15 };
    button(fb, next, t("diff.next"), Math.floor(this.time2 * 3) % 2 === 0);
    if (!inp.touchMode) para(fb, t("diff.hint"), W / 2, 146, C.grey, w - 8, true);
    if (inp.hit("back")) { this.audio.uiSelect(); this.setMode("title"); return; }
    if (inp.hit("confirm") || this.tapped(taps, next)) {
      if (p !== inp.pref) analytics.event("controls_set", { name: p });
      inp.setPref(p);
      this.audio.uiSelect();
      this.toDifficulty();
    }
  }

  /** Little pixel pictures on the controls buttons: a keyboard, a phone, or both for auto. */
  private controlIcon(x: number, y: number, p: ControlPref): void {
    const fb = this.fb;
    const ink = C.ink, body = rgb(0xd8d0e8), key = rgb(0x5a4a78), glass = rgb(0x5ad0ff);
    const keyboard = (kx: number, ky: number) => {
      fb.rect(kx, ky, 15, 8, ink);
      fb.rect(kx + 1, ky + 1, 13, 6, body);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) fb.pset(kx + 2 + c * 2, ky + 2 + r * 2, key);
      fb.rect(kx + 4, ky + 5, 7, 1, key);
    };
    const phone = (px: number, py: number) => {
      fb.rect(px, py, 7, 11, ink);
      fb.rect(px + 1, py + 1, 5, 9, body);
      fb.rect(px + 2, py + 2, 3, 6, glass);
      fb.pset(px + 3, py + 9, key);
    };
    if (p === "keyboard") keyboard(x, y + 2);
    else if (p === "touch") phone(x + 4, y);
    else { keyboard(x, y + 3); phone(x + 11, y); }
  }

  // -------------------------------------------------------- difficulty
  private toDifficulty(): void {
    this.setMode("difficulty");
    this.diffSel = DIFFS.indexOf(this.diff);
  }

  private difficulty(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const fb = this.fb;
    this.demo.update(dt, { steer: 0, throttle: 0, brake: 0 });
    this.painter.render(this.demo);
    fb.rectA(0, 0, W, H, rgb(0x0c0618), 0.45);
    const x0 = 40, w = W - 80;
    panel(fb, x0, 10, w, 146);
    big(fb, t("diff.title"), W / 2, 16, 2, GRAD_SUN, "center", w - 8);
    const btns: Rect[] = DIFFS.map((_d, i) => ({ x: W / 2 - 70, y: 38 + i * 18, w: 140, h: 15 }));
    if (inp.hit("up") || inp.hit("left")) { this.diffSel = (this.diffSel + DIFFS.length - 1) % DIFFS.length; this.audio.uiMove(); }
    if (inp.hit("down") || inp.hit("right")) { this.diffSel = (this.diffSel + 1) % DIFFS.length; this.audio.uiMove(); }
    btns.forEach((r, i) => {
      if (this.tapped(taps, r) && i !== this.diffSel) { this.diffSel = i; this.audio.uiMove(); }
      button(fb, r, t(DIFFS[i].nameKey), i === this.diffSel);
      // colour pip: green / yellow / red
      fb.rect(r.x + 5, r.y + 5, 5, 5, C.ink);
      fb.rect(r.x + 6, r.y + 6, 3, 3, DIFFS[i].col);
    });
    const d = DIFFS[this.diffSel];
    const lines = para(fb, t(d.descKey), W / 2, 96, C.white, w - 14);
    let y = 96 + lines * 9 + 3;
    drawText(fb, t("diff.score", { n: d.score === 1 ? "1" : d.score.toLocaleString(locale()) }), W / 2, y, d.col, { align: "center", outline: C.ink });
    y += 10;
    para(fb, t("diff.own"), W / 2, y, C.grey, w - 14);
    const next: Rect = { x: W / 2 - 40, y: 160, w: 80, h: 15 };
    button(fb, next, t("diff.next"), Math.floor(this.time2 * 3) % 2 === 0);
    if (!inp.touchMode) para(fb, t("diff.hint"), W / 2, 146, C.grey, w - 8, true);
    if (inp.hit("back")) { this.audio.uiSelect(); this.toControls(); return; }
    if (inp.hit("confirm") || this.tapped(taps, next)) {
      this.diff = d;
      try { localStorage.setItem(DIFF_KEY, d.id); } catch { /* storage blocked */ }
      this.audio.uiSelect();
      this.toRadio();
    }
  }

  // ------------------------------------------------------------- radio
  private toRadio(): void {
    this.race = this.newRace();
    this.race.skin = this.car.skin;
    if (WARP > 0) this.race.warp(WARP - 1, Number((/at=(\d+)/.exec(HASH) || [])[1] || 60));
    this.setMode("radio");
    this.requestSong(this.station);
    this.audio.playSong(SONG_KEYS[this.station]);
  }

  private radio(_dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const race = this.race!;
    this.painter.render(race);
    const fb = this.fb;
    fb.rectA(0, 0, W, H, rgb(0x100820), 0.25);

    // car-radio faceplate
    const px = 30, py = 14, pw = W - 60, ph = 116;
    fb.rect(px - 2, py - 2, pw + 4, ph + 4, rgb(0x0a0612));
    fb.rect(px, py, pw, ph, rgb(0x2a2236));
    fb.rect(px, py, pw, 2, rgb(0x6a6080));
    fb.rect(px, py + ph - 2, pw, 2, rgb(0x16101e));
    drawText(fb, t("radio.title"), W / 2, py + 6, C.yellow, { align: "center", outline: C.ink, maxW: pw - 8 });
    // tuning band
    const bx = px + 12, by = py + 20, bw = pw - 24, bh = 26;
    fb.rect(bx - 1, by - 1, bw + 2, bh + 2, rgb(0x0a0612));
    for (let y = 0; y < bh; y++) fb.rect(bx, by + y, bw, 1, y < bh / 2 ? rgb(0xffb050) : rgb(0xff9a3a));
    for (let i = 0; i <= 40; i++) {
      const x = bx + 4 + (i * (bw - 8)) / 40;
      fb.rect(x, by + 2, 1, i % 5 === 0 ? 7 : 4, rgb(0x6a2a10));
    }
    const n = SONG_KEYS.length;
    const slot = (i: number) => bx + (0.08 + (i * 0.84) / (n - 1)) * bw;
    // preset marks along the bottom of the band
    for (let i = 0; i < n; i++) fb.rect(Math.round(slot(i)) - 1, by + bh - 3, 3, 3, rgb(0x6a2a10));
    const ready = this.songReady(this.station);
    // fetch the song once the dial rests on a station (flicking past stations downloads nothing)
    if (!ready && this.time2 - this.tunedAt > 0.35) this.requestSong(this.station);
    const nx = Math.round(slot(this.station) + Math.sin(this.time2 * 9) * (ready ? 0 : 1.5));
    fb.rect(nx - 1, by - 3, 3, bh + 6, rgb(0xe02a1a));
    fb.rect(nx, by - 3, 1, bh + 6, rgb(0xff8a6a));
    // station presets: two columns of three (up/down run through all six, left/right swap columns)
    const ROWS = 3;
    const btns: Rect[] = SONG_KEYS.map((_k, i) => ({ x: i < ROWS ? W / 2 - 124 : W / 2 + 4, y: by + bh + 5 + (i % ROWS) * 14, w: 120, h: 13 }));
    if (inp.hit("up")) this.tune((this.station + n - 1) % n);
    if (inp.hit("down")) this.tune((this.station + 1) % n);
    if (inp.hit("left") || inp.hit("right")) this.tune((this.station + ROWS) % n);
    btns.forEach((r, i) => {
      if (this.tapped(taps, r)) this.tune(i);
      button(fb, r, `${i + 1}  ${t(SONG_NAME_IDS[i])}`, i === this.station);
    });
    // equaliser bounce on the band when playing
    if (this.audio.currentSong) {
      const bars = Math.floor((bw - 10) / 4);
      for (let i = 0; i < bars; i++) {
        const h = 2 + Math.abs(Math.sin(this.time2 * (6 + (i % 18) * 0.7) + i * 1.3)) * 8;
        fb.rect(bx + 6 + i * 4, by + bh - 2 - h, 2, h, rgb(0x8a3a10));
      }
    } else if (!ready) {
      drawText(fb, t("radio.loading"), W / 2, by + 12, rgb(0x6a2a10), { align: "center" });
    }
    const drive: Rect = { x: W / 2 - 40, y: by + bh + 5 + 3 * 14 + 3, w: 80, h: 15 };
    button(fb, drive, t("radio.drive"), Math.floor(this.time2 * 3) % 2 === 0);
    fb.rectA(0, H - 12, W, 12, rgb(0x100820), 0.6);
    para(fb, inp.touchMode ? t("radio.hint_tap") : t("radio.hint"), W / 2, H - 9, C.white, W - 10, true);

    const tiltBtn = this.tiltToggle(H - 46);
    // test hook: which songs are in memory and which one is on air
    if (RADIOTEST) (window as unknown as Record<string, unknown>).__radio = { station: this.station, ready, on: this.audio.currentSong, held: SONG_KEYS.filter((k) => this.audio.buffers.has(k)), loading: [...this.songLoading] };
    if (inp.hit("back")) { this.audio.stopSong(0.4); this.toDifficulty(); return; }
    if (inp.hit("confirm") || (this.tapped(taps, drive) && !(tiltBtn && this.tapped(taps, tiltBtn)))) this.startRace();
  }

  private tune(i: number): void {
    if (i === this.station) return;
    this.station = i;
    this.audio.uiMove();
    try { localStorage.setItem(STORE_KEY, String(i)); } catch { /* storage blocked */ }
    this.audio.tuneStatic();
    this.tunedAt = this.time2;
    if (this.audio.buffers.has(SONG_KEYS[i])) this.audio.playSong(SONG_KEYS[i], 0.3);
    else this.audio.stopSong(0.15); // the radio screen fetches it once the dial rests
  }

  /** A rival driver shouts at you (with an angry honk from his side of the road). */
  private rivalYell(car: Car, kind: "hit" | "pass", force: boolean): boolean {
    const r = this.race;
    if (!r || !this.shouts.say(car, kind, r.playerX, force)) return false;
    const horn = car.sprite.startsWith("truck") ? "truck" : car.sprite.startsWith("beetle") ? "small" : "car";
    this.audio.honk(horn, (car.x - r.playerX) * 1.5, true);
    return true;
  }

  /** Tilt-steering switch for phones/tablets; the tap itself is handled by the input layer. */
  private tiltToggle(y: number): Rect | null {
    const inp = this.input2;
    if (!inp.touchMode || !inp.tiltSupported) return null;
    const fb = this.fb;
    const r: Rect = { x: W / 2 - 75, y, w: 150, h: 13 };
    inp.tiltRect = r;
    button(fb, r, inp.tiltWanted ? t("ctl.tilt_on") : t("ctl.tilt_off"), inp.tiltWanted);
    const note = inp.tiltDenied ? t("ctl.tilt_blocked") : inp.tiltMode ? t("ctl.tilt_hint") : "";
    if (note) para(fb, note, W / 2, y + 15, inp.tiltDenied ? C.pink : C.yellow, W - 10);
    return r;
  }

  // -------------------------------------------------------------- race
  private startRace(): void {
    if (!carUnlocked(this.car, this.carGoals())) this.car = CARS[0];
    const race = this.race ?? this.newRace();
    race.skin = this.car.skin;
    this.race = race;
    this.requestSong(this.station); // in case Drive was pressed while the dial was still moving
    this.hud = new Hud();
    this.lady = new Passenger();
    this.lady.onSpeak = (m) => this.audio.voice(m);
    this.lady.onLevel = (lv, prev) => {
      if (this.race && this.race.tumbleT >= 0) return; // she has her own words for a tumble
      if (lv === 3 && prev < 3) this.lady.say("love", true, "pass.love1");
      else if (lv === 0 && prev > 0) this.lady.say("scared", true, "pass.terrified");
    };
    this.calmT = 0;
    this.shouts = new Shouts();
    this.cleanT = 0;
    this.roughT = 0;
    this.passTotal = 0;
    this.stageClean = true;
    this.runClean = true;
    this.nearRun = 0;
    this.nearPending = 0;
    this.paused = false;
    this.lastBeep = 99;
    this.lastTick = 99;
    this.setMode("race");
    this.audio.uiSelect();
    this.audio.startEngine();
    this.hud.push(t("msg.ready"), t(race.theme.nameKey), 2.4, GRAD_PINK, 30, 2);
    // test hook: window.__tumble() slams the car into the roadside flat out
    if (TUMBLETEST) (window as unknown as Record<string, unknown>).__tumble = () => { this.race?.forceTumble(); return this.race?.tumbleT; };
    // test hook: window.__spawn(segs, x) puts a rival right ahead (to check the night lights)
    if (TUMBLETEST) (window as unknown as Record<string, unknown>).__spawn = (n: number, x: number) => this.race?.spawnAhead(n, x);
    analytics.levelStart(race.theme.id, 0);
    analytics.event("run_start", { name: race.diff.id, value: race.diff.score });
    race.events = {
      gate: (g, r) => this.onGate(g, r),
      crash: (hard, car, tumble) => {
        this.audio.crash(hard);
        if (tumble) {
          // the car flips: she has no breath to talk until she lands on the sand
          this.audio.tumbleLaunch();
          this.tumbleCount++;
          this.lady.feel(-30);
          analytics.event("tumble", { levelId: race.theme.id, levelIndex: race.stage, value: race.kmh });
        } else {
          this.lady.say("scared", true, hard || car ? "pass.scared1" : undefined);
          this.lady.feel(hard ? -22 : -15);
        }
        this.stageClean = this.runClean = false;
        this.cleanT = 0;
        this.calmT = 0;
        if (car) this.rivalYell(car, "hit", true);
      },
      bump: (car) => {
        this.audio.bump();
        this.lady.feel(-10);
        this.stageClean = this.runClean = false;
        this.cleanT = 0;
        this.calmT = 0;
        this.rivalYell(car, "hit", true);
        // let the other driver get his words out first
        this.time.delayedCall(850, () => { if (this.mode === "race") this.lady.say("scared", true); });
      },
      scrape: () => { if (Math.random() < 0.3) this.audio.scrape(); this.lady.say("scared"); this.cleanT = 0; },
      closePass: (n, car) => {
        this.audio.closePass();
        this.hud.push(t("msg.closepass", { n: fmtNum(n) }), undefined, 1.0, GRAD_CYAN, 64, 1);
        this.lady.feel(3);
        this.nearRun++;
        this.nearPending++; // counted up and reported at the next stage clear
        // sometimes the driver you just buzzed is not amused; otherwise she cheers
        if (Math.random() < 0.45 && this.rivalYell(car, "pass", false)) this.time.delayedCall(900, () => { if (this.mode === "race" && Math.random() < 0.6) this.lady.say("love"); });
        else if (Math.random() < 0.6) this.lady.say("love");
      },
      tumbleLand: (what) => {
        if (what === "car") { this.audio.tumbleLand(); return; }
        this.audio.sandThuds();
        this.time.delayedCall(450, () => {
          if (this.mode === "race" && this.race === race && race.tumbleT >= 0) this.lady.say("hurry", true, TUMBLE_LINES[Math.floor(Math.random() * TUMBLE_LINES.length)]);
        });
      },
      timeUp: () => {
        this.hud.push(t("msg.timeup"), undefined, 99, GRAD_RED, 56);
        this.lady.say("sad", true);
        this.audio.jingle("gameover", () => this.audio.sadTune());
        this.audio.stopSong(1.2);
        const r = this.race!;
        analytics.death(r.theme.id, Math.round(r.playerX * 100) / 100, r.playerSeg.i);
      },
      over: () => { this.time.delayedCall(1400, () => this.finishRun(false)); },
      goal: () => this.onGoal(),
      fork: (_f, side, node) => {
        // the road splits: a chime, and she has an opinion about where you are taking her
        this.audio.forkChime();
        const th = THEMES[node];
        if (th.weather === "rain" || th.weather === "sand" || th.weather === "fog" || th.weather === "snow") this.lady.say("scared", true, "pass.weather");
        else this.lady.say("love", true, "pass.newroad");
        analytics.event("route_choice", { levelId: th.id, levelIndex: race.stage + 1, name: side < 0 ? "left" : "right" });
      },
      thunder: (delay, k) => this.audio.thunder(delay, k),
      tunnel: (enter) => {
        // a rush of air as the car dives in (the engine echo follows race.tunnelAmt)
        if (!enter) return;
        this.audio.tunnelWhoosh();
        if (Math.random() < 0.45) this.lady.say("love", false, Math.random() < 0.5 ? "pass.tunnel1" : "pass.tunnel2");
      },
      ice: (enter) => {
        // the tyres lose their grip: a short warning on screen and a little shriek from the passenger
        if (!enter) return;
        this.hud.push(t("msg.ice"), undefined, 1.3, GRAD_CYAN, 64, 1);
        if (Math.random() < 0.7) this.lady.say("scared", true, "pass.ice");
      },
    };
  }

  private onGate(g: Gate, r: Race): void {
    const th = THEMES[r.track.path[g.stage]];
    if (g.kind === "check") {
      // race messages stay small and up in the sky so the road (and the traffic on it) stays in view
      this.hud.push(t("msg.checkpoint"), t("msg.extended", { n: r.bonusFor(g) }), 2.2, GRAD_SUN, 26, 2);
      this.lady.say("love", true);
      this.lady.feel(8);
      this.audio.jingle("checkpoint", () => this.audio.fanfare());
      analytics.checkpoint(th.id, "midpoint");
    } else if (g.kind === "stage") {
      const time = r.stageTimes[r.stageTimes.length - 1] ?? 0;
      this.hud.push(t("msg.stageclear", { n: g.stage + 1 }), t("msg.stagetime", { t: fmtTime(time) }) + "   " + t("msg.extended", { n: r.bonusFor(g) }), 2.6, GRAD_SUN, 24, 2);
      this.audio.jingle("stage", () => this.audio.fanfare());
      this.lady.say("love", true);
      this.lady.feel(10);
      const pb = this.lady.bonus(r.diff.score, 0.2);
      r.score += pb;
      this.passTotal += pb;
      this.hud.push(t("msg.passbonus", { n: fmtNum(pb) }), undefined, 2.6, GRAD_PINK, 54, 1);
      this.badgeStage(g.stage);
      analytics.levelComplete(th.id, Math.round(time * 1000));
      const next = THEMES[r.track.path[g.stage + 1]];
      analytics.levelStart(next.id, g.stage + 1);
      this.time.delayedCall(3200, () => {
        if (this.mode === "race" && this.race === r && r.state === "race") this.hud.push(t(next.nameKey), t("hud.stage", { n: g.stage + 2 }), 2.2, GRAD_PINK, 28, 2);
      });
    }
  }

  private onGoal(): void {
    const r = this.race!;
    const remain = Math.ceil(r.timer);
    const bonus = Math.round(remain * 20000 * r.diff.score);
    r.score += bonus;
    this.result.bonus = bonus;
    this.hud.push(t("msg.goal"), t("res.timebonus", { n: fmtNum(bonus) }), 99, GRAD_SUN, 50);
    // her happiness pays out at the finish
    const pb = this.lady.bonus(r.diff.score, 1);
    r.score += pb;
    this.passTotal += pb;
    const lv = this.lady.level;
    if (lv >= 2) { this.lady.say("love", true, "pass.love1"); this.lady.burst(lv === 3 ? 14 : 8); }
    else this.lady.say(lv === 1 ? "love" : "scared", true, lv === 1 ? "pass.relief" : "pass.never");
    this.time.delayedCall(2200, () => { if (this.race === r && this.mode === "race") this.hud.push(t("msg.passbonus", { n: fmtNum(pb) }), undefined, 99, GRAD_PINK, 85, 1); });
    this.audio.jingle("goal", () => this.audio.fanfare());
    // finishing badges (each difficulty has its own set)
    const b = this.badges, tier = r.diff.id;
    this.badgeStage(STAGE_COUNT - 1);
    b.unlock(badgeId("coast-complete", tier));
    b.progress(statId("coast-finishes", tier), 1);
    if (this.runClean) b.unlock(badgeId("clean-coast", tier));
    if (lv === 3) b.unlock(badgeId("coast-love", tier));
    if (remain <= 5) b.unlock(badgeId("photo-finish", tier));
    this.badgeGoal(r.track.path[STAGE_COUNT - 1] ?? -1);
    analytics.levelComplete(r.theme.id, Math.round((r.stageTimes[STAGE_COUNT - 1] ?? 0) * 1000));
    // a few seconds of "GOAL!" on the road, then the celebration at the end of the coast
    this.time.delayedCall(3800, () => { if (this.race === r && this.mode === "race") this.startEnding(); });
  }

  private racing(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const race = this.race!;
    const fb = this.fb;
    const pauseTap = inp.touchMode && this.tapped(taps, TOUCH.pause);
    if (!this.paused && (inp.hit("pause") || inp.hit("back") || pauseTap) && (race.state === "race" || race.state === "countdown")) {
      this.paused = true;
      this.pauseSel = 0;
      this.audio.uiMove();
      taps = [];
    }
    if (!this.paused) {
      if(inp.hit('signal')||(inp.touchMode&&this.tapped(taps,TOUCH.signal))) {
        if(race.signal()==='horn')this.audio.horn();
      }
      for (let k = 0; k < SIM; k++) {
        const ctl = AUTOPILOT && race.state === "race" ? race.autopilot(dt, 0.997) : { steer: inp.steer, throttle: inp.throttle, brake: inp.brake };
        race.update(dt, ctl);
      }
      if (AUTOPILOT) (window as unknown as Record<string, unknown>).__trk = race.track;
      if (AUTOPILOT || TUMBLETEST) (window as unknown as Record<string, unknown>).__race = { state: race.state, timer: race.timer, stage: race.stage, times: race.stageTimes, score: race.score, crash: race.crashT, kmh: race.kmh, run: race.runTime, near: this.nearRun, clean: this.runClean, tumble: race.tumbleT, crashes: this.tumbleCount, ice: race.iceAmt, x: race.playerX, z: race.position, car: this.car.id, skin: race.visualSkin, roof: race.roof.phase, roofPosition: race.roof.position, rain: race.weatherAmt("rain"), snow: race.weatherAmt("snow") };
      this.hud.update(dt);
      // countdown beeps
      if (race.state === "countdown" || (race.state === "race" && race.countdown > 0)) {
        if (race.state === "race") race.countdown -= dt;
        const n = Math.ceil(race.countdown - 0.6);
        if (n !== this.lastBeep) {
          this.lastBeep = n;
          if (n >= 1 && n <= 3) { this.audio.beep(false); this.hud.push(String(n), undefined, 0.9, GRAD_SUN, 86); }
          else if (n <= 0 && race.state === "race") { this.audio.beep(true); this.hud.push(t("msg.go"), undefined, 1.0, GRAD_SUN, 86); }
        }
      }
      // hurry-up ticks
      if (race.state === "race" && race.timer < 10.5) {
        const s = Math.ceil(race.timer);
        if (s !== this.lastTick) { this.lastTick = s; this.audio.tick(); if (s === 10) { this.hud.push(t("msg.hurry"), undefined, 1.6, GRAD_RED, 56, 2); this.lady.say("hurry", true); } }
      } else this.lastTick = 99;
      // she cheers a long clean blast at top speed and squeals at sand and grass
      if (race.state === "race") {
        const fast = race.kmh > 255 && !race.offroad && race.crashT <= 0;
        this.cleanT = fast ? this.cleanT + dt : Math.max(0, this.cleanT - dt * 2);
        if (this.cleanT > 9) { this.lady.say("love"); this.cleanT = 0; }
        this.roughT = race.offroad && race.kmh > 90 ? this.roughT + dt : 0;
        if (this.roughT > 0.7) { this.lady.say("scared"); this.roughT = 0; }
        // mood drifts with how you drive: calm fast cruising pleases her, sand, scraping and a panicking clock don't
        const rough = race.offroad && race.kmh > 90;
        if (rough || race.scraping > 0 || race.crashT > 0) this.calmT = 0; else this.calmT += dt;
        if (rough) this.lady.feel(-4 * dt);
        if (race.scraping > 0) this.lady.feel(-6 * dt);
        if (race.timer < 10) this.lady.feel(-1 * dt);
        if (this.calmT > 3 && race.kmh > 180) this.lady.feel(0.9 * dt);
      }
      this.lady.update(dt);
      this.shouts.update(dt);
      if (YELLTEST && race.state === "race" && Math.floor(this.time2 / 2.5) !== Math.floor((this.time2 - dt) / 2.5)) {
        // test hook: make the nearest car ahead (or one just passed) shout
        const pz = race.playerZ;
        const ahead = race.cars.filter((c) => c.z > pz).sort((a, b) => a.z - b.z)[0];
        const behind = race.cars.filter((c) => c.z < pz).sort((a, b) => b.z - a.z)[0];
        const passTurn = Math.floor(this.time2 / 2.5) % 2 === 1;
        // a detached copy stands in for a car we just overtook (never drawn → shouts from the side)
        const ghost: Car | undefined = ahead ? { ...ahead, seen: -1, x: race.playerX + (Math.floor(this.time2 / 5) % 2 ? 0.5 : -0.5) } : undefined;
        const pick = passTurn ? behind ?? ghost : ahead;
        if (pick) this.rivalYell(pick, passTurn ? "pass" : "hit", true);
        (window as unknown as Record<string, unknown>).__yell = { pick: pick ? { x: pick.x, z: pick.z - pz, seen: pick.seen, frame: this.painter.frame } : null, behind: !!behind, kind: pick === ahead ? "hit" : "pass" };
      }
      const quiet = race.state === "over";
      this.audio.engine(race.rpm, race.throttle, race.speed / MAX_SPEED, race.skid, race.offroad, quiet, race.seaAmt, race.offDepth, race.edge);
      // swerving off the tarmac at speed: a squeal as the tyres lose grip
      if (race.offroad && !this.wasOffroad && race.speed / MAX_SPEED > 0.3 && race.crashT <= 0) this.audio.dirtKick(race.speed / MAX_SPEED);
      this.wasOffroad = race.offroad;
      const dry = 1 - race.tunnelAmt; // the storm goes quiet inside a tunnel
      this.audio.weather(race.weatherAmt("rain") * dry, Math.max(race.weatherAmt("sand"), race.weatherAmt("snow") * 0.55) * dry, race.gustAmt * dry);
      this.audio.tunnel(race.tunnelAmt);
    } else {
      this.audio.engine(0.15, 0, 0, 0, false, true);
    }

    if (AUTOPILOT) {
      // test hook: how long the road painter takes (ms, running average)
      const t0 = performance.now();
      this.painter.render(race);
      const w = window as unknown as Record<string, number>;
      w.__render_ms = (w.__render_ms ?? 0) * 0.95 + (performance.now() - t0) * 0.05;
    } else this.painter.render(race);
    // after a tumble the road fades out and back in while the couple climb back into the car
    const fade = race.fade;
    if (fade > 0) fb.rectA(0, 0, W, H, rgb(0x120a1c), fade);
    this.hud.draw(fb, race, inp.touchMode && !this.paused, this.time2, inp.tiltMode);
    drawForkPanel(fb, this.bank, race, this.time2);
    if (race.tumbleT >= 0) {
      // she talks from wherever she landed (and not at all while flying through the air)
      const head = race.ladyHead();
      if (head) this.lady.draw(fb, head.x, head.y);
      else this.lady.box = null;
    } else this.lady.draw(fb, race.carScreenX() + 12, race.carScreenY() - 42);
    this.lady.drawMeter(fb, W - 7, 24);
    this.shouts.draw(fb, this.painter.frame, this.lady.box, inp.touchMode && !this.paused);

    if (this.paused) this.pauseMenu(taps);
  }

  private pauseMenu(taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const fb = this.fb;
    fb.rectA(0, 0, W, H, rgb(0x0c0618), 0.55);
    const hasTilt = inp.touchMode && inp.tiltSupported;
    panel(fb, W / 2 - 80, 46, 160, hasTilt ? 102 : 82);
    big(fb, t("pause.title"), W / 2, 54, 2, GRAD_SUN);
    const b1: Rect = { x: W / 2 - 60, y: 80, w: 120, h: 15 };
    const b2: Rect = { x: W / 2 - 60, y: 100, w: 120, h: 15 };
    if (inp.hit("up") || inp.hit("down")) { this.pauseSel ^= 1; this.audio.uiMove(); }
    button(fb, b1, t("pause.resume"), this.pauseSel === 0);
    button(fb, b2, t("pause.quit"), this.pauseSel === 1);
    para(fb,t('ctl.signal_hint'),W/2,hasTilt?153:136,C.white,230);
    let act = -1;
    if (inp.hit("confirm")) act = this.pauseSel;
    if (inp.hit("pause") || inp.hit("back")) act = 0;
    if (hasTilt) {
      const r: Rect = { x: W / 2 - 70, y: 120, w: 140, h: 13 };
      inp.tiltRect = r;
      button(fb, r, inp.tiltWanted ? t("ctl.tilt_on") : t("ctl.tilt_off"), inp.tiltWanted);
      if (inp.tiltDenied) para(fb, t("ctl.tilt_blocked"), W / 2, 152, C.pink, W - 10);
    }
    if (this.tapped(taps, b1)) act = 0;
    else if (this.tapped(taps, b2)) act = 1;
    if (act === 0) { this.paused = false; this.audio.uiSelect(); }
    else if (act === 1) {
      this.paused = false;
      this.audio.uiSelect();
      this.audio.stopEngine();
      this.audio.stopSong(0.5);
      const r = this.race!;
      analytics.event("run_quit", { levelId: r.theme.id, levelIndex: r.stage, value: Math.round(r.score) });
      this.flushNear();
      this.race = null;
      this.newDemo();
      this.setMode("title");
    }
  }

  // ------------------------------------------------------- ending scene
  private startEnding(letter?: string): void {
    // which goal was reached picks the celebration (the coast road's end is the sunset)
    const node = this.race?.track.path[STAGE_COUNT - 1] ?? -1;
    this.fin = FINALES[(letter ?? goalLetter(node)) || "E"] ?? FINALES.E;
    this.floats = [];
    this.streaks = [];
    this.finLanded = false;
    this.finFlash = 0;
    this.setMode("ending");
    this.audio.stopEngine();
    this.sparks = [];
    this.rockets = [];
    this.confetti = [];
    this.nextRocket = 2.7;
    this.endStep = 0;
    this.lady.box = null;
    analytics.event("ending_scene", { name: this.race?.diff.id ?? "normal", goal: goalLetter(node) || "E" });
  }

  /** The end of the coast road at sunset: the car rolls up to the barrier, the couple jump out
   *  cheering, the sunset trophy rises out of the sea, fireworks and confetti. */
  private ending(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const fb = this.fb;
    const tt = this.modeT;
    const r = this.race;
    // The roof is fully open before the couple leave their seats at HOP (2 seconds).
    r?.roof.update(0, dt);
    const skin = r?.visualSkin ?? this.car.skin;
    const F = this.fin;
    const bg = this.bank.get(F.bg) ?? this.bank.get("ending_bg");
    if (bg) fb.layer(bg, 0, 0, true);
    else fb.clear(rgb(0x2a1450));
    this.finaleScene(F, tt, dt);
    // ---- the trophy: up out of the water / street, or down out of the sky
    const trophy = this.bank.get(F.trophy), glow = this.bank.get(F.glow);
    const TR0 = 1.9, TR1 = 3.6;
    if (tt > TR0 && trophy) {
      const u = Math.min(1, (tt - TR0) / (TR1 - TR0));
      let by: number, clip = 0;
      if (F.entry === "rise") {
        const ease = 1 - Math.pow(1 - u, 3);
        by = Math.round(F.clip + trophy.h - (F.clip + trophy.h - F.rest) * ease);
        clip = F.clip;
      } else {
        // falls in and settles with a small bounce
        const fall = Math.min(1, u * 1.15);
        const bounce = u > 0.87 ? Math.sin((u - 0.87) / 0.13 * Math.PI) * 5 : 0;
        by = Math.round(-6 + (F.rest + 6) * (fall * fall) - bounce);
      }
      const bob = u >= 1 ? Math.round(Math.sin((tt - TR1) * 2.2) * 1.5) : 0;
      by += bob;
      if (F.entry === "drop" && !this.finLanded && u >= 0.87) { this.finLanded = true; this.finFlash = 0.45; }
      if (glow && u > 0.4) fb.blitAdd(glow, W / 2, by + 0, 1, Math.min(1, (u - 0.4) * 2) * (0.85 + 0.15 * Math.sin(tt * 5)));
      fb.blit(trophy, W / 2, by, 1, clip ? { clipY: clip } : {});
      // a star-fall trail behind the dropping trophy
      if (F.entry === "drop" && u < 0.87) {
        for (let i = 1; i < 9; i++) fb.rectA(W / 2 - 1 + (i % 2), by - trophy.h - i * 4, 2, 3, rgb(F.cols[i % F.cols.length]), 0.5 * (1 - i / 9));
      }
      // twinkles around it once it is up
      if (u >= 1) {
        for (let i = 0; i < 4; i++) {
          const ph = (tt * 1.3 + i * 0.27) % 1;
          if (ph > 0.5) continue;
          const a = i * 1.7 + Math.floor(tt * 1.3 + i * 0.27) * 2.1;
          const sx = Math.round(W / 2 + Math.cos(a) * (14 + (i % 2) * 6)), sy = Math.round(by - 24 + Math.sin(a) * 18);
          const len = ph < 0.25 ? 1 + Math.round(ph * 8) : 1 + Math.round((0.5 - ph) * 8);
          fb.rect(sx - len, sy, len * 2 + 1, 1, rgb(0xfffbe0));
          fb.rect(sx, sy - len, 1, len * 2 + 1, rgb(0xfffbe0));
        }
      }
    }
    if (this.endStep === 0 && tt > TR0 + 0.6) { this.endStep = 1; this.audio.trophy(); }
    if (this.endStep === 1 && tt > TR1) { this.endStep = 2; this.audio.fanfare(); }
    // ---- fireworks
    if (tt > this.nextRocket) {
      this.nextRocket = tt + F.every[0] + Math.random() * F.every[1];
      this.rockets.push({ x: 40 + Math.random() * 240, y: 140, vy: -150 - Math.random() * 40, ty: 18 + Math.random() * 40, col: F.cols[Math.floor(Math.random() * F.cols.length)] });
      this.audio.fireworkLaunch();
    }
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const k = this.rockets[i];
      k.y += k.vy * dt;
      fb.rect(Math.round(k.x), Math.round(k.y), 1, 3, rgb(0xffe8b0));
      if (k.y <= k.ty) {
        this.rockets.splice(i, 1);
        // two rings of sparks: a big outer shell and a tighter white-hot core
        const n = F.ring ? 36 : 44;
        for (let j = 0; j < n; j++) {
          const a = (j / n) * Math.PI * 2 + (F.ring ? 0 : Math.random() * 0.15), v = F.ring ? 56 : 46 + Math.random() * 18;
          // ring: a clean circle of light; willow: slow, long and drooping like a weeping tree
          this.sparks.push({ x: k.x, y: k.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: (F.willow ? 2.2 : 1.4) + Math.random() * 0.5, max: F.willow ? 2.7 : 1.9, col: k.col,
            g: F.willow ? 34 : undefined, d: F.willow ? 2.2 : undefined });
        }
        for (let j = 0; j < 14; j++) {
          const a = (j / 14) * Math.PI * 2, v = 18 + Math.random() * 8;
          this.sparks.push({ x: k.x, y: k.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.9 + Math.random() * 0.3, max: 1.2, col: 0xfff8e0 });
        }
        this.sparks.push({ x: k.x, y: k.y, vx: 0, vy: 0, life: 0.12, max: -1, col: 0xffffff });
        this.audio.fireworkPop();
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.life -= dt;
      if (p.life <= 0) { this.sparks.splice(i, 1); continue; }
      const drag = p.d ?? 1.2;
      p.vx *= 1 - dt * drag;
      p.vy = p.vy * (1 - dt * drag) + (p.g ?? 22) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.max < 0) { fb.rect(Math.round(p.x) - 2, Math.round(p.y) - 2, 5, 5, rgb(0xffffff)); continue; } // burst flash
      const k = p.life / p.max;
      if (k < 0.25 && Math.floor(p.life * 30) % 2) continue;
      const sz = k > 0.45 ? 2 : 1;
      // a short dim trail behind each spark
      fb.rectA(Math.round(p.x - p.vx * 0.05), Math.round(p.y - p.vy * 0.05), 1, 1, rgb(p.col), Math.min(1, k) * 0.6);
      fb.rectA(Math.round(p.x), Math.round(p.y), sz, sz, rgb(p.col), Math.min(1, k * 1.8));
    }
    // ---- the car rolls up to the barrier, then the couple jump out
    const CAR_IN = 1.5, HOP = 2.0, LAND = 2.5;
    const cu = Math.min(1, tt / CAR_IN);
    const cy = Math.round(174 + (1 - (1 - Math.pow(1 - cu, 3))) * 70);
    const out = tt > HOP;
    const frame = Math.floor(this.time2 * 6) & 1;
    const car = out ? this.bank.get(`${skin}_empty`) : this.bank.get(`${skin}_straight_${frame}`);
    fb.rectA(W / 2 - 41, cy - 4, 82, 5, rgb(0x120a1c), 0.45);
    if (car) {
      fb.blit(car, W / 2, cy, 1);
      if (tt > CAR_IN * 0.6 && tt < CAR_IN + 0.5) { const b = this.bank.get(`${skin}_brake_straight`); if (b) fb.blit(b, W / 2, cy, 1); }
    }
    let ladyHead: { x: number; y: number } | null = null;
    if (out) {
      const hu = Math.min(1, (tt - HOP) / (LAND - HOP));
      const who: [string, number, number][] = [["driver", W / 2 - 14, 92], ["lady", W / 2 + 14, 228]];
      for (const [name, fromX, toX] of who) {
        const x = Math.round(fromX + (toX - fromX) * hu);
        const lift = hu < 1 ? Math.round(Math.sin(hu * Math.PI) * 22) : 0;
        // after landing: arms waving, a little victory hop now and then
        const hop = hu >= 1 && Math.floor((tt + (name === "lady" ? 0.4 : 0)) * 1.5) % 3 === 0 ? Math.round(Math.abs(Math.sin((tt + (name === "lady" ? 0.4 : 0)) * Math.PI * 1.5)) * 4) : 0;
        const f = Math.floor((tt + (name === "lady" ? 0.15 : 0)) * 3.3) & 1;
        const spr = this.bank.get(`cheer_${name}_${f}`);
        const feet = 175 - lift - hop;
        fb.rectA(x - 9, 172, 18, 3, rgb(0x120a1c), 0.4);
        if (spr) {
          fb.blit(spr, x, feet, 1);
          if (name === "lady") ladyHead = { x: x + 1, y: feet - spr.h + 10 };
        }
      }
    }
    // ---- confetti drifting down over everything
    if (tt > 3.0 && this.confetti.length < 70) {
      for (let i = 0; i < 2; i++) this.confetti.push({ x: Math.random() * W, y: -4, vy: 18 + Math.random() * 18, ph: Math.random() * 6, sp: 2 + Math.random() * 3, col: F.confetti[Math.floor(Math.random() * F.confetti.length)] });
    }
    for (const c of this.confetti) {
      c.y += c.vy * dt;
      c.ph += dt * c.sp;
      if (c.y > H + 4) { c.y = -4; c.x = Math.random() * W; }
      const x = Math.round(c.x + Math.sin(c.ph) * 4), y = Math.round(c.y);
      const flat = Math.cos(c.ph * 1.7) > 0;
      if (F.coin) {                                   // spinning gold coins
        fb.rect(x, y, flat ? 3 : 1, 3, rgb(c.col));
        if (flat) fb.rect(x, y, 1, 1, rgb(0xfff8d0));
      } else if (F.star) {                            // little star glitter
        fb.rect(x - 1, y, 3, 1, rgb(c.col));
        fb.rect(x, y - 1, 1, 3, rgb(c.col));
      } else fb.rect(x, y, flat ? 2 : 1, flat ? 1 : 2, rgb(c.col));
    }
    // ---- she has something to say about it
    if (this.endStep < 3 && tt > LAND + 0.3) {
      this.endStep = 3;
      const lv = this.lady.level;
      this.lady.say(lv >= 2 ? "love" : lv === 1 ? "love" : "scared", true, F.lines[lv]);
      if (lv >= 2) this.lady.burst(lv === 3 ? 16 : 8);
    }
    this.lady.update(dt);
    if (ladyHead) this.lady.draw(fb, ladyHead.x, ladyHead.y);
    // ---- words
    if (tt > 3.3) {
      const k = tt - 3.3;
      if (k > 0.3 || Math.floor(k * 16) % 2 === 0) {
        big(fb, t(F.title), W / 2, 5, 2, GRAD_SUN, "center", W - 8);
        para(fb, t(F.sub), W / 2, 23, C.white, W - 12);
      }
    }
    if (tt < 0.6) fb.rectA(0, 0, W, H, rgb(0x0c0618), 1 - tt / 0.6);
    if (this.finFlash > 0) {                           // the trophy lands: a flash of its own colour
      this.finFlash = Math.max(0, this.finFlash - dt);
      fb.rectA(0, 0, W, H, rgb(F.cols[0]), this.finFlash * 0.7);
    }
    if (tt > 5 && Math.floor(this.time2 * 2) % 2 === 0) {
      para(fb, inp.touchMode ? t("res.continue_tap") : t("res.continue_key"), W / 2, H - 9, C.white, W - 10, true);
    }
    if ((tt > 1.5 && (inp.hit("confirm") || inp.hit("back") || taps.length)) || tt > 18) {
      this.audio.uiSelect();
      this.finishRun(true);
    }
  }

  /** The light show of one finale, over its picture (before the trophy and the couple). */
  private finaleScene(F: Finale, tt: number, dt: number): void {
    const fb = this.fb;
    const tw = Math.floor(this.time2 * 8);
    const hsh = (a: number, b: number, c: number) => Math.abs(Math.sin((a * 91.7 + b * 37.1 + c * 13.3) * 12.9898) * 43758.5453) % 1;
    if (F.fx === "sea") {
      // the sun's path on the sea twinkles
      for (let y = 97; y < 131; y++) {
        const hw = 12 + (y - 96) * 1.25;
        for (let k = 0; k < 3; k++) {
          const h = hsh(y, k, tw);
          if (h < 0.55) fb.rect(Math.round(160 + (h * 2 - 0.55) * hw * 1.6), y, 2, 1, h < 0.2 ? rgb(0xfffbd0) : rgb(0xffd070));
        }
      }
    } else if (F.fx === "neon") {
      // searchlights sweep the sky over the skyline; the wet quay flickers in neon
      for (let i = 0; i < 3; i++) {
        const sx = [58, 168, 268][i], a = Math.sin(this.time2 * 0.8 + i * 2.1) * 0.55 + (i - 1) * 0.25;
        const col = rgb(i % 2 ? 0xff7ae8 : 0x8af0ff);
        for (let r = 6; r < 120; r += 3) {
          const wd = 2 + Math.round(r * 0.07);
          fb.rectA(Math.round(sx + Math.sin(a) * r) - (wd >> 1), Math.round(97 - Math.cos(a) * r * 0.95), wd, 3, col, 0.17 * (1 - r / 150));
        }
      }
      for (let y = 98; y < 131; y++) {
        const h = hsh(y, 3, tw);
        if (h < 0.35) fb.rect(Math.round(h * 2.6 * W) % W, y, 2, 1, h < 0.17 ? rgb(0x8af0ff) : rgb(0xff6ae0));
      }
    } else if (F.fx === "west") {
      // a tumbleweed rolls through town, dust drifting after it
      const tx = ((tt * 46) % (W + 80)) - 40, ty = 128 + Math.round(Math.abs(Math.sin(tt * 5)) * -3);
      const tum = this.bank.get("tumbleweed");
      if (tum) fb.blit(tum, Math.round(tx), ty, 1);
      for (let i = 1; i < 6; i++) fb.rectA(Math.round(tx - 8 - i * 5), ty - 1 - (i % 3), 3 + (i % 2), 1, rgb(0xd8b078), 0.45 - i * 0.07);
    } else if (F.fx === "lake") {
      // fireflies over the water and paper lanterns drifting up into the night
      for (let i = 0; i < 16; i++) {
        const x = 14 + ((i * 53) % 290) + Math.sin(this.time2 * 0.7 + i) * 8, y = 100 + ((i * 37) % 36) + Math.cos(this.time2 * 0.9 + i * 1.7) * 5;
        if (Math.sin(this.time2 * 2.1 + i * 1.3) > 0.1) fb.rect(Math.round(x), Math.round(y), 1, 1, rgb(i % 3 ? 0xe8ff90 : 0xfff4c0));
      }
      if (tt > 3.2 && this.floats.length < 14 && Math.random() < dt * 3.2) {
        this.floats.push({ x: 20 + Math.random() * 280, y: 150 + Math.random() * 14, vy: -(8 + Math.random() * 7), ph: Math.random() * 6, sp: 0.8 + Math.random(), col: [0xffa040, 0xffd060, 0xff7a50][Math.floor(Math.random() * 3)] });
      }
      for (let i = this.floats.length - 1; i >= 0; i--) {
        const l = this.floats[i];
        l.y += l.vy * dt;
        l.ph += dt * l.sp;
        if (l.y < -8) { this.floats.splice(i, 1); continue; }
        const x = Math.round(l.x + Math.sin(l.ph) * 5), y = Math.round(l.y);
        fb.rectA(x - 3, y - 3, 7, 9, rgb(l.col), 0.18);
        fb.rect(x - 1, y, 3, 4, rgb(l.col));
        fb.rect(x - 1, y, 3, 1, rgb(0xfff4c0));
        fb.rect(x - 1, y + 4, 3, 1, rgb(0x6a3a20));
      }
      // rings spread on the water where the trophy comes up
      if (tt > 1.9 && tt < 6.5) {
        for (let k = 0; k < 2; k++) {
          const r = ((tt - 1.9) * 26 + k * 20) % 44;
          for (let a = 0; a < 28; a++) {
            const ang = (a / 28) * Math.PI * 2;
            fb.rectA(Math.round(160 + Math.cos(ang) * r * 1.6), Math.round(this.fin.clip + 2 + Math.sin(ang) * r * 0.3), 2, 1, rgb(0xd8f4ff), 0.5 * (1 - r / 44));
          }
        }
      }
    } else if (F.fx === "stars") {
      // twinkling stars and shooting stars across the sky
      for (let i = 0; i < 14; i++) {
        const ph = (this.time2 * 0.9 + i * 0.37) % 1;
        if (ph > 0.45) continue;
        const x = 8 + ((i * 97) % 304), y = 6 + ((i * 53) % 70), len = ph < 0.22 ? 1 + Math.round(ph * 9) : 1 + Math.round((0.45 - ph) * 9);
        fb.rect(x - len, y, len * 2 + 1, 1, rgb(0xfffbe0));
        fb.rect(x, y - len, 1, len * 2 + 1, rgb(0xfffbe0));
      }
      if (tt > 0.8 && Math.random() < dt * 1.6) this.streaks.push({ x: 40 + Math.random() * 280, y: -4 + Math.random() * 30, vx: -(90 + Math.random() * 50), vy: 45 + Math.random() * 25, life: 1.0 });
      for (let i = this.streaks.length - 1; i >= 0; i--) {
        const q = this.streaks[i];
        q.life -= dt;
        if (q.life <= 0 || q.y > 96) { this.streaks.splice(i, 1); continue; }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        for (let k = 0; k < 10; k++) fb.rectA(Math.round(q.x - q.vx * 0.012 * k), Math.round(q.y - q.vy * 0.012 * k), k < 2 ? 2 : 1, 1, rgb(k < 3 ? 0xffffff : 0xb8a8ff), (1 - k / 10) * Math.min(1, q.life * 2));
      }
    }
  }

  // ----------------------------------------------------------- results
  private finishRun(goal: boolean): void {
    const r = this.race;
    if (!r || (this.mode !== "race" && this.mode !== "ending")) return;
    this.audio.stopEngine();
    const res = this.result;
    res.goal = goal;
    res.score = Math.round(r.score);
    res.stage = r.stage;
    res.stageTimes = r.stageTimes.slice();
    res.path = r.track.path.slice(0, r.stage + 1);
    res.run = r.runTime;
    if (!goal) res.bonus = 0;
    res.passBonus = this.passTotal; // stage-clear bonuses + the finish bonus
    res.moodLevel = this.lady.level;
    res.diff = r.diff.id;
    this.flushNear();
    analytics.event("passenger_mood", { name: this.lady.levelKey, value: Math.round(this.lady.mood) });
    res.newBest = new Set();
    res.top = [];
    res.topLoaded = false;
    analytics.score(res.score);
    // first the course map with the route just driven, then the results
    this.openMap(true);
    if (!goal) this.audio.stopSong(1);
    // leaderboards (the run's own difficulty): only better results are kept, so submitting every run is fine
    const subs: Promise<void>[] = [];
    const testRun = TEST_HOOKS && !isTestSdk(); // test hooks never post to the real boards
    const diff = r.diff.id, scoreBoard = boardId("score", diff);
    const sub = (board: string, v: number) => { if (!testRun) subs.push(submitScore(board, v).then((x) => { if (x?.improved) res.newBest.add(board); })); };
    sub(scoreBoard, res.score);
    if (goal) sub(boardId("run", diff), Math.round(res.run * 1000));
    // stage times are the player's own bests on this device, per difficulty
    if (!testRun) {
      const bests = this.stageBests(diff);
      res.stageTimes.forEach((sec, i) => {
        const node = res.path[i] ?? i;
        const ms = Math.round(sec * 1000);
        if (ms > 0 && (!bests[node] || ms < bests[node])) { bests[node] = ms; res.newBest.add(`stage-${node}`); }
      });
      this.saveStageBests(diff, bests);
    }
    Promise.all(subs).finally(() => {
      this.rankCache.clear();
      if (!servicesOnline()) {
        // no online boards here (desktop / offline): show this computer's arcade top drivers instead
        res.top = arcadeTable(diff).slice(0, 5).map((e, i) => ({ rank: i + 1, score: e.s, displayName: e.n }));
        res.topLoaded = true;
        return;
      }
      topScores(scoreBoard, 5).then((e) => { res.top = e; res.topLoaded = true; });
    });
    const had = this.bestScore.get(diff);
    if (!testRun && (had === undefined || res.score > had)) this.bestScore.set(diff, res.score);
    // a score good enough for this device's arcade top 10 gets the "enter your name" screen next
    res.arcade = !testRun || NAMETEST ? arcadeRank(diff, res.score) : -1;
  }

  /** Fastest time (ms, 0 = none yet) for each of the ten stages on a difficulty, on this device
   *  (indexed by stage: the five coast stages keep the slots they always had). */
  private stageBests(diff: DiffId): number[] {
    let all: Record<string, number[]> = {};
    try { all = JSON.parse(localStorage.getItem(STAGE_BEST_KEY) || "{}") || {}; } catch { /* storage blocked or garbled */ }
    const row = Array.isArray(all[diff]) ? all[diff] : [];
    return Array.from({ length: NODE_COUNT }, (_v, i) => (typeof row[i] === "number" && row[i] > 0 ? row[i] : 0));
  }

  private saveStageBests(diff: DiffId, bests: number[]): void {
    try {
      const all = JSON.parse(localStorage.getItem(STAGE_BEST_KEY) || "{}") || {};
      all[diff] = bests;
      localStorage.setItem(STAGE_BEST_KEY, JSON.stringify(all));
    } catch { /* storage blocked */ }
  }

  private results(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const r = this.race;
    const fb = this.fb;
    if (r) {
      r.update(dt, { steer: 0, throttle: 0, brake: 0 });
      this.painter.render(r);
    } else fb.clear(rgb(0x140a26));
    fb.rectA(0, 0, W, H, rgb(0x0c0618), Math.min(0.5, this.modeT));
    const res = this.result;
    const x0 = 34, w = W - 68;
    panel(fb, x0, 8, w, 164);
    big(fb, res.goal ? t("res.complete") : t("res.gameover"), W / 2, 14, 2, res.goal ? GRAD_SUN : GRAD_RED, "center", w - 8);
    if (r) drawText(fb, t(r.diff.nameKey), x0 + 5, 11, r.diff.col, { outline: C.ink });
    let y = 34;
    drawText(fb, t("res.score", { n: fmtNum(res.score) }), W / 2, y, C.white, { align: "center", outline: C.ink });
    if (res.newBest.has(boardId("score", res.diff)) && Math.floor(this.time2 * 3) % 2 === 0) drawText(fb, t("res.newbest"), x0 + w - 6, y, C.yellow, { align: "right", outline: C.ink });
    y += 10;
    {
      // her mood and the bonus it earned: [face] MOOD  PASSENGER BONUS +N
      const moodTxt = t(MOOD_NAME[res.moodLevel]);
      const bonusTxt = res.passBonus > 0 ? t("msg.passbonus", { n: fmtNum(res.passBonus) }) : "";
      const mw = textWidth(moodTxt), bwid = textWidth(bonusTxt);
      const total = 11 + 4 + mw + (bwid ? 8 + bwid : 0);
      let lx = Math.round(W / 2 - total / 2);
      face(fb, lx, y - 2, res.moodLevel);
      lx += 15;
      drawText(fb, moodTxt, lx, y, MOOD_COL[res.moodLevel], { outline: C.ink });
      drawText(fb, bonusTxt, lx + mw + 8, y, C.pink, { outline: C.ink });
    }
    y += 12;
    if (res.goal) {
      drawText(fb, t("res.fullrun", { t: fmtTime(res.run) }), W / 2, y, C.cyan, { align: "center", outline: C.ink });
      if (res.newBest.has(boardId("run", res.diff))) star(fb, Math.round(W / 2 + textWidth(t("res.fullrun", { t: fmtTime(res.run) })) / 2 + 4), y, C.yellow);
      if (res.bonus) { y += 10; drawText(fb, t("res.timebonus", { n: fmtNum(res.bonus) }), W / 2, y, C.yellow, { align: "center", outline: C.ink }); }
    } else {
      drawText(fb, t("res.reached", { name: t(THEMES[res.path[res.stage] ?? 0].nameKey) }), W / 2, y, C.cyan, { align: "center", outline: C.ink, maxW: w - 8 });
    }
    y += 13;
    // stage splits
    for (let i = 0; i < STAGE_COUNT; i++) {
      // the stages of the route driven; columns not reached stay blank
      const done = i < res.stageTimes.length;
      const node = res.path[i];
      const col = done ? C.white : rgb(0x6a5a80);
      drawText(fb, `${i + 1}`, x0 + 10, y, done ? C.orange : col, { outline: C.ink });
      drawText(fb, node !== undefined ? fit(t(THEMES[node].nameKey), 112) : "- - -", x0 + 20, y, col, { outline: C.ink });
      drawText(fb, done ? fmtTime(res.stageTimes[i]) : "--'--\"--", x0 + w - 44, y, done ? C.cyan : col, { align: "right", outline: C.ink });
      if (node !== undefined && res.newBest.has(`stage-${node}`)) star(fb, x0 + w - 38, y, C.yellow);
      y += 9;
    }
    y += 4;
    label(fb, t("res.top_on", { d: t(diffById(res.diff).nameKey) }), W / 2, y, C.orange, "center");
    y += 10;
    if (!res.topLoaded) drawText(fb, t("rank.loading"), W / 2, y, C.grey, { align: "center", outline: C.ink });
    else if (!res.top.length) para(fb, t("rank.empty"), W / 2, y, C.grey, w - 8);
    else {
      const rows = Math.max(1, Math.min(4, Math.floor((166 - y) / 9)));
      for (const e of res.top.slice(0, rows)) {
        const col = e.you ? C.yellow : C.white;
        drawText(fb, `${e.rank}`, x0 + 10, y, col, { outline: C.ink });
        drawText(fb, fit(e.displayName || "???", 150), x0 + 24, y, col, { outline: C.ink });
        drawText(fb, fmtNum(e.score), x0 + w - 8, y, col, { align: "right", outline: C.ink });
        y += 9;
      }
    }
    if (this.modeT > 1.2 && Math.floor(this.time2 * 2) % 2 === 0) {
      para(fb, inp.touchMode ? t("res.continue_tap") : t("res.continue_key"), W / 2, H - 11, C.white, W - 10, true);
    }
    if (this.modeT > 1.2 && (inp.hit("confirm") || inp.hit("back") || taps.length)) {
      this.audio.uiSelect();
      if (res.arcade >= 0) { this.openName(); return; }
      this.audio.stopSong(0.8);
      this.race = null;
      this.newDemo();
      this.setMode("title");
    }
  }

  // ------------------------------------------------------- course map
  private openMap(run: boolean): void {
    this.mapRun = run;
    this.mapProg = 0;
    this.setMode("map");
    if (!run && this.race === null) this.courseMap.sel = this.courseMap.sel || 0;
  }

  private mapScreen(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const fb = this.fb;
    const cm = this.courseMap;
    const res = this.result;
    if (this.mapRun) {
      // the route just driven draws itself across the map, then on to the results
      const edges = Math.max(0, res.path.length - 1);
      const done = this.mapProg >= edges;
      this.mapProg = Math.min(edges, this.mapProg + dt * 1.15);
      cm.draw(fb, this.bank, this.time2, res.path, this.mapProg, -1);
      const k = Math.min(res.path.length - 1, Math.round(this.mapProg));
      const node = res.path[k];
      const extra = k < res.stageTimes.length ? fmtTime(res.stageTimes[k]) : res.goal ? t("map.goal") : t("map.timeup");
      cm.caption(fb, this.bank, node, 0, extra);
      if (done && this.modeT > 0.8 && Math.floor(this.time2 * 2) % 2 === 0) para(fb, inp.touchMode ? t("res.continue_tap") : t("res.continue_key"), W / 2, H - 41, C.white, W - 10, true);
      if (this.modeT > 0.5 && (inp.hit("confirm") || inp.hit("back") || taps.length)) {
        this.audio.uiSelect();
        if (!done) this.mapProg = edges;
        else this.setMode("results");
      }
      return;
    }
    // browsing from the title: pick a stage to see its weather and your best time
    if (inp.hit("left")) { cm.move(-1, 0); this.audio.uiMove(); }
    if (inp.hit("right")) { cm.move(1, 0); this.audio.uiMove(); }
    if (inp.hit("up")) { cm.move(0, -1); this.audio.uiMove(); }
    if (inp.hit("down")) { cm.move(0, 1); this.audio.uiMove(); }
    const back: Rect = { x: 4, y: 4, w: 44, h: 12 };
    for (const tp of taps) {
      if (inRect(back, tp.x, tp.y)) continue;
      const n = cm.hit(tp.x, tp.y);
      if (n >= 0 && n !== cm.sel) { cm.sel = n; this.audio.uiMove(); }
    }
    cm.draw(fb, this.bank, this.time2, [], 0, cm.sel);
    button(fb, back, t("rank.back"), false);
    cm.caption(fb, this.bank, cm.sel, this.stageBests(this.diff.id)[cm.sel] ?? 0);
    if (inp.hit("back") || inp.hit("confirm") || this.tapped(taps, back)) {
      this.audio.uiSelect();
      this.setMode("title");
      this.menuSel = 2;
    }
  }

  // ------------------------------------------------------ name entry
  private openName(): void {
    this.setMode("name");
    this.namePhase = "enter";
    this.nameBuf = lastName();
    // a returning driver's name is already filled in: start on OK
    this.nameRow = this.nameBuf ? NAME_ROWS.length : 0;
    this.nameCol = this.nameBuf ? 2 : 0;
    this.nameAt = -1;
    this.input2.textMode = true;
  }

  private nameKeys(): { r: number; c: number; rect: Rect; label: string }[] {
    const keys: { r: number; c: number; rect: Rect; label: string }[] = [];
    const x0 = W / 2 - 109;
    NAME_ROWS.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) keys.push({ r, c, rect: { x: x0 + c * 22, y: 60 + r * 14, w: 20, h: 12 }, label: row[c] });
    });
    const y = 60 + NAME_ROWS.length * 14;
    keys.push({ r: NAME_ROWS.length, c: 0, rect: { x: x0, y, w: 64, h: 13 }, label: t("name.space") });
    keys.push({ r: NAME_ROWS.length, c: 1, rect: { x: x0 + 68, y, w: 64, h: 13 }, label: t("name.del") });
    keys.push({ r: NAME_ROWS.length, c: 2, rect: { x: x0 + 136, y, w: 82, h: 13 }, label: t("name.ok") });
    return keys;
  }

  /** Press one key of the on-screen keyboard (or a typed character). */
  private nameKey(r: number, c: number): void {
    const last = NAME_ROWS.length;
    if (r < last) {
      if (Array.from(this.nameBuf).length < NAME_MAX) { this.nameBuf += NAME_ROWS[r][c]; this.audio.uiMove(); }
    } else if (c === 0) {
      if (this.nameBuf && Array.from(this.nameBuf).length < NAME_MAX && !this.nameBuf.endsWith(" ")) { this.nameBuf += " "; this.audio.uiMove(); }
    } else if (c === 1) {
      if (this.nameBuf) { this.nameBuf = Array.from(this.nameBuf).slice(0, -1).join(""); this.audio.uiMove(); }
    } else this.nameDone();
  }

  private nameDone(): void {
    const res = this.result;
    const name = cleanName(this.nameBuf) || t("name.default");
    if (cleanName(this.nameBuf)) saveName(name);
    const e: ArcadeEntry = { n: name, s: res.score, c: this.car.id, d: Date.now() };
    this.nameAt = arcadeInsert(res.diff, e);
    analytics.event("arcade_entry", { name: res.diff, value: this.nameAt + 1 });
    this.input2.textMode = false;
    this.namePhase = "table";
    this.modeT = 0;
    this.audio.fanfare();
  }

  private nameEntry(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const fb = this.fb;
    const res = this.result;
    const r = this.race;
    if (r) { r.update(dt, { steer: 0, throttle: 0, brake: 0 }); this.painter.render(r); }
    else { this.demo.update(dt, { steer: 0, throttle: 0, brake: 0 }); this.painter.render(this.demo); }
    fb.rectA(0, 0, W, H, rgb(0x0c0618), 0.55);
    const x0 = 14, w = W - 28;
    panel(fb, x0, 3, w, 156);
    const diff = diffById(res.diff);
    if (this.namePhase === "table") { this.arcadeBoard(diff, this.nameAt, taps); return; }

    big(fb, t("name.title"), W / 2, 7, 2, GRAD_SUN, "center", w - 8);
    // "Normal   Rank 3   1,889,796"
    const parts: [string, number][] = [[t(diff.nameKey), diff.col], [t("name.rank", { n: res.arcade + 1 }), C.white], [fmtNum(res.score), C.yellow]];
    const gap = 12, tw = parts.reduce((a, [q]) => a + textWidth(q), 0) + gap * 2;
    let tx = Math.round(W / 2 - tw / 2);
    for (const [q, col] of parts) { drawText(fb, q, tx, 25, col, { outline: C.ink }); tx += textWidth(q) + gap; }
    // the name so far, in big letters with a blinking cursor
    const chars = Array.from(this.nameBuf);
    const slot = 12, fx = Math.round(W / 2 - (NAME_MAX * slot) / 2);
    for (let i = 0; i < NAME_MAX; i++) {
      const sx = fx + i * slot;
      if (i < chars.length) drawText(fb, chars[i], sx + 1, 37, C.white, { scale: 2, outline: C.ink });
      const cursor = i === chars.length && Math.floor(this.time2 * 3) % 2 === 0;
      fb.rect(sx + 1, 53, 10, 1, cursor ? C.yellow : rgb(0x5a4a78));
    }
    // typed on a real keyboard (letters, digits, space, backspace)
    for (const ch of inp.takeTyped()) {
      if (ch === "") { this.nameKey(NAME_ROWS.length, 1); continue; }
      const u = nameChar(ch);
      if (!u) continue;
      if (u === " ") this.nameKey(NAME_ROWS.length, 0);
      else if (Array.from(this.nameBuf).length < NAME_MAX) { this.nameBuf += u; this.audio.uiMove(); }
      // after typing, Enter means "done"
      this.nameRow = NAME_ROWS.length;
      this.nameCol = 2;
    }
    // arrows walk the on-screen keyboard
    const last = NAME_ROWS.length;
    const rowLen = (row: number) => (row === last ? 3 : NAME_ROWS[row].length);
    if (inp.hit("left")) { this.nameCol = (this.nameCol + rowLen(this.nameRow) - 1) % rowLen(this.nameRow); this.audio.uiMove(); }
    if (inp.hit("right")) { this.nameCol = (this.nameCol + 1) % rowLen(this.nameRow); this.audio.uiMove(); }
    const toRow = (nr: number) => {
      const from = this.nameRow;
      if (from === last && nr !== last) this.nameCol = [1, 5, 8][this.nameCol];
      else if (nr === last && from !== last) this.nameCol = this.nameCol < 4 ? 0 : this.nameCol < 7 ? 1 : 2;
      this.nameRow = nr;
      this.audio.uiMove();
    };
    if (inp.hit("up")) toRow((this.nameRow + last) % (last + 1));
    if (inp.hit("down")) toRow((this.nameRow + 1) % (last + 1));
    const keys = this.nameKeys();
    for (const k of keys) {
      if (this.tapped(taps, k.rect)) { this.nameRow = k.r; this.nameCol = k.c; this.nameKey(k.r, k.c); if (this.mode !== "name" || this.namePhase !== "enter") return; }
      const on = k.r === this.nameRow && k.c === this.nameCol;
      button(fb, k.rect, k.label, on);
    }
    para(fb, inp.touchMode ? t("name.hint_tap") : t("name.hint_key"), W / 2, 137, C.grey, w - 10);
    para(fb, t("name.local"), W / 2, 148, rgb(0x8a7aa8), w - 10);
    if (inp.hit("confirm")) this.nameKey(this.nameRow, this.nameCol);
    else if (inp.hit("back")) this.nameDone();
  }

  /** This device's arcade top 10 for a difficulty, the just-entered row blinking. */
  private arcadeBoard(diff: Difficulty, at: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const fb = this.fb;
    const x0 = 14, w = W - 28;
    big(fb, t("name.table"), W / 2, 7, 2, GRAD_SUN, "center", w - 8);
    drawText(fb, t(diff.nameKey), W / 2, 25, diff.col, { align: "center", outline: C.ink });
    this.arcadeRows(diff.id, at, x0 + 40, x0 + w - 40, 37, 10);
    if (this.modeT > 0.6 && Math.floor(this.time2 * 2) % 2 === 0) {
      para(fb, inp.touchMode ? t("res.continue_tap") : t("res.continue_key"), W / 2, 150, C.white, w - 10);
    }
    if (this.modeT > 0.6 && (inp.hit("confirm") || inp.hit("back") || taps.length)) {
      this.audio.uiSelect();
      this.audio.stopSong(0.8);
      this.race = null;
      this.newDemo();
      this.setMode("title");
    }
  }

  /** Rows of the arcade table between xl and xr from y, `step` px apart; `at` = row to highlight. */
  private arcadeRows(diff: DiffId, at: number, xl: number, xr: number, y: number, step: number, placeholders = true): number {
    const fb = this.fb;
    const rows = arcadeTable(diff);
    for (let i = 0; i < (placeholders ? ARCADE_SIZE : rows.length); i++) {
      const e = rows[i];
      const mine = i === at;
      const blink = mine && Math.floor(this.time2 * 4) % 2 === 0;
      if (mine) fb.rectA(xl - 6, y - 1, xr - xl + 12, step, rgb(0xff9a3c), 0.28);
      const col = blink ? C.yellow : mine ? C.white : !e ? rgb(0x5a4a78) : i < 3 ? C.white : C.grey;
      drawText(fb, `${i + 1}`, xl + 10, y, i === 0 && e ? C.yellow : col, { align: "right", outline: C.ink });
      if (e) {
        drawText(fb, e.n, xl + 18, y, col, { outline: C.ink, maxW: 100 });
        // a dab of the colour of the car it was driven in
        const car = carById(e.c);
        fb.rect(xl + 124, y + 1, 7, 5, C.ink);
        fb.rect(xl + 125, y + 2, 5, 3, car.col);
        drawText(fb, fmtNum(e.s), xr, y, col, { align: "right", outline: C.ink });
      } else {
        drawText(fb, "- - -", xl + 18, y, col, { outline: C.ink });
      }
      y += step;
    }
    return y;
  }

  // ------------------------------------------------------------ badges
  /** A stage was cleared: clean-driving, near-miss and progress badges. */
  private badgeStage(stage: number): void {
    const b = this.badges, tier = this.tier;
    b.unlock(badgeId("stage-clear", tier));
    // every stage cleared on this difficulty, over all runs and routes (kept on this device)
    if (this.race && !(TEST_HOOKS && !isTestSdk())) {
      const seen = this.stagesCleared(tier);
      seen.add(this.race.track.path[stage] ?? stage);
      this.saveStagesCleared(tier, seen);
      if (seen.size >= NODE_COUNT) b.unlock(badgeId("every-road", tier));
    }
    if (this.stageClean) { b.unlock(badgeId("clean-stage", tier)); b.progress(statId("clean-stages", tier), 1); }
    if (stage + 1 === STAGE_COUNT - 1) b.unlock(badgeId("reach-twilight", tier));
    this.flushNear();
    this.stageClean = true;
  }

  /** Stages ever cleared on a difficulty (this device). */
  private stagesCleared(tier: string): Set<number> {
    try {
      const all = JSON.parse(localStorage.getItem(STAGES_CLEARED_KEY) || "{}") || {};
      return new Set((Array.isArray(all[tier]) ? all[tier] : []).filter((n: unknown) => typeof n === "number" && n >= 0 && n < NODE_COUNT));
    } catch { return new Set(); }
  }

  private saveStagesCleared(tier: string, seen: Set<number>): void {
    try {
      const all = JSON.parse(localStorage.getItem(STAGES_CLEARED_KEY) || "{}") || {};
      all[tier] = [...seen].sort((x, y) => x - y);
      localStorage.setItem(STAGES_CLEARED_KEY, JSON.stringify(all));
    } catch { /* storage blocked */ }
  }

  /** A goal was reached: its own badge, and the grand one once all five have been reached (any difficulty). */
  private badgeGoal(node: number): void {
    const letter = goalLetter(node);
    if (!letter) return;
    this.goalProgress.enabled = !TEST_HOOKS || isTestSdk();
    this.goalProgress.record(this.tier, letter as GoalLetter);
    this.syncGoalProgress();
    const b = this.badges, mine = `goal-${letter.toLowerCase()}`;
    b.unlock(mine);
    let seen = new Set<string>();
    if (!(TEST_HOOKS && !isTestSdk())) {
      try {
        const raw = JSON.parse(localStorage.getItem(GOALS_REACHED_KEY) || "[]");
        seen = new Set((Array.isArray(raw) ? raw : []).filter((x: unknown) => typeof x === "string" && GOAL_BASES.includes(x)));
      } catch { /* storage blocked */ }
      seen.add(mine);
      try { localStorage.setItem(GOALS_REACHED_KEY, JSON.stringify([...seen])); } catch { /* storage blocked */ }
    }
    // goals earned on another device count too
    for (const g of GOAL_BASES) if (g === mine || b.has(g)) seen.add(g);
    if (GOAL_BASES.every((g) => seen.has(g))) b.unlock("goal-all");
  }

  /** Merge proven difficulty-specific finishes; old tier-less goal rewards stay separate. */
  private syncGoalProgress(): void {
    this.goalProgress.enabled = !TEST_HOOKS || isTestSdk();
    const cleared = Object.fromEntries(TIERS.map(tier => [tier, [...this.stagesCleared(tier)]]));
    const completed = new Set(TIERS.filter(tier => this.badges.has(badgeId('all-goals', tier))));
    this.goalProgress.merge(cleared, completed);
    for (const tier of TIERS) if (goalCount(this.goalProgress.current, tier) === 5) {
      this.badges.unlock(badgeId('all-goals', tier));
    }
  }

  /** Report this run's near misses so far (once per checkpoint, never per pass). */
  private flushNear(): void {
    const tier = this.tier;
    if (this.nearRun >= NEAR_MISS_RUN) this.badges.unlock(badgeId("near-miss-run", tier));
    this.badges.progress(statId("near-misses", tier), this.nearPending);
    this.nearPending = 0;
  }

  /** Which badge set this run earns towards: the difficulty it is driven on. */
  private get tier(): DiffId { return this.race?.diff.id ?? this.diff.id; }

  private openBadges(): void {
    this.badges.refresh();
    this.badgeSel = DIFFS.indexOf(this.diff) * BADGE_TYPES.length;
    this.setMode("badges");
  }

  private badgeScreen(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const fb = this.fb;
    const bd = this.badges;
    this.demo.update(dt, { steer: 0, throttle: 0, brake: 0 });
    this.painter.render(this.demo);
    fb.rectA(0, 0, W, H, rgb(0x0c0618), 0.45);
    const x0 = 12, w = W - 24;
    panel(fb, x0, 6, w, 152);
    big(fb, t("badge.title"), W / 2, 10, 2, GRAD_SUN, "center", w - 8);
    const PER = BADGE_TYPES.length;
    if (bd.state === "loading") drawText(fb, t("rank.loading"), W / 2, 27, C.grey, { align: "center", outline: C.ink });
    else if (bd.state === "failed" && !bd.count) para(fb, t("badge.offline"), W / 2, 27, C.pink, w - 10);
    else {
      // earned per difficulty, each in its medal colour (Easy bronze, Normal silver, Hard gold), then the goals
      const kinds: ("easy" | "normal" | "hard" | "goal")[] = [...TIERS, "goal"];
      const parts = kinds.map((k) => {
        const mine = BADGES.filter((d) => d.tier === k);
        return t("badge.tier_count", { d: tierName(k), n: mine.filter((d) => bd.has(d.id)).length, total: mine.length });
      });
      const gap = 9, tw = parts.reduce((q, x) => q + textWidth(x), 0) + gap * (parts.length - 1);
      let tx = Math.round(W / 2 - tw / 2);
      parts.forEach((q, i) => { drawText(fb, q, tx, 27, TIER_RIM[kinds[i]][1], { outline: C.ink }); tx += textWidth(q) + gap; });
    }

    // one row of medals per difficulty, and a last row for the five goals and the grand one
    const rowStart = BADGE_ROWS.map((_, r) => BADGE_ROWS.slice(0, r).reduce((q, x) => q + x, 0));
    const row = rowStart.findIndex((st, r) => this.badgeSel >= st && this.badgeSel < st + BADGE_ROWS[r]);
    const col = this.badgeSel - rowStart[row];
    const cnt = BADGE_ROWS[row];
    if (inp.hit("left")) { this.badgeSel = rowStart[row] + (col + cnt - 1) % cnt; this.audio.uiMove(); }
    if (inp.hit("right")) { this.badgeSel = rowStart[row] + (col + 1) % cnt; this.audio.uiMove(); }
    for (const [key, dir] of [["up", -1], ["down", 1]] as const) {
      if (!inp.hit(key)) continue;
      const r2 = (row + dir + BADGE_ROWS.length) % BADGE_ROWS.length;
      // keep the same horizontal position (rows are centred, so a shorter row is offset)
      const c2 = Math.max(0, Math.min(BADGE_ROWS[r2] - 1, Math.round(col + (BADGE_ROWS[r2] - cnt) / 2)));
      this.badgeSel = rowStart[r2] + c2;
      this.audio.uiMove();
    }
    const SP = Math.min(21, Math.floor((w - 12) / Math.max(...BADGE_ROWS))), PITCH = 17, TOP = 40;
    BADGES.forEach((def, i) => {
      const r = rowStart.findIndex((st, k) => i >= st && i < st + BADGE_ROWS[k]);
      const cx = Math.round(W / 2 + ((i - rowStart[r]) - (BADGE_ROWS[r] - 1) / 2) * SP), cy = TOP + r * PITCH;
      if (this.tapped(taps, { x: cx - SP / 2, y: cy - 8, w: SP, h: PITCH }) && i !== this.badgeSel) { this.badgeSel = i; this.audio.uiMove(); }
      const earned = bd.has(def.id);
      if (i === this.badgeSel) {
        const rr = 9, c = Math.floor(this.time2 * 4) % 2 ? C.yellow : C.white;
        for (let dy = -rr - 1; dy <= rr + 1; dy++) for (let dx = -rr - 1; dx <= rr + 1; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (Math.abs(d - rr) < 0.55) fb.pset(cx + dx, cy + dy, c);
        }
      }
      drawMedal(fb, cx, cy, def, earned, 8, earned ? ((this.time2 * 0.5 + i * 0.13) % 3) : -1, def.tier);
    });

    // details of the chosen badge
    const def = BADGES[this.badgeSel];
    const earned = bd.has(def.id);
    fb.rect(x0 + 10, 99, w - 20, 1, rgb(0x5a2a5a));
    const name = badgeName(def), tierTxt = def.tier === "goal" ? "" : ` (${tierName(def.tier)})`;
    const nw = textWidth(name) + textWidth(tierTxt);
    const nx = Math.round(W / 2 - Math.min(nw, w - 12) / 2);
    drawText(fb, fit(name, w - 12 - textWidth(tierTxt)), nx, 103, earned ? C.yellow : C.white, { outline: C.ink });
    drawText(fb, tierTxt, nx + Math.min(textWidth(name), w - 12 - textWidth(tierTxt)), 103, TIER_RIM[def.tier][1], { outline: C.ink });
    para(fb, badgeDesc(def), W / 2, 114, C.grey, w - 16);
    if (def.base === 'all-goals' && def.tier !== 'goal') {
      const mask = bd.has(def.id) ? 31 : this.goalProgress.current.masks[def.tier];
      GOAL_LETTERS.forEach((letter, i) => drawText(fb, letter, W / 2 + (i - 2) * 17, 125,
        mask & (1 << i) ? C.green : C.grey, { align: 'center', outline: C.ink }));
    }
    const sy = 135;
    if (earned) {
      // pixel tick + "Earned"
      const txt = t("badge.got"), tw = textWidth(txt);
      const tx = Math.round(W / 2 - (tw + 10) / 2);
      const TICK = ["......#", ".....##", "#...##.", "##.##..", ".###...", "..#...."];
      TICK.forEach((r, ry) => { for (let q = 0; q < r.length; q++) if (r[q] === "#") { fb.rect(tx + q - 1, sy + ry, 3, 2, C.ink); } });
      TICK.forEach((r, ry) => { for (let q = 0; q < r.length; q++) if (r[q] === "#") fb.pset(tx + q, sy + ry + 1, C.green); });
      drawText(fb, txt, tx + 10, sy, C.green, { outline: C.ink });
    }
    else if (def.target && def.target > 1) {
      const got = bd.progressOf(def);
      const txt = t("badge.progress", { n: fmtNum(got), total: fmtNum(def.target) });
      const bw = 80, tw = textWidth(txt);
      const bx = Math.round(W / 2 - (bw + 6 + tw) / 2);
      fb.rect(bx - 1, sy - 1, bw + 2, 9, C.ink);
      fb.rect(bx, sy, bw, 7, rgb(0x2c1a48));
      fb.rect(bx, sy, Math.round((got / def.target) * bw), 7, def.col);
      fb.rect(bx, sy, Math.round((got / def.target) * bw), 1, rgb(0xffffff));
      drawText(fb, txt, bx + bw + 6, sy, C.white, { outline: C.ink });
    } else drawText(fb, t("badge.locked"), W / 2, sy, rgb(0x8a7aa8), { align: "center", outline: C.ink });

    const back: Rect = { x: W / 2 - 40, y: 162, w: 80, h: 14 };
    button(fb, back, t("rank.back"), true);
    if (!inp.touchMode) para(fb, t("badge.hint"), W / 2, 146, rgb(0x8a7aa8), w - 8, true);
    if (inp.hit("back") || inp.hit("confirm") || this.tapped(taps, back)) {
      this.audio.uiSelect();
      this.setMode("title");
      this.menuSel = 4;
    }
  }

  // ---------------------------------------------------------- rankings
  private openRankings(from: Mode): void {
    this.rankFrom = from;
    this.rankCache.clear();
    this.rankDiff = DIFFS.indexOf(this.diff);
    this.setMode("rankings");
    this.fetchBoard();
  }

  private fetchBoard(): void {
    const k = BOARD_KINDS[this.rankSel].kind;
    if (k === "stages" || k === "arcade") return;
    const id = boardId(k, DIFFS[this.rankDiff].id);
    if (this.rankCache.has(id)) return;
    this.rankCache.set(id, null);
    topScores(id, 7).then((e) => this.rankCache.set(id, e));
  }

  private rankings(dt: number, taps: { x: number; y: number }[]): void {
    const inp = this.input2;
    const fb = this.fb;
    this.demo.update(dt, { steer: 0, throttle: 0, brake: 0 });
    this.painter.render(this.demo);
    fb.rectA(0, 0, W, H, rgb(0x0c0618), 0.45);
    const x0 = 30, w = W - 60;
    panel(fb, x0, 8, w, 150);
    big(fb, t("rank.title"), W / 2, 13, 2, GRAD_SUN);
    // difficulty tabs (up / down), then which board (left / right)
    const tabs: Rect[] = DIFFS.map((_d, i) => ({ x: W / 2 - 93 + i * 64, y: 30, w: 58, h: 13 }));
    let dd = 0;
    if (inp.hit("up")) dd = -1;
    if (inp.hit("down")) dd = 1;
    if (dd) this.rankDiff = (this.rankDiff + dd + DIFFS.length) % DIFFS.length;
    tabs.forEach((r, i) => {
      if (this.tapped(taps, r) && i !== this.rankDiff) { this.rankDiff = i; dd = 1; }
      const on = i === this.rankDiff;
      button(fb, r, t(DIFFS[i].nameKey), on);
      fb.rect(r.x + 3, r.y + 4, 5, 5, C.ink);
      fb.rect(r.x + 4, r.y + 5, 3, 3, DIFFS[i].col);
    });
    const kinds = BOARD_KINDS.length;
    const prev: Rect = { x: x0 + 6, y: 46, w: 16, h: 13 };
    const next: Rect = { x: x0 + w - 22, y: 46, w: 16, h: 13 };
    button(fb, prev, "<", false);
    button(fb, next, ">", false);
    let dir = 0;
    if (inp.hit("left") || this.tapped(taps, prev)) dir = -1;
    if (inp.hit("right") || this.tapped(taps, next)) dir = 1;
    if (dir) this.rankSel = (this.rankSel + dir + kinds) % kinds;
    if (dir || dd) { this.audio.uiMove(); this.fetchBoard(); }
    const diff = DIFFS[this.rankDiff];
    const kind = BOARD_KINDS[this.rankSel].kind;
    drawText(fb, t(BOARD_KINDS[this.rankSel].label), W / 2, 49, C.yellow, { align: "center", outline: C.ink, maxW: w - 50 });
    let y = 64;
    if (kind === "stages") {
      // the player's own fastest time on each stage of this difficulty
      const bests = this.stageBests(diff.id);
      // every stage, by where it comes in a run (coast first in each column)
      // (two columns: the first eight stages on the left, the rest on the right)
      const rows: { col: number; node: number; first: boolean }[] = [];
      (DEMO_A ? GOAL_A_PATH.map(n => [n]) : COLUMN_NODES).forEach((list, col) => list.slice().reverse().forEach((node, k) => rows.push({ col, node, first: k === 0 })));
      const half = Math.ceil(rows.length / 2), cw = (w - 8) / 2;
      rows.forEach((row, i) => {
        const cx = x0 + 4 + (i < half ? 0 : cw), ry = 60 + (i % half) * 9;
        const th = THEMES[row.node];
        const has = bests[row.node] > 0;
        const time = has ? fmtTime(bests[row.node] / 1000) : "--'--";
        if (row.first || i === half) drawText(fb, `${row.col + 1}`, cx + 5, ry, C.orange, { align: "right", outline: C.ink });
        drawText(fb, fit(t(th.nameKey), cw - 13 - textWidth(time)), cx + 8, ry, has ? C.white : C.grey, { outline: C.ink });
        drawText(fb, time, cx + cw - 2, ry, has ? C.cyan : rgb(0x6a5a80), { align: "right", outline: C.ink });
      });
    } else if (kind === "arcade") {
      // names entered after a run, kept on this device
      const n = arcadeTable(diff.id).length;
      if (!n) para(fb, t("rank.arcade_empty"), W / 2, y + 26, C.grey, w - 10);
      else this.arcadeRows(diff.id, -1, x0 + 14, x0 + w - 10, n > 7 ? 62 : 64, n <= 7 ? 11 : n <= 9 ? 9 : 8, false);
    } else {
      const entries = this.rankCache.get(boardId(kind, diff.id));
      if (!servicesOnline()) para(fb, t("rank.offline"), W / 2, y + 20, C.grey, w - 16);
      else if (entries === null || entries === undefined) drawText(fb, t("rank.loading"), W / 2, y + 26, C.grey, { align: "center", outline: C.ink });
      else if (!entries.length) para(fb, t("rank.empty"), W / 2, y + 26, C.grey, w - 10);
      else {
        for (const e of entries.slice(0, 6)) {
          const col = e.you ? C.yellow : e.rank <= 3 ? C.white : C.grey;
          if (e.you) fb.rectA(x0 + 4, y - 2, w - 8, 11, rgb(0xff9a3c), 0.25);
          drawText(fb, `${e.rank}`, x0 + 18, y, e.rank === 1 ? C.yellow : col, { align: "right", outline: C.ink });
          drawText(fb, fit(e.displayName || "???", 140), x0 + 26, y, col, { outline: C.ink });
          const v = kind === "run" ? fmtTime(e.score / 1000) : fmtNum(e.score);
          drawText(fb, v, x0 + w - 8, y, col, { align: "right", outline: C.ink });
          y += 11;
        }
        // online boards can only show the name of the player's account
        drawText(fb, t("rank.account"), W / 2, 133, rgb(0x8a7aa8), { align: "center", outline: C.ink, maxW: w - 10 });
      }
    }
    const back: Rect = { x: W / 2 - 40, y: 162, w: 80, h: 14 };
    button(fb, back, t("rank.back"), true);
    if (!inp.touchMode) para(fb, t("rank.hint"), W / 2, 146, C.grey, w - 8, true);
    if (inp.hit("back") || inp.hit("confirm") || this.tapped(taps, back)) {
      this.audio.uiSelect();
      this.setMode(this.rankFrom === "title" ? "title" : this.rankFrom);
      if (this.mode === "title") this.menuSel = 3;
    }
  }
}

async function boot(): Promise<void> {
  // the play service connects in the background: the game draws its first frame without waiting for it
  void initTesana(2500);
  // let the page finish loading first: starting the renderer in the very first
  // moments of the page can lose its graphics context on some browsers
  if (document.readyState !== "complete") {
    await new Promise<void>((r) => { window.addEventListener("load", () => r(), { once: true }); setTimeout(r, 1500); });
  }
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: W,
    height: H,
    pixelArt: true,
    backgroundColor: "#120c24",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    banner: false,
    scene: [MainScene],
  });
}

boot();
