import { Vector2 } from "./vector2";

// Refrence https://docs.godotengine.org/en/stable/tutorials/math/matrices_and_transforms.html
export class Transform {
  private x = Vector2.right();
  private y = Vector2.down();
  private origin = Vector2.zero();

  constructor(x = Vector2.right(), y = Vector2.down(), origin = Vector2.zero()) {
    this.x = x;
    this.y = y;
    this.origin = origin;
  }

  getX(): Vector2 {
    return this.x;
  }

  setX(newX: Vector2): void {
    this.x = newX;
  }

  getY(): Vector2 {
    return this.y;
  }

  setY(newY: Vector2): void {
    this.y = newY;
  }

  getOrigin(): Vector2 {
    return this.origin;
  }

  setOrigin(newOrigin: Vector2): void {
    this.origin = newOrigin;
  }

  asRaw(): number[] {
    return [this.x.x, this.x.y, this.y.x, this.y.y, this.origin.x, this.origin.y];
  }

  asDOMMatrix(): DOMMatrix {
    return new DOMMatrix(this.asRaw());
  }
}