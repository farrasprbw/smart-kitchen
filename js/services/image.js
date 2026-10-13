// Image processing service (resize, compress, format conversions)

export class ImageService {
  /**
   * Reads a File or Blob into base64 and dataUrl
   * @param {File|Blob} file
   */
  static readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Resizes an image (from File, Blob, or dataUrl) and returns compressed base64
   * @param {string|File|Blob} source
   * @param {number} maxDimension
   * @param {number} quality
   */
  static async compressAndResize(source, maxDimension = 1200, quality = 0.85) {
    let srcUrl = source;
    if (source instanceof Blob || source instanceof File) {
      srcUrl = await ImageService.readFileAsDataUrl(source);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];

        resolve({
          dataUrl,
          base64,
          mimeType: 'image/jpeg',
          width,
          height
        });
      };
      img.onerror = reject;
      img.src = srcUrl;
    });
  }

  /**
   * Rotates an image (dataUrl) by 90 degrees clockwise
   * @param {string} dataUrl
   * @param {number} quality
   */
  static rotate90(dataUrl, quality = 0.88) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // When rotated 90 degrees, width and height swap
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const rotatedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = rotatedDataUrl.split(',')[1];
        resolve({
          dataUrl: rotatedDataUrl,
          base64,
          mimeType: 'image/jpeg',
          width: canvas.width,
          height: canvas.height
        });
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }
}
