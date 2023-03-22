import { Vector2 } from "./math/vector2";
import { log } from "./index";

export type Constructor<T> = new (...args: any[]) => T;

type Timer = {
  action: Function,
  length: number,
  timeUsed: number,
  recurring: boolean,
};

export class Utils {
  public static readonly GAME_WIDTH = 1920;
  public static readonly GAME_HEIGHT = 1088;
  private static signals: Map<string, Function[]> = new Map();

  private static timers: Timer[] = [];

  /**
   * Rounds a number to a specified number of decimal places.
   * @param {number} n The number to round
   * @param {number} places The number of places to round the decmal to.
   */
  static roundToDecimal(n: number, places: number) {
    const zeroes = Math.pow(10, places);
    return Math.round(n * zeroes) / zeroes;
  }

  /**
   * Moves a value 'current' towards 'target'
   * @param {number} current The current value
   * @param {number} target The value to move towards
   * @param {number} maxDelta The maximum change that should be applied to the value
   * @returns A linear interpolation that moves from current to target as far as possible without the speed exceeding maxDelta, and the result value not exceeding target.
   */
  static moveTowards(current: number, target: number, maxDelta: number) {
    if (Math.abs(target - current) <= maxDelta) {
      return target;
    }

    return current + Math.sign(target - current) * maxDelta;
  }

  static broadcast(signal: string, data?: any) {
    if (!Utils.signals.has(signal)) return;

    Utils.signals.get(signal)!.forEach(action => {
      action.call(action, data);
    });
  }

  static listen(signal: string, action: Function) {
    console.log("Add action", action);

    if (!Utils.signals.has(signal)) {
      Utils.signals.set(signal, []);
    }
    Utils.signals.get(signal)!.push(action);
  }

  static timer(action: Function, timeout: number, recurring: boolean) {
    Utils.timers.push({
      action: action,
      length: timeout,
      timeUsed: 0,
      recurring: recurring
    }); 
  }

  static timerUpdate(dt: number) {
    for (let i = 0; i < Utils.timers.length; i++) {
      const timer = Utils.timers[i];
      timer.timeUsed += dt;
      log("dt: " + dt);
      log("timeRemaining: " + timer.timeUsed);
      log("Length: " + timer.length); 

      if (timer.timeUsed >= timer.length) {
        timer.action.call(timer.action);

        if (timer.recurring) {
          log("rercurring.");
          timer.timeUsed = 0;
          log("final time left: " + timer.timeUsed);
        } else {
          log("removing")
          Utils.timers.splice(i, 1);
        }
      }
    }
  }

  // static parseObjectPath(path: string, object: object) {
  //   const keys = path.split("/");

  //   let runningObj = object;
  //   let finalObj;
  //   for (let i = 0; i < keys.length; i++) {
  //     if (i === keys.length - 1) {
  //       finalObj = runningObj[keys[i]];
  //     } else {
  //       runningObj = runningObj[keys[i]];
  //     }
  //   }

  //   return finalObj;
  // }

  static* seedRandom(startSeed: number): Generator<number, never, number> {
    let seed = startSeed;
    while (true) {
      seed = (seed * 9301 + 49297) % 233280;
      yield seed / 233280;
    }
  }

  static shuffleArray(arr: any[], randGen: Generator): void {
    for (let i = arr.length - 1; i > 0; i--) {
      let j = Math.floor(randGen.next().value * i);
      
      // Same thing as this:
      // let t = arr[i]; arr[i] = arr[j]; arr[j] = t
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}