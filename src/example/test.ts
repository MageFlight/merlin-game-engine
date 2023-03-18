import { Utils } from "../utils.js";
import { GameState } from "../gameState.js";
import { Vector2 } from "../math/vector2.js";
import { PhysicsEngine } from "../physicsEngine/physics";
import { StaticBody, KinematicBody, AABB } from "../gameObjects/physicsObjects.js";
import { ImageTexture, TiledTexture } from "../resources/textures.js";
import { keyboardHandler, log } from "../main.js";
import { GameObjectTree } from "../gameObjects/gameObjectTree.js";
import { ResourceLoader } from "../resources/resource.js";
import { ColorRect, TextureRect } from "../gameObjects/cameraObjects.js";

export class TestGame extends GameState {
  #objectTree = null;
  
  constructor() {
    super();
    this.#objectTree = new GameObjectTree(new PhysicsEngine());
  }

  async load() {
    const tex = await ImageTexture.createFromImage(await ResourceLoader.getImage('example/rightNormalV3.svg'));
    const ground = await TiledTexture.createFromPaths(['example/rightNormalV3.svg'], new Vector2(1280, 128), new Vector2(64, 64), -1, true, true);

    console.log("ground: ", ground);

    this.#objectTree.addGameObjects([
      new Player()
        .addChild(new AABB(Vector2.zero(), new Vector2(128, 128), true, "playerCollider"))
        .addChild(new TextureRect(Vector2.zero(), new Vector2(128, 128), tex, "playerTexture")),

      new StaticBody(new Vector2(640, 600), new Vector2(192, 320), 0, 0.8, "wall")
        .addChild(new AABB(Vector2.zero(), new Vector2(192, 320), true, "wallCollider"))
        .addChild(new ColorRect(Vector2.zero(), new Vector2(192, 320), "#ff0000", "wallTex")),

      new StaticBody(new Vector2(0, Utils.getGameSize().y - 128), new Vector2(1280, 128), 0, 0.8, "ground")
        .addChild(new AABB(Vector2.zero(), new Vector2(1280, 128), true, "groundCollider"))
        .addChild(new TextureRect(Vector2.zero(), new Vector2(1280, 128), ground, "groundTexture"))
    ]);
  }

  update(dt) {
    this.#objectTree.update(dt);
  }

  draw(renderer) {
    this.#objectTree.draw(renderer);
  }
}

class MovementParameters {
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
    maxSpeed,
    maxAcceleration,
    maxAirAcceleration,
    deccelerationRate,
    airDeccelerationRate,
    airFriction,
    turnRate,
    jumpHeight,
    maxAirJumps,
    jumpBuffer,
    coyoteTime,
    upwardGravity,
    downwardGravity
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
      this.downwardGravity
    );
  }
}

class MovementController {
  #movementParameters;

  #velocity = Vector2.zero();
  #gravityMultiplier = 1;

  #jumpsUsed = 0;

  #jumped = false;
  #coyoteJumpAllowed = false;

  #attemptingJump = false;

  /**
   * A movement controller computes what an object's velocity should be based on the player input and the movement parameters.
   * @param {MovementParameters} movementParameters The initial movement parameters that constrain the object's movement
   */
  constructor(movementParameters) {
    this.#movementParameters = movementParameters;
  }

  get movementParameters() {
    return this.#movementParameters;
  }

  set movementParameters(newParameters) {
    this.#movementParameters = newParameters;
  }

  /**
   * Calculates the new velocity for the object, using the constraints and current velocity.
   * @param {Number} desiredHorizontalDirection The direction to accelerate towards. -1 is left, 1 is right, and 0 is stop
   * @param {boolean} jumpDesired Determines whether a jump should be attempted.
   * @param {RigidBody} groundPlatform The RigidBody that the object is standing on. If airborne, this is null.
   * @param {Number} downDirection The direction of the ground. -1 is up relative to the screen, and 1 is down relative to the screen
   * @param {Number} dt The elapsed time since the start of the previous frame
   * @param {PhysicsEngine} physics The physics engine used in physics calculations
   * @returns The desired velocity after taking into account the current velocity and constraits.
   */
  computeVelocity(desiredHorizontalDirection, jumpDesired, groundPlatform, downDirection, physics, dt) {
    const onGround = groundPlatform != null;
    log("onGround: ", onGround);
    this.#jumped = this.#jumped && !onGround;
    
    // Coyote time
    this.#coyoteJumpAllowed *= !onGround; // If on the ground, coyoteJumpAllowed resets to 0. Otherwise, it keeps state
    if (!this.#jumped && !onGround && this.#coyoteJumpAllowed == 0) {
      this.#coyoteJumpAllowed = 1;
      Utils.timer(() => {
        log("resetCoyote");
        this.#coyoteJumpAllowed = -1;
      }, this.#movementParameters.coyoteTime, false);
    }

    // Horizontal Movement
    let acceleration = 0;
    if (desiredHorizontalDirection == 0) { // Deceleration
      acceleration = this.#movementParameters.deccelerationRate * onGround + this.#movementParameters.airDeccelerationRate * !onGround;
    } else {
      acceleration = this.#movementParameters.maxAcceleration * onGround + this.#movementParameters.maxAirAcceleration * !onGround;

      if (desiredHorizontalDirection != Math.sign(this.#velocity.x)) { // Turning
        acceleration *= this.#movementParameters.turnRate;
      }
    }

    acceleration /= onGround ? groundPlatform.friction : this.#movementParameters.airFriction;
    this.#velocity.x = Utils.moveTowards(this.#velocity.x, desiredHorizontalDirection * this.#movementParameters.maxSpeed, acceleration * dt);

    //// Vertical Movement ////
    // Jumping
    this.#jumpsUsed *= !onGround; // Reset jumps used if on ground

    if (!this.#attemptingJump && jumpDesired) {
      this.#attemptingJump = true;
      Utils.timer(() => this.#attemptingJump = false, this.#movementParameters.jumpBuffer);
    }

    log("jumping: ", this.#jumped);
    log("jumpDesired: " + jumpDesired);
    log("atteptingJump: " + this.#attemptingJump);
    if (((onGround || this.#coyoteJumpAllowed == 1) || this.#jumpsUsed < this.#movementParameters.maxAirJumps || ((this.#jumpsUsed >= this.#movementParameters.maxAirJumps) && this.#movementParameters.temporaryAirJumps)) && this.#attemptingJump) {
      this.#jumped = true;
      this.#attemptingJump = false;

      if ((this.#jumpsUsed >= this.#movementParameters.maxAirJumps) && this.#movementParameters.temporaryAirJumps > 0 && !(onGround || this.#coyoteJumpAllowed == 1)) {
        this.#movementParameters.temporaryAirJumps--;
      } else {
        this.#jumpsUsed += 1 * !(onGround || this.#coyoteJumpAllowed == 1);
      }

      let jumpSpeed = -Math.sqrt(-4 * this.#movementParameters.jumpHeight * -(physics.gravity * this.#movementParameters.upwardGravity)) * downDirection; // Gravity is inverted because y-axis is inverted (relative to math direction) in Andromeda Game Engine.

      log("jumpSpeed: ", jumpSpeed);
      // Making jump height constant in air jump environments
      if (this.#velocity.y < 0) {
        jumpSpeed = jumpSpeed - this.#velocity.y;
      } else if (this.#velocity.y > 0) {
        jumpSpeed -= this.#velocity.y;
      }

      this.#velocity.y += jumpSpeed;
    }

    // Special Gravity

    if (this.#velocity.y * downDirection < 0) {
      this.#gravityMultiplier = this.#movementParameters.upwardGravity * downDirection;
    } else if (this.#velocity.y * downDirection > 0) {
      this.#gravityMultiplier = this.#movementParameters.downwardGravity * downDirection;
    } else {
      this.#gravityMultiplier = downDirection;
    }

    // Apply Gravity
    this.#velocity.y += physics.gravity * this.#gravityMultiplier * dt;

    return this.#velocity;
  }
  
  reset() {
    this.#velocity = Vector2.zero();
    this.#gravityMultiplier = 1;
  }
}

class Player extends KinematicBody {
  #spawn = new Vector2(128, 128);
  #movementController = new MovementController(new MovementParameters(
    1, 0.009, 0.003, 0.007, 0.001, 0.9, 1.6,
    200, 1,
    83, 50,
    0.8, 1.2
    // 0, 0
  ));
  #horizontalDirection = 0;

  constructor() {
    super(new Vector2(128, 128), new Vector2(128, 128), "player");
  }

  update(dt) {
    this.#horizontalDirection = (keyboardHandler.isKeyDown("KeyA") != keyboardHandler.isKeyDown("KeyD")) * (keyboardHandler.isKeyDown("KeyA") * -1 + keyboardHandler.isKeyDown("KeyD")); // If both left or right are active, then 0. If left is active, then 1. If right is active, then -1.
    if (this._position.y > 1088) {
      this._position = this.#spawn.clone();
      this.#movementController.reset();
    }
  }

  physicsUpdate(physics, dt) {
    const groundPlatform = this.getGroundPlatform(Vector2.up());

    const velocity = this.#movementController.computeVelocity(this.#horizontalDirection, keyboardHandler.keyJustPressed("Space"), groundPlatform, 1, physics, dt);
    this.moveAndSlide(velocity, physics, dt);
  }
}