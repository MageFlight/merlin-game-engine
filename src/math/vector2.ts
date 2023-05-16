export class Vector2 {
  x;
  y;

  /**
   * Creates a new Vector2 from two numbers
   * @param {number} x Initial x-value of the vector
   * @param {number} y Initial y-value of the vector
   */
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  // /**
  //  * Creates a new Vector2 by multiplying two numbers by the level scale. The y-value is flipped such that the bottom left corner of the screen is (0, 0).
  //  * @param {Number} x The initial x-value of the vector
  //  * @param {Number} y the initial y-value of the vector
  //  * @param {Boolean} readonly Determines whether the vector will be readonly.
  //  * @returns A new Vector2, appropriately scaled
  //  */
  // static levelPositionVector2(x, y, readonly = false) {
  //   log("LevelVec x: " + (x * Utils.getLevelScale()) + " y: " + (Utils.getGameSize().y - (y * Utils.getLevelScale())));
  //   return new Vector2(x * Utils.getLevelScale(), Utils.getGameSize().y - (y * Utils.getLevelScale()), readonly);
  // }

  // /**
  //  * Creates a new read-only Vector 2 by multipling x and y by the level scale.
  //  * @param {Number} x The initial x-value of the vector.
  //  * @param {Number} y The initial y-value of the vector.
  //  * @param {Boolean} readonly Determines whether the vector will be readonly.
  //  * @returns A new read-only Vector2 scaled by the level scale.
  //  */
  // static levelVector2(x, y, readonly = false) {
  //   return new Vector2(x * Utils.getLevelScale(), y * Utils.getLevelScale(), readonly);
  // }

  /**
   * Returns a zero vector: a vector with all components set to 0
   * @returns A new Zero vector2
   */
  static zero() {
    return new Vector2(0, 0);
  }

  /**
   * Creates a new one vector: a vector with all components set to 1
   * @returns A new one vector2
   */
  static one() {
    return new Vector2(1, 1);
  }

  /**
   * Creates a new normalized vector that is pointing upwards.
   * @returns A new Vector with components of 0 and -1.
   */
  static up() {
    return new Vector2(0, -1);
  }

  /**
   * Creates a new normalized vector that is pointing downwards.
   * @returns A new Vector with components of 0 and 1.
   */
  static down() {
    return new Vector2(0, 1);
  }

  /**
   * Creates a new normalized vector that is pointing left.
   * @returns A new Vector with components of -1 and 0.
   */
  static left() {
    return new Vector2(-1, 0);
  }

  /**
   * Creates a new normalized vector that is pointing upwards.
   * @returns A new Vector with components of 1 and 0.
   */
  static right() {
    return new Vector2(1, 0);
  }

  /**
   * Adds this vector to another vector.
   * @param {Vector2} vector Vector to add
   * @returns The resulting vector.
   */
  add(vector: Vector2) {
    return new Vector2(this.x + vector.x, this.y + vector.y);
  }

  // /**
  //  * Adds the resulting vector of the parameters to this vector
  //  * @param {Number} x The value to add to this vector's X value
  //  * @param {Number} y The value to add to this vector's Y value
  //  * @returns The resulting vector.
  //  */
  // add(x, y) {
  //   log("addNum")
  //   return new Vector2(this.x + x, this.y + y, this.#readonly);
  // }

  /**
   * Subtracts another vector from this vector (this - another)
   * @param {Vector2} vector The vector subtracting with
   * @returns The resulting vector.
   */
  subtract(vector: Vector2) {
    return new Vector2(this.x - vector.x, this.y - vector.y);
  }

  /**
   * Multiplies the x-component and the y-component by a scalar.
   * @param {number} n The scalar value to multiply both components by
   * @returns The resulting vector.
   */
  multiply(n: number): Vector2;
  multiply(vec: Vector2): Vector2;

  multiply(n: number | Vector2) {
    if (n instanceof Vector2) {
      return new Vector2(this.x * n.x, this.y * n.y);
    } else {
      return new Vector2(this.x * n, this.y * n);
    }
  }

  /**
   * Divides the x and y components by a divisor.
   * @param {Number} n The number to divide this vector by
   * @returns The resulting vector.
   */
  divide(n: number) {
    return new Vector2(this.x / n, this.y / n);
  }

  abs(): Vector2 {
    return new Vector2(Math.abs(this.x), Math.abs(this.y));
  }

  mod(n: number): Vector2 {
    return new Vector2(this.x % n, this.y % n);
  }

  swapComponents(): Vector2 {
    return new Vector2(this.y, this.x);
  }

  normalize(): Vector2 {
    let length = this.x * this.x + this.y * this.y;
    if (length > 0) {
      length = Math.sqrt(length);
      const inverseLength = 1.0 / length;
      return new Vector2(this.x * inverseLength, this.y * inverseLength);
    } else {
      return new Vector2(1, 0);
    }
  }

  /**
   * Creates a clone of this vector
   * @returns The clone of this vector
   */
  clone() {
    return new Vector2(this.x, this.y);
  }

  /**
   * Checks if this vector is equal to another vector.
   * @param {Vector2} vector2 The vector to be compared to.
   * @returns The result of the comparison.
   */
  equals(vector2: Vector2) {
    return this.x == vector2.x && this.y == vector2.y;
  }
}