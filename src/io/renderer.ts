import { Utils } from "../utils";
import { log } from "../index";
import { Vector2 } from "../math/vector2";
import { Transform } from "../math/transform";

export class Renderer {
  private viewport: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private scaleFactor = 1;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);';
    document.body.append(this.canvas);
    
    if (this.canvas.getContext('2d') !== null) {
      this.viewport = <CanvasRenderingContext2D> this.canvas.getContext('2d');
    } else {
      throw new TypeError('Could not get the context of the canvas.');
    }

    addEventListener("resize", () => this.setCanvasSize());
    this.setCanvasSize();
  }

  getCanvasBoundingClientRect(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }

  getTransform(): DOMMatrix {
    return this.viewport.getTransform();
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  setTransform(matrix: DOMMatrix): void;
  setTransform(transform: Transform): void;

  setTransform(aOrMatrix: number | DOMMatrix | Transform, b?: number, c?: number, d?: number, e?: number, f?: number): void {
    if (aOrMatrix instanceof DOMMatrix) {
      this.viewport.setTransform(aOrMatrix);
    } else if (aOrMatrix instanceof Transform) {
      this.viewport.setTransform(aOrMatrix.asDOMMatrix());
    } else if (b !== undefined && c !== undefined && d !== undefined && e !== undefined && f !== undefined) {
      this.viewport.setTransform(aOrMatrix, b, c, d, e, f);
    }
  }

  clear(color: string): void { // TODO: Make Color Object
    this.viewport.clearRect(-this.viewport.getTransform().e, 0, this.canvas.width, this.canvas.height);
    this.viewport.fillStyle = color;
    this.viewport.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawImage(position: Vector2, size: Vector2, data: ImageBitmap): void {
    this.viewport.drawImage(data, Math.floor(position.x * this.scaleFactor), Math.floor(position.y * this.scaleFactor), Math.ceil(size.x * this.scaleFactor), Math.ceil(size.y * this.scaleFactor));
  }

  fillRect(position: Vector2, size: Vector2, color: string): void {
    log("fillRect: " + JSON.stringify(position) + " " + this.scaleFactor, " size: ", size);
    this.viewport.fillStyle = color;
    this.viewport.fillRect(Math.floor(position.x * this.scaleFactor), Math.floor(position.y * this.scaleFactor), Math.ceil(size.x * this.scaleFactor), Math.ceil(size.y * this.scaleFactor));
  }

  strokeRect(position: Vector2, size: Vector2, color: string, width: number): void {
    this.viewport.lineWidth = width;
    this.viewport.strokeStyle = color;
    this.viewport.strokeRect(Math.floor(position.x * this.scaleFactor), Math.floor(position.y * this.scaleFactor), Math.ceil(size.x * this.scaleFactor), Math.ceil(size.y * this.scaleFactor))
  }

  debugLine(startPos: Vector2, endPos: Vector2, color: string, width: number): void {
    this.viewport.strokeStyle = color;
    this.viewport.lineWidth = width;
    this.viewport.beginPath();
    this.viewport.moveTo(Math.floor(startPos.x * this.scaleFactor), Math.floor(startPos.y * this.scaleFactor));
    this.viewport.lineTo(Math.floor(endPos.x * this.scaleFactor), Math.floor(endPos.y * this.scaleFactor));
    this.viewport.stroke();
  }

  fillText(position: Vector2, text: string, fontSize: number, color: string) {
    this.viewport.font = `${Math.ceil(fontSize * this.scaleFactor)}px arial`;
    this.viewport.fillStyle = color;
    this.viewport.fillText(text, Math.floor(position.x * this.scaleFactor), Math.floor(position.y * this.scaleFactor));
  }

  translateTo(position: Vector2) {
    this.viewport.translate(-position.x * this.scaleFactor - this.viewport.getTransform().e, -position.y * this.scaleFactor - this.viewport.getTransform().f);
  }

  getScaleFactor(): number {
    return this.scaleFactor;
  }

  private setCanvasSize() {
    // Link to a desmos possibly explaining this: https://www.desmos.com/calculator/lndgojuiit

    const roundedHeight = window.innerHeight - (window.innerHeight % 17);
    const roundedWidth = window.innerWidth - (window.innerWidth % 30);
    const proposeSizeHeightBased = {
      height: roundedHeight,
      width: 30 * roundedHeight / 17
    };
    const proposeSizeWidthBased = {
      width: roundedWidth,
      height: 17 * roundedWidth / 30
    };

    if (proposeSizeHeightBased.height <= window.innerHeight && proposeSizeHeightBased.width <= window.innerWidth) {
      this.canvas.height = proposeSizeHeightBased.height;
      this.canvas.width = proposeSizeHeightBased.width;
    } else {
      this.canvas.width = proposeSizeWidthBased.width;
      this.canvas.height = proposeSizeWidthBased.height;
    }

    this.scaleFactor = this.canvas.clientWidth / Utils.GAME_WIDTH;
  }
}