export class Resource {
  protected data: any;
  protected path: string;

  constructor(path: string, data: any) {
    this.path = path;
    this.data = data;
  }
}

export class ResourceLoader {
  static loadedImages: Map<string, ImageBitmap> = new Map();

  static async getImage(src: string): Promise<ImageBitmap> {
    if (!ResourceLoader.loadedImages.has(src)) { // Check if the image is already loaded
      // log("loading img " + src)
      ResourceLoader.loadedImages.set(src, await ResourceLoader.loadImage(src));
    }
  
    return ResourceLoader.loadedImages.get(src)!;
  }

  static async loadImage(src: string): Promise<ImageBitmap> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        console.log("loaded image " + src);
        // log(`Image ${src} width is ${img.width}`);
        createImageBitmap(img, 0, 0, img.width, img.height)
          .then(imgBitmap => resolve(imgBitmap))
          .catch(error => reject(error));
      };
      img.onerror = error => {
        reject(error);
      }
    });
  }
}
