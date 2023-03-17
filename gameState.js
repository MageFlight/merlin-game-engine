class GameState {
  paused = false;
  
  constructor() {
  }

  async init() {}
  start() {}
  stop() {}

  update(dt) {document.title = Math.round(1000/dt) + " FPS"}
  draw(renderer) {renderer.fillRect(new Vector2(50, 50), new Vector2(100, 100), "#ffff00")}
}