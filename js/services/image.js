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
}
