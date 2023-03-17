class GameObjectTree {
  #gameObjects = [];
  #gameObjectRemoveQueue = [];
  #physicsEngine;
  #activeCamera = null;

  constructor(physicsEngine) {
    this.#physicsEngine = physicsEngine;
  }

  addGameObject(gameObject) {
    this.#gameObjects.push(gameObject);
    this.#physicsEngine.addSprite(gameObject);
    gameObject.gameObjectTree = this;
  }
  
  addGameObjects(gameObjects) {
    gameObjects.forEach(obj => this.addGameObject(obj));
  }

  queueRemoveGameObject(gameObject) {
    this.#gameObjectRemoveQueue.push(gameObject);
  }

  update(dt) {
    for (let i = 0; i < this.#gameObjects.length; i++) {
      this.#updateObject(this.#gameObjects[i], dt);
    }

    if (this.#physicsEngine) {
      for (let i = 0; i < this.#gameObjects.length; i++) {
        this.#physicsUpdateObject(this.#gameObjects[i], dt);
      }

      this.#physicsEngine.interactRegions();
    }

    this.#gameObjectRemoveQueue.forEach(obj => this.#gameObjects.splice(this.#gameObjects.indexOf(obj), 1));
    if (this.#gameObjectRemoveQueue.length > 0) this.#gameObjectRemoveQueue = [];
  }

  #updateObject(obj, dt) {
    obj.update(dt);

    for (let i = 0; i < obj.children.length; i++) {
      this.#updateObject(obj.children[i], dt);
    }
  }

  #physicsUpdateObject(obj, dt) {
    obj.physicsUpdate(this.#physicsEngine, dt);

    for (let i = 0; i < obj.children.length; i++) {
      this.#physicsUpdateObject(obj.children[i], dt);
    }
  }

  draw(renderer) {
    if (this.#activeCamera) renderer.translateTo(this.#activeCamera.calculateScroll());
    
    for (let i = 0; i < this.#gameObjects.length; i++) {
      this.#drawObject(this.#gameObjects[i], renderer);
    }
  }

  #drawObject(object, renderer) {
    const vp = renderer.viewport;
    let originTransform;
    if (object instanceof CanvasLayer) {
      originTransform = vp.getTransform();
      vp.setTransform(...object.transform.asRaw());
    } else {
      if (!object.visible) return;

      object.draw(renderer);
    }

    for (let i = 0; i < object.children.length; i++) {
      this.#drawObject(object.children[i], renderer);
    }

    if (object instanceof CanvasLayer) vp.setTransform(originTransform);
  }
}