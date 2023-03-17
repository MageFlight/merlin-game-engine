class Vector2 {
  x;
  y;
  #readonly;

  /**
   * Creates a new Vector2 from two numbers
   * @param {Number} x Initial x-value of the vector
   * @param {Number} y Initial y-value of the vector
   * @param {Boolean} readonly Determines whether the vector will be readonly.
   */
  constructor(x, y, readonly = false) {
    this.x = x;
    this.y = y;
    this.#readonly = readonly;
  }

  /**
   * Creates a new Vector2 by multiplying two numbers by the level scale. The y-value is flipped such that the bottom left corner of the screen is (0, 0).
   * @param {Number} x The initial x-value of the vector
   * @param {Number} y the initial y-value of the vector
   * @param {Boolean} readonly Determines whether the vector will be readonly.
   * @returns A new Vector2, appropriately scaled
   */
  static levelPositionVector2(x, y, readonly = false) {
    log("LevelVec x: " + (x * Utils.getLevelScale()) + " y: " + (Utils.getGameSize().y - (y * Utils.getLevelScale())));
    return new Vector2(x * Utils.getLevelScale(), Utils.getGameSize().y - (y * Utils.getLevelScale()), readonly);
  }

  /**
   * Creates a new read-only Vector 2 by multipling x and y by the level scale.
   * @param {Number} x The initial x-value of the vector.
   * @param {Number} y The initial y-value of the vector.
   * @param {Boolean} readonly Determines whether the vector will be readonly.
   * @returns A new read-only Vector2 scaled by the level scale.
   */
  static levelVector2(x, y, readonly = false) {
    return new Vector2(x * Utils.getLevelScale(), y * Utils.getLevelScale(), readonly);
  }

  /**
   * Returns a zero vector: a vector with all components set to 0
   * @param {Boolean} readonly Determines whether the vector will be readonly.
   * @returns A new Zero vector2
   */
  static zero(readonly = false) {
    return new Vector2(0, 0, readonly);
  }

  /**
   * Creates a new one vector: a vector with all components set to 1
   * @param {Boolean} readonly Determines whether the vector will be readonly.
   * @returns A new one vector2
   */
  static one(readonly = false) {
    return new Vector2(1, 1, readonly);
  }

  /**
   * Creates a new normalized vector that is pointing upwards.
   * @param {Boolean} readonly Determines whether the vector will be readonly.
   * @returns A new Vector with components of 0 and -1.
   */
  static up(readonly = false) {
    return new Vector2(0, -1, readonly);
  }

  /**
   * Creates a new normalized vector that is pointing downwards.
   * @param {Boolean} readonly Determines whether the vector will be readonly.
   * @returns A new Vector with components of 0 and 1.
   */
  static down(readonly = false) {
    return new Vector2(0, 1, readonly);
  }

  /**
   * Creates a new normalized vector that is pointing left.
   * @param {Boolean} readonly Determines whether the vector will be readonly.
   * @returns A new Vector with components of -1 and 0.
   */
  static left(readonly = false) {
    return new Vector2(-1, 0, readonly);
  }

  /**
   * Creates a new normalized vector that is pointing upwards.
   * @param {Boolean} readonly Determines whether the vector will be readonly.
   * @returns A new Vector with components of 1 and 0.
   */
  static right(readonly = false) {
    return new Vector2(1, 0, readonly);
  }

  /**
   * Adds this vector to another vector.
   * @param {Vector2} vector Vector to add
   * @returns The resulting vector.
   */
  add(vector) {
    return new Vector2(this.x + vector.x, this.y + vector.y, this.#readonly || vector.readonly);
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
  subtract(vector) {
    return new Vector2(this.x - vector.x, this.y - vector.y, this.#readonly || vector.readonly);
  }

  /**
   * Multiplies the x-component and the y-component by a scalar.
   * @param {Number} n The scalar value to multiply both components by
   * @returns The resulting vector.
   */
  multiply(n) {
    return new Vector2(this.x * n, this.y * n, this.#readonly);
  }

  /**
   * Divides the x and y components by a divisor.
   * @param {Number} n The number to divide this vector by
   * @returns The resulting vector.
   */
  divide(n) {
    return new Vector2(this.x / n, this.y / n), this.#readonly;
  }

  /**
   * Creates a clone of this vector
   * @returns The clone of this vector
   */
  clone() {
    return new Vector2(this.x, this.y, this.#readonly);
  }

  /**
   * Checks if this vector is equal to another vector.
   * @param {Number} vector2 The vector to be compared to.
   * @returns The result of the comparison.
   */
  equals(vector2) {
    return this.x == vector2.x && this.y == vector2.y;
  }

  get readonly() {
    return this.#readonly;
  }
}