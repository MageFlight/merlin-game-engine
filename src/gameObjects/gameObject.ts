import { Vector2 } from "../math/vector2";
import { log } from "../index";
import { PhysicsEngine } from "../physicsEngine/physics";
import { Renderer } from "../io/renderer";
import { GameObjectTree } from "./gameObjectTree";
import { Constructor } from "../utils";

export class GameObject {
  private static genID: number = 0;

  protected readonly name: string = "";

  protected children: GameObject[] = [];
  protected parent: GameObject | null = null;

  protected readonly uid: number;

  protected gameObjectTree: GameObjectTree | null = null;

  protected visible: boolean = true;

  constructor(name: string) {
    this.name = name;
    this.uid = GameObject.genID++;
  }

  start(): void {};
  update(dt: number): void {};
  physicsUpdate(physics: PhysicsEngine, dt: number): void {};
  draw(): void {};

  addToGameObjectTree(newTree: GameObjectTree): void {
    this.gameObjectTree = newTree;
    this.children.forEach(child => child.gameObjectTree = newTree);
  }

  addChild(child: GameObject): GameObject {
    log("parent init: " + this.parent);
    child.parent = this;
    child.gameObjectTree = this.gameObjectTree;
    this.children.push(child);
    return this;
  }

  removeChild(child: GameObject): void {
    child.parent = null;
    child.gameObjectTree = null;
    this.children.splice(this.children.indexOf(child), 1);
  }

  getChildrenType<T extends GameObject>(type: Constructor<T>): T[] {
    return <T[]> this.children.filter(child => child instanceof type);
  }

  getChildName(name: string): GameObject | null {
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].name == name) {
        return this.children[i];
      }
    }

    return null;
  }

  getChildUid(uid: number): GameObject | null {
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].uid == uid) {
        return this.children[i];
      }
    }

    return null;
  }

  resolvePath(path: string): GameObject | null {
    const names = path.split("/");

    let currentSpr: GameObject | null = this;
    for (let i = 0; i < names.length; i++) {
      if (currentSpr == null) return null;

      currentSpr = currentSpr.getChildName(names[i]);
    }
    return currentSpr;
  }

  getChildren(): GameObject[] {
    return this.children;
  }

  getName(): string {
    return this.name;
  }

  getUid(): number {
    return this.uid;
  }

  getParent(): GameObject | null {
    return this.parent;
  }
  
  setParent(newParent: GameObject): void {
    this.parent = newParent;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(newVisibility: boolean): void {
    this.visible = newVisibility;
  }
}

export class Sprite extends GameObject {  
  protected position: Vector2;
  protected size: Vector2;

  constructor(position: Vector2, size: Vector2, name: string) {
    super(name);
    this.position = position.clone();
    this.size = size;
  }

  getPosition(): Vector2 {
    return this.position;
  }

  setPosition(newPosition: Vector2): void {
    this.position = newPosition;
  }

  getSize(): Vector2 {
    return this.size;
  }

  setSize(newSize: Vector2): void {
    this.size = newSize;
  }

  getGlobalPos(): Vector2 {
    if (this.parent instanceof Sprite) {
      return this.position.add(this.parent.getGlobalPos());
    }
    return this.position.clone();
  }

  setGlobalPos(newPosition: Vector2): void {
    this.position = this.position.add(newPosition.subtract(this.getGlobalPos()));
  }
}