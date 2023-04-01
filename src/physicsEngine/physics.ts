import { AABB, CollisionObject, Region, RigidBody } from "../gameObjects/physicsObjects";
import { Vector2 } from "../math/vector2";
import { log } from "../index";

export interface CollisionData {
  time: number,
  normal: Vector2,
  position: Vector2,
  collider: RigidBody | null,
}

export class PhysicsEngine {
  private regions: Region[] = [];
  private rigidBodies: RigidBody[] = []; // TODO: Model Godot more in this; use CollisionObjects
  private readonly gravity = 0.0072;

  constructor() {}

  getGravity(): number {
    return this.gravity;
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
    log("groundpos: ", this.rigidBodies[2].getGlobalPos());

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

    // Check if any are directly overlapping with a static Seperating Axis Theorem test. (https:`//noonat.github.io/intersect/#aabb-vs-aabb)
    for (let i = 0; i < possibleSprites.length; i++) {
      const b1Collider = sprite.getChildrenType<AABB>(AABB)[0];
      const b2Collider = possibleSprites[i].getChildrenType<AABB>(AABB)[0];

      const b2Pos = b2Collider.getGlobalPos();

      const b1HalfSize = b1Collider.getSize().multiply(0.5);
      const b2HalfSize = b2Collider.getSize().multiply(0.5);

      log("b1Pos: ", spriteGlobalPos, " b1HalfSize: ", b1HalfSize);
      log("b2Pos: ", b2Pos, " b2HalfSize: ", b2HalfSize);
      const dx = (spriteGlobalPos.x + b1HalfSize.x) - (b2Pos.x + b2HalfSize.x);
      const px = (b2HalfSize.x + b1HalfSize.x) - Math.abs(dx);
      if (px <= 0) continue;

      const dy = (b2Pos.y + b2HalfSize.y) - (spriteGlobalPos.y + b1HalfSize.y);
      const py = (b2HalfSize.y + b1HalfSize.y) - Math.abs(dy);
      if (py <= 0) continue;
    
      log("dx: ", dx, " dy: ", dy);
      log("ExtraCheck  px: " + px + " py: " + py);
      if (px < py) {
        const signX = dx == 0 ? 1 : Math.sign(dx);
        const collision: CollisionData = {
          time: 0,
          normal: new Vector2(signX, 0),
          position: new Vector2(spriteGlobalPos.x + px * signX, spriteGlobalPos.y),
          collider: possibleSprites[i],
        };

        sprite.onCollision(collision);
        possibleSprites[i].onCollision(collision);
        return collision;
      } else {
        const signY = dy == 0 ? 1 : Math.sign(dy);
        log("spriteGlobalPos: ", spriteGlobalPos.y);
        log("signY: ", signY, " sub: ", (py * signY));
        log("expected position: ", new Vector2(spriteGlobalPos.x, spriteGlobalPos.y - py * signY));
        const collision = {
          time: 0,
          normal: new Vector2(0, signY),
          position: new Vector2(spriteGlobalPos.x, spriteGlobalPos.y - py * signY),
          collider: possibleSprites[i],
        };

        sprite.onCollision(collision);
        possibleSprites[i].onCollision(collision);
        return collision;
      }
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
        const collision = PhysicsEngine.sweptAABB(
          sprite,
          closestSprites[i],
          suggestedVelocity,
          dt
        );

        if (!collision.normal.equals(Vector2.zero())) {
          collisions.push(collision);

          suggestedVelocity.x = suggestedVelocity.x * collision.time * dt;
          suggestedVelocity.y = suggestedVelocity.y * collision.time * dt;
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

  // RETURN the time and surface normal.
  // Adapted from https://www.gamedev.net/articles/programming/general-and-gameplay-programming/swept-aabb-collision-detection-and-response-r3084/
  static sweptAABB(dynamicBox: RigidBody, staticBox: RigidBody, vel: Vector2, dt: number): CollisionData {
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
      return {
        time: 1,
        normal: Vector2.zero(),
        position: b1Pos.add(vel.multiply(dt)),
        collider: null,
      };
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
