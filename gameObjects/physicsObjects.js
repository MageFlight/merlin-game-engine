import { Vector2 } from "../math/vector2.js";
import { Sprite } from "./gameObject.js";
import { log } from "../main.js";

export class AABB extends Sprite {
  enabled;

  /**
   * Creates an Axis-Aligned Bounding Box.
   * @param {Vector2} position The initial position of the collider
   * @param {Vector2} size The size of the collider
   * @param {boolean} enabled The initial enabled status of the collider
   * @param {String} name The name of the collider
   */
  constructor(position, size, enabled, name) {
    super(position, size, name);
    this.enabled = enabled;
  }
}

export class CollisionObject extends Sprite {
  _collisionMask = 0b1; // Same as 0b0000000001
  _collisionLayer = 0b1;

  constructor(position, size, collisionMask, collisionLayer, name) {
    super(position, size, name);
    this._collisionMask = collisionMask;
    this._collisionLayer = collisionLayer;
  }

  get collisionMask() {
    return this._collisionMask;
  }

  get collisionLayer() {
    return this._collisionLayer;
  }

  setMaskLevel(level, value) {
    this._collisionMask =
      (this._collisionMask & (1 << level)) ^
      (value << index) ^
      this._collisionMask;
  }

  setLayerLevel(level, value) {
    this._collisionLayer =
      (this._collisionLayer & (1 << level)) ^
      (value << index) ^
      this._collisionLayer;
  }

  /**
   * Checks if this region and another region are intersecting
   * @param {Region} region Region to check interesction with
   */
  intersecting(region) {
    const c1 = this.getChildType(AABB);
    const c2 = region.getChildType(AABB);

    return (
      (region.collisionMask & this._collisionLayer ||
        this._collisionMask & region.collisionLayer) && // If mask and layers align
      PhysicsEngine.staticAABB(c1, c2) // And intersecting
    );
  }
}

export class Region extends CollisionObject {
  _regionsInside = [];

  constructor(position, size, name) {
    super(position, size, 0b1, 0b1, name);
  }

  interactWithRegion(region) {
    const intersecting = this.intersecting(region);
    const containsRegion = this._regionsInside.indexOf(region) > -1;

    if (intersecting && !containsRegion) {
      // If inside, but wasn't last frame
      this._regionsInside.push(region);
      this.onRegionEnter(region);
      region.onRegionEnter(this);
    } else if (!intersecting && containsRegion) {
      // If not inside, but was last frame
      this._regionsInside.splice(this._regionsInside.indexOf(region), 1);
      this.onRegionExit(region);
      region.onRegionExit(this);
    }
  }

  onRegionEnter(region) {}
  onRegionExit(region) {}
}

export class RigidBody extends Region {
  constructor(position, size, name) {
    super(position, size, name);
  }

  onCollision(collision) {}
}

export class StaticBody extends RigidBody {
  _bounce = 0;
  _friction = 0.8;

  constructor(position, size, bounce, friction, name) {
    super(position, size, name);
    this._bounce = bounce;
    this._friction = friction;
  }

  get bounce() {
    return this._bounce;
  }

  set bounce(newBounce) {
    this._bounce = newBounce;
  }

  get friction() {
    return this._friction;
  }

  set friction(newFriction) {
    this._friction = newFriction;
  }
}

export class KinematicBody extends RigidBody {
  _lastSlideCollisions = [];

  constructor(position, size, name) {
    super(position, size, name);
  }

  /**
   * Moves this sprite by the movement vector and stops if it encounters a collider.
   * @deprecated
   * @param {Vector2} movement The vector to move by.
   * @param {Number} dt Delta time
   * @returns The information about the collision, or null if there was none.
   */
  moveAndCollide(movement, physics, dt) {
    return physics.checkCollisions(this, movement, dt);
  }

  /**
   * Moves this sprite by the movement vector and slides along the surface it encounters.
   * @param {Vector2} movement How much to move by
   * @param {Number} dt Delta time between frames
   * @param {Number} slidesLeft Maximum number of collisions
   */
  moveAndSlide(movement, physics, dt, slidesLeft = 4) {
    this._lastSlideCollisions = [];

    let excludeList = [];
    let collision = physics.checkCollisions(this, movement, excludeList, dt);
    while (!collision.normal.equals(Vector2.zero()) && slidesLeft > 0) {
      log("collision!!!!!!!!!!!!!!");
      log("collisionTime: " + collision.time);
      log("Position: " + JSON.stringify(collision.position));
      log("normal: " + JSON.stringify(collision.normal));
      this.teleportGlobal(collision.position);

      log("beforeCollision: " + JSON.stringify(movement));
      const dotprod =
        movement.x * collision.normal.y + movement.y * collision.normal.x;
      movement.x = dotprod * collision.normal.y;
      movement.y = dotprod * collision.normal.x;
      log("AfterCollision: " + JSON.stringify(movement));
      log("afterPosition: " + JSON.stringify(this._position));
      log("AfterCollide: " + JSON.stringify(movement));

      if (!collision.normal.equals(Vector2.zero())) {
        log("Add Collision");
        this._lastSlideCollisions.push(collision);
        excludeList.push(collision.collider);
        slidesLeft--;
      } else {
        return;
      }

      collision = physics.checkCollisions(this, movement, excludeList, dt);
    }

    log("FinalMovement: " + JSON.stringify(movement));
    this._position = this._position.add(movement.multiply(dt));
    log("Final position: " + JSON.stringify(this._position));
    log("result: " + JSON.stringify(this._position));
    log("slidesLeft: " + slidesLeft);
  }

  isOnGround(upDirection) {
    log("Looking in last slides: " + this._lastSlideCollisions.length);
    for (let i = 0; i < this._lastSlideCollisions.length; i++) {
      if (this._lastSlideCollisions[i].normal.equals(upDirection)) return true;
    }

    return false;
  }

  getGroundPlatform(upDirection) {
    log("getting ground platform in length ", this._lastSlideCollisions.length);

    for (let i = 0; i < this._lastSlideCollisions.length; i++) {
      if (this._lastSlideCollisions[i].normal.equals(upDirection))
        return this._lastSlideCollisions[i].collider;
    }

    return null;
  }
}
