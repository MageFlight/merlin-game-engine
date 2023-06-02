import { Vector2 } from "../math/vector2";
import { Sprite } from "./gameObject";
import { log } from "../index";
import { CollisionData, PhysicsEngine } from "../physicsEngine/physics";

export class AABB extends Sprite {
  protected enabled;

  /**
   * Creates an Axis-Aligned Bounding Box.
   * @param {Vector2} position The initial position of the collider
   * @param {Vector2} size The size of the collider
   * @param {boolean} enabled The initial enabled status of the collider
   * @param {String} name The name of the collider
   */
  constructor(position: Vector2, size: Vector2, enabled: boolean, name: string) {
    super(position, size, name);
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export class CollisionObject extends Sprite {
  protected collisionMask: number = 0b1; // Same as 0b0000000001
  protected collisionLayer: number = 0b1;

  constructor(position: Vector2, size: Vector2, collisionMask: number, collisionLayer: number, name: string) {
    super(position, size, name);
    this.collisionMask = collisionMask;
    this.collisionLayer = collisionLayer;
  }

  getCollisionMask(): number {
    return this.collisionMask;
  }

  getCollisionLayer(): number {
    return this.collisionLayer;
  }

  setMaskLevel(level: number, value: number): void {
    this.collisionMask =
      (this.collisionMask & (1 << level)) ^
      (value << level) ^
      this.collisionMask;
  }

  setLayerLevel(level: number, value: number): void {
    this.collisionLayer =
      (this.collisionLayer & (1 << level)) ^
      (value << level) ^
      this.collisionLayer;
  }

  /**
   * Checks if this region and another region are intersecting
   * @param {Region} region Region to check interesction with
   */
  intersecting(region: Region): boolean {
    const c1 = this.getChildrenType<AABB>(AABB)[0];
    const c2 = region.getChildrenType<AABB>(AABB)[0];

    return (
      (region.collisionMask & this.collisionLayer ||
        this.collisionMask & region.collisionLayer) !== 0 && // If mask and layers align
      PhysicsEngine.staticAABB(c1, c2) // And intersecting
    );
  }
}

export class Region extends CollisionObject {
  protected regionsInside: Region[] = [];

  constructor(position: Vector2, size: Vector2, name: string) {
    super(position, size, 0b1, 0b1, name);
  }

  interactWithRegion(region: Region): void {
    const intersecting = this.intersecting(region);
    const containsRegion = this.regionsInside.indexOf(region) > -1;

    if (intersecting && !containsRegion) {
      // If inside, but wasn't last frame
      this.regionsInside.push(region);
      this.onRegionEnter(region);
      region.onRegionEnter(this);
    } else if (!intersecting && containsRegion) {
      // If not inside, but was last frame
      this.regionsInside.splice(this.regionsInside.indexOf(region), 1);
      this.onRegionExit(region);
      region.onRegionExit(this);
    }
  }

  getRegionsInside(): Region[] {
    return this.regionsInside;
  }

  onRegionEnter(region: Region): void {}
  onRegionExit(region: Region): void {}
}

export class RigidBody extends Region {
  protected friction: number = 0.8;
  protected lastFrameCollisions: CollisionData[] = [];

  constructor(position: Vector2, size: Vector2, friction: number, name: string) {
    super(position, size, name);
  }

  public resetFrameColisions(): void {
    this.lastFrameCollisions = [];
  }

  public logCollision(collision: CollisionData): void {
    this.lastFrameCollisions.push(collision);
  }

  public getFriction(): number {
    return this.friction;
  }

  public setFriction(newFriction: number): void {
    this.friction = newFriction;
  }

  public onCollision(collision: CollisionData): void {
  }
}

export class StaticBody extends RigidBody {
  constructor(position: Vector2, size: Vector2, friction: number, name: string) {
    super(position, size, friction, name);
    this.friction = friction;
  }
}

export class KinematicBody extends RigidBody {
  protected pushable: boolean;
  protected velocity: Vector2;

  constructor(position: Vector2, size: Vector2, velocity: Vector2, pushable: boolean, friction: number, name: string) {
    super(position, size, friction, name);
    this.velocity = velocity;
    this.pushable = pushable;
  }

  public isPushable(): boolean {
    return this.pushable;
  }

  public setPushable(newPushable: boolean): void {
    this.pushable = newPushable;
  }

  public getVelocity(): Vector2 {
    return this.velocity;
  }

  public setVelocity(newVelocity: Vector2): void {
    this.velocity = newVelocity;
  }

  isOnGround(upDirection: Vector2): boolean {
    log("Looking in last slides: " + this.lastFrameCollisions.length);
    for (let i = 0; i < this.lastFrameCollisions.length; i++) {
      if (this.lastFrameCollisions[i].normal.equals(upDirection)) return true;
    }

    return false;
  }

  getGroundPlatform(upDirection: Vector2): RigidBody | null {
    log("getting ground platform in length ", this.lastFrameCollisions.length);

    for (let i = 0; i < this.lastFrameCollisions.length; i++) {
      if (this.lastFrameCollisions[i].normal.equals(upDirection))
        return this.lastFrameCollisions[i].collider;
    }

    return null;
  }
}
