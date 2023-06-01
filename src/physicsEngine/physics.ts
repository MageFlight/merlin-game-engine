import { AABB, CollisionObject, KinematicBody, Region, RigidBody, StaticBody } from "../gameObjects/physicsObjects";
import { Vector2 } from "../math/vector2";
import { log } from "../index";

export interface CollisionData {
  time: number,
  normal: Vector2,
  position: Vector2,
  collider: RigidBody,
}

class CollisionResolutionData {
  colliderA: KinematicBody;
  colliderAFinalPosition: Vector2;
  colliderAFinalVelocity: Vector2;

  constructor(colliderA: KinematicBody, colliderAFinalPosition: Vector2, colldierAFinalVelocity: Vector2) {
    this.colliderA = colliderA;
    this.colliderAFinalPosition = colliderAFinalPosition;
    this.colliderAFinalVelocity = colldierAFinalVelocity;
  }
}

export class PhysicsEngine {
  private regions: Region[] = [];
  private rigidBodies: RigidBody[] = []; // TODO: Model Godot more in this; use CollisionObjects
  private readonly gravity = 0.0072;

  constructor() {}

  getGravity(): number {
    return this.gravity;
  }

  public update(dt: number) {
    log("In physics update()");

    const frameCollisions: CollisionResolutionData[] = [];

    const specialUnpushables: Map<KinematicBody, Vector2> = new Map();

    const pushableKinematicBodies = this.rigidBodies.filter(body => body instanceof KinematicBody && body.isPushable());
    const unpushableKinematicBodies = this.rigidBodies.filter(body => body instanceof KinematicBody && !body.isPushable());

    log("Pushables: ");
    pushableKinematicBodies.forEach(body => log(body.getName()));
    log("unPushables: ");
    unpushableKinematicBodies.forEach(body => log(body.getName()));

    for (const colliderA of pushableKinematicBodies.concat(unpushableKinematicBodies)) {
      log("");
      log("ColliderA: ", colliderA.getName());
      colliderA.resetFrameColisions();

      if (!(colliderA instanceof KinematicBody)) continue;

      log("Checking collision for ", colliderA.getName());

      const collision = this.checkCollisions(colliderA, colliderA.getVelocity(), [], dt);

      if (collision == null) {
        log("Null Collision");
        frameCollisions.push(new CollisionResolutionData(
          colliderA,
          colliderA.getGlobalPos().add(colliderA.getVelocity().multiply(dt)),
          colliderA.getVelocity())
        );

        continue;
      }

      colliderA.onCollision(collision);
      colliderA.logCollision(collision);

      if (colliderA instanceof KinematicBody && ((collision.collider instanceof KinematicBody && collision.collider.isPushable()) || collision.collider instanceof StaticBody)) {
        const currentUnpushableState = specialUnpushables.get(colliderA);
        if (currentUnpushableState === undefined) {
          specialUnpushables.set(colliderA, collision.normal);
        } else {
          specialUnpushables.set(colliderA, currentUnpushableState.add(collision.normal));
        }
      }

      log("IsUnpushable on ", specialUnpushables.get(colliderA));

      log("Collision ocurred");
      log("CollisionTime: ", collision.time, " position: ", collision.position, " normal: ", collision.normal, " collider: ", collision.collider.getName());
      const colliderAUnpushable = !colliderA.isPushable() ? Vector2.one() : specialUnpushables.get(colliderA);
      const colliderBUnpushable = collision.collider instanceof KinematicBody && collision.collider.isPushable() ? specialUnpushables.get(collision.collider) : Vector2.one();
      
      const finalResolutionData = this.resolveCollision(colliderA, colliderAUnpushable, collision, colliderBUnpushable);
      log("Final ResolutionData Collider: ", colliderA.getName(), " position: ", finalResolutionData.colliderAFinalPosition, " Velocity: ", finalResolutionData.colliderAFinalVelocity);
      frameCollisions.push(finalResolutionData);
    }

    log("");
    log("collisions: ");
    frameCollisions.forEach(collision => log(collision.colliderA.getName()));
    for (const collision of frameCollisions) {
      log("Applying collision");
      log("collider: ", collision.colliderA.getName(), " position: ", collision.colliderAFinalPosition, " velocity: ", collision.colliderAFinalVelocity);
      collision.colliderA.setGlobalPos(collision.colliderAFinalPosition);
      collision.colliderA.setVelocity(collision.colliderAFinalVelocity);
    }

    this.interactRegions();
  }

  protected resolvePushableVsPushable(colliderA: KinematicBody, colliderB: KinematicBody | StaticBody, collision: CollisionData): CollisionResolutionData {
    log("Resolving pushable vs pushable");
    log("colliderA: ", colliderA.getName(), " colliderB: ", colliderB.getName());
    
    const colliderAFinalPosition = collision.position;

    const colldierAFinalVelocity = colliderB instanceof KinematicBody ? colliderB.getVelocity().clone() : Vector2.zero();

    return new CollisionResolutionData(colliderA, colliderAFinalPosition, colldierAFinalVelocity);
  }

  protected resolvePushableVsStatic(colliderA: KinematicBody, colliderB: KinematicBody | StaticBody, collision: CollisionData): CollisionResolutionData {
    log("Resolving pushable vs static");
    log("colliderA: ", colliderA.getName(), " colliderB: ", colliderB.getName());
    
    const colliderAFinalPosition = collision.position;

    // Reset the velocity of colliderA along the collision normal
    const colliderAFinalVelocity = colliderA.getVelocity().multiply(collision.normal.abs().swapComponents());

    return new CollisionResolutionData(colliderA, colliderAFinalPosition, colliderAFinalVelocity);
  }

  protected resolvePushableVsNonPushable(colliderA: KinematicBody, colliderB: KinematicBody | StaticBody, collision: CollisionData): CollisionResolutionData {
    log("Resolving pushable vs non-pushable");
    log("colliderA: ", colliderA.getName(), " colliderB: ", colliderB.getName());

    // The first section of collision reseolution of pushable v. non-pushable is the same as pushable v. static.
    let resolutionData = this.resolvePushableVsStatic(colliderA, colliderB, collision);

    // Add the velocity of ColliderB along the collision normal
    const colliderBVelocity = colliderB instanceof KinematicBody ? colliderB.getVelocity() : Vector2.zero();
    resolutionData.colliderAFinalVelocity = resolutionData.colliderAFinalVelocity.add(colliderBVelocity.multiply(collision.normal.abs()));

    return resolutionData;
  }

  protected resolveNonPushableVsPushable(colliderA: KinematicBody, colliderB: KinematicBody | StaticBody, collision: CollisionData) {
    return new CollisionResolutionData(colliderA, collision.position, colliderA.getVelocity());
  }

  protected resolveNonPushableVsStatic(colliderA: KinematicBody, colliderB: StaticBody | KinematicBody, collision: CollisionData): CollisionResolutionData {
    log("Resolving non-pushable vs static");
    log("colliderA: ", colliderA.getName(), " colliderB: ", colliderB.getName());
    // The end result of Non-Pushable vs Static and Pushable vs Static is the same.
    return this.resolvePushableVsStatic(colliderA, colliderB, collision);
  }

  protected resolveNonPushableVsNonPushable(colliderA: KinematicBody, colliderB: KinematicBody | StaticBody, collision: CollisionData): CollisionResolutionData {
    log("Resolving non-pushable vs non-pushable");
    log("colliderA: ", colliderA.getName(), " colliderB: ", colliderB.getName());
    // The first part of resolving NonPushable vs Non-Pushable collision is the same as Non-Pushable vs. Static
    return this.resolveNonPushableVsStatic(colliderA, colliderB, collision);

    // Reset the velocity of colliderB along the collision normal
    // colliderB.velocity = colliderB.velocity.multiply(collision.normal.abs().swapComponents());
  }

  protected resolveCollision(colliderA: KinematicBody, colliderAUnpushableAxes: Vector2 | undefined, collision: CollisionData, colliderBUnpushableAxes: Vector2 | undefined): CollisionResolutionData {
    const otherCollider = collision.collider;
    if (!(otherCollider instanceof StaticBody || otherCollider instanceof KinematicBody)) {
      throw new Error("Unsupported rigidbody type.");
    }

    let resolutionData: CollisionResolutionData[] = [];

    for (let currentAxis = 0; currentAxis < 2; currentAxis++) {
      log("currentAxis: ", currentAxis);
      let colliderAUnpushable = currentAxis == 0 ? colliderAUnpushableAxes?.x : colliderAUnpushableAxes?.y;
      let colliderBUnpushable = currentAxis == 0 ? colliderBUnpushableAxes?.x : colliderBUnpushableAxes?.y;

      if (colliderAUnpushable === undefined) {
        colliderAUnpushable = 0;
      }

      if (colliderBUnpushable === undefined) {
        colliderBUnpushable = 0;
      }

      log("colliderAUnpushable: ", colliderAUnpushable, " ColliderBUnpushable: ", colliderBUnpushable);

      if (collision.collider instanceof StaticBody) {
        log("Resolution 1");
        resolutionData[currentAxis] = this.resolvePushableVsStatic(colliderA, otherCollider, collision);
      } else if (colliderAUnpushable == 0 && colliderBUnpushable == 0) {
        log("Resolution 2");
        resolutionData[currentAxis] = this.resolvePushableVsPushable(colliderA, otherCollider, collision);
      } else if (colliderAUnpushable == 0 && colliderBUnpushable != 0) {
        log("Resolution 3");
        resolutionData[currentAxis] = this.resolvePushableVsNonPushable(colliderA, otherCollider, collision);
      } else if (colliderAUnpushable != 0 && colliderBUnpushable == 0) {
        log("Resolution 4");
        resolutionData[currentAxis] = this.resolveNonPushableVsPushable(colliderA, otherCollider, collision);
      } else if (colliderAUnpushable != 0 && colliderBUnpushable != 0) {
        log("Resolution 5");
        resolutionData[currentAxis] = this.resolveNonPushableVsNonPushable(colliderA, otherCollider, collision);
      } else {
        throw new Error("Unsupported combination of pushable and unpushable colliders.");
      }
    }

    const finalResolutionData = new CollisionResolutionData(
      colliderA,
      new Vector2(resolutionData[0].colliderAFinalPosition.x, resolutionData[1].colliderAFinalPosition.y),
      new Vector2(resolutionData[0].colliderAFinalVelocity.x, resolutionData[1].colliderAFinalVelocity.y));
    
    return finalResolutionData;
  }

  reset(): void {
    this.regions = [];
    this.rigidBodies = [];
  }

  addSprites(sprites: Region[]): void {
    sprites.forEach((sprite) => {
      this.addSprite(sprite);
    });
  }

  addSprite(spr: Region): void {
    if (spr instanceof RigidBody) {
      this.rigidBodies.push(spr);
    } else if (spr instanceof Region) {
      this.regions.push(spr);
    }

    this.addSprites(spr.getChildrenType<Region>(Region));
  }

  removeSprite(spr: Region): void {
    if (spr instanceof RigidBody) {
      this.rigidBodies.splice(this.rigidBodies.indexOf(spr), 1);
    } else if (spr instanceof Region) {
      this.regions.splice(this.regions.indexOf(spr), 1);
    }
  }

  interactRegions(): void {
    const allBodies = this.regions.concat(this.rigidBodies);

    for (let i = 0; i < this.regions.length; i++) {
      const region = this.regions[i];

      for (let x = 0; x < allBodies.length; x++) {
        const sprite2 = allBodies[x];
        if (region != sprite2) region.interactWithRegion(sprite2);
      }
    }
  }

  /**
   * Checks for any collisions between physics-recognised sprites and the provided sprite.
   * @param {RigidBody} sprite Sprite to check collision for
   * @param {Vector2} velocity The velocity of the sprite
   * @param {CollisionObject[]} spritesExclude Sprites to ignore during collision checking.
   * @param {Number} dt Delta time
   * @returns The collision information
   */
  checkCollisions(sprite: RigidBody, velocity: Vector2, spriteExcludeList: CollisionObject[], dt: number): CollisionData | null {
    const spriteGlobalPos = sprite.getChildrenType<AABB>(AABB)[0].getGlobalPos();

    let broadBox = new AABB(
      new Vector2(
        velocity.x > 0
          ? spriteGlobalPos.x
          : spriteGlobalPos.x + velocity.x * dt,
        velocity.y > 0 ? spriteGlobalPos.y : spriteGlobalPos.y + velocity.y * dt
      ),
      new Vector2(
        velocity.x > 0
          ? velocity.x * dt + sprite.getSize().x
          : sprite.getSize().x - velocity.x * dt,
        velocity.y > 0
          ? velocity.y * dt + sprite.getSize().y
          : sprite.getSize().y - velocity.y * dt
      ),
      true,
      "broadBox"
    );
    log("vel: " + JSON.stringify(velocity) + " dt: " + dt);
    log("bBox size: " + JSON.stringify(broadBox.getSize()));
    log("bBox pos: " + JSON.stringify(broadBox.getPosition()));
    log("dBox pos: " + JSON.stringify(sprite.getGlobalPos()));

    const possibleSprites = [];
    for (let i = 0; i < this.rigidBodies.length; i++) {
      const spr = this.rigidBodies[i];
      if (
        spr != sprite &&
        spriteExcludeList.indexOf(spr) == -1 &&
        PhysicsEngine.staticAABB(broadBox, spr.getChildrenType<AABB>(AABB)[0])
      )
        possibleSprites.push(spr);
    }

    log("possibleSpriteLength: ", possibleSprites.length);
    log("rigidBodyCount: ", this.rigidBodies.length);

    if (possibleSprites.length == 0) {
      return null;
    }

    // Get closest collision
    let closestSprites: RigidBody[] = [];
    let closestDist = Infinity;
    for (let i = 0; i < possibleSprites.length; i++) {
      const dist = PhysicsEngine.getDist(sprite, possibleSprites[i], velocity);
      if (dist < closestDist) {
        closestDist = dist;
        closestSprites = [possibleSprites[i]];
      } else if (dist == closestDist) {
        closestSprites.push(possibleSprites[i]);
      }
    }

    // Calculate Collision if Found
    if (closestSprites.length > 0) {
      let suggestedVelocity = velocity.clone();
      let collisions = [];
      
      for (let i = 0; i < closestSprites.length; i++) {
        const collision = PhysicsEngine.minkowskiSweptAABB(
          sprite,
          closestSprites[i],
          dt
        );

        log("Collision normal: ", collision?.normal);
        log("Collision time: ", collision?.time);
        log("Collision position: ", collision?.position);

        if (collision === null) return null;

        if (!collision.normal.equals(Vector2.zero())) {
          collisions.push(collision);

          suggestedVelocity.x = suggestedVelocity.x * dt;
          suggestedVelocity.y = suggestedVelocity.y * dt;
        } else {
          break;
        }
      }

      if (collisions.length > 0) {
        const finalCollision = collisions[collisions.length - 1];
        sprite.onCollision(finalCollision);
        finalCollision.collider?.onCollision(finalCollision);
        return finalCollision;
      } else {
        return null;
      }
    }

    return null;
  }

  static getDist(dBox: CollisionObject, sBox: CollisionObject, dBoxVel: Vector2): number {
    let dist = Vector2.zero();
    const dBoxPos = dBox.getGlobalPos();
    const sBoxPos = sBox.getGlobalPos();
    log("sBox pos: " + JSON.stringify(sBoxPos));

    // Get the distances
    if (dBoxVel.x > 0) {
      // Moving right
      dist.x = sBoxPos.x - (dBoxPos.x + dBox.getSize().x);
    } else {
      // Moving left
      dist.x = sBoxPos.x + sBox.getSize().x - dBoxPos.x;
    }
    if (dBoxVel.y > 0) {
      // Moving down
      dist.y = sBoxPos.y - (dBoxPos.y + dBox.getSize().y);
    } else {
      // Moving Up
      dist.y = dBoxPos.y - (sBoxPos.y + sBox.getSize().y);
    }

    log("dists preSnap: " + JSON.stringify(dist));
    dist.x = dist.x < 0 ? Infinity : dist.x;
    dist.y = dist.y < 0 ? Infinity : dist.y;
    log("dists: " + JSON.stringify(dist));
    return Math.min(dist.x, dist.y);
  }

  static satAABB(sprite0: RigidBody, sprite1: RigidBody): CollisionData | null {
    log("in satAABB()");
    const sprite0Pos = sprite0.getGlobalPos();
    const sprite1Pos = sprite1.getGlobalPos();

    const b1Collider = sprite0.getChildrenType<AABB>(AABB)[0];
    const b2Collider = sprite1.getChildrenType<AABB>(AABB)[0];

    const b1HalfSize = b1Collider.getSize().multiply(0.5);
    const b2HalfSize = b2Collider.getSize().multiply(0.5);

    log("b1Pos: ", sprite0Pos, " b1HalfSize: ", b1HalfSize);
    log("b2Pos: ", sprite1Pos, " b2HalfSize: ", b2HalfSize);
    const dx = (sprite0Pos.x + b1HalfSize.x) - (sprite1Pos.x + b2HalfSize.x);
    const px = (b2HalfSize.x + b1HalfSize.x) - Math.abs(dx);
    if (px <= 0) return null;

    const dy = (sprite1Pos.y + b2HalfSize.y) - (sprite0Pos.y + b1HalfSize.y);
    const py = (b2HalfSize.y + b1HalfSize.y) - Math.abs(dy);
    if (py <= 0) return null;
  
    log("dx: ", dx, " dy: ", dy);
    log("ExtraCheck  px: " + px + " py: " + py);
    if (px < py) {
      const signX = dx == 0 ? 1 : Math.sign(dx);
      const collision: CollisionData = {
        time: 0,
        normal: new Vector2(signX, 0),
        position: new Vector2(sprite0Pos.x + px * signX, sprite0Pos.y),
        collider: sprite1,
      };

      sprite0.onCollision(collision);
      sprite1.onCollision(collision);
      return collision;
    } else {
      const signY = dy == 0 ? 1 : Math.sign(dy);
      log("spriteGlobalPos: ", sprite0Pos.y);
      log("signY: ", signY, " sub: ", (py * signY));
      log("expected position: ", new Vector2(sprite0Pos.x, sprite0Pos.y - py * signY));
      const collision = {
        time: 0,
        normal: new Vector2(0, signY),
        position: new Vector2(sprite0Pos.x, sprite0Pos.y - py * signY),
        collider: sprite1,
      };

      sprite0.onCollision(collision);
      sprite1.onCollision(collision);
      return collision;
    }
  }

  /**
   * Checks if two colliders are currently intersecting.
   * @param {AABB} c1 First Collider
   * @param {AABB} c2 Second Collider
   * @returns True if both colliders are intersecting, False if they aren't.
   */
  static staticAABB(c1: AABB, c2: AABB): boolean {
    const c1Pos = c1.getGlobalPos();
    const c2Pos = c2.getGlobalPos();

    return (
      c1Pos.x + c1.getSize().x > c2Pos.x &&
      c1Pos.x < c2Pos.x + c2.getSize().x &&
      c1Pos.y + c1.getSize().y > c2Pos.y &&
      c1Pos.y < c2.getGlobalPos().y + c2.getSize().y
    );
  }

  // Very helpful explination: https://noonat.github.io/intersect/#aabb-vs-segment
  static rayAABB(rayStart: Vector2, rayDelta: Vector2, collider: RigidBody, padding: Vector2, dt: number): CollisionData | null {
    const scaleX = rayDelta.x == 0 ? Infinity : 1.0 / (rayDelta.x * dt);
    const scaleY = rayDelta.y == 0 ? Infinity : 1.0 / (rayDelta.y * dt);
    const signX = scaleX >= 0 ? 1 : -1;
    const signY = scaleY >= 0 ? 1 : -1;

    const c0AABB = collider.getChildrenType<AABB>(AABB)[0];
    const c0HalfSize = c0AABB.getSize().multiply(0.5);
    const c0MiddlePos = c0AABB.getGlobalPos().add(c0HalfSize);

    log("ScaleX: ", scaleX, " SignX: ", signX);
    log("ScaleY: ", scaleY, " SignY: ", signY);

    log("rayStart: ", rayStart, " rayDelta: ", rayDelta, " padding: ", padding);
    log("c0 name: ", collider.getName());
    log("c0 globalPos: ", collider.getGlobalPos());
    log("b2HalfSize: ", c0HalfSize, " b2MiddlePos: ", c0MiddlePos);

    const nearTime = new Vector2((c0MiddlePos.x - signX * (c0HalfSize.x + padding.x) - rayStart.x) * scaleX, (c0MiddlePos.y - signY * (c0HalfSize.y + padding.y) - rayStart.y) * scaleY);
    const farTime = new Vector2((c0MiddlePos.x + signX * (c0HalfSize.x + padding.x) - rayStart.x) * scaleX, (c0MiddlePos.y + signY * (c0HalfSize.y + padding.y) - rayStart.y) * scaleY);
    
    log("nearTime: ", nearTime, " farTime: ", farTime);
    log("nearTime.x > farTime.y: ", nearTime.x > farTime.y, " nearTime.y > farTime.x: ", nearTime.y > farTime.x);

    if (nearTime.x > farTime.y || nearTime.y > farTime.x) {
      return null;
    }

    const finalNearTime = Math.min(rayDelta.x == 0 ? Infinity : nearTime.x, rayDelta.y == 0 ? Infinity : nearTime.y);
    const finalFarTime = Math.max(rayDelta.x == 0 ? -Infinity : farTime.x, rayDelta.y == 0 ? -Infinity : farTime.y);

    log("finalNearTime: ", finalNearTime, " finalFarTime: ", finalFarTime);

    if (finalNearTime >= 1 || finalFarTime <= 0) {
      return null;
    }

    let collisionNormal: Vector2;
    const collisionTime = Math.max(Math.min(finalNearTime, 1), 0);

    log("nearTime.x > nearTime.y: ", nearTime.x > nearTime.y);

    if (nearTime.x > nearTime.y) {
      collisionNormal = new Vector2(-signX, 0);
    } else {
      collisionNormal = new Vector2(0, -signY);
    }

    log("collisionNormal1: ", collisionNormal);
    log("collisionTime1: ", collisionTime);

    return {
      collider: collider,
      time: collisionTime,
      normal: collisionNormal,
      position: new Vector2(rayStart.x + rayDelta.x * collisionTime, rayStart.y + rayDelta.y * collisionTime)
    };
  }

  static minkowskiSweptAABB(b1: RigidBody, b2: RigidBody, dt: number): CollisionData | null {
    let sweepTime: number;

    if (b1 instanceof StaticBody && b2 instanceof StaticBody) {
      const collision = PhysicsEngine.satAABB(b1, b2);
      return collision;
    }

    const b1Velocity = b1 instanceof KinematicBody ? b1.getVelocity() : Vector2.zero();
    const b2Velocity = b2 instanceof KinematicBody ? b2.getVelocity() : Vector2.zero();
    
    log("b1Velocity: ", b1Velocity);
    log("b2Velocity: ", b2Velocity);

    const relativeVelocity = b1Velocity.subtract(b2Velocity);
    
    const b1Collider = b1.getChildrenType<AABB>(AABB)[0];
    const b2Collider = b2.getChildrenType<AABB>(AABB)[0];

    log("areInside: ", PhysicsEngine.staticAABB(b1Collider, b2Collider))
    if (relativeVelocity.equals(Vector2.zero()) && PhysicsEngine.staticAABB(b1Collider, b2Collider)) {
      const collision = PhysicsEngine.satAABB(b1, b2);
      return collision;
    }

    const b1HalfSize = b1Collider.getSize().multiply(0.5);
    const b1MidPosition = b1Collider.getGlobalPos().add(b1HalfSize);

    log("b1MidPosition: ", b1MidPosition, " b1HalfSize: ", b1HalfSize, " relativeVelocity: ", relativeVelocity);

    const collision = PhysicsEngine.rayAABB(b1MidPosition, relativeVelocity, b2, b1HalfSize, dt);
    
    if (collision === null) return collision;
    log("rawCollisionPosition: ", collision.position);
    
    const b2HalfSize = b2Collider.getSize().multiply(0.5);
    const b2Pos = b2Collider.getGlobalPos().add(b2HalfSize);

    log("b2Pos: ", b2Pos, " b2HalfSize: ", b2HalfSize);
    log("b1MidPosition: ", b1MidPosition, " b1HalfSize: ", b1HalfSize, " relativeVelocity: ", relativeVelocity);

    if (!(b2 instanceof KinematicBody && b2.isPushable() && b1 instanceof KinematicBody && !b1.isPushable())) { // Prevent snapping to other collider's normal 
      const collisionMask = collision.normal.abs();

      const snapCorrection = b2Pos.add(b2HalfSize.add(b1HalfSize).multiply(collision.normal)).multiply(collisionMask);

      log("Correction before mask: ", b2HalfSize.add(b1HalfSize).multiply(collision.normal));
      log("snapCorrection: ", snapCorrection);
      log("snapCorrectionFinal: ", snapCorrection.subtract(b1HalfSize).multiply(collisionMask));

      collision.position = b1MidPosition.add(b1Velocity.multiply(dt)).multiply(collisionMask.swapComponents()).add(snapCorrection).subtract(b1HalfSize);
    } else {
      collision.position = collision.position.subtract(b1HalfSize);
    }

    log("b1: ", b1.getName(), " b2: ", b2.getName());
    log("finalPositionInSweptAABB: ", collision.position);
    return collision;
  }

  // RETURN the time and surface normal.
  // Adapted from https://www.gamedev.net/articles/programming/general-and-gameplay-programming/swept-aabb-collision-detection-and-response-r3084/
  static sweptAABB(dynamicBox: RigidBody, staticBox: RigidBody, vel: Vector2, dt: number): CollisionData | null {
    const b1 = dynamicBox.getChildrenType<AABB>(AABB)[0];
    const b2 = staticBox.getChildrenType<AABB>(AABB)[0];

    const b1Pos = b1.getGlobalPos();
    const b2Pos = b2.getGlobalPos();

    let entryDist = Vector2.zero();
    let exitDist = Vector2.zero();
    let entryTime = Vector2.zero();
    let exitTime = Vector2.zero();

    log("b1Pos: " + JSON.stringify(b1Pos));
    log("b1Size: " + JSON.stringify(b1.getSize()));
    log("b2Pos: " + JSON.stringify(b2Pos));
    log("b2Size: " + JSON.stringify(b2.getSize()));
    // Find the distances between the near and far sides of the boxes.
    if (vel.x > 0) {
      // Moving right
      entryDist.x = b2Pos.x - (b1Pos.x + b1.getSize().x);
      exitDist.x = b2Pos.x + b2.getSize().x - b1Pos.x;
    } else {
      // Moving left
      entryDist.x = b2Pos.x + b2.getSize().x - b1Pos.x;
      exitDist.x = b2Pos.x - (b1Pos.x + b1.getSize().x);
    }
    if (vel.y > 0) {
      // Moving down
      entryDist.y = b2Pos.y - (b1Pos.y + b1.getSize().y);
      exitDist.y = b2Pos.y + b2.getSize().y - b1Pos.y;
    } else {
      // Moving Up
      entryDist.y = b2Pos.y + b2.getSize().y - b1Pos.y;
      exitDist.y = b2Pos.y - (b1Pos.y + b1.getSize().y);
    }

    log("entryDist: " + JSON.stringify(entryDist));
    log("exitDist: " + JSON.stringify(exitDist));

    // Calculate entry and exit times
    if (vel.x == 0) {
      entryTime.x = -Infinity;
      exitTime.x = Infinity;
    } else {
      entryTime.x = entryDist.x / (vel.x * dt);
      exitTime.x = exitDist.x / (vel.x * dt);
    }
    if (vel.y == 0) {
      entryTime.y = -Infinity;
      exitTime.y = Infinity;
    } else {
      entryTime.y = entryDist.y / (vel.y * dt);
      exitTime.y = exitDist.y / (vel.y * dt);
    }

    log("entry: " + JSON.stringify(entryTime));
    log("exit: " + JSON.stringify(exitTime));

    let finalEntryTime = Math.max(entryTime.x, entryTime.y);
    let finalExitTime = Math.min(exitTime.x, exitTime.y);
    log("finalEntry: " + JSON.stringify(finalEntryTime));
    log("finalExit: " + JSON.stringify(finalExitTime));
    log("vel: " + JSON.stringify(vel));
    // If no collision
    if (
      finalEntryTime > finalExitTime ||
      entryTime.x > exitTime.x ||
      entryTime.y > exitTime.y ||
      (entryTime.x < 0 && entryTime.y < 0) ||
      (entryTime.x > 1 && entryTime.y > 1)
    ) {
      return null;
    } else {
      if (entryTime.x > entryTime.y) {
        if (entryDist.x < 0 || (entryDist.x == 0 && vel.x < 0)) {
          return {
            time: finalEntryTime,
            normal: Vector2.right(),
            position: new Vector2(
              b2Pos.x + b2.getSize().x,
              b1Pos.y + vel.y * finalEntryTime
            ),
            collider: staticBox,
          };
        } else {
          return {
            time: finalEntryTime,
            normal: Vector2.left(),
            position: new Vector2(
              b2Pos.x - b1.getSize().x,
              b1Pos.y + vel.y * finalEntryTime
            ),
            collider: staticBox,
          };
        }
      } else {
        if (entryDist.y < 0 || (entryDist.y == 0 && vel.y < 0)) {
          return {
            time: finalEntryTime,
            normal: Vector2.down(),
            position: new Vector2(
              b1Pos.x + vel.x * finalEntryTime,
              b2Pos.y + b2.getSize().y
            ),
            collider: staticBox,
          };
        } else {
          return {
            time: finalEntryTime,
            normal: Vector2.up(),
            position: new Vector2(
              b1Pos.x + vel.x * finalEntryTime,
              b2Pos.y - b1.getSize().y
            ),
            collider: staticBox,
          };
        }
      }
    }
  }
}
