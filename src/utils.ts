import { Vector2 } from "./math/vector2";
import { log } from "./main.js";

export class Utils {
  static #gameSize = new Vector2(1920, 1088, true);
  static #signals = {};

  static #timers = [];

  /**
   * Gets the size of one game screen
   * @returns The game size.
   */
  static getGameSize() {
    return Utils.#gameSize.clone();
  }

  /**
   * Rounds a number to a specified number of decimal places.
   * @param {Number} n The number to round
   * @param {Number} places The number of places to round the decmal to.
   */
  static roundToDecimal(n, places) {
    const zeroes = Math.pow(10, places);
    return Math.round(n * zeroes) / zeroes;
  }

  /**
   * Moves a value 'current' towards 'target'
   * @param {Number} current The current value
   * @param {Number} target The value to move towards
   * @param {Number} maxDelta The maximum change that should be applied to the value
   * @returns A linear interpolation that moves from current to target as far as possible without the speed exceeding maxDelta, and the result value not exceeding target.
   */
  static moveTowards(current, target, maxDelta) {
    if (Math.abs(target - current) <= maxDelta) {
      return target;
    }

    return current + Math.sign(target - current) * maxDelta;
  }

  static broadcast(signal, data = null) {
    if (!Utils.#signals[signal]) return;

    Utils.#signals[signal].forEach(action => {
      action.call(action, data);
    });
  }

  static listen(signal, action) {
    console.log("Add action", action);

    if (!Utils.#signals[signal]) {
      Utils.#signals[signal] = [];
    }
    Utils.#signals[signal].push(action);
  }

  static timer(action, timeout, recurring) {
    Utils.#timers.push({
      action: action,
      length: timeout,
      timeRemaining: 0,
      recurring: recurring
    }); 
  }

  static timerUpdate(dt) {
    for (let i = 0; i < Utils.#timers.length; i++) {
      const timer = Utils.#timers[i];
      timer.timeRemaining += dt;
      log("dt: " + dt);
      log("timeRemaining: " + timer.timeRemaining);
      log("Length: " + timer.length); 

      if (timer.timeRemaining >= timer.length) {
        timer.action.call(timer.action);

        if (timer.recurring) {
          log("rercurring.");
          timer.timeRemaining = 0;
          log("final time left: " + timer.timeRemaining);
        } else {
          log("removing")
          Utils.#timers.splice(i, 1);
        }
      }
    }
  }

  static parseObjectPath(path, object) {
    const keys = path.split("/");

    let runningObj = object;
    let finalObj;
    for (let i = 0; i < keys.length; i++) {
      if (i == keys.length - 1) {
        finalObj = runningObj[keys[i]];
      } else {
        runningObj = runningObj[keys[i]];
      }
    }

    return finalObj;
  }

  static* seedRandom(startSeed) {
    let seed = startSeed;
    while (true) {
      seed = (seed * 9301 + 49297) % 233280;
      yield seed / 233280;
    }
  }

  static shuffleArray(arr, randGen) {
    for (let i = arr.length - 1; i > 0; i--) {
      let j = Math.floor(randGen.next().value * i);
      
      // Same thing as this:
      // let t = arr[i]; arr[i] = arr[j]; arr[j] = t
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  static* counter(startNumber = 0) {
    let i = startNumber;
    yield i;
    while (true) {
      yield i++;
    }
  }

  static clone(object) {
    let newObject = {};

    for (let key in object) {
      newObject[key] = object[key];
    }

    return newObject;
  }
}