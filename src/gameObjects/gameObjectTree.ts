import { Renderer } from "../io/renderer.js";
import { renderer } from "../main.js";
import { PhysicsEngine } from "../physicsEngine/physics.js";
import { Camera, CanvasLayer } from "./cameraObjects.js";
import { GameObject } from "./gameObject.js";
import { Region } from "./physicsObjects.js";

export class GameObjectTree {
  private gameObjects: GameObject[] = [];
  private gameObjectRemoveQueue: GameObject[] = [];
  private physicsEngine;
  private activeCamera: Camera | null = null;

  constructor(physicsEngine: PhysicsEngine) {
    this.physicsEngine = physicsEngine;
  }

  addGameObject(gameObject: GameObject): void {
    this.gameObjects.push(gameObject);
    if (gameObject instanceof Region) this.physicsEngine.addSprite(gameObject);
    gameObject.addToGameObjectTree(this);
  }
  
  addGameObjects(gameObjects: GameObject[]): void {
    gameObjects.forEach(obj => this.addGameObject(obj));
  }

  queueRemoveGameObject(gameObject: GameObject): void {
    this.gameObjectRemoveQueue.push(gameObject);
  }

  update(dt: number) {
    for (let i = 0; i < this.gameObjects.length; i++) {
      this.updateObject(this.gameObjects[i], dt);
    }

    if (this.physicsEngine) {
      for (let i = 0; i < this.gameObjects.length; i++) {
        this.physicsUpdateObject(this.gameObjects[i], dt);
      }

      this.physicsEngine.interactRegions();
    }

    this.gameObjectRemoveQueue.forEach(obj => this.gameObjects.splice(this.gameObjects.indexOf(obj), 1));
    if (this.gameObjectRemoveQueue.length > 0) this.gameObjectRemoveQueue = [];
  }

  private updateObject(obj: GameObject, dt: number): void {
    obj.update(dt);

    const objChildren = obj.getChildren();
    for (let i = 0; i < objChildren.length; i++) {
      this.updateObject(objChildren[i], dt);
    }
  }

  private physicsUpdateObject(obj: GameObject, dt: number): void {
    obj.physicsUpdate(this.physicsEngine, dt);

    const objChildren = obj.getChildren();
    for (let i = 0; i < objChildren.length; i++) {
      this.physicsUpdateObject(objChildren[i], dt);
    }
  }

  draw(): void {
    if (this.activeCamera) renderer.translateTo(this.activeCamera.calculateScroll());
    
    for (let i = 0; i < this.gameObjects.length; i++) {
      this.drawObject(this.gameObjects[i], renderer);
    }
  }

  private drawObject(object: GameObject, renderer: Renderer) {
    let originTransform: DOMMatrix | null = null;
    if (object instanceof CanvasLayer) {
      originTransform = renderer.getTransform();
      renderer.setTransform(object.getTransform().asDOMMatrix());
    } else {
      if (!object.isVisible()) return;

      object.draw();
    }

    const objChildren = object.getChildren();
    for (let i = 0; i < objChildren.length; i++) {
      this.drawObject(objChildren[i], renderer);
    }

    if (originTransform !== null) renderer.setTransform(originTransform);
  }
}