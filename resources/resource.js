class Resource {
  data;
  path;

  constructor(path, data) {
    this.path = path;
    this.data = data;
  }
}

class ResourceLoader {
  static #loadedImages = {};

  static async getImage(src) {
    if (!Object.hasOwn(ResourceLoader.#loadedImages, src)) { // Check if the image is already loaded
      // log("loading img " + src)
      ResourceLoader.#loadedImages[src] = await ResourceLoader.loadImage(src);
    }
  
    return ResourceLoader.#loadedImages[src];
  }

  static async loadImage(src) {
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
