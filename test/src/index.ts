import { MerlinEngine } from "../../src/index";
import { TestGame } from "./test";

const engine = new MerlinEngine(false);
const game = new TestGame();
game.load().then(() => {
  engine.pushState(game);
  engine.start();
});
