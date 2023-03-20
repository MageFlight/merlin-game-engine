import { MouseHandeler, KeyboardHandler } from "./io/input.js";
import { GameState } from "./gameState.js";
import { Logger } from "./logger.js";
import { Renderer } from "./io/renderer.js";
import { Utils } from "./utils.js";

export const renderer: Renderer = new Renderer();
export const mouseHandeler: MouseHandeler = new MouseHandeler();
export const keyboardHandler: KeyboardHandler = new KeyboardHandler(false);
export const logger: Logger = new Logger();
export const log: Function = logger.log.bind(logger);

export class MerlinEngine {
  private gameStateStack: GameState[] = [];
  private gameStateStackBuffer: GameState[] = [];

  private dt: number = -1;
  private prevStartTime: number = Date.now();

  private logActive: boolean = true;
  private paused: boolean = false;

  constructor() {
  }

  /**
   * Begins the game engine loop
   */
  start() {
    requestAnimationFrame(startTime => this.frame(startTime).catch(e => alert(e.stack)));
    Utils.listen("toggleLog", () => this.logActive = !this.logActive);
  }

  private async frame(startTime: number) {
    try {
      this.dt = startTime - this.prevStartTime;
      this.prevStartTime = startTime;

      mouseHandeler.update();
      keyboardHandler.update();

      if (keyboardHandler.keyJustReleased("KeyO")) this.paused = false;
      if (keyboardHandler.keyJustReleased("KeyP")) this.paused = !this.paused;

      if (this.dt >= 0 && !this.paused) {
        Utils.timerUpdate(this.dt);

        for (let i = this.gameStateStack.length - 1; i >= 0; i--) {
          const state: GameState = this.gameStateStack[i];
          if (state && !state.isPaused()) {
            state.update(this.dt);
          }
        }

        renderer.clear('#0000ff');
        for (let i = this.gameStateStack.length - 1; i >= 0; i--) {
          const state: GameState = this.gameStateStack[i];
          if (state && !state.isPaused()) {
            state.draw();
          }
        }
      }

      if (this.logActive && !this.paused) logger.update();
      
      if (keyboardHandler.keyJustReleased("KeyO")) this.paused = true;
      if (keyboardHandler.keyJustReleased("KeyI")) this.logActive = !this.logActive;

      this.gameStateStack = [...this.gameStateStackBuffer];
      requestAnimationFrame(startTime => this.frame(startTime).catch(e => alert(e.stack)));
      
    } catch (e: any) {
      alert(e.stack);
    }
  }

  /**
   * Pushes a GameState to the top of the Game State Stack.
   * @param {GameState} gameState The GameState to add to the stack.
   */
  pushState(gameState: GameState): void {
    this.gameStateStackBuffer.push(gameState);
  }

  /**
   * Removes the GameState at the top of the Game State Stack.
   * @returns The GameState that was removed
   */
  popState(): GameState | undefined {
    return this.gameStateStackBuffer.pop();
  }
}