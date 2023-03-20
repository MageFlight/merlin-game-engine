export abstract class GameState {
  protected paused = false;
  
  constructor() {
  }

  async init?() {}
  start?() {}
  stop?() {}

  isPaused(): boolean {
    return this.paused;
  }

  setPaused(newPaused: boolean): void {
    this.paused = newPaused;
  }

  abstract update(dt: number): void;
  abstract draw(): void;
}