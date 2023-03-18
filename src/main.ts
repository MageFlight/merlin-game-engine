import { MouseHandeler, KeyboardHandler } from "./io/input.js";
import { GameState } from "./gameState.js";
import { Logger } from "./logger.js";
import { Renderer } from "./io/renderer.js";
import { Utils } from "./utils.js";

export const mouseHandeler = new MouseHandeler();
export const keyboardHandler = new KeyboardHandler(false);
export const logger = new Logger();
export const log = logger.log.bind(logger);

export class MerlinEngine {
  #gameStateStack = [];
  #gameStateStackBuffer = [];

  #dt = -1;
  #prevStartTime = Date.now();

  #renderer;
  #logActive = true;
  #paused = false;

  constructor() {
    this.#renderer = new Renderer();
  }

  /**
   * Begins the game engine loop
   */
  start() {
    requestAnimationFrame(startTime => this.#frame(startTime).catch(e => alert(e.stack)));
    Utils.listen("toggleLog", () => this.#logActive = !this.#logActive);
  }

  async #frame(startTime) {
    try {
      this.#dt = startTime - this.#prevStartTime;
      this.#prevStartTime = startTime;

      mouseHandeler.update();
      keyboardHandler.update();

      if (keyboardHandler.keyJustReleased("KeyO")) this.#paused = false;
      if (keyboardHandler.keyJustReleased("KeyP")) this.#paused = !this.#paused;

      if (this.#dt >= 0 && !this.#paused) {
        Utils.timerUpdate(this.#dt);

        for (let i = this.#gameStateStack.length - 1; i >= 0; i--) {
          const state = this.#gameStateStack[i];
          if (state && !state.paused) {
            state.update(this.#dt);
          }
        }

        this.#renderer.clear('#0000ff');
        for (let i = this.#gameStateStack.length - 1; i >= 0; i--) {
          const state = this.#gameStateStack[i];
          if (state && !state.paused) {
            state.draw(this.#renderer);
          }
        }
      }

      if (this.#logActive && !this.#paused) logger.update();
      
      if (keyboardHandler.keyJustReleased("KeyO")) this.#paused = true;
      if (keyboardHandler.keyJustReleased("KeyI")) this.#logActive = !this.#logActive;

      this.#gameStateStack = [...this.#gameStateStackBuffer];
      requestAnimationFrame(startTime => this.#frame(startTime).catch(e => alert(e.stack)));
      
    } catch (e) {
      alert(e.stack);
    }
  }

  /**
   * Pushes a GameState to the top of the Game State Stack.
   * @param {GameState} gameState The GameState to add to the stack.
   */
  pushState(gameState) {
    this.#gameStateStackBuffer.push(gameState);
  }

  /**
   * Removes the GameState at the top of the Game State Stack.
   * @returns The GameState that was removed
   */
  popState() {
    return this.#gameStateStackBuffer.pop();
  }
}