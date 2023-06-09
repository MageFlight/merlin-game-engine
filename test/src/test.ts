import { TextureRect, ColorRect } from "../../src/gameObjects/cameraObjects";
import { GameObjectTree } from "../../src/gameObjects/gameObjectTree";
import { AABB, StaticBody, KinematicBody, RigidBody, Region } from "../../src/gameObjects/physicsObjects";
import { GameState } from "../../src/gameState";
import { log, keyboardHandler } from "../../src/index";
import { Vector2 } from "../../src/math/vector2";
import { PhysicsEngine } from "../../src/physicsEngine/physics";
import { ResourceLoader } from "../../src/resources/resource";
import { ImageTexture, TiledTexture } from "../../src/resources/textures";
import { Utils } from "../../src/utils";
import RightNormalV3 from "./rightNormalV3.svg";

export class TestGame extends GameState {
  private objectTree: GameObjectTree;
  
  constructor() {
    super();
    this.objectTree = new GameObjectTree(new PhysicsEngine());
  }

  async load() {
    const tex = await ImageTexture.createFromImage(await ResourceLoader.getImage(RightNormalV3), RightNormalV3);
    const ground = await TiledTexture.createFromPaths([RightNormalV3], new Vector2(1280, 128), new Vector2(64, 64), -1, true, true);

    console.log("ground: ", ground);

    this.objectTree.addGameObjects([
      new Player()
        .addChild(new AABB(Vector2.zero(), new Vector2(128, 128), true, "playerCollider"))
        .addChild(new TextureRect(Vector2.zero(), new Vector2(128, 128), tex, "playerTexture")),
      
      new TogglePlatform(new Vector2(0, Utils.GAME_HEIGHT - 512), new Vector2(64, 384), 0b1, 0b1, 0.8, "toggle1")
        .addChild(new AABB(Vector2.zero(), new Vector2(64, 384), true, "toggle1Collider"))
        .addChild(new ColorRect(Vector2.zero(), new Vector2(64, 384), "#f5a442", "toggle1Texture")),

      new SquarePlayer(new Vector2(128, Utils.GAME_HEIGHT - 256), "squarePlayer")
        .addChild(new AABB(Vector2.zero(), new Vector2(128, 128), true, "squareCollider"))
        .addChild(new ColorRect(Vector2.zero(), new Vector2(128, 128), "#00ffff", "squareTexture")),

      new StaticBody(new Vector2(640, 600), new Vector2(192, 320), 0b1, 0b1, 0.8, "wall")
        .addChild(new AABB(Vector2.zero(), new Vector2(192, 320), true, "wallCollider"))
        .addChild(new ColorRect(Vector2.zero(), new Vector2(192, 320), "#ff0000", "wallTex")),

      new StaticBody(new Vector2(0, Utils.GAME_HEIGHT - 128), new Vector2(1280, 128), 0b1, 0b1, 0.8, "ground")
        .addChild(new AABB(Vector2.zero(), new Vector2(1280, 128), true, "groundCollider"))
        .addChild(new TextureRect(Vector2.zero(), new Vector2(1280, 128), ground, "groundTexture")),
      
      new StaticBody(new Vector2(0, 0), new Vector2(512, 128), 0b1, 0b1, 0.8, "ceiling")
        .addChild(new AABB(Vector2.zero(), new Vector2(1280, 128), true, "ceilingCollider"))
        .addChild(new ColorRect(Vector2.zero(), new Vector2(1280, 128), "#00ff00", "ceilingTexture")),

      new TestingRegion(new Vector2(512, Utils.GAME_HEIGHT - 256), new Vector2(128, 128), "region1")
        .addChild(new AABB(Vector2.zero(), new Vector2(128, 128), true, "region1Collider"))
        .addChild(new ColorRect(Vector2.zero(), new Vector2(128, 128), "purple", "region1Texture")),
    ]);
  }

  override update(dt: number) {
    this.objectTree.update(dt);
  }

  override draw() {
    this.objectTree.draw();
  }
}

class TestingRegion extends Region {
  constructor(position: Vector2, size: Vector2, name: string) {
    super(position, size, 0b1, 0b1, name);
  }

  override update(dt: number): void {
    let regionsInsideNames: string[] = [];
    this.regionsInside.forEach((region: Region) => regionsInsideNames.push(region.getName()));
    log("RegionsInside: ", regionsInsideNames);
  }
}

class TogglePlatform extends StaticBody {
  constructor(position: Vector2, size: Vector2, collisionLayer: number, collisionMask: number, friction: number, name: string) {
    super(position, size, collisionLayer, collisionMask, friction, name);

    Utils.listen("togglePlatform", (data: {name: string, enabled: -1 | 0 | 1}) => {
      if (data.name == this.name) {
        const collider = this.getChildrenType<AABB>(AABB)[0];
        if (data.enabled == 0) {
          collider.setVisible(!collider.isVisible());
        } else if (data.enabled == -1) {
          collider.setVisible(false);
        } else if (data.enabled == 1) {
          collider.setVisible(true);
        }
      }
    });
  }
}

class SquarePlayer extends KinematicBody {
  private spawnpoint: Vector2;
  private speed: number = 0.5;

  constructor(spawnpoint: Vector2, name: string) {
    super(spawnpoint, new Vector2(128, 128), 0b1, 0b1, Vector2.zero(), false, 0.8, name);
    this.spawnpoint = spawnpoint.clone();
  }

  override update(dt: number): void {
    log("Update squarePlayer");
    log("Square Velocity: ", this.velocity);
    if (keyboardHandler.isKeyDown("ArrowRight") && this.velocity.equals(Vector2.zero())) {
      this.velocity.x = this.speed;
    } else if (keyboardHandler.isKeyDown("ArrowLeft") && this.velocity.equals(Vector2.zero())) {
      this.velocity.x = -this.speed;
    } else if (keyboardHandler.isKeyDown("ArrowUp") && this.velocity.equals(Vector2.zero())) {
      this.velocity.y = -this.speed;
    } else if (keyboardHandler.isKeyDown("ArrowDown") && this.velocity.equals(Vector2.zero())) {
      this.velocity.y = this.speed;
    }

    if (this.position.x < 0 || this.position.x > Utils.GAME_WIDTH || this.position.y < 0 || this.position.y > Utils.GAME_HEIGHT) {
      this.die();
    }
  }

  override physicsUpdate(physics: PhysicsEngine, dt: number): void {
    // log("");
    // log("movingSquarePlayer");
    // this.moveAndSlide(physics, dt);
  }

  die() {
    this.position = this.spawnpoint.clone();
    this.velocity = Vector2.zero();
  }
}

class MovementParameters { // TODO: Make this an interface or type (Probally interface)
  maxSpeed;

  maxAcceleration;
  maxAirAcceleration;
  deccelerationRate;
  airDeccelerationRate;
  airFriction;
  turnRate;

  jumpHeight;
  maxAirJumps;
  temporaryAirJumps = 0;
  jumpBuffer;
  coyoteTime;

  upwardGravity;
  downwardGravity;

  /**
   * The base set of movement contstraints for a movement controller.
   * @param {Number} maxSpeed The maximum speed of the object
   * @param {Number} maxAcceleration The maximum rate at which the object will speed up while grounded
   * @param {Number} maxAirAcceleration The maximum rate at which the object will speed up while airborne
   * @param {Number} deccelerationRate The maximum rate at which the object will slow down while grounded
   * @param {Number} airDeccelerationRate The maximum rate at which the object will slow down while airborne
   * @param {Number} airFriction The friction of the air: While airborne, the acceleration is divided by this value 
   * @param {Number} turnRate Multiplies the acceleration by this value when the targeted horizontal velocity is not the same sign as the actual velocity.
   * @param {Number} jumpHeight The height of the object's jump
   * @param {Number} maxAirJumps The maximum amount of jumps in the air
   * @param {Number} jumpBuffer The amount of time a jump is held down
   * @param {Number} coyoteTime The amount of time after walking off of a platform when a jump is allowed
   * @param {Number} upwardGravity The multiplier on gravity on the object when its velocity is upwards.
   * @param {Number} downwardGravity The multiplier on gravity on the object when its velocity is 0 or downwards.
   */
  constructor(
    maxSpeed: number,
    maxAcceleration: number,
    maxAirAcceleration: number,
    deccelerationRate: number,
    airDeccelerationRate: number,
    airFriction: number,
    turnRate: number,
    jumpHeight: number,
    maxAirJumps: number,
    jumpBuffer: number,
    coyoteTime: number,
    upwardGravity: number,
    downwardGravity: number
  ) {
    this.maxSpeed = maxSpeed;
    
    this.maxAcceleration = maxAcceleration;
    this.maxAirAcceleration = maxAirAcceleration;
    this.deccelerationRate = deccelerationRate;
    this.airDeccelerationRate = airDeccelerationRate;
    this.airFriction = airFriction;
    this.turnRate = turnRate;

    this.jumpHeight = jumpHeight;
    this.maxAirJumps = maxAirJumps;

    this.jumpBuffer = jumpBuffer;
    this.coyoteTime = coyoteTime;
    
    this.upwardGravity = upwardGravity;
    this.downwardGravity = downwardGravity;
  }

  clone() {
    return new MovementParameters(
      this.maxSpeed,
      this.maxAcceleration,
      this.maxAirAcceleration,
      this.deccelerationRate,
      this.airDeccelerationRate,
      this.airFriction,
      this.turnRate,
      this.jumpHeight,
      this.maxAirJumps,
      this.upwardGravity,
      this.jumpBuffer,
      this.upwardGravity,
      this.downwardGravity
    );
  }
}

class MovementController {
  private movementParameters: MovementParameters;

  private velocity = Vector2.zero();
  private gravityMultiplier = 1;

  private jumpsUsed = 0;

  private jumped = false;
  private coyoteJumpAllowed: boolean = false;
  private coyoteJumpLocked: boolean = false;

  private attemptingJump = false;

  /**
   * A movement controller computes what an object's velocity should be based on the player input and the movement parameters.
   * @param {MovementParameters} movementParameters The initial movement parameters that constrain the object's movement
   */
  constructor(movementParameters: MovementParameters) {
    this.movementParameters = movementParameters;
  }

  getMovementParameters(): MovementParameters {
    return this.movementParameters;
  }

  setMovementParameters(newParameters: MovementParameters) {
    this.movementParameters = newParameters;
  }

  /**
   * Calculates the new velocity for the object, using the constraints and current velocity.
   * @param {Number} desiredHorizontalDirection The direction to accelerate towards. -1 is left, 1 is right, and 0 is stop
   * @param {boolean} jumpDesired Determines whether a jump should be attempted.
   * @param {RigidBody | null} groundPlatform The RigidBody that the object is standing on. If airborne, this is null.
   * @param {Number} downDirection The direction of the ground. -1 is up relative to the screen, and 1 is down relative to the screen
   * @param {Number} dt The elapsed time since the start of the previous frame
   * @param {PhysicsEngine} physics The physics engine used in physics calculations
   * @returns The desired velocity after taking into account the current velocity and constraits.
   */
  computeVelocity(updatedVelocity: Vector2, desiredHorizontalDirection: number, jumpDesired: boolean, groundPlatform: RigidBody | null, downDirection: number, physics: PhysicsEngine, dt: number) {
    this.velocity = updatedVelocity;
    log("playerVelocity: ", this.velocity);
    const onGround = groundPlatform != null;
    log("onGround: ", onGround);
    this.jumped = this.jumped && !onGround;
    log("jumped: ", this.jumped);

    // Coyote time
    this.coyoteJumpLocked = !onGround && this.coyoteJumpLocked;
    log("coyoteJumpAllowed: ", this.coyoteJumpAllowed);
    log("coyoteJumpLocked: ", this.coyoteJumpLocked);
    if (!this.jumped && !onGround && !this.coyoteJumpAllowed && !this.coyoteJumpLocked) {
      this.coyoteJumpAllowed = true;
      Utils.timer(() => {
        log("resetCoyote");
        this.coyoteJumpAllowed = false;
        this.coyoteJumpLocked = true;
      }, this.movementParameters.coyoteTime, false);
    }
    log("playerVelocity: ", this.velocity);

    // Horizontal Movement
    let acceleration = 0;
    if (desiredHorizontalDirection == 0) { // Deceleration
      acceleration = onGround ? this.movementParameters.deccelerationRate : this.movementParameters.airDeccelerationRate;
    } else {
      acceleration = onGround ? this.movementParameters.maxAcceleration : this.movementParameters.maxAirAcceleration;

      if (desiredHorizontalDirection != Math.sign(this.velocity.x)) { // Turning
        acceleration *= this.movementParameters.turnRate;
      }
    }

    log("playerVelocity: ", this.velocity);

    acceleration /= onGround ? groundPlatform.getFriction() : this.movementParameters.airFriction;
    this.velocity.x = Utils.moveTowards(this.velocity.x, desiredHorizontalDirection * this.movementParameters.maxSpeed, acceleration * dt);

    //// Vertical Movement ////
    // Jumping
    log("playerVelocity: ", this.velocity);
    if (onGround) this.jumpsUsed = 0;

    if (!this.attemptingJump && jumpDesired) {
      this.attemptingJump = true;
      Utils.timer(() => this.attemptingJump = false, this.movementParameters.jumpBuffer, false);
    }

    log("jumping: ", this.jumped);
    log("jumpDesired: " + jumpDesired);
    log("atteptingJump: " + this.attemptingJump);
    if (((onGround || this.coyoteJumpAllowed) || this.jumpsUsed < this.movementParameters.maxAirJumps || ((this.jumpsUsed >= this.movementParameters.maxAirJumps) && this.movementParameters.temporaryAirJumps)) && this.attemptingJump) {
      this.jumped = true;
      this.attemptingJump = false;

      if ((this.jumpsUsed >= this.movementParameters.maxAirJumps) && this.movementParameters.temporaryAirJumps > 0 && !(onGround || this.coyoteJumpAllowed)) {
        this.movementParameters.temporaryAirJumps--;
      } else if (!(onGround || this.coyoteJumpAllowed)) {
        this.jumpsUsed++;
      }

      let jumpSpeed = -Math.sqrt(-4 * this.movementParameters.jumpHeight * -(physics.getGravity() * this.movementParameters.upwardGravity)) * downDirection; // Gravity is inverted because y-axis is inverted (relative to math direction) in Andromeda Game Engine.

      log("jumpSpeed: ", jumpSpeed);
      // Making jump height constant in air jump environments
      if (this.velocity.y < 0) {
        jumpSpeed = jumpSpeed - this.velocity.y;
      } else if (this.velocity.y > 0) {
        jumpSpeed -= this.velocity.y;
      }

      this.velocity.y += jumpSpeed;
    }
    log("playerVelocity: ", this.velocity);


    // Special Gravity

    if (this.velocity.y * downDirection < 0) {
      this.gravityMultiplier = this.movementParameters.upwardGravity * downDirection;
    } else if (this.velocity.y * downDirection > 0) {
      this.gravityMultiplier = this.movementParameters.downwardGravity * downDirection;
    } else {
      this.gravityMultiplier = downDirection;
    }

    log("playerVelocity: ", this.velocity);
    log("gravity * gravityMultiplier * dt: ", physics.getGravity() * this.gravityMultiplier * dt);

    // Apply Gravity
    this.velocity.y += physics.getGravity() * this.gravityMultiplier * dt;
    log("playerVelocity: ", this.velocity);

    return this.velocity;
  }
  
  reset() {
    this.velocity = Vector2.zero();
    this.gravityMultiplier = 1;
  }
}

class Player extends KinematicBody {
  private spawn: Vector2 = new Vector2(128, 128);
  private movementController: MovementController = new MovementController(new MovementParameters(
    1, 0.009, 0.003, 0.007, 0.001, 0.9, 1.6,
    200, 1,
    83, 50,
    0.8, 1.2
    // 0, 0
  ));
  private horizontalDirection: number = 0;

  constructor() {
    super(new Vector2(128, Utils.GAME_HEIGHT - 384), new Vector2(128, 128), 0b1, 0b1, Vector2.zero(), true, 0.8, "player");
  }

  override update(dt: number) {
    log("playerRegionsInside: ", this.regionsInside.map((region: Region) => region.getName()));
    const pressLeft: boolean = keyboardHandler.isKeyDown("KeyA");
    const pressRight: boolean = keyboardHandler.isKeyDown("KeyD");
    if (pressLeft == pressRight) {
      this.horizontalDirection = 0;
    } else if (pressLeft) {
      this.horizontalDirection = -1;
    } else {
      this.horizontalDirection = 1;
    }

    if (keyboardHandler.keyJustPressed("KeyE")) Utils.broadcast("togglePlatform", {name: "toggle1", enabled: 0});

    if (this.position.y > 1088) {
      this.velocity = Vector2.zero();
      this.position = this.spawn.clone();
      this.movementController.reset();
    }
  }

  override physicsUpdate(physics: PhysicsEngine, dt: number) {
    const groundPlatform = this.getGroundPlatform(Vector2.up());

    log("PlayerVel preUpdate: ", this.velocity);
    this.velocity = this.movementController.computeVelocity(this.velocity, this.horizontalDirection, keyboardHandler.isKeyDown("Space"), groundPlatform, 1, physics, dt);
    // log("");
    // log("moving player with velocity ", this.velocity);
    // this.moveAndSlide(physics, dt);
  }
}