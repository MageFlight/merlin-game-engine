class GameObject {
  static genID = 0;

  _name = "";

  _children = [];
  _parent = null;

  _uid = GameObject.genID++;

  gameObjectTree = null;

  constructor(name) {
    this._name = name;
  }

  start() {
  }

  update(dt) {
  }

  physicsUpdate(physics, dt) {
  }

  set gameObjectTree(newTree) {
    this.gameObjectTree = newTree;
    this._children.forEach(child => child.gameObjectTree = newTree);
  }

  addChild(child) {
    log("parent init: " + this._parent);
    child.parent = this;
    child.gameObjectTree = this.gameObjectTree;
    this._children.push(child);
    return this;
  }

  removeChild(child) {
    child.parent = null;
    child.gameObjectTree = null;
    this._children.splice(this._children.indexOf(child), 1);
  }

  getChildType(type) {
    for (let i = 0; i < this._children.length; i++) {
      if (this._children[i] instanceof type) {
        return this._children[i];
      }
    }

    return null;
  }

  getChildName(name) {
    for (let i = 0; i < this._children.length; i++) {
      if (this._children[i].name == name) {
        return this._children[i];
      }
    }

    return null;
  }

  getChildUid(uid) {
    for (let i = 0; i < this._children.length; i++) {
      if (this._children[i].uid == uid) {
        return this._children[i];
      }
    }

    return null;
  }

  getChildrenType(type) {
    let kids = [];

    for (let i = 0; i < this._children.length; i++) {
      if (this._children[i] instanceof type) {
        kids.push(this._children[i]);
      }
    }

    return kids.length == 0 ? null : kids;
  }

  resolvePath(path) {
    const names = path.split("/");

    let currentSpr = this;
    for (let i = 0; i < names.length; i++) {
      if (currentSpr == null) return null;

      currentSpr = currentSpr.getChildName(names[i]);
    }
    return currentSpr;
  }

  get children() {
    return this._children;
  }

  get name() {
    return this._name;
  }

  get uid() {
    return this._uid;
  }

  get parent() {
    return this._parent;
  }
  
  set parent(newParent) {
    this._parent = newParent;
  }
}

class Sprite extends GameObject {  
  _position;
  _size = Vector2.one();
  _visible = true;

  constructor(position, size, name) {
    super(name);
    this._position = position.clone();
    this._size = size;
  }

  draw(renderer) {
  }

  get position() {
    return this._position;
  }

  set position(newPosition) {
    this._position = newPosition;
  }

  /**
   * Translates this sprite along a given vector
   * @param {Vector2} vector Vector to translate by
   */
  translate(vector) {
    if (this._pinned) return;

    const parentPos = this._globalPos.subtract(this._position);
    this._position = this._position.add(vector);
  }

  /**
   * Moves this sprite to a given position
   * @param {Vector2} position The position to teleport to
   */
  teleport(position) {
    if (this._pinned) return;

    const parentPos = this._globalPos.subtract(this._position);
    this._position = position.clone();
  }

  /**
   * Moves this sprite to a given global position
   * @param {Vector2} position Global position to teleport to
   */
  teleportGlobal(position) {
    if (this._pinned) return;

    this._position = this._position.add(position.subtract(this.globalPos));
  }

  get globalPos() {
    if (this._parent && this._parent instanceof Sprite) {
      return this._position.add(this._parent.globalPos);
    }
    return this._position.clone();
  }

  get size() {
    return this._size;
  }

  get visible() {
    return this._visible;
  }

  set visible(newVisible) {
    this._visible = newVisible;
  }
}