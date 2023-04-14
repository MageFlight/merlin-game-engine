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

  constructor(position: Vector2, size: Vector2, friction: number, name: string) {
    super(position, size, name);
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
  protected lastSlideCollisions: CollisionData[] = [];
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

  /**
   * Moves this sprite by the movement vector and stops if it encounters a collider.
   * @param {Vector2} movement The vector to move by.
   * @param {PhysicsEngine} physics
   * @param {Number} dt Delta time
   * @returns The information about the collision, or null if there was none.
   * @deprecated
   */
   public moveAndCollide(physics: PhysicsEngine, dt: number): CollisionData | null {
    return physics.checkCollisions(this, this.velocity, [], dt);
  }

  /**
   * Moves this sprite by the movement vector and slides along the surface it encounters.
   * @param {Number} dt Delta time between frames
   * @param {Number} slidesLeft Maximum number of collisions
   */
  public moveAndSlide(physics: PhysicsEngine, dt: number, slidesLeft: number = 4) {
    this.lastSlideCollisions = [];

    let excludeList: RigidBody[] = [];
    let collision: CollisionData | null = physics.checkCollisions(this, this.velocity, excludeList, dt);
    while (collision != null && !collision.normal.equals(Vector2.zero()) && slidesLeft > 0) {
      log("collision!!!!!!!!!!!!!!");
      log("collisionTime: " + collision.time);
      log("Position: " + JSON.stringify(collision.position));
      log("normal: " + JSON.stringify(collision.normal));

      const otherCollider = collision.collider;

      this.position = this.position.add(collision.position.subtract(this.getGlobalPos()));

      if (!(otherCollider instanceof StaticBody || otherCollider instanceof KinematicBody)) return;

      // This works for kinematic vs. StaticBody
      if (otherCollider instanceof StaticBody || this.pushable) {
        log("in otherCollider instanceof StaticBody || this.pushable");
        const dotprod =
          this.velocity.x * collision.normal.y + this.velocity.y * collision.normal.x;
        this.velocity.x = dotprod * collision.normal.y;
        this.velocity.y = dotprod * collision.normal.x;
      } else if (!this.pushable && otherCollider.isPushable()) {
        log("in !this.pushable && otherCollider.isPushable()");
        log("otherColliderVel: ", otherCollider.getVelocity());
        const dotprod =
          otherCollider.velocity.x * collision.normal.y + otherCollider.velocity.y * collision.normal.x;
        otherCollider.getVelocity().x = dotprod * collision.normal.y;
        otherCollider.getVelocity().y = dotprod * collision.normal.x;
      } else {
        log("in else");
        const collisionMask = collision.normal.abs().add(Vector2.one()).mod(2);
        this.velocity.multiply(collisionMask);
        otherCollider.velocity.multiply(collisionMask);
      }

      if (otherCollider instanceof KinematicBody && (this.pushable || otherCollider.isPushable())) {
        const initialVelocity = this.velocity;
        if (this.pushable) this.velocity = this.velocity.add(otherCollider.getVelocity());
        if (otherCollider.isPushable()) otherCollider.setVelocity(otherCollider.getVelocity().add(initialVelocity));
        log("OtherFinalMovement: ", otherCollider.getVelocity());
      }

      if (!collision.normal.equals(Vector2.zero()) && collision.collider !== null) {
        this.lastSlideCollisions.push(collision);
        excludeList.push(collision.collider);
        slidesLeft--;
      } else {
        return;
      }

      collision = physics.checkCollisions(this, this.velocity, excludeList, dt);
    }

    log("FinalMovement: " + JSON.stringify(this.velocity));
    this.position = this.position.add(this.velocity.multiply(dt));
    log("Final position: " + JSON.stringify(this.position));
    log("result: " + JSON.stringify(this.position));
    log("slidesLeft: " + slidesLeft);
  }

  isOnGround(upDirection: Vector2): boolean {
    log("Looking in last slides: " + this.lastSlideCollisions.length);
    for (let i = 0; i < this.lastSlideCollisions.length; i++) {
      if (this.lastSlideCollisions[i].normal.equals(upDirection)) return true;
    }

    return false;
  }

  getGroundPlatform(upDirection: Vector2): RigidBody | null {
    log("getting ground platform in length ", this.lastSlideCollisions.length);

    for (let i = 0; i < this.lastSlideCollisions.length; i++) {
      if (this.lastSlideCollisions[i].normal.equals(upDirection))
        return this.lastSlideCollisions[i].collider;
    }

    return null;
  }
}
