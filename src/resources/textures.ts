import { renderer } from "../index";
import { Vector2 } from "../math/vector2";
import { Utils } from "../utils";
import { Resource, ResourceLoader } from "./resource";

export class Texture extends Resource { // TODO: Add loader.
  size;

  constructor(path: string, data: ImageBitmap) {
    super(path, data);

    this.size = new Vector2(data.width, data.height);
  }

  draw(position: Vector2, size = null) {
    renderer.drawImage(position, size == null ? this.size : size, this.data);
  }
}

export class ImageTexture extends Texture {
  constructor(data: ImageBitmap, src: string, size?: Vector2) {
    super(src, data);

    if (size !== undefined) {
      this.size = size;
    }
  }

  static async createFromImage(image: ImageBitmap, src: string, size?: Vector2): Promise<ImageTexture> {
    return new ImageTexture(image, src, size);
  }
  
  static async createFromPath(path: string, size?: Vector2): Promise<ImageTexture> {
    return new ImageTexture(await ResourceLoader.getImage(path), path, size);
  }
}

export class TiledTexture extends Texture {
  private static rng = Utils.seedRandom(12);

  constructor(data: ImageBitmap, sources: string[]) {
    super(sources.join(";"), data);
  }

  private static drawTile(img: ImageBitmap, column: number, row: number, size: Vector2, tileSize: Vector2, tileRotation: number, tileHorizontal: boolean, tileVertical: boolean, tileRender: CanvasRenderingContext2D) {
    if (tileRotation != 0) {
      const width = tileHorizontal ? tileSize.x : size.x;
      const height = tileVertical ? tileSize.y : size.y;
      const x = column + width / 2; // middle of image
      const y = row + height / 2;

      const angle =
        tileRotation == -1
          ? Math.floor(TiledTexture.rng.next().value * 4) * 0.5 * Math.PI
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
        tileHorizontal ? tileSize.x : size.x,
        tileVertical ? tileSize.y : size.y
      );
    }

    tileRender.setTransform(1, 0, 0, 1, 0, 0); // Identity matrix to reset
  }

  static async createFromImages(images: ImageBitmap[], sources: string[], size: Vector2, tileSize: Vector2, tileRotation: number, tileHorizontal: boolean, tileVertical: boolean) {
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = size.x;
    tileCanvas.height = size.y;
    const tileRender = tileCanvas.getContext('2d');
    if (tileRender == null) {
      throw new ReferenceError("Could not get the CanvasRenderingContext2D for creating the Tiled Texture.");
    }

    // let workingTiles = [...images]; // Copy the tiles
    // Utils.shuffleArray(workingTiles, TiledTexture.rng); // Initialize seed and shuffle array

    for (let column = 0; column < (tileHorizontal ? size.x : tileSize.x); column += tileSize.x) {
      for (let row = 0; row < (tileVertical ? size.y : tileSize.y); row += tileSize.y) {
        // if (workingTiles.length == 0) {
        //   workingTiles = [...images];
        //   Utils.shuffleArray(workingTiles, TiledTexture.rng);
        // }

        const img = images[Math.floor(TiledTexture.rng.next().value * images.length)];
        console.log(img);
        TiledTexture.drawTile(img, column, row, size, tileSize, tileRotation, tileHorizontal, tileVertical, tileRender);
      }
    }

    return new TiledTexture(await createImageBitmap(tileCanvas), sources); // Create an Image class that has imageBitmap and a matching source
  }

  static async createFromPaths(paths: string[], size: Vector2, tileSize: Vector2, tileRotation: number, tileHorizontal: boolean, tileVertical: boolean) {
    let tiles: ImageBitmap[] = [];
    for (let i = 0; i < paths.length; i++) {
      tiles.push(await ResourceLoader.getImage(paths[i]));
    }

    return TiledTexture.createFromImages(tiles, paths, size, tileSize, tileRotation, tileHorizontal, tileVertical);
  }
}
