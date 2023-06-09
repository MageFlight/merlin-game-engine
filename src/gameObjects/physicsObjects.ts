import { Vector2 } from "../math/vector2";
import { Sprite } from "./gameObject";
import { internalLog, log } from "../index";
import { CollisionData, PhysicsEngine } from "../physicsEngine/physics";

export class AABB extends Sprite {
  /**
   * Creates an Axis-Aligned Bounding Box.
   * @param {Vector2} position The initial position of the collider
   * @param {Vector2} size The size of the collider
   * @param {boolean} enabled The initial enabled status of the collider
   * @param {String} name The name of the collider
   */
  constructor(position: Vector2, size: Vector2, enabled: boolean, name: string) {
    super(position, size, name);
    this.visible = enabled;
  }
}

export class CollisionObject extends Sprite {
  protected collisionMask: number = 0b1; // Same as 0b0000000001
  protected collisionLayer: number = 0b1;

  constructor(position: Vector2, size: Vector2, collisionLayer: number, collisionMask: number, name: string) {
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

  constructor(position: Vector2, size: Vector2, collisionLayer: number, collisionMask: number, name: string) {
    super(position, size, collisionLayer, collisionLayer, name);
  }

  interactWithRegion(region: Region): void {
    const intersecting = this.intersecting(region);
    const containsRegion = this.regionsInside.indexOf(region) > -1;

    if (intersecting && !containsRegion) {
      // If inside, but wasn't last frame
      this.regionsInside.push(region);
      this.onRegionEnter(region);
    } else if (!intersecting && containsRegion) {
      // If not inside, but was last frame
      this.regionsInside.splice(this.regionsInside.indexOf(region), 1);
      this.onRegionExit(region);
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

  constructor(position: Vector2, size: Vector2, collisionLayer: number, collisionMask: number, friction: number, name: string) {
    super(position, size, collisionLayer, collisionMask, name);
    this.friction = friction;
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
  constructor(position: Vector2, size: Vector2, collisionLayer: number, collisionMask: number, friction: number, name: string) {
    super(position, size, collisionLayer, collisionMask, friction, name);
    this.friction = friction;
  }
}

export class KinematicBody extends RigidBody {
  protected pushable: boolean;
  protected velocity: Vector2;

  constructor(position: Vector2, size: Vector2, collisionLayer: number, collisionMask: number, velocity: Vector2, pushable: boolean, friction: number, name: string) {
    super(position, size, collisionLayer, collisionMask, friction, name);
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
    internalLog("Looking in last slides: " + this.lastFrameCollisions.length);
    return this.lastFrameCollisions.some((collision: CollisionData) => {
      const isColliderA = collision.colliderA === this;
      const collisionNormal = isColliderA ? collision.normal : collision.normal.multiply(-1);
      return collisionNormal.equals(upDirection);
    });
  }

  getGroundPlatform(upDirection: Vector2): RigidBody | null {
    internalLog("getting ground platform in length ", this.lastFrameCollisions.length);

    for (let i = 0; i < this.lastFrameCollisions.length; i++) {
      const collision = this.lastFrameCollisions[i];
      const isColliderA = collision.colliderA === this;
      const collisionNormal = isColliderA ? collision.normal : collision.normal.multiply(-1);

      if (collisionNormal.equals(upDirection)) {
        if (isColliderA) {
          return collision.colliderB !== undefined ? collision.colliderB : null;
        } else {
          return collision.colliderA;
        }
      }
    }

    return null;
  }
}
