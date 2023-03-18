import { Utils } from "../utils.js";
import { log } from "../main.js";

export class Renderer {
  #viewport;
  #canvas;
  static #scaleFactor = 1;

  constructor() {
    this.#canvas = document.createElement("canvas");
    this.#canvas.style = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);';
    document.querySelector('body').append(this.#canvas);
    this.#viewport = this.#canvas.getContext('2d');
    addEventListener("resize", () => this.#setCanvasSize());
    this.#setCanvasSize();
  }

  clear(color) {
    this.#viewport.clearRect(-this.#viewport.getTransform().e, 0, this.#canvas.width, this.#canvas.height);
    this.#viewport.fillStyle = color;
    this.#viewport.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  drawImage(position, size, data) {
    this.#viewport.drawImage(data, Math.floor(position.x * Renderer.#scaleFactor), Math.floor(position.y * Renderer.#scaleFactor), Math.ceil(size.x * Renderer.#scaleFactor), Math.ceil(size.y * Renderer.#scaleFactor));
  }

  fillRect(position, size, color) {
    log("fillRect: " + JSON.stringify(position) + " " + Renderer.#scaleFactor, " size: ", size);
    this.#viewport.fillStyle = color;
    this.#viewport.fillRect(Math.floor(position.x * Renderer.#scaleFactor), Math.floor(position.y * Renderer.#scaleFactor), Math.ceil(size.x * Renderer.#scaleFactor), Math.ceil(size.y * Renderer.#scaleFactor));
  }

  strokeRect(position, size, color, width = 1) {
    this.#viewport.lineWidth = width;
    this.#viewport.strokeStyle = color;
    this.#viewport.strokeRect(Math.floor(position.x * Renderer.#scaleFactor), Math.floor(position.y * Renderer.#scaleFactor), Math.ceil(size.x * Renderer.#scaleFactor), Math.ceil(size.y * Renderer.#scaleFactor))
  }

  debugLine(startPos, endPos, color, width = 1) {
    this.#viewport.strokeStyle = color;
    this.#viewport.lineWidth = width;
    this.#viewport.beginPath();
    this.#viewport.moveTo(Math.floor(startPos.x * Renderer.#scaleFactor), Math.floor(startPos.y * Renderer.#scaleFactor));
    this.#viewport.lineTo(Math.floor(endPos.x * Renderer.#scaleFactor), Math.floor(endPos.y * Renderer.#scaleFactor));
    this.#viewport.stroke();
  }

  fillText(position, text, fontSize, color) {
    this.#viewport.font = `${Math.ceil(fontSize * Renderer.#scaleFactor)}px arial`;
    this.#viewport.fillStyle = color;
    this.#viewport.fillText(text, Math.floor(position.x * Renderer.#scaleFactor), Math.floor(position.y * Renderer.#scaleFactor));
  }

  translateTo(position) {
    this.#viewport.translate(-position.x * Renderer.scaleFactor - this.#viewport.getTransform().e, -position.y * Renderer.scaleFactor - this.#viewport.getTransform().f);
  }

  #setCanvasSize() {
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
      this.#canvas.height = proposeSizeHeightBased.height;
      this.#canvas.width = proposeSizeHeightBased.width;
    } else {
      this.#canvas.width = proposeSizeWidthBased.width;
      this.#canvas.height = proposeSizeWidthBased.height;
    }

    Renderer.#scaleFactor = this.#canvas.clientWidth / Utils.getGameSize().x;
  }
}