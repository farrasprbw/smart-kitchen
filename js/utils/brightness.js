// Canvas-based image brightness detection

/**
 * Calculate average luminance of an image element or video frame.
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} source
 * @returns {number} Average brightness from 0 to 255
 */
export function calculateBrightness(source) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = Math.min(160, source.videoWidth || source.naturalWidth || source.width || 160);
    const height = Math.min(120, source.videoHeight || source.naturalHeight || source.height || 120);

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(source, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let totalLuminance = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      // Relative luminance formula (ITU-R BT.709)
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      totalLuminance += lum;
    }

    return Math.round(totalLuminance / totalPixels);
  } catch (err) {
    console.warn('Brightness calculation error:', err);
    return 120; // fallback optimal
  }
}

/**
 * Get human-readable status for a brightness score
 * @param {number} score
 */
export function getBrightnessStatus(score) {
  if (score < 80) {
    return {
      score,
      status: 'dark',
      label: 'Terlalu Gelap',
      pillClass: 'bg-error-container text-on-error-container',
      icon: 'lightbulb',
      advice: 'Pencahayaan kurang. Disarankan nyalakan flash atau lampu kulkas.'
    };
  }
  if (score < 110) {
    return {
      score,
      status: 'acceptable',
      label: 'Cukup Terang',
      pillClass: 'bg-secondary-fixed text-on-secondary-fixed',
      icon: 'wb_incandescent',
      advice: 'Cahaya cukup, pastikan bahan tidak tertutup bayangan.'
    };
  }
  return {
    score,
    status: 'optimal',
    label: 'Cahaya Optimal',
    pillClass: 'bg-primary-fixed text-on-primary-fixed',
    icon: 'brightness_5',
    advice: 'Pencahayaan sangat baik untuk pemindaian AI.'
  };
}
