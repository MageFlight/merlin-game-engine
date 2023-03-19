import { MerlinEngine } from "./main";
import { TestGame } from "./example/test";

try {
  const engine = new MerlinEngine();
  const game = new TestGame();
  game
    .load()
    .then(() => {
      engine.pushState(game);
      engine.start();
    })
    .catch((e) => alert(e.stack));
} catch (e) {
  alert(e.stack);
}
