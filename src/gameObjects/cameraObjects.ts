import { GameObject, Sprite } from "./gameObject";
import { Vector2 } from "../math/vector2";
import { internalLog, renderer } from "../index";
import { Transform } from "../math/transform";
import { Utils } from "../utils";
import { Texture } from "../resources/textures";

/**
 * A Game Object that applies a special Transform before rendering its children. After its children have been rendered, the original transform is restored.
 */
export class CanvasLayer extends GameObject {
  /** The transform that will be applied to the canvas during rendering. */
  protected transform: Transform; // This transform is seperate from the regular canvas transform

  /**
   * The constructor of the CanvasLayer
   * @param initialTransform The transform that will be used as the active transform.
   * @param name The name of the CanvasLayer.
   */
  constructor(initialTransform: Transform, name: string) {
    super(name);
    this.transform = initialTransform;
  }

  /**
   * Gets the currently active transform for this CanvasLayer.
   * @returns Returns the current active transform on this CanvasLayer
   */
  getTransform(): Transform {
    return this.transform;
  }

  /**
   * Sets the currently active transform on this CanvasLayer
   * @param newTransform The transform to become the active transform on this CanvasLayer.
   */
  setTransform(newTransform: Transform): void {
    this.transform = newTransform;
  }
}

export class Camera extends GameObject {
  protected scrollMin;
  protected scrollMax;

  protected leftBound;
  protected rightBound;
  protected upBound;
  protected downBound;

  protected horizontalLock;
  protected verticalLock;

  protected scrollPos = Vector2.zero();

  /**
   * Creates a new camera
   * @param {Vector2} scrollMin The minimum scroll amounts
   * @param {Vector2} scrollMax The maximum scroll amounts
   * @param {number} leftBound The x amount at which the camera starts scrolling left
   * @param {number} rightBound The x amount at which the camera starts scrolling right
   * @param {number} upBound The y amount at which the camera starts scrolling up
   * @param {number} downBound The y amount at which the camera starts scrolling down
   * @param {boolean} horizontalLock Controls whether or not the camera will scroll horizontally
   * @param {boolean} verticalLock Controls whether or not the camera will scroll horizontally
   * @param {boolean} initialCamera Controls if the camera will be the first active camera
   * @param {string} name The name of the camera
   */
  constructor(
    scrollMin: Vector2,
    scrollMax: Vector2,
    leftBound: number,
    rightBound: number,
    upBound: number,
    downBound: number,
    horizontalLock: boolean,
    verticalLock: boolean,
    initialCamera: boolean,
    name: string
  ) {
    super(name);

    this.scrollMin = scrollMin;
    this.scrollMax = scrollMax;

    this.leftBound = leftBound;
    this.rightBound = rightBound;
    this.upBound = upBound;
    this.downBound = downBound;

    this.horizontalLock = horizontalLock;
    this.verticalLock = verticalLock;

    if (initialCamera) this.activate();
  }

  activate() {
    Utils.broadcast("changeCamera", this);
  }

  calculateScroll() {
    let parentScreenPosition: Vector2;
    if (this.parent !== null && this.parent instanceof Sprite) {
      parentScreenPosition = new Vector2(
        this.parent.getGlobalPos().x - this.scrollPos.x,
        this.parent.getGlobalPos().y - this.scrollPos.y
      );
    } else {
      parentScreenPosition = Vector2.zero();
    }
    internalLog("parentSreenPos: ", JSON.stringify(parentScreenPosition));
    internalLog("scrollPos: " + JSON.stringify(this.scrollPos));
    internalLog("scrollMax: " + JSON.stringify(this.scrollMax));
    internalLog("scrollMin: " + JSON.stringify(this.scrollMin));

    // x-axis
    if (!this.horizontalLock) {
      if (parentScreenPosition.x > this.rightBound)
        this.scrollPos.x += parentScreenPosition.x - this.rightBound;
      if (parentScreenPosition.x < this.leftBound)
        this.scrollPos.x += parentScreenPosition.x - this.leftBound;
      this.scrollPos.x = Math.min(
        Math.max(this.scrollPos.x, this.scrollMin.x),
        this.scrollMax.x - Utils.GAME_WIDTH
      );
    }
    // y-axis
    if (!this.verticalLock) {
      internalLog("screenPos: " + parentScreenPosition.y);
      internalLog("upOffset: " + (parentScreenPosition.y - this.upBound));
      internalLog("downOffset: " + (parentScreenPosition.y - this.downBound));
      if (parentScreenPosition.y < this.upBound)
        this.scrollPos.y += parentScreenPosition.y - this.upBound;
      if (parentScreenPosition.y > this.downBound)
        this.scrollPos.y += parentScreenPosition.y - this.downBound;
      internalLog("beforeClamp: " + this.scrollPos.y);
      this.scrollPos.y = Math.min(
        Math.max(this.scrollPos.y, this.scrollMin.y),
        this.scrollMax.y
      );
      internalLog("afterClamp: " + this.scrollPos.y);
    }

    return this.scrollPos;
  }
}

export class TextureRect extends Sprite {
  protected texture: Texture;

  constructor(
    position: Vector2,
    size: Vector2,
    texture: Texture,
    name: string
  ) {
    super(position, size, name);
    internalLog("tex: " + JSON.stringify(texture));
    this.texture = texture;
  }

  getTexture(): Texture {
    return this.texture;
  }

  setTexture(newTex: Texture): void {
    this.texture = newTex;
  }

  override draw(): void {
    internalLog("draw: ", renderer, " pos: ", this.getGlobalPos());
    this.texture.draw(this.getGlobalPos());
  }
}

export class ColorRect extends Sprite {
  protected color: string;

  constructor(position: Vector2, size: Vector2, color: string, name: string) {
    super(position, size, name);
    this.color = color;
  }

  getColor(): string {
    return this.color;
  }

  setColor(newColor: string): void {
    this.color = newColor;
  }

  override draw(): void {
    renderer.fillRect(this.getGlobalPos(), this.size, this.color);
  }
}
