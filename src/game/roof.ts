/** Visual state only: never affects handling, collision bounds or saved car IDs. */
export class WeatherRoof {
  position = 0;
  private close = false;

  reset(wet: number): void {
    this.close = wet >= 0.18;
    this.position = this.close ? 1 : 0;
  }

  update(wet: number, dt: number): void {
    // Hysteresis avoids repeated opening near a blended weather boundary.
    if (wet >= 0.18) this.close = true;
    else if (wet <= 0.04) this.close = false;
    const step = Math.max(0, Math.min(dt, 1)) / 0.65;
    this.position = this.close ? Math.min(1, this.position + step) : Math.max(0, this.position - step);
  }

  get phase(): number { return Math.round(this.position * 7); }
  get suffix(): string { return ['', '_roof1', '_roof2', '_roof3', '_roof4', '_roof5', '_roof6', '_closed'][this.phase]; }
}
