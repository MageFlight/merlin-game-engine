import { AABB, CollisionObject, KinematicBody, Region, RigidBody, StaticBody } from "../gameObjects/physicsObjects";
import { Vector2 } from "../math/vector2";
import { internalLog, log } from "../index";

export interface CollisionData {
  time: number,
  normal: Vector2,
  position: Vector2,
  colliderA: RigidBody,
  colliderB?: RigidBody,
}

class CollisionResolutionData {
  collision: CollisionData | null;

  colliderA: KinematicBody;
  colliderAFinalPosition: Vector2;
  colliderAFinalVelocity: Vector2;

  colliderB?: KinematicBody | StaticBody;
  colliderBFinalPosition?: Vector2;
  colliderBFinalVelocity?: Vector2

  constructor(collision: CollisionData | null, colliderA: KinematicBody, colliderAFinalPosition: Vector2, colldierAFinalVelocity: Vector2, colliderB?: KinematicBody | StaticBody, colliderBFinalPosition?: Vector2, colliderBFinalVelocity?: Vector2) {
    this.collision = collision;
    
    this.colliderA = colliderA;
    this.colliderAFinalPosition = colliderAFinalPosition;
    this.colliderAFinalVelocity = colldierAFinalVelocity;

    this.colliderB = colliderB;
    this.colliderBFinalPosition = colliderBFinalPosition;
    this.colliderBFinalVelocity = colliderBFinalVelocity;
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
    internalLog("In physics update()");

    let specialUnpushables: Map<KinematicBody, Vector2> = new Map();

    let bodyResolutions: Map<RigidBody, CollisionResolutionData[]> = new Map();

    const pushableKinematicBodies = this.rigidBodies.filter(body => body instanceof KinematicBody && body.isPushable());
    const unpushableKinematicBodies = this.rigidBodies.filter(body => body instanceof KinematicBody && !body.isPushable());

    internalLog("Pushables: ");
    pushableKinematicBodies.forEach(body => internalLog(body.getName()));
    internalLog("unPushables: ");
    unpushableKinematicBodies.forEach(body => internalLog(body.getName()));

    for (const colliderA of pushableKinematicBodies.concat(unpushableKinematicBodies)) {
      internalLog("");
      internalLog("ColliderA: ", colliderA.getName());
      colliderA.resetFrameColisions();

      if (!(colliderA instanceof KinematicBody)) continue;

      internalLog("Checking collision for ", colliderA.getName());

      let passCollisions: CollisionResolutionData[] = [];

      let startPositions: Map<KinematicBody, Vector2> = new Map();
      let startVelocities: Map<KinematicBody, Vector2> = new Map();
      const startPosition: Vector2 = colliderA.getPosition();
      const startVelocity: Vector2 = colliderA.getVelocity();

      let collision: CollisionData | null = this.checkCollisions(colliderA, colliderA.getVelocity(), null, bodyResolutions, specialUnpushables, dt);

      if (collision === null) {
        internalLog("Null Collision");
        internalLog("DeltaTime: ", dt);
        internalLog("Velocity: ", colliderA.getVelocity());
        internalLog("StartPosition: ", colliderA.getGlobalPos());
        if (bodyResolutions.has(colliderA) && bodyResolutions.get(colliderA)?.length !== 0) {
          internalLog("AlreadyCollided");
          internalLog("CollisionsLength: ", bodyResolutions.get(colliderA)?.length);
          continue;
        } 
        if (!bodyResolutions.has(colliderA)) bodyResolutions.set(colliderA, []);
        bodyResolutions.get(colliderA)?.push(new CollisionResolutionData(
          null,
          colliderA,
          colliderA.getGlobalPos().add(colliderA.getVelocity().multiply(dt)),
          colliderA.getVelocity())
        );
      }

      internalLog("StartPosition: ", startPosition, " startVelocity: ", startVelocity);
      for (let slidesLeft = 6; slidesLeft > 0; slidesLeft--) {
        internalLog("");
        internalLog("SlidesLeft: ", slidesLeft);
        if (collision == null || collision.colliderB === undefined) {
          internalLog("Null collision");
          break;
        }

        
        if (collision.colliderA instanceof KinematicBody && ((collision.colliderB instanceof KinematicBody && collision.colliderB.isPushable()) || collision.colliderB instanceof StaticBody)) {
          const currentUnpushableState = specialUnpushables.get(collision.colliderA);
          internalLog("currentUnpushableState for ", collision.colliderA.getName(), ": ", currentUnpushableState);
          if (currentUnpushableState === undefined) {
            specialUnpushables.set(collision.colliderA, collision.normal);
          } else {
            specialUnpushables.set(collision.colliderA, currentUnpushableState.add(collision.normal));
          }
          internalLog("finalUnpushableState for ", collision.colliderA.getName(), ": ", specialUnpushables.get(collision.colliderA));
        }
        
        // Set the start positions
        if (collision.colliderA instanceof KinematicBody && !startPositions.has(collision.colliderA)) {
          startPositions.set(collision.colliderA, collision.colliderA.getGlobalPos());
        }
        if (collision.colliderB instanceof KinematicBody && !startPositions.has(collision.colliderB)) {
          startPositions.set(collision.colliderB, collision.colliderB.getGlobalPos());
        }
        // Set the start Velocities
        if (collision.colliderA instanceof KinematicBody && !startVelocities.has(collision.colliderA)) {
          startVelocities.set(collision.colliderA, collision.colliderA.getVelocity());
        }
        if (collision.colliderB instanceof KinematicBody && !startVelocities.has(collision.colliderB)) {
          startVelocities.set(collision.colliderB, collision.colliderB.getVelocity());
        }

        internalLog("Collision ocurred");
        internalLog("CollisionTime: ", collision.time, " position: ", collision.position, " normal: ", collision.normal, " collider: ", collision.colliderB.getName());
        const colliderAUnpushable = collision.colliderA instanceof KinematicBody && collision.colliderA.isPushable() ? specialUnpushables.get(collision.colliderA) : Vector2.one();
        const colliderBUnpushable = collision.colliderB instanceof KinematicBody && collision.colliderB.isPushable() ? specialUnpushables.get(collision.colliderB) : Vector2.one();
        
        const finalResolutionData = this.resolveCollision(collision, colliderAUnpushable, colliderBUnpushable, dt);
        internalLog("Final ResolutionData Collider: ", finalResolutionData.colliderA.getName(), " position: ", finalResolutionData.colliderAFinalPosition, " Velocity: ", finalResolutionData.colliderAFinalVelocity);
        internalLog("Final ResolutionData ColliderB: ", finalResolutionData.colliderB?.getName(), " position: ", finalResolutionData.colliderBFinalPosition, " Velocity: ", finalResolutionData.colliderBFinalVelocity);

        passCollisions.push(finalResolutionData);
        collision.colliderA.onCollision(collision);
        collision.colliderA.logCollision(collision);

        collision.colliderB.onCollision(collision);
        collision.colliderB.logCollision(collision);
        
        if (collision.colliderA instanceof KinematicBody) {
          collision.colliderA.setGlobalPos(finalResolutionData.colliderAFinalPosition);
          collision.colliderA.setVelocity(Vector2.zero());
        }

        if (collision.colliderB instanceof KinematicBody && finalResolutionData.colliderBFinalPosition !== undefined && finalResolutionData.colliderBFinalVelocity !== undefined) {
          collision.colliderB.setGlobalPos(finalResolutionData.colliderBFinalPosition);
          collision.colliderB.setVelocity(Vector2.zero());
        }

        internalLog("---===Checking for new Collision===---");
        internalLog("passCollisionsLength: ", passCollisions.length);
        const lastCollision = passCollisions.length > 0 ? passCollisions[passCollisions.length - 1] : null
        collision = this.checkCollisions(colliderA, colliderA.getVelocity(), lastCollision, bodyResolutions, specialUnpushables, dt);
      }

      // Reset velocities
      startPositions.forEach((position: Vector2, body: KinematicBody) => body.setGlobalPos(position));
      startVelocities.forEach((velocity: Vector2, body: KinematicBody) => body.setVelocity(velocity));

      const collidedBodies: Map<RigidBody, RigidBody> = new Map();
      for (let i = passCollisions.length - 1; i >= 0; i--) {
        const collision = passCollisions[i];

        const colliderA = collision.colliderA;
        const colliderB = collision.colliderB;

        const hasCollided = colliderB !== undefined ? collidedBodies.get(colliderA) === colliderB || collidedBodies.get(colliderB) === colliderA : false;
        if (hasCollided) continue;
        
        if (!bodyResolutions.has(colliderA)) {
          bodyResolutions.set(colliderA, []);
        }
        bodyResolutions.get(colliderA)?.push(collision);
        
        if (colliderB === undefined) continue;
        
        if (!bodyResolutions.has(colliderB)) {
          bodyResolutions.set(colliderB, []);
        }
        bodyResolutions.get(colliderB)?.push(collision);

        collidedBodies.set(colliderA, colliderB);
      }
    }

    internalLog("");
    internalLog("collisions:");
    for (const body of bodyResolutions.keys()) {
      if (!bodyResolutions.has(body)) continue;
      let resolutions = bodyResolutions.get(body);
      if (resolutions === undefined) continue;
      internalLog(body.getName());
      let collidedAxes = Vector2.one();
      resolutions.sort((resolutionA: CollisionResolutionData, resolutionB: CollisionResolutionData) => {
        const getColliderType = (collider: RigidBody | undefined) => {
          // if (collider === undefined) return 0;
          if (collider instanceof StaticBody) return 1;
          if (collider instanceof KinematicBody && !collider.isPushable()) return 2;
          if (collider instanceof KinematicBody && collider.isPushable()) return 3;
          return 4;
        }

        const otherColliderA = resolutionA.colliderA !== body ? resolutionA.colliderA : resolutionA.colliderB;
        const otherColliderB = resolutionB.colliderA !== body ? resolutionB.colliderA : resolutionB.colliderB;
   
        const colliderAType = getColliderType(otherColliderA);
        const colliderBType = getColliderType(otherColliderB);
        internalLog("colliderAType: ", colliderAType);
        internalLog("colliderAName: ", otherColliderA?.getName());
        internalLog("colliderBType: ", colliderBType);
        internalLog("colliderBName: ", otherColliderB?.getName());
        if (colliderAType != colliderBType) {
          return colliderAType < colliderBType ? -1 : 1;
        }
  
        const collisionATime = resolutionA.collision !== null ? resolutionA.collision.time : 1;
        const collisionBTime = resolutionB.collision !== null ? resolutionB.collision.time : 1;
        if (collisionATime == collisionBTime) return 0;
        return collisionATime < collisionBTime ? -1 : 1;
      });

      for (const resolution of resolutions) {
        if (!(body instanceof KinematicBody)) continue;
        // Fetch final position and velocity
        const isColliderA = resolution.colliderA === body;
        let finalPosition = isColliderA ? resolution.colliderAFinalPosition : resolution.colliderBFinalPosition;
        let finalVelocity = isColliderA ? resolution.colliderAFinalVelocity : resolution.colliderBFinalVelocity;

        // Data Validation
        if (finalPosition === undefined) throw new Error("Undefined Final Position for collider " + body.getName());
        if (finalVelocity === undefined) throw new Error("Undefined Final Velocity for collider " + body.getName());
        
        // Ignore already collided axes
        const resolutionMask = collidedAxes.abs();
        const existingMask = resolutionMask.subtract(Vector2.one()).abs();
        finalPosition = finalPosition.multiply(resolutionMask).add(body.getGlobalPos().multiply(existingMask));
        finalVelocity = finalVelocity.multiply(resolutionMask).add(body.getVelocity().multiply(existingMask));

        internalLog("Collision colliderA: ", resolution.colliderA.getName(), " colliderB: ", resolution.colliderB?.getName());
        internalLog("Collision Normal: ", resolution.collision?.normal);
        internalLog("ResolutionMask: ", resolutionMask, " existingMask: ", existingMask);
        internalLog("ColliderA: ", body.getName(), " finalPosition: ", finalPosition, " finalVelocity: ", finalVelocity, " collidedAxes: ", collidedAxes);
        // Apply finals
        body.setGlobalPos(finalPosition);
        body.setVelocity(finalVelocity);

        // Update collided axes if there was a collision
        if (resolution.collision !== null) {
          const isColliderA = resolution.colliderA === body ? 1 : -1;
          collidedAxes.x = Math.max(collidedAxes.x - Math.abs(resolution.collision.normal.x * isColliderA), 0);
          collidedAxes.y = Math.max(collidedAxes.y - Math.abs(resolution.collision.normal.y * isColliderA), 0);
        }

        if (collidedAxes.equals(Vector2.zero())) break;
      }
    }

    this.interactRegions();
  }

  private getEdgePosition(colliderAPosition: Vector2, colliderASize: Vector2, colliderBSize: Vector2, normal: Vector2): Vector2 {
    const mask = normal.abs();

    const colliderAHalfSize = colliderASize.multiply(0.5);
    const colliderAMidPosition = colliderAPosition.add(colliderAHalfSize);

    const colliderBHalfSize = colliderBSize.multiply(0.5);

    internalLog("Get edge position.");
    internalLog("ColliderAPosition: ", colliderAPosition, " ColliderASize ", colliderASize, " colliderBSize: ", colliderBSize);
    internalLog("Normal: ", normal);
    internalLog("ColliderAHalfSize: ", colliderAHalfSize, " ColliderAMidPosition: ", colliderAMidPosition);
    internalLog("ColliderBHalfSize: ", colliderBHalfSize);

    const edgePosition = colliderAMidPosition.add(colliderAHalfSize.add(colliderBHalfSize).multiply(normal)).subtract(colliderBHalfSize).multiply(mask);
    internalLog("edgePosition: ", edgePosition);
    return edgePosition; // Return the non-zero value
  }

  private resolvePushableVsPushable(colliderA: KinematicBody, colliderB: KinematicBody, collision: CollisionData, dt: number): CollisionResolutionData {
    const positionMask = collision.normal.swapComponents().abs();
    const colliderACollidingShape = colliderA.getChildrenType<AABB>(AABB)[0];
    const colliderBCollidingShape = colliderB.getChildrenType<AABB>(AABB)[0];
    
    const colliderAFinalPosition = colliderA.getGlobalPos().add(colliderA.getVelocity().multiply(dt)).multiply(positionMask).add(collision.position.multiply(collision.normal.abs()));
    const colliderAFinalVelocity = colliderB.getVelocity().clone();

    // Move by its velocity along the non-colliding axis, snap to the edge position of collider A on the other.
    const colliderBFinalPosition = colliderB.getGlobalPos().add(colliderB.getVelocity().multiply(dt)).multiply(positionMask).add(this.getEdgePosition(colliderAFinalPosition, colliderACollidingShape.getSize(), colliderBCollidingShape.getSize(), collision.normal));
    const colliderBFinalVelocity = colliderA.getVelocity().clone();

    return new CollisionResolutionData(collision, colliderA, colliderAFinalPosition, colliderAFinalVelocity, colliderB, colliderBFinalPosition, colliderBFinalVelocity);
  }

  private resolvePushableVsStatic(colliderA: KinematicBody, colliderB: StaticBody | KinematicBody, collision: CollisionData, dt: number): CollisionResolutionData {
    const colliderACollidingShape = colliderA.getChildrenType<AABB>(AABB)[0];
    const colliderBCollidingShape = colliderB.getChildrenType<AABB>(AABB)[0];

    // Move by its velocity along the non-colliding axis, snap to the edge position of collider B on the other.
    const positionMask = collision.normal.swapComponents().abs();
    const colliderAFinalPosition = colliderA.getGlobalPos().add(colliderA.getVelocity().multiply(dt)).multiply(positionMask).add(this.getEdgePosition(colliderBCollidingShape.getGlobalPos(), colliderBCollidingShape.getSize(), colliderACollidingShape.getSize(), collision.normal));
    const colliderAFinalVelocity = colliderA.getVelocity().multiply(positionMask);

    if (!(colliderB instanceof KinematicBody)) return new CollisionResolutionData(collision, colliderA, colliderAFinalPosition, colliderAFinalVelocity, colliderB);

    return new CollisionResolutionData(collision, colliderA, colliderAFinalPosition, colliderAFinalVelocity, colliderB, colliderBCollidingShape.getGlobalPos(), colliderB.getVelocity());
  }

  private resolvePushableVsUnpushable(colliderA: KinematicBody, colliderB: KinematicBody, collision: CollisionData, dt: number): CollisionResolutionData {
    const positionMask = collision.normal.swapComponents().abs();
    const colliderACollidingShape = colliderA.getChildrenType<AABB>(AABB)[0];
    const colliderBCollidingShape = colliderB.getChildrenType<AABB>(AABB)[0];

    const colliderBFinalPosition = colliderB.getGlobalPos().add(colliderB.getVelocity().multiply(dt));
    const colliderBFinalVelocity = colliderB.getVelocity();

    // Move by its velocity along the non-colliding axis, snap to the edge position of collider B on the other.
    const colliderAFinalPosition = colliderA.getGlobalPos().add(colliderA.getVelocity().multiply(dt)).multiply(positionMask).add(this.getEdgePosition(colliderBFinalPosition, colliderBCollidingShape.getSize(), colliderACollidingShape.getSize(), collision.normal));
    const colliderAFinalVelocity = colliderA.getVelocity().multiply(positionMask).add(colliderBFinalVelocity.multiply(collision.normal.abs()));

    return new CollisionResolutionData(collision, colliderA, colliderAFinalPosition, colliderAFinalVelocity, colliderB, colliderBFinalPosition, colliderBFinalVelocity);
  }

  private resolveUnpushableVsPushable(colliderA: KinematicBody, colliderB: KinematicBody, collision: CollisionData, dt: number): CollisionResolutionData {
    // Resolving pushable v unpushable and unpushable v pushable are the same thing, except colliderA and colliderB are swapped.
    const colliderACollidingShape = colliderA.getChildrenType<AABB>(AABB)[0];
    const colliderBCollidingShape = colliderB.getChildrenType<AABB>(AABB)[0];
    
    const colliderAFinalPosition = colliderA.getGlobalPos().add(colliderA.getVelocity().multiply(dt));
    const colliderAFinalVelocity = colliderA.getVelocity();

    const positionMask = collision.normal.swapComponents().abs();
    // Move by its velocity along the non-colliding axis, snap to the edge position of collider A on the other.
    const colliderBFinalPosition = colliderB.getGlobalPos().add(colliderB.getVelocity().multiply(dt)).multiply(positionMask).add(this.getEdgePosition(colliderAFinalPosition, colliderACollidingShape.getSize(), colliderBCollidingShape.getSize(), collision.normal.multiply(-1)));
    const colliderBFinalVelocity = colliderB.getVelocity().multiply(positionMask).add(colliderA.getVelocity().multiply(collision.normal.abs()));    

    return new CollisionResolutionData(collision, colliderA, colliderAFinalPosition, colliderAFinalVelocity, colliderB, colliderBFinalPosition, colliderBFinalVelocity);
  }

  private resolveUnpushableVsStatic(colliderA: KinematicBody, colliderB: StaticBody, collision: CollisionData, dt: number): CollisionResolutionData {
    const positionMask = collision.normal.swapComponents().abs();
    const colliderACollidingShape = colliderA.getChildrenType<AABB>(AABB)[0];
    const colliderBCollidingShape = colliderB.getChildrenType<AABB>(AABB)[0];
  
    const colliderAFinalPosition = colliderA.getGlobalPos().add(colliderA.getVelocity().multiply(dt)).multiply(positionMask).add(this.getEdgePosition(colliderBCollidingShape.getGlobalPos(), colliderBCollidingShape.getSize(), colliderACollidingShape.getSize(), collision.normal));
    const colliderAFinalVelocity = colliderA.getVelocity().multiply(positionMask);

    if (!(colliderB instanceof KinematicBody)) return new CollisionResolutionData(collision, colliderA, colliderAFinalPosition, colliderAFinalVelocity, colliderB);

    return new CollisionResolutionData(collision, colliderA, colliderAFinalPosition, colliderAFinalVelocity, colliderB, colliderBCollidingShape.getGlobalPos(), colliderB.getVelocity());
  }

  private resolveUnpushableVsUnpushable(colliderA: KinematicBody, colliderB: KinematicBody, collision: CollisionData, dt: number): CollisionResolutionData {
    const positionMask = collision.normal.swapComponents().abs();
    const colliderACollidingShape = colliderA.getChildrenType<AABB>(AABB)[0];
    const colliderBCollidingShape = colliderB.getChildrenType<AABB>(AABB)[0];

    const colliderAFinalPosition = colliderA.getGlobalPos().add(colliderA.getVelocity().multiply(dt)).multiply(positionMask).add(collision.position.multiply(collision.normal.abs()));
    const colliderAFinalVelocity = colliderA.getVelocity().multiply(positionMask);

    const colliderBFinalPosition = colliderB.getGlobalPos().add(colliderB.getVelocity().multiply(dt)).multiply(positionMask).add(this.getEdgePosition(colliderACollidingShape.getGlobalPos(), colliderACollidingShape.getSize(), colliderBCollidingShape.getSize(), collision.normal.multiply(-1)));
    const colliderBFinalVelocity = colliderB.getVelocity().multiply(positionMask);

    return new CollisionResolutionData(collision, colliderA, colliderAFinalPosition, colliderAFinalVelocity, colliderB, colliderBFinalPosition, colliderBFinalVelocity);
  }

  private getCollisionResolution(currentAxis: number, colliderA: KinematicBody, colliderAUnpushableAxes: Vector2 | undefined, colliderB: KinematicBody | StaticBody, colliderBUnpushableAxes: Vector2 | undefined, collision: CollisionData, dt: number): CollisionResolutionData {
    let colliderAUnpushable = currentAxis == 0 ? colliderAUnpushableAxes?.x : colliderAUnpushableAxes?.y;
    let colliderBUnpushable = currentAxis == 0 ? colliderBUnpushableAxes?.x : colliderBUnpushableAxes?.y;

    if (colliderAUnpushable === undefined) {
      colliderAUnpushable = 0;
    }

    if (colliderBUnpushable === undefined) {
      colliderBUnpushable = 0;
    }

    internalLog("Getting collision Resolution for ", colliderA.getName(), " and ", colliderB.getName());
    internalLog("colliderAUnpushable: ", colliderAUnpushable, " ColliderBUnpushable: ", colliderBUnpushable);
    internalLog("Collision Normal: ", collision.normal);

    if (colliderAUnpushable == 0 && colliderB instanceof StaticBody) {
      internalLog("Resolution pushable vs static");
      return this.resolvePushableVsStatic(colliderA, colliderB, collision, dt);
    } else if (colliderAUnpushable != 0 && colliderB instanceof StaticBody) {
      internalLog("Resoution unpushable vs static");
      return this.resolveUnpushableVsStatic(colliderA, colliderB, collision, dt);
    } else if (colliderAUnpushable == 0 && colliderB instanceof KinematicBody && colliderBUnpushable == 0) {
      internalLog("Resolution pushable vs pushable");
      return this.resolvePushableVsPushable(colliderA, colliderB, collision, dt);
    } else if (colliderAUnpushable == 0 && colliderB instanceof KinematicBody && colliderBUnpushable != 0) {
      internalLog("Resolution pushable vs unpushable");
      return this.resolvePushableVsUnpushable(colliderA, colliderB, collision, dt);
    } else if (colliderAUnpushable != 0 && colliderB instanceof KinematicBody && colliderBUnpushable == 0) {
      internalLog("Resolution unpushable vs pushable");
      return this.resolveUnpushableVsPushable(colliderA, colliderB, collision, dt);
    } else if (colliderAUnpushable != 0 && colliderB instanceof KinematicBody && colliderBUnpushable != 0) {
      internalLog("Resolution unpushable vs unpushable");
      return this.resolveUnpushableVsUnpushable(colliderA, colliderB, collision, dt);
    } else {
      throw new Error("Unsupported combination of pushable and unpushable colliders.");
    }
  }

  private resolveCollision(collision: CollisionData, colliderAUnpushableAxes: Vector2 | undefined, colliderBUnpushableAxes: Vector2 | undefined, dt: number): CollisionResolutionData {
    // if (collision === null) {
    //   return new CollisionResolutionData(collision, collision.colliderA, colliderA.getGlobalPos().add(colliderA.getVelocity().multiply(dt)), colliderA.getVelocity());
    // }
    
    const colliderA = collision.colliderA;
    const colliderB = collision.colliderB;
    if (!(colliderB instanceof StaticBody || colliderB instanceof KinematicBody) || !(colliderA instanceof KinematicBody)) {
      throw new Error("Unsupported rigidbody type.");
    }

    const collisionResolutionDataX = this.getCollisionResolution(0, colliderA, colliderAUnpushableAxes, colliderB, colliderBUnpushableAxes, collision, dt);
    const collisionResolutionDataY = this.getCollisionResolution(1, colliderA, colliderAUnpushableAxes, colliderB, colliderBUnpushableAxes, collision, dt);

    const colliderAFinalPosition = new Vector2(collisionResolutionDataX.colliderAFinalPosition.x, collisionResolutionDataY.colliderAFinalPosition.y);
    const colliderAFinalVelocity = new Vector2(collisionResolutionDataX.colliderAFinalVelocity.x, collisionResolutionDataY.colliderAFinalVelocity.y);

    if (collisionResolutionDataY.colliderB instanceof KinematicBody && (collisionResolutionDataY.colliderBFinalPosition === undefined || collisionResolutionDataY.colliderBFinalVelocity === undefined)) {
      throw new Error("Incomplete Resolution Data on the Y Axis");
    }

    if (collisionResolutionDataX.colliderB != collisionResolutionDataY.colliderB) {
      throw new Error("Mismatching colliderB");
    }

    let colliderBFinalPosition = undefined;
    let colliderBFinalVelocity = undefined;
    if (collisionResolutionDataX.colliderB instanceof KinematicBody) {
      if (collisionResolutionDataX.colliderBFinalPosition === undefined || collisionResolutionDataX.colliderBFinalVelocity === undefined) {
        throw new Error("Incomplete Resolution Data on the X Axis");
      }
      if (collisionResolutionDataY.colliderBFinalPosition === undefined || collisionResolutionDataY.colliderBFinalVelocity === undefined) {
        throw new Error("Incomplete Resolution Data on the Y Axis");
      }

      colliderBFinalPosition = new Vector2(collisionResolutionDataX.colliderBFinalPosition.x, collisionResolutionDataY.colliderBFinalPosition.y);
      colliderBFinalVelocity = new Vector2(collisionResolutionDataX.colliderBFinalVelocity.x, collisionResolutionDataY.colliderBFinalVelocity.y);
    }

    const finalResolutionData = new CollisionResolutionData(
      collision,
      colliderA,
      colliderAFinalPosition,
      colliderAFinalVelocity,
      colliderB,
      colliderBFinalPosition,
      colliderBFinalVelocity
    );

    internalLog("rawFinalResolutionData is ", colliderA.getName(), " v. ", colliderB.getName());
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
        if (region === sprite2) continue;
        region.interactWithRegion(sprite2);
        sprite2.interactWithRegion(region);
      }
    }
  }

  private getBroadBox(sprite: RigidBody, velocity: Vector2, dt: number): AABB {
    const collider = sprite.getChildrenType<AABB>(AABB)[0];
    const globalPos = collider.getGlobalPos();
    const size = collider.getSize();

    internalLog("GetBroadBox sprite: ", sprite.getName(), " pos: ", globalPos, " size: ", size, " velocity: ", velocity, " dt: ", dt);

    const broadBoxPosition = new Vector2(
      velocity.x > 0 ? globalPos.x : globalPos.x + velocity.x * dt,
      velocity.y > 0 ? globalPos.y : globalPos.y + velocity.y * dt
    );
    const broadBoxSize = new Vector2(
      velocity.x > 0 ? velocity.x * dt + size.x : size.x - velocity.x * dt,
      velocity.y > 0 ? velocity.y * dt + size.y : size.y - velocity.y * dt
    );

    internalLog("Broadbox Position: ", broadBoxPosition, " BroadboxSize: ", broadBoxSize);

    return new AABB(broadBoxPosition, broadBoxSize, true, `${sprite.getName()}BroadBox`);
  }

  /**
   * Checks for any collisions between physics-recognised sprites and the provided sprite.
   * @param {RigidBody} sprite Sprite to check collision for
   * @param {Vector2} velocity The velocity of the sprite
   * @param {CollisionObject[]} spritesExclude Sprites to ignore during collision checking.
   * @param {Number} dt Delta time
   * @returns The collision information
   */
  checkCollisions(sprite: RigidBody, velocity: Vector2, lastCollision: CollisionResolutionData | null, bodyResolutions: Map<RigidBody, CollisionResolutionData[]>, specialUnpushables: Map<KinematicBody, Vector2>, dt: number): CollisionData | null {
    const spriteGlobalPos = sprite.getChildrenType<AABB>(AABB)[0].getGlobalPos();

    let broadBox = this.getBroadBox(sprite, velocity, dt);
    internalLog("vel: " + JSON.stringify(velocity) + " dt: " + dt);
    internalLog("bBox size: " + JSON.stringify(broadBox.getSize()));
    internalLog("bBox pos: " + JSON.stringify(broadBox.getPosition()));
    internalLog("dBox pos: " + JSON.stringify(sprite.getGlobalPos()));

    const possibleSprites = [];
    for (let i = 0; i < this.rigidBodies.length; i++) {
      const spr = this.rigidBodies[i];
      const previousCollisions = bodyResolutions.get(sprite);
      const alreadyCollided = previousCollisions?.find((value: CollisionResolutionData) => {
        return value.colliderA === spr || value.colliderB === spr;
      });

      const sprCollider = spr.getChildrenType<AABB>(AABB)[0];
      const spriteCollider = sprite.getChildrenType<AABB>(AABB)[0];

      const sprVelocity = spr instanceof KinematicBody ? spr.getVelocity() : Vector2.zero();
      const sprBroadBox = this.getBroadBox(spr, sprVelocity, dt);
      const relativeBroadBox = this.getBroadBox(sprite, velocity.subtract(sprVelocity), dt);
      let wasInLastCollision: boolean;
      if (lastCollision !== null) {
        wasInLastCollision = (lastCollision.colliderA === spr && lastCollision.colliderB === sprite) || (lastCollision.colliderA === sprite && lastCollision.colliderB === spr);
      } else {
        wasInLastCollision = false;
      }

      internalLog("spr: ", spr.getName(), " sprite: ", sprite.getName());
      internalLog("Spr & Sprite: ", spr.getCollisionLayer() & sprite.getCollisionMask(), " Sprite & spr: ", sprite.getCollisionLayer() & spr.getCollisionMask());
      internalLog("relativeBroadBox: ", relativeBroadBox);
      internalLog("broadBoxIntersect: ", PhysicsEngine.staticAABB(relativeBroadBox, sprCollider));
      internalLog("wasInLastCollision: ", wasInLastCollision);
      if (
        spr != sprite &&
        !wasInLastCollision &&
        (previousCollisions === undefined || alreadyCollided === undefined) &&
        (sprCollider.isVisible() && spriteCollider.isVisible()) &&
        (spr.getCollisionLayer() & sprite.getCollisionMask() || sprite.getCollisionLayer() & spr.getCollisionMask()) &&
        PhysicsEngine.staticAABB(relativeBroadBox, sprCollider)
      ) {
        possibleSprites.push(spr);
      }
    }

    internalLog("possibleSpriteLength: ", possibleSprites.length);
    internalLog("rigidBodyCount: ", this.rigidBodies.length);

    if (possibleSprites.length == 0) {
      return null;
    }

    // Get closest collision
    let spriteDistances: Map<RigidBody, number> = new Map();
    let closestSprites: RigidBody[] = [...possibleSprites];
    possibleSprites.forEach((colliderB: RigidBody) => spriteDistances.set(colliderB, PhysicsEngine.getDist(sprite, colliderB, velocity)));

    closestSprites.sort((colliderA: RigidBody, colliderB: RigidBody) => {
      const getColliderType = (collider: RigidBody) => {
        if (collider instanceof StaticBody) return 0;
        if (collider instanceof KinematicBody && !collider.isPushable()) return 1;
        if (collider instanceof KinematicBody && collider.isPushable()) return 2;
        return 3;
      }
 
      const colliderAType = getColliderType(colliderA);
      const colliderBType = getColliderType(colliderB);
      internalLog("colliderAType: ", colliderAType);
      internalLog("colliderBType: ", colliderBType);
      // if (colliderAType != colliderBType) {
      //   return colliderAType < colliderBType ? -1 : 1;
      // }

      const colliderADistance = PhysicsEngine.getDist(sprite, colliderA, velocity);
      const colliderBDistance = PhysicsEngine.getDist(sprite, colliderB, velocity);
      if (colliderADistance == colliderBDistance) return 0;
      return colliderADistance < colliderBDistance ? -1 : 1;
    });

    internalLog("closestSprites: ");
    closestSprites.forEach((body: RigidBody) => internalLog(body.getName()));

    // Calculate Collision if Found
    if (closestSprites.length > 0) {
      let suggestedVelocity = velocity.clone();
      let collisions = [];
      
      // for (let i = 0; i < closestSprites.length; i++) {
        internalLog("currentSprite: ", closestSprites[0].getName());
        const colliderAVelocity = sprite instanceof KinematicBody ? sprite.getVelocity().lengthSquared() : 0;
        const colliderBVelocity = closestSprites[0] instanceof KinematicBody ? closestSprites[0].getVelocity().lengthSquared() : 0;
        const finalColliderA = colliderAVelocity >= colliderBVelocity || !(closestSprites[0] instanceof KinematicBody) ? sprite : closestSprites[0];
        const finalColliderB = colliderAVelocity >= colliderBVelocity || !(closestSprites[0] instanceof KinematicBody) ? closestSprites[0]: sprite;
        const colliderAUnpushable = finalColliderA instanceof KinematicBody && finalColliderA.isPushable() ? specialUnpushables.get(finalColliderA) : Vector2.one();
        const colliderBUnpushable = finalColliderB instanceof KinematicBody && finalColliderB.isPushable() ? specialUnpushables.get(finalColliderB) : Vector2.one();
        internalLog("colliderAVelocity: ", colliderAVelocity);
        internalLog("colliderBVelocity: ", colliderBVelocity);
        internalLog("finalColliderA: ", finalColliderA.getName());
        internalLog("finalColliderB: ", finalColliderB.getName());
        const collision = PhysicsEngine.minkowskiSweptAABB(
          finalColliderA,
          finalColliderB,
          // sprite,
          // closestSprites[0],
          colliderAUnpushable,
          colliderBUnpushable,
          dt
        );

        internalLog("Collision normal: ", collision?.normal);
        internalLog("Collision time: ", collision?.time);
        internalLog("Collision position: ", collision?.position);

        if (collision === null) return null;

        if (!collision.normal.equals(Vector2.zero())) {
          return collision;
        } else {
          return null;
        }
      // }

      // if (collisions.length > 0) {
      //   const finalCollision = collisions[collisions.length - 1];
      //   sprite.onCollision(finalCollision);
      //   finalCollision.colliderB?.onCollision(finalCollision);
      //   return finalCollision;
      // } else {
      //   return null;
      // }
    }

    return null;
  }

  static getDist(dBox: CollisionObject, sBox: CollisionObject, dBoxVel: Vector2): number {
    let dist = Vector2.zero();
    const dBoxPos = dBox.getGlobalPos();
    const sBoxPos = sBox.getGlobalPos();
    internalLog("sBox pos: " + JSON.stringify(sBoxPos));

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

    internalLog("dists preSnap: " + JSON.stringify(dist));
    dist.x = dist.x < 0 ? Infinity : dist.x;
    dist.y = dist.y < 0 ? Infinity : dist.y;
    internalLog("dists: " + JSON.stringify(dist));
    return Math.min(dist.x, dist.y);
  }

  static satAABB(sprite0: RigidBody, sprite1: RigidBody): CollisionData | null {
    internalLog("in satAABB()");
    const sprite0Pos = sprite0.getGlobalPos();
    const sprite1Pos = sprite1.getGlobalPos();

    const b1Collider = sprite0.getChildrenType<AABB>(AABB)[0];
    const b2Collider = sprite1.getChildrenType<AABB>(AABB)[0];

    const b1HalfSize = b1Collider.getSize().multiply(0.5);
    const b2HalfSize = b2Collider.getSize().multiply(0.5);

    internalLog("b1Pos: ", sprite0Pos, " b1HalfSize: ", b1HalfSize);
    internalLog("b2Pos: ", sprite1Pos, " b2HalfSize: ", b2HalfSize);
    const dx = (sprite0Pos.x + b1HalfSize.x) - (sprite1Pos.x + b2HalfSize.x);
    const px = (b2HalfSize.x + b1HalfSize.x) - Math.abs(dx);
    if (px <= 0) return null;

    const dy = (sprite1Pos.y + b2HalfSize.y) - (sprite0Pos.y + b1HalfSize.y);
    const py = (b2HalfSize.y + b1HalfSize.y) - Math.abs(dy);
    if (py <= 0) return null;
  
    internalLog("dx: ", dx, " dy: ", dy);
    internalLog("ExtraCheck  px: " + px + " py: " + py);
    if (px < py) {
      const signX = dx == 0 ? 1 : Math.sign(dx);
      const collision: CollisionData = {
        time: 0,
        normal: new Vector2(signX, 0),
        position: new Vector2(sprite0Pos.x + px * signX, sprite0Pos.y),
        colliderA: sprite0,
        colliderB: sprite1,
      };

      sprite0.onCollision(collision);
      sprite1.onCollision(collision);
      return collision;
    } else {
      const signY = dy == 0 ? 1 : Math.sign(dy);
      internalLog("spriteGlobalPos: ", sprite0Pos.y);
      internalLog("signY: ", signY, " sub: ", (py * signY));
      internalLog("expected position: ", new Vector2(sprite0Pos.x, sprite0Pos.y - py * signY));
      const collision: CollisionData = {
        time: 0,
        normal: new Vector2(0, -signY),
        position: new Vector2(sprite0Pos.x, sprite0Pos.y - py * signY),
        colliderA: sprite0,
        colliderB: sprite1,
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

    internalLog("ScaleX: ", scaleX, " SignX: ", signX);
    internalLog("ScaleY: ", scaleY, " SignY: ", signY);

    internalLog("rayStart: ", rayStart, " rayDelta: ", rayDelta, " padding: ", padding);
    internalLog("c0 name: ", collider.getName());
    internalLog("c0 globalPos: ", collider.getGlobalPos());
    internalLog("b2HalfSize: ", c0HalfSize, " b2MiddlePos: ", c0MiddlePos);

    // if (Math.sign(c0MiddlePos.x - rayStart.x) === Math.sign(rayDelta.x) || Math.sign(c0MiddlePos.y - rayStart.y) === Math.sign(rayDelta.y)) { // If the ray is pointing away from c0, then it can't collide.
    //   return null;
    // }

    const nearTime = new Vector2((c0MiddlePos.x - signX * (c0HalfSize.x + padding.x) - rayStart.x) * scaleX, (c0MiddlePos.y - signY * (c0HalfSize.y + padding.y) - rayStart.y) * scaleY);
    const farTime = new Vector2((c0MiddlePos.x + signX * (c0HalfSize.x + padding.x) - rayStart.x) * scaleX, (c0MiddlePos.y + signY * (c0HalfSize.y + padding.y) - rayStart.y) * scaleY);
    
    internalLog("nearTime: ", nearTime, " farTime: ", farTime);
    internalLog("nearTime.x > farTime.y: ", nearTime.x > farTime.y, " nearTime.y > farTime.x: ", nearTime.y > farTime.x);

    if (nearTime.x > farTime.y || nearTime.y > farTime.x) {
      return null;
    }

    const finalNearTime = Math.max(rayDelta.x == 0 ? -Infinity : nearTime.x, rayDelta.y == 0 ? -Infinity : nearTime.y);
    const finalFarTime = Math.min(rayDelta.x == 0 ? Infinity : farTime.x, rayDelta.y == 0 ? Infinity : farTime.y);

    internalLog("finalNearTime: ", finalNearTime, " finalFarTime: ", finalFarTime);

    if (finalNearTime >= 1 || finalFarTime <= 0) {
      return null;
    }

    let collisionNormal: Vector2;
    const collisionTime = Math.max(Math.min(finalNearTime, 1), 0);

    internalLog("nearTime.x > nearTime.y: ", nearTime.x > nearTime.y);

    if (nearTime.x > nearTime.y) {
      collisionNormal = new Vector2(rayStart.x - c0MiddlePos.x !== 0 ? Math.sign(rayStart.x - c0MiddlePos.x) : 1, 0);
    } else {
      collisionNormal = new Vector2(0, rayStart.y - c0MiddlePos.y !== 0 ? Math.sign(rayStart.y - c0MiddlePos.y) : 1);
    }

    internalLog("collisionNormal1: ", collisionNormal);
    internalLog("collisionTime1: ", collisionTime);
    internalLog("rayDeltaX * collisionTime: ", rayDelta.x * collisionTime);
    internalLog("rayStart.x + rayDelta.x * collisionTime: ", rayStart.x + rayDelta.x * collisionTime);

    return {
      colliderA: collider,
      time: collisionTime,
      normal: collisionNormal,
      position: new Vector2(rayStart.x + rayDelta.x * collisionTime, rayStart.y + rayDelta.y * collisionTime)
    };
  }

  static minkowskiSweptAABB(b1: RigidBody, b2: RigidBody, b1UnpushableAxes: Vector2 | undefined, b2UnpushableAxes: Vector2 | undefined, dt: number): CollisionData | null {
    let sweepTime: number;

    if (b1 instanceof StaticBody && b2 instanceof StaticBody) {
      const collision = PhysicsEngine.satAABB(b1, b2);
      return collision;
    }

    const b1Velocity = b1 instanceof KinematicBody ? b1.getVelocity() : Vector2.zero();
    const b2Velocity = b2 instanceof KinematicBody ? b2.getVelocity() : Vector2.zero();
    
    internalLog("b1Velocity: ", b1Velocity);
    internalLog("b2Velocity: ", b2Velocity);

    const relativeVelocity = b1Velocity.subtract(b2Velocity);
    
    const b1Collider = b1.getChildrenType<AABB>(AABB)[0];
    const b2Collider = b2.getChildrenType<AABB>(AABB)[0];

    internalLog("areInside: ", PhysicsEngine.staticAABB(b1Collider, b2Collider))
    if (relativeVelocity.equals(Vector2.zero()) && PhysicsEngine.staticAABB(b1Collider, b2Collider)) {
      const collision = PhysicsEngine.satAABB(b1, b2);
      return collision;
    }

    const b1HalfSize = b1Collider.getSize().multiply(0.5);
    const b1MidPosition = b1Collider.getGlobalPos().add(b1HalfSize);

    internalLog("b1MidPosition: ", b1MidPosition, " b1HalfSize: ", b1HalfSize, " relativeVelocity: ", relativeVelocity);

    internalLog("b1: ", b1.getName(), " b2: ", b2.getName());
    const collision = PhysicsEngine.rayAABB(b1MidPosition, relativeVelocity, b2, b1HalfSize, dt);
    
    if (collision === null) return collision;
    internalLog("rawCollisionPosition: ", collision.position);
    
    const b2HalfSize = b2Collider.getSize().multiply(0.5);
    const b2Pos = b2Collider.getGlobalPos().add(b2HalfSize);

    internalLog("b2Pos: ", b2Pos, " b2HalfSize: ", b2HalfSize);
    internalLog("b1MidPosition: ", b1MidPosition, " b1HalfSize: ", b1HalfSize, " relativeVelocity: ", relativeVelocity);

    const b1UnpushableVector = b1UnpushableAxes !== undefined ? b1UnpushableAxes.multiply(collision.normal) : Vector2.zero();
    const b2UnpushableVector = b2UnpushableAxes !== undefined ? b2UnpushableAxes.multiply(collision.normal) : Vector2.zero();
    const b1Unpushable = Boolean(b1UnpushableVector.x + b1UnpushableVector.y);
    const b2Unpushable = Boolean(b2UnpushableVector.x + b2UnpushableVector.y);
    if (!(b2 instanceof KinematicBody && b2Unpushable && b1 instanceof KinematicBody && !b1Unpushable)) { // Prevent snapping to other collider's normal 
      const collisionMask = collision.normal.abs();

      const snapCorrection = b2Pos.add(b2HalfSize.add(b1HalfSize).multiply(collision.normal)).multiply(collisionMask);

      internalLog("Correction before mask: ", b2HalfSize.add(b1HalfSize).multiply(collision.normal));
      internalLog("snapCorrection: ", snapCorrection);
      internalLog("snapCorrectionFinal: ", snapCorrection.subtract(b1HalfSize).multiply(collisionMask));

      collision.position = b1MidPosition.add(b1Velocity.multiply(dt)).multiply(collisionMask.swapComponents()).add(snapCorrection).subtract(b1HalfSize);
    } else {
      collision.position = collision.position.subtract(b1HalfSize);
    }

    collision.colliderA = b1;
    collision.colliderB = b2;

    internalLog("b1: ", b1.getName(), " b2: ", b2.getName());
    internalLog("finalPositionInSweptAABB: ", collision.position);
    return collision;
  }

  // RETURN the time and surface normal.
  // Adapted from https://www.gamedev.net/articles/programming/general-and-gameplay-programming/swept-aabb-collision-detection-and-response-r3084/
  /**
   * @depricated Use Minoskwi Swept AABB Test
   */
  static sweptAABB(dynamicBox: RigidBody, staticBox: RigidBody, vel: Vector2, dt: number): CollisionData | null {
    const b1 = dynamicBox.getChildrenType<AABB>(AABB)[0];
    const b2 = staticBox.getChildrenType<AABB>(AABB)[0];

    const b1Pos = b1.getGlobalPos();
    const b2Pos = b2.getGlobalPos();

    let entryDist = Vector2.zero();
    let exitDist = Vector2.zero();
    let entryTime = Vector2.zero();
    let exitTime = Vector2.zero();

    internalLog("b1Pos: " + JSON.stringify(b1Pos));
    internalLog("b1Size: " + JSON.stringify(b1.getSize()));
    internalLog("b2Pos: " + JSON.stringify(b2Pos));
    internalLog("b2Size: " + JSON.stringify(b2.getSize()));
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

    internalLog("entryDist: " + JSON.stringify(entryDist));
    internalLog("exitDist: " + JSON.stringify(exitDist));

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

    internalLog("entry: " + JSON.stringify(entryTime));
    internalLog("exit: " + JSON.stringify(exitTime));

    let finalEntryTime = Math.max(entryTime.x, entryTime.y);
    let finalExitTime = Math.min(exitTime.x, exitTime.y);
    internalLog("finalEntry: " + JSON.stringify(finalEntryTime));
    internalLog("finalExit: " + JSON.stringify(finalExitTime));
    internalLog("vel: " + JSON.stringify(vel));
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
            colliderA: dynamicBox,
            colliderB: staticBox,
          };
        } else {
          return {
            time: finalEntryTime,
            normal: Vector2.left(),
            position: new Vector2(
              b2Pos.x - b1.getSize().x,
              b1Pos.y + vel.y * finalEntryTime
            ),
            colliderA: dynamicBox,
            colliderB: staticBox,
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
            colliderA: dynamicBox,
            colliderB: staticBox,
          };
        } else {
          return {
            time: finalEntryTime,
            normal: Vector2.up(),
            position: new Vector2(
              b1Pos.x + vel.x * finalEntryTime,
              b2Pos.y - b1.getSize().y
            ),
            colliderA: dynamicBox,
            colliderB: staticBox,
          };
        }
      }
    }
  }
}
