import { MerlinEngine } from "../main";
import { TestGame } from "./test";

try {
  const engine = new MerlinEngine();
  const game = new TestGame();
  game
    .load()
    .then(() => {
      engine.pushState(game);
      engine.start();
    })
    .catch((e: any) => alert(e.stack));
} catch (e: any) {
  alert(e.stack);
}
