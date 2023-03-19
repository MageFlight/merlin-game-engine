import { GameObject, Sprite } from "./gameObject.js";
import { Vector2 } from "../math/vector2.js";
import { log } from "../main.js";

export class CanvasLayer extends GameObject {
  _transform; // This transform is seperate from the regular canvas transform

  constructor(initialTransform, name) {
    super(name);
    this._transform = initialTransform;
  }

  get transform() {
    return this._transform;
  }

  set transform(newTransform) {
    this._transform = newTransform;
  }
}

class Camera extends Sprite {
  _scrollMin;
  _scrollMax;
  
  _leftBound;
  _rightBound;
  _upBound;
  _downBound;

  _horizontalLock;
  _verticalLock;

  _scrollPos = Vector2.zero();

  /**
   * Creates a new camera
   * @param {Vector2} scrollMin The minimum scroll amounts
   * @param {Vector2} scrollMax The maximum scroll amounts
   * @param {Number} leftBound The x amount at which the camera starts scrolling left
   * @param {Number} rightBound The x amount at which the camera starts scrolling right
   * @param {Number} upBound The y amount at which the camera starts scrolling up
   * @param {Number} downBound The y amount at which the camera starts scrolling down
   * @param {Boolean} horizontalLock Controls whether or not the camera will scroll horizontally
   * @param {Boolean} verticalLock Controls whether or not the camera will scroll horizontally
   * @param {Boolean} initialCamera Controls if the camera will be the first active camera
   * @param {String} name The name of the camera
   */
  constructor(scrollMin, scrollMax, leftBound, rightBound, upBound, downBound, horizontalLock, verticalLock, initialCamera, name) {
    super(Vector2.zero(), Vector2.zero(), name);

    this._scrollMin = scrollMin;
    this._scrollMax = scrollMax;

    this._leftBound = leftBound;
    this._rightBound = rightBound;
    this._upBound = upBound;
    this._downBound = downBound;

    this._horizontalLock = horizontalLock;
    this._verticalLock = verticalLock;
    
    if (initialCamera) this.activate();
  }

  activate() {
    Utils.broadcast("changeCamera", this);
  }

  calculateScroll() {
    let parentScreenPosition;
    if (this._parent == null) {
      parentScreenPosition == Vector2.zero();
    } else {
      parentScreenPosition = new Vector2(this._parent.globalPos.x - this._scrollPos.x, this._parent.globalPos.y - this._scrollPos.y);
    }
    log("parentSreenPos: ", JSON.stringify(parentScreenPosition));
    log("scrollPos: " + JSON.stringify(this._scrollPos));
    log("scrollMax: " + JSON.stringify(this._scrollMax));
    log("scrollMin: " + JSON.stringify(this._scrollMin));

    // x-axis
    if (!this._horizontalLock) {
      if (parentScreenPosition.x > this._rightBound) this._scrollPos.x += parentScreenPosition.x - this._rightBound;
      if (parentScreenPosition.x < this._leftBound) this._scrollPos.x += parentScreenPosition.x - this._leftBound;
      this._scrollPos.x = Math.min(Math.max(this._scrollPos.x, this._scrollMin.x), this._scrollMax.x - Utils.gameWidth);
    }
    // y-axis
    if (!this._verticalLock) {
      log("screenPos: " + parentScreenPosition.y);
      log("upOffset: " + (parentScreenPosition.y - this._upBound));
      log("downOffset: " + (parentScreenPosition.y - this._downBound));
      if (parentScreenPosition.y < this._upBound) this._scrollPos.y += parentScreenPosition.y - this._upBound;
      if (parentScreenPosition.y > this._downBound) this._scrollPos.y += parentScreenPosition.y - this._downBound;
      log("beforeClamp: " + this._scrollPos.y);
      this._scrollPos.y = Math.min(Math.max(this._scrollPos.y, this._scrollMin.y), this._scrollMax.y)
      log("afterClamp: " + this._scrollPos.y);
    }
  
    return this._scrollPos;
  }
}

export class TextureRect extends Sprite {
  #texture;

  constructor(position, size, texture, name) {
    super(position, size, name);
    log("tex: " + JSON.stringify(texture));
    this.#texture = texture;
  }

  set texture(newTex) {
    this.#texture = newTex;
  }

  get texture() {
    return this.#texture;
  }

  draw(renderer) {
    console.log("draw: ", renderer, " pos: ", this.globalPos);
    this.#texture.draw(renderer, this.globalPos);
  }
}

export class ColorRect extends Sprite {
  #color;

  constructor(position, size, color, name) {
    super(position, size, name);
    this.#color = color;
  }

  get color() {
    return this.#color;
  }

  set color(newColor) {
    this.#color = newColor;
  }

  draw(renderer) {
    renderer.fillRect(this.globalPos, this.size, this.#color);
  }
}