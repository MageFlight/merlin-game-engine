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

  protected resolvePushableVsPushable(colliderA: KinematicBody, colliderB: KinematicBody, collision: CollisionData) {
    log("Resolving pushable vs pushable");
    log("colliderA: ", colliderA.getName(), " colliderB: ", colliderB.getName());
    // Go to the global position
    colliderA.position = colliderA.position.add(collision.position.subtract(colliderA.getGlobalPos()));

    // Swap velocities
    const colliderAVelocity = colliderA.getVelocity();
    colliderA.velocity = colliderB.velocity.clone();
    colliderB.velocity = colliderAVelocity;
  }

  protected resolvePushableVsStatic(colliderA: KinematicBody, colliderB: StaticBody | KinematicBody, collision: CollisionData) {
    log("Resolving pushable vs static");
    log("colliderA: ", colliderA.getName(), " colliderB: ", colliderB.getName());
    // Go to the global collision position
    colliderA.position = colliderA.position.add(collision.position.subtract(colliderA.getGlobalPos()));

    // Reset the velocity of colliderA along the collision normal
    colliderA.velocity = colliderA.velocity.multiply(collision.normal.abs().swapComponents());
  }

  protected resolvePushableVsNonPushable(colliderA: KinematicBody, colliderB: KinematicBody, collision: CollisionData) {
    log("Resolving pushable vs non-pushable");
    log("colliderA: ", colliderA.getName(), " colliderB: ", colliderB.getName());
    // The first section of collision reseolution of pushable v. non-pushable is the same as pushable v. static.
    this.resolvePushableVsStatic(colliderA, colliderB, collision);
    
    // A non-moving, non-pushable kinematicBody acts the same as a StaticBody, so we only have to resolve pushable vs static
    if (colliderB.velocity.equals(Vector2.zero())) {
      return;
    }

    // Add the velocity of ColliderB along the collision normal
    colliderA.velocity = colliderA.velocity.add(colliderB.velocity.multiply(collision.normal.abs()));
  }

  protected resolveNonPushableVsStatic(colliderA: KinematicBody, colliderB: StaticBody | KinematicBody, collision: CollisionData) {
    log("Resolving non-pushable vs static");
    log("colliderA: ", colliderA.getName(), " colliderB: ", colliderB.getName());
    // The end result of Non-Pushable vs Static and Pushable vs Static is the same.
    this.resolvePushableVsStatic(colliderA, colliderB, collision);
  }

  protected resolveNonPushableVsNonPushable(colliderA: KinematicBody, colliderB: KinematicBody, collision: CollisionData) {
    log("Resolving non-pushable vs non-pushable");
    log("colliderA: ", colliderA.getName(), " colliderB: ", colliderB.getName());
    // The first part of resolving NonPushable vs Non-Pushable collision is the same as Non-Pushable vs. Static
    this.resolveNonPushableVsStatic(colliderA, colliderB, collision);

    // Reset the velocity of colliderB along the collision normal
    colliderB.velocity = colliderB.velocity.multiply(collision.normal.abs().swapComponents());
  }

  protected resolveCollision(collision: CollisionData) {
    const otherCollider = collision.collider;
    if (!(otherCollider instanceof StaticBody || otherCollider instanceof KinematicBody)) {
      throw new Error("Unsupported rigidbody type.");
    }
    
    if (otherCollider instanceof StaticBody) {
      this.resolvePushableVsStatic(this, otherCollider, collision);
    } else if (this.pushable && otherCollider.pushable) {
      this.resolvePushableVsPushable(this, otherCollider, collision);
    } else if (this.pushable && !otherCollider.pushable) {
      this.resolvePushableVsNonPushable(this, otherCollider, collision);
    } else if (!this.pushable && otherCollider.pushable) {
      this.resolvePushableVsNonPushable(otherCollider, this, collision);
    } else if (!this.pushable && !otherCollider.pushable) {
      this.resolveNonPushableVsNonPushable(this, otherCollider, collision);
    } else {
      throw new Error("Unsupported combination of pushable and unpushable colliders.");
    }
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
    if (collision === null) log("Null Collision")
    while (collision != null && !collision.normal.equals(Vector2.zero()) && slidesLeft > 0) {
      log("collision!!!!!!!!!!!!!!");
      log("collisionTime: " + collision.time);
      log("Position: " + JSON.stringify(collision.position));
      log("normal: " + JSON.stringify(collision.normal));

      this.resolveCollision(collision);

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
