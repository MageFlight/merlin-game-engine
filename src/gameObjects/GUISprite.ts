import { log } from "../main.js";

export class GUISprite extends Sprite {
  constructor(position, size, name) {
    super(position, size, name);
  }

  imgui(gui) {}
}

export class Button extends GUISprite {
  _texture;

  constructor(position, size, texture, name) {
    super(position, size, name);
    this._texture = texture;
  }

  imgui(gui) {
    log("Buttoning")
    if (gui.button(gui.getID(), this._position, this._size, this._texture)) {
      this.onPress();
    }
  }

  onPress() {}
}