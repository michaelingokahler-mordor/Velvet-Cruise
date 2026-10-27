// Sound: a synthesised flat-12 engine, tyre squeal, wind and impacts, plus
// the radio (six looping songs) and short jingles.

export interface SongInfo { file: string; title: string; bpm: number; loopStart: number; loopEnd: number }
export interface MusicJson { songs: SongInfo[]; jingles: Record<string, string> }

export class GameAudio {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private engOsc: OscillatorNode[] = [];
  private engFilter!: BiquadFilterNode;
  private engGain!: GainNode;
  private skidGain!: GainNode;
  private skidFilter!: BiquadFilterNode;
  private skidTone!: OscillatorNode;
  private roughGain!: GainNode;
  private crunchGain!: GainNode;
  private crunchFilter!: BiquadFilterNode;
  private buzzGain!: GainNode;
  private buzzOsc!: OscillatorNode;
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  private surfGain!: GainNode;
  private rainGain: GainNode | null = null;
  private windStormGain: GainNode | null = null;
  private windStormFilter: BiquadFilterNode | null = null;
  private echoGain: GainNode | null = null;
  private engineOn = false;
  private song: AudioBufferSourceNode | null = null;
  private songGain: GainNode | null = null;
  private songKey = "";
  private duckUntil = 0;
  private musicLevel = 0.6;
  private effectsLevel = 0.8;
  buffers = new Map<string, AudioBuffer>();
  music: MusicJson | null = null;

  attach(ctx: AudioContext | null | undefined): void {
    if (!ctx || this.ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVolume;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.effectsLevel;
    this.sfxBus.connect(this.master);
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  get ready(): boolean { return !!this.ctx && this.ctx.state === "running"; }

  get musicVolume(): number { return this.musicLevel; }
  set musicVolume(value: number) {
    if (!Number.isFinite(value)) return;
    this.musicLevel = Math.max(0, Math.min(1, value));
    if (this.musicLevel === 0) { this.stopSong(.06); this.setStatic(false); }
    this.updateMusicGain();
  }
  get effectsVolume(): number { return this.effectsLevel; }
  set effectsVolume(value: number) {
    if (!Number.isFinite(value)) return;
    this.effectsLevel = Math.max(0, Math.min(1, value));
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxBus.gain.cancelScheduledValues(t);
    this.sfxBus.gain.setTargetAtTime(this.effectsLevel, t, .025);
    if (this.effectsLevel === 0 && this.duckUntil > t) {
      this.duckUntil = 0; this.updateMusicGain();
    }
  }
  private updateMusicGain(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, ducked = this.duckUntil > t;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(this.musicLevel * (ducked ? .25 : 1), t, .025);
    if (ducked) this.musicBus.gain.setTargetAtTime(this.musicLevel, this.duckUntil, .2);
  }

  private noise(loop = true): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = loop;
    return s;
  }

  // ----------------------------------------------------------- engine bed
  startEngine(): void {
    const ctx = this.ctx;
    if (!ctx || this.engineOn) return;
    this.engineOn = true;
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = "lowpass";
    this.engFilter.frequency.value = 600;
    this.engFilter.Q.value = 2.5;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.2); }
    shaper.curve = curve;
    shaper.connect(this.engFilter);
    this.engFilter.connect(this.engGain);
    this.engGain.connect(this.sfxBus);
    const types: OscillatorType[] = ["sawtooth", "sawtooth", "square"];
    const gains = [0.35, 0.3, 0.22];
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      o.type = types[i];
      const g = ctx.createGain();
      g.gain.value = gains[i];
      o.connect(g);
      g.connect(shaper);
      o.start();
      this.engOsc.push(o);
    }
    // tyre squeal
    const sk = this.noise();
    this.skidFilter = ctx.createBiquadFilter();
    this.skidFilter.type = "bandpass";
    this.skidFilter.frequency.value = 1100;
    this.skidFilter.Q.value = 3;
    this.skidGain = ctx.createGain();
    this.skidGain.gain.value = 0;
    sk.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.sfxBus);
    sk.start();
    // A quiet rubber tone gives the scrape a recognisable pitched squeal.
    this.skidTone = ctx.createOscillator();
    this.skidTone.type = 'triangle';
    this.skidTone.frequency.value = 1100;
    const rubber = ctx.createGain(); rubber.gain.value = .18;
    this.skidTone.connect(rubber); rubber.connect(this.skidGain);
    this.skidTone.start();
    // gravel rumble
    const rg = this.noise();
    const rf = ctx.createBiquadFilter();
    rf.type = "lowpass";
    rf.frequency.value = 320;
    this.roughGain = ctx.createGain();
    this.roughGain.gain.value = 0;
    rg.connect(rf);
    rf.connect(this.roughGain);
    this.roughGain.connect(this.sfxBus);
    rg.start();
    // gravel crunch: crackling mid-high noise whose level is flicked every frame (sand and earth under the tyres)
    const cr = this.noise();
    this.crunchFilter = ctx.createBiquadFilter();
    this.crunchFilter.type = "bandpass";
    this.crunchFilter.frequency.value = 2200;
    this.crunchFilter.Q.value = 0.9;
    this.crunchGain = ctx.createGain();
    this.crunchGain.gain.value = 0;
    cr.connect(this.crunchFilter);
    this.crunchFilter.connect(this.crunchGain);
    this.crunchGain.connect(this.sfxBus);
    cr.start();
    // rumble strip: a coarse buzz that climbs with speed
    this.buzzOsc = ctx.createOscillator();
    this.buzzOsc.type = "sawtooth";
    this.buzzOsc.frequency.value = 50;
    const bf = ctx.createBiquadFilter();
    bf.type = "lowpass";
    bf.frequency.value = 520;
    this.buzzGain = ctx.createGain();
    this.buzzGain.gain.value = 0;
    this.buzzOsc.connect(bf);
    bf.connect(this.buzzGain);
    this.buzzGain.connect(this.sfxBus);
    this.buzzOsc.start();
    // wind
    const wn = this.noise();
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 700;
    this.windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wn.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxBus);
    wn.start();
    // distant surf: low noise swelling slowly like waves rolling in
    const sf = this.noise();
    const sfl = ctx.createBiquadFilter();
    sfl.type = "lowpass";
    sfl.frequency.value = 650;
    const swell = ctx.createGain();
    swell.gain.value = 0.02;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 0.018;
    lfo.connect(lfoAmt);
    lfoAmt.connect(swell.gain);
    this.surfGain = ctx.createGain();
    this.surfGain.gain.value = 0;
    sf.connect(sfl);
    sfl.connect(swell);
    swell.connect(this.surfGain);
    this.surfGain.connect(this.sfxBus);
    sf.start();
    lfo.start();
    // tunnel echo: the engine bouncing back off the walls (silent until `tunnel()` opens it)
    const dl = ctx.createDelay(0.5);
    dl.delayTime.value = 0.085;
    const fbk = ctx.createGain();
    fbk.gain.value = 0.42;
    const elp = ctx.createBiquadFilter();
    elp.type = "lowpass";
    elp.frequency.value = 1600;
    this.echoGain = ctx.createGain();
    this.echoGain.gain.value = 0;
    this.engGain.connect(dl);
    dl.connect(elp);
    elp.connect(fbk);
    fbk.connect(dl);
    elp.connect(this.echoGain);
    this.echoGain.connect(this.sfxBus);
  }

  /** Inside a tunnel (0..1): the engine echoes off the walls. */
  tunnel(k: number): void {
    if (!this.ctx || !this.echoGain || !this.engineOn) return;
    this.echoGain.gain.setTargetAtTime(Math.max(0, Math.min(1, k)) * 0.9, this.ctx.currentTime, 0.08);
  }

  /** A rush of air as the car dives into a tunnel. */
  tunnelWhoosh(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = this.noise(false);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(1800, t);
    bp.frequency.exponentialRampToValueAtTime(380, t + 0.55);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    n.connect(bp);
    bp.connect(g);
    g.connect(this.sfxBus);
    n.start(t);
    n.stop(t + 0.65);
  }

  stopEngine(): void {
    if (!this.engineOn || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.rainGain?.gain.setTargetAtTime(0, t, 0.3);
    this.windStormGain?.gain.setTargetAtTime(0, t, 0.3);
    this.engGain.gain.setTargetAtTime(0, t, 0.1);
    this.skidGain.gain.setTargetAtTime(0, t, 0.05);
    this.roughGain.gain.setTargetAtTime(0, t, 0.05);
    this.crunchGain.gain.setTargetAtTime(0, t, 0.05);
    this.buzzGain.gain.setTargetAtTime(0, t, 0.05);
    this.windGain.gain.setTargetAtTime(0, t, 0.1);
    this.surfGain.gain.setTargetAtTime(0, t, 0.3);
    this.echoGain?.gain.setTargetAtTime(0, t, 0.1);
  }

  /** Called every frame while racing. `sea` = how much ocean is beside the road (surf). */
  engine(rpm: number, throttle: number, speedPct: number, skid: number, offroad: boolean, quiet = false, sea = 1, depth = 0, edge = 0): void {
    if (!this.ctx || !this.engineOn) return;
    const t = this.ctx.currentTime;
    const f = 44 + rpm * 150;
    this.engOsc[0].frequency.setTargetAtTime(f, t, 0.03);
    this.engOsc[1].frequency.setTargetAtTime(f * 1.012, t, 0.03);
    this.engOsc[2].frequency.setTargetAtTime(f * 0.5, t, 0.03);
    this.engFilter.frequency.setTargetAtTime(260 + rpm * 1500 + throttle * 700, t, 0.05);
    const vol = quiet ? 0.05 : 0.075 + throttle * 0.06 + rpm * 0.03;
    this.engGain.gain.setTargetAtTime(vol, t, 0.06);
    this.skidGain.gain.setTargetAtTime(quiet || offroad || speedPct < .08 ? 0 : Math.max(0, Math.min(1, skid)) * .38, t, 0.04);
    this.skidFilter.frequency.setTargetAtTime(950 + skid * 500 + Math.sin(t * 31) * 80, t, 0.02);
    this.skidTone.frequency.setTargetAtTime(1050 + skid * 380 + Math.sin(t * 29) * 45, t, .03);
    const dirt = offroad && speedPct > 0.05 && !quiet;
    this.roughGain.gain.setTargetAtTime(dirt ? (0.12 + Math.random() * 0.1) * (0.6 + 0.4 * Math.min(1, depth)) : 0, t, 0.03);
    // crunchy gravel: louder and brighter with speed and depth, crackling because the level jumps every frame
    this.crunchGain.gain.setTargetAtTime(dirt ? (0.05 + 0.1 * Math.min(1, depth)) * (0.35 + speedPct) * (0.3 + Math.random() * 1.2) : 0, t, 0.012);
    this.crunchFilter.frequency.setTargetAtTime(1300 + speedPct * 1800 + Math.random() * 900, t, 0.02);
    // the red/white strip: a buzzing rumble through the wheels
    const onStrip = !offroad && !quiet && edge > 0.05 && speedPct > 0.08;
    this.buzzGain.gain.setTargetAtTime(onStrip ? .14 * Math.min(1, edge * 1.5) * Math.min(1, speedPct * 3) : 0, t, 0.025);
    this.buzzOsc.frequency.setTargetAtTime(34 + speedPct * 70, t, 0.04);
    this.windGain.gain.setTargetAtTime(quiet ? 0 : speedPct * speedPct * 0.05, t, 0.2);
    this.windFilter.frequency.setTargetAtTime(500 + speedPct * 900, t, 0.2);
    this.surfGain.gain.setTargetAtTime((quiet ? 0.6 : 1 - speedPct * 0.5) * sea, t, 0.5);
  }

  // ----------------------------------------------------------- weather
  private weatherBed(): void {
    const ctx = this.ctx;
    if (!ctx || this.rainGain) return;
    // rain: bright hiss
    const r = this.noise(true);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2200;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 9000;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    r.connect(hp); hp.connect(lp); lp.connect(this.rainGain); this.rainGain.connect(this.sfxBus);
    r.start(0, Math.random());
    // storm wind: a howling band of noise
    const w = this.noise(true);
    this.windStormFilter = ctx.createBiquadFilter();
    this.windStormFilter.type = "bandpass";
    this.windStormFilter.frequency.value = 520;
    this.windStormFilter.Q.value = 1.4;
    this.windStormGain = ctx.createGain();
    this.windStormGain.gain.value = 0;
    w.connect(this.windStormFilter); this.windStormFilter.connect(this.windStormGain); this.windStormGain.connect(this.sfxBus);
    w.start(0, Math.random());
  }

  /** Rain hiss and storm wind (0..1 each), every frame while racing. */
  weather(rain: number, wind: number, gust: number): void {
    if (!this.ctx || !this.engineOn) return;
    if ((rain > 0.01 || wind > 0.01) && !this.rainGain) this.weatherBed();
    if (!this.rainGain || !this.windStormGain || !this.windStormFilter) return;
    const t = this.ctx.currentTime;
    this.rainGain.gain.setTargetAtTime(rain * 0.075, t, 0.4);
    this.windStormGain.gain.setTargetAtTime(wind * (0.05 + gust * 0.09), t, 0.25);
    this.windStormFilter.frequency.setTargetAtTime(420 + gust * 520 + Math.sin(t * 1.7) * 90, t, 0.3);
  }

  /** A rolling peal of thunder. */
  thunder(delay: number, strength: number): void {
    this.burst(0.25, "highpass", 2500, 600, 0.06 * strength, 0.7, delay);
    this.burst(2.2, "lowpass", 420, 50, 0.34 * strength, 0.9, delay + 0.05);
    this.burst(1.6, "lowpass", 260, 40, 0.22 * strength, 0.9, delay + 0.5);
  }

  /** The road was picked at a fork. */
  forkChime(): void {
    this.tone(784, 0.12, "triangle", 0.08);
    this.tone(1175, 0.18, "triangle", 0.08, 0.08);
    this.tone(1568, 0.26, "triangle", 0.06, 0.16);
  }

  // ----------------------------------------------------------- one-shots
  private env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.12, when = 0, slideTo?: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    this.env(g, t, vol, 0.005, dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private burst(dur: number, type: BiquadFilterType, f0: number, f1: number, vol: number, q = 1, when = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const n = this.noise(false);
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    this.env(g, t, vol, 0.004, dur);
    n.connect(flt);
    flt.connect(g);
    g.connect(this.sfxBus);
    n.start(t, Math.random());
    n.stop(t + dur + 0.05);
  }

  crash(hard: boolean): void {
    this.burst(hard ? 0.9 : 0.5, "lowpass", 3000, 120, hard ? 0.7 : 0.45, 0.8);
    this.tone(90, 0.35, "sine", 0.5, 0, 35);
    this.burst(0.25, "bandpass", 2500, 1800, 0.25, 2, 0.02);
    if (hard) { this.burst(0.4, "bandpass", 1400, 600, 0.2, 3, 0.25); this.tone(60, 0.4, "sine", 0.4, 0.3, 30); }
  }
  bump(): void { this.tone(110, 0.18, "sine", 0.45, 0, 50); this.burst(0.18, "lowpass", 1800, 200, 0.35); }
  /** A short rhythmic tyre strike on the painted kerb, distinct from loose sand. */
  stripKick(speedPct: number): void {
    const k = Math.max(.2, Math.min(1, speedPct));
    for (let i = 0; i < 4; i++) {
      this.tone(95 + speedPct * 85, .035, 'square', .14 * k, i * .038, 65);
      this.burst(.03, 'lowpass', 900, 220, .12 * k, .7, i * .038);
    }
  }
  /** Loose sand: a coarse low thud followed by a falling grainy scrape. */
  dirtKick(speedPct: number): void {
    const k = Math.max(0.3, Math.min(1, speedPct));
    this.burst(.3, 'lowpass', 1100, 220, .3 * k, .8);
    this.burst(.4, 'bandpass', 2600, 700, .27 * k, .8, .025);
  }
  scrape(): void { this.burst(0.09, "bandpass", 3200 + Math.random() * 1500, 2600, 0.12, 4); }
  whoosh(): void { this.burst(0.45, "bandpass", 500, 2200, 0.16, 1.4); }
  beep(go = false): void { this.tone(go ? 1320 : 660, go ? 0.6 : 0.16, "square", 0.1); if (go) this.tone(1980, 0.6, "square", 0.04); }
  tick(): void { this.tone(1250, 0.05, "square", 0.06); }
  uiMove(): void { this.tone(740, 0.05, "square", 0.06); }
  uiSelect(): void { this.tone(880, 0.07, "square", 0.08); this.tone(1320, 0.12, "square", 0.08, 0.07); }
  closePass(): void { this.whoosh(); this.tone(1568, 0.09, "triangle", 0.08, 0.05); this.tone(2093, 0.12, "triangle", 0.08, 0.12); }

  // --------------------------------------------------------------- music
  playSong(key: string, fadeIn = 0.6): void {
    const ctx = this.ctx;
    if (!ctx || this.musicLevel === 0) return;
    const buf = this.buffers.get(key);
    if (!buf) return;
    if (this.songKey === key && this.song) return;
    this.stopSong(0.4);
    const info = this.music?.songs.find((s) => s.file.includes(key));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    if (info && info.loopEnd > info.loopStart && info.loopEnd <= buf.duration + 0.01) {
      src.loopStart = info.loopStart;
      src.loopEnd = info.loopEnd;
    }
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + fadeIn);
    src.connect(g);
    g.connect(this.musicBus);
    src.start();
    this.song = src;
    this.songGain = g;
    this.songKey = key;
  }

  stopSong(fade = 0.5): void {
    if (!this.ctx || !this.song || !this.songGain) return;
    const t = this.ctx.currentTime;
    const s = this.song, g = this.songGain;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0.0001, t + fade);
    try { s.stop(t + fade + 0.05); } catch { /* already stopped */ }
    this.song = null;
    this.songGain = null;
    this.songKey = "";
  }

  get currentSong(): string { return this.songKey; }

  /** A quick crackle of static as the dial moves. */
  tuneStatic(): void { if (this.musicLevel > 0) this.burst(0.2, "bandpass", 900, 3400, 0.07, 0.7); }

  private staticSrc: AudioBufferSourceNode | null = null;
  private staticGain: GainNode | null = null;

  /** Soft radio hiss while a station is still coming in. */
  setStatic(on: boolean): void {
    const ctx = this.ctx;
    on = on && this.musicLevel > 0;
    if (!ctx || on === !!this.staticSrc) return;
    const t = ctx.currentTime;
    if (on) {
      const src = this.noise(true);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2400;
      bp.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.035, t + 0.12);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.musicBus);
      src.start(t, Math.random());
      this.staticSrc = src;
      this.staticGain = g;
    } else {
      const src = this.staticSrc!, g = this.staticGain!;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0.0001, t + 0.25);
      try { src.stop(t + 0.3); } catch { /* already stopped */ }
      this.staticSrc = null;
      this.staticGain = null;
    }
  }

  jingle(name: string, fallback: () => void): number {
    const ctx = this.ctx;
    const buf = this.buffers.get("jingle_" + name);
    if (!ctx) return 0;
    if (!buf) { fallback(); return 0; }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.95;
    src.connect(g);
    g.connect(this.sfxBus);
    src.start();
    // duck the radio under the jingle
    const t = ctx.currentTime;
    if (this.effectsLevel > 0) {
      this.duckUntil = t + buf.duration;
      this.updateMusicGain();
    }
    return buf.duration;
  }

  voice(mood: "love" | "scared" | "hurry" | "sad"): void {
    if (mood === "love") { this.tone(988, 0.09, "sine", 0.09, 0, 1318); this.tone(1318, 0.14, "sine", 0.08, 0.1, 1760); }
    else if (mood === "scared") { this.tone(1500, 0.16, "triangle", 0.09, 0, 820); this.tone(1400, 0.12, "triangle", 0.06, 0.15, 900); }
    else if (mood === "hurry") { this.tone(1175, 0.06, "sine", 0.08); this.tone(1175, 0.06, "sine", 0.08, 0.09); }
    else { this.tone(880, 0.2, "sine", 0.07, 0, 660); this.tone(660, 0.3, "sine", 0.06, 0.2, 520); }
  }

  fanfare(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.18, "square", 0.08, i * 0.09));
    this.tone(1319, 0.5, "square", 0.08, 0.38);
  }

  /** Bright little arpeggio for a badge pop-up. */
  badge(): void {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.16, "triangle", 0.12, i * 0.07));
    this.tone(2093, 0.4, "square", 0.035, 0.3);
  }

  /** Whoosh as the car leaves the ground in a tumble crash. */
  tumbleLaunch(): void { this.burst(0.75, "bandpass", 500, 2600, 0.22, 0.8, 0.05); }

  /** Metal crunch and a deep thud as the car comes back down. */
  tumbleLand(): void {
    this.burst(0.65, "lowpass", 2600, 90, 0.6, 0.9);
    this.burst(0.25, "highpass", 3000, 1200, 0.18, 1.2, 0.03);
    this.tone(72, 0.3, "sine", 0.35, 0, 38);
  }

  /** Two soft thumps in the sand, then cartoon birdies for the dazed driver. */
  sandThuds(): void {
    this.burst(0.18, "lowpass", 600, 80, 0.32);
    this.burst(0.18, "lowpass", 500, 70, 0.3, 1, 0.1);
    [2093, 2637, 2349, 2794, 2093].forEach((f, i) => this.tone(f, 0.06, "sine", 0.035, 0.55 + i * 0.15, f * 1.18));
  }

  /** A firework rocket whistling up. */
  fireworkLaunch(): void { this.tone(500, 0.55, "sine", 0.035, 0, 1900); this.burst(0.5, "highpass", 3000, 6000, 0.03, 0.7); }

  /** The bang and crackle of a firework bursting. */
  fireworkPop(): void {
    this.burst(0.5, "lowpass", 1800, 120, 0.32, 0.8);
    this.tone(70, 0.25, "sine", 0.22, 0, 40);
    for (let i = 0; i < 5; i++) this.burst(0.05, "highpass", 4000, 3000, 0.05, 1, 0.25 + i * 0.07 + Math.random() * 0.05);
  }

  /** Shimmering chime as the trophy rises out of the sunset. */
  trophy(): void {
    [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.5, "triangle", 0.07, i * 0.08));
    this.tone(3136, 0.9, "sine", 0.03, 0.4);
  }

  sadTune(): void {
    [523, 494, 466, 440].forEach((f, i) => this.tone(f, 0.3, "triangle", 0.12, i * 0.28));
  }
}
