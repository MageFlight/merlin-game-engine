class MouseHandeler {
  #buttonStates = [false, false, false, false, false];
  #buttonStatesQueue = [false, false, false, false, false];
  #position = Vector2.zero();

  constructor() {
    addEventListener("mousemove", event => {
      const size = document.querySelector("canvas").getBoundingClientRect();

      this.#position.x = (event.clientX - size.x) / Renderer.scaleFactor;
      this.#position.y = (event.clientY - size.y) / Renderer.scaleFactor;
    });

    addEventListener("mousedown", event => {
      this.#buttonStates[event.button] = true;
      this.#buttonStatesQueue[event.button] = true;
    });
    addEventListener("mouseup", event => {
      this.#buttonStatesQueue[event.button] = false;
    });
  }

  update() {
    for (let i = 0; i < this.#buttonStates.length; i++) {
      this.#buttonStates[i] = this.#buttonStates[i] && this.#buttonStatesQueue[i];
    }
  }

  getButtonState(mouseBtn) {
    return this.#buttonStates[mouseBtn];
  }

  getMousePos() {
    return this.#position;
  }
}

class KeyboardHandler {
  #registerKeyRepeat = false;
  #keysPressed = new Set();
  #changingKeys = new Set();
  #changedKeys = new Set();

  constructor(registerKeyRepeat = false) {
    this.#registerKeyRepeat = registerKeyRepeat;

    addEventListener('keydown', event => {
      if (!this.#registerKeyRepeat && event.repeat) return;
      if (this.#keysPressed.has(event.code)) return;

      this.#changingKeys.add(event.code);
    });

    addEventListener('keyup', event => {
      if (!this.#keysPressed.has(event.code)) return;
      this.#changingKeys.add(event.code);
    })
  }

  update() {
    for (let key of this.#changingKeys) {
      if (this.#keysPressed.has(key)) {
        this.#keysPressed.delete(key);
      } else {
        this.#keysPressed.add(key);
      }
    }

    this.#changedKeys = new Set(this.#changingKeys);
    this.#changingKeys.clear();
  }

  isKeyDown(keyCode) {
    return this.#keysPressed.has(keyCode);
  }

  keyJustPressed(keyCode) {
    return this.#changedKeys.has(keyCode) && this.#keysPressed.has(keyCode);
  }

  keyJustReleased(keyCode) {
    return this.#changedKeys.has(keyCode) && !this.#keysPressed.has(keyCode);
  }
}