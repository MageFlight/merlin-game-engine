import { renderer } from "../main.js";
import { Vector2 } from "../math/vector2.js";

export class MouseHandeler {
  private buttonStates = [false, false, false, false, false];
  private buttonStatesQueue = [false, false, false, false, false];
  private position = Vector2.zero();

  constructor() {
    addEventListener("mousemove", event => {
      const size = renderer.getCanvasBoundingClientRect();

      this.position.x = (event.clientX - size.x) / renderer.getScaleFactor();
      this.position.y = (event.clientY - size.y) / renderer.getScaleFactor();
    });

    addEventListener("mousedown", event => {
      this.buttonStates[event.button] = true;
      this.buttonStatesQueue[event.button] = true;
    });
    addEventListener("mouseup", event => {
      this.buttonStatesQueue[event.button] = false;
    });
  }

  update(): void {
    for (let i = 0; i < this.buttonStates.length; i++) {
      this.buttonStates[i] = this.buttonStates[i] && this.buttonStatesQueue[i];
    }
  }

  getButtonState(mouseBtn: number): boolean {
    return this.buttonStates[mouseBtn];
  }

  getMousePos(): Vector2 {
    return this.position;
  }
}

export class KeyboardHandler {
  private registerKeyRepeat = false;
  private keysPressed = new Set();
  private changingKeys = new Set();
  private changedKeys = new Set();

  constructor(registerKeyRepeat = false) {
    this.registerKeyRepeat = registerKeyRepeat;

    addEventListener('keydown', event => {
      if (!this.registerKeyRepeat && event.repeat) return;
      if (this.keysPressed.has(event.code)) return;

      this.changingKeys.add(event.code);
    });

    addEventListener('keyup', event => {
      if (!this.keysPressed.has(event.code)) return;
      this.changingKeys.add(event.code);
    })
  }

  update(): void {
    for (let key of this.changingKeys) {
      if (this.keysPressed.has(key)) {
        this.keysPressed.delete(key);
      } else {
        this.keysPressed.add(key);
      }
    }

    this.changedKeys = new Set(this.changingKeys);
    this.changingKeys.clear();
  }

  isKeyDown(keyCode: string): boolean {
    return this.keysPressed.has(keyCode);
  }

  keyJustPressed(keyCode: string): boolean {
    return this.changedKeys.has(keyCode) && this.keysPressed.has(keyCode);
  }

  keyJustReleased(keyCode: string): boolean {
    return this.changedKeys.has(keyCode) && !this.keysPressed.has(keyCode);
  }
}