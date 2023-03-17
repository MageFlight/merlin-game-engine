class Texture extends Resource {
  size;

  constructor(path, data) {
    super(path);

    this.data = data;
    this.size = new Vector2(data.width, data.height);
  }

  draw(renderer, position, size = null) {
    renderer.drawImage(position, size == null ? this.size : size, this.data);
  }
}

class ImageTexture extends Texture {
  constructor(data, size = null) {
    super(data.src, data);

    if (size != null) {
      this.size = size;
    }
  }

  static async createFromImage(image, size = null) {
    return new ImageTexture(image, size);
  }
  
  static async createFromPath(path, size = null) {
    return new ImageTexture(await ResourceLoader.getImage(path), size);
  }
}

class TiledTexture extends Texture {
  static #rng = Utils.seedRandom(12);

  constructor(data, sources) {
    super(sources.join(";"), data);
  }

  static #drawTile(img, column, row, size, tileSize, tileRotation, tileHorizontal, tileVertical, tileRender) {
    if (tileRotation != 0) {
      const width = tileHorizontal ? tileSize.x : size.x;
      const height = tileVertical ? tileSize.y : size.y;
      const x = column + width / 2; // middle of image
      const y = row + height / 2;

      const angle =
        tileRotation == -1
          ? Math.floor(TiledTexture.#rng.next().value * 4) * 0.5 * Math.PI
          : (tileRotation * Math.PI) / 180;
      
      // Essentially rotating the image about its center
      tileRender.save();
      tileRender.translate(x, y);
      tileRender.rotate(angle);
      tileRender.drawImage(img, -width / 2, -height / 2, width, height);
      tileRender.restore();
    } else {
      tileRender.drawImage(
        img,
        column,
        row,
        tileHorizontal ? tileSize : size.x,
        tileVertical ? tileSize : size.y
      );
    }

    tileRender.setTransform(1, 0, 0, 1, 0, 0); // Identity matrix to reset
  }

  static async createFromImages(images, size, tileSize, tileRotation, tileHorizontal = true, tileVertical = true) {
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = size.x;
    tileCanvas.height = size.y;
    const tileRender = tileCanvas.getContext('2d');

    let workingTiles = [...images]; // Copy the tiles
    Utils.shuffleArray(workingTiles, TiledTexture.#rng); // Initialize seed and shuffle array

    for (let column = 0; column < (tileHorizontal ? size.x : tileSize); column += tileSize.x) {
      for (let row = 0; row < (tileVertical ? size.y : tileSize); row += tileSize.y) {
        const img = workingTiles.shift();
        
        TiledTexture.#drawTile(img, column, row, size, tileSize, tileRotation, tileHorizontal, tileVertical, tileRender);

        if (workingTiles.length == 0) {
          workingTiles = [...images];
          Utils.shuffleArray(workingTiles, TiledTexture.#rng);
        }
      }
    }

    let sources = [];
    for (let i = 0; i < images.length; i++) {
      sources.push(images[i].src);
    }

    return new TiledTexture(await createImageBitmap(tileCanvas), sources);
  }

  static async createFromPaths(paths, size, tileSize, tileRotation, tileHorizontal = true, tileVertical = true) {
    let tiles = [];
    for (let i = 0; i < paths.length; i++) {
      tiles.push(await ResourceLoader.getImage(paths[i]));
    }

    return TiledTexture.createFromImages(tiles, size, tileSize, tileRotation, tileHorizontal, tileVertical);
  }
}
