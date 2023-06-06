import { log } from "../index";
import { Vector2 } from "../math/vector2";
import { Texture } from "../resources/textures";
import { Sprite } from "./gameObject";

export class GUISprite extends Sprite {
  constructor(position: Vector2, size: Vector2, name: string) {
    super(position, size, name);
  }

  /**
   * Updates this GUISprite's gui functions
   * @param gui The user interface class to use.
   */
  imgui(gui: never): void {} // TODO: Add IMGUI
}

export class Button extends GUISprite {
  protected texture: Texture;

  constructor(position: Vector2, size: Vector2, texture: Texture, name: string) {
    super(position, size, name);
    this.texture = texture;
  }

  // override imgui(gui) {
  //   internalLog("Buttoning")
  //   if (gui.button(gui.getID(), this._position, this._size, this._texture)) {
  //     this.onPress();
  //   }
  // }

  onPress(): void {}
}