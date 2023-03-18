import { Vector2 } from "../vector2.js";

// Refrence https://docs.godotengine.org/en/stable/tutorials/math/matrices_and_transforms.html
export class Transform {
  _x = Vector2.right();
  _y = Vector2.down();
  _origin = Vector2.zero();

  constructor(x = Vector2.right(), y = Vector2.down(), origin = Vector2.zero()) {
    this._x = x;
    this._y = y;
    this._origin = origin;
  }

  get x() {
    return this._x;
  }

  set x(newX) {
    this._x = newX;
  }

  get y() {
    return this._y;
  }

  set y(newY) {
    this._y = newY;
  }

  get origin() {
    return this._origin;
  }

  set origin(newOrigin) {
    this._origin = newOrigin;
  }

  asRaw() {
    return [this._x.x, this._x.y, this._y.x, this._y.y, this._origin.x, this._origin.y];
  }
}