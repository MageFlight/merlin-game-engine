import { MouseHandeler, KeyboardHandler } from "./io/input";
import { GameState } from "./gameState";
import { Logger } from "./logger";
import { Renderer } from "./io/renderer";
import { Utils } from "./utils";

export const renderer: Renderer = new Renderer();
export const mouseHandeler: MouseHandeler = new MouseHandeler();
export const keyboardHandler: KeyboardHandler = new KeyboardHandler(false);
export const logger: Logger = new Logger();
export const log: Function = logger.log.bind(logger);
export const internalLog: Function = logger.internalLog.bind(logger);

export class MerlinEngine {
  private gameStateStack: GameState[] = [];
  private gameStateStackBuffer: GameState[] = [];

  private dt: number = -1;
  private prevStartTime: number = Date.now();

  private logActive: boolean = true;
  private paused: boolean;

  /**
   * The constructor for MerlinEngine
   * @param paused Whether or not the game engine will initially be paused.
   */
  constructor(paused: boolean = false, showLog: boolean = false, allowInternalLog: boolean = false) {
    this.paused = paused;
    logger.setAllowInternalLog(allowInternalLog);
    this.logActive = showLog;
  }

  /**
   * Begins the game engine loop
   */
  start() {
    requestAnimationFrame(startTime => this.frame(startTime));
    Utils.listen("toggleLog", () => this.logActive = !this.logActive);
    Utils.listen("togglePause", () => this.paused = !this.paused);
  }

  private async frame(startTime: number) {
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
    requestAnimationFrame(startTime => this.frame(startTime));
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