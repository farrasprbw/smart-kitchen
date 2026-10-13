// Camera service using MediaDevices API with flash/torch and fallback upload

export class CameraService {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.track = null;
    this.torchEnabled = false;
    this.facingMode = 'environment';
  }

  async start(videoElement) {
    this.videoElement = videoElement;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Kamera tidak didukung pada browser ini.');
    }

    // Stop existing stream if any
    this.stop();

    const constraints = {
      video: {
        facingMode: { ideal: this.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();
      this.track = this.stream.getVideoTracks()[0] || null;
      return true;
    } catch (err) {
      console.warn('Error accessing back camera, trying default:', err);
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
        this.track = this.stream.getVideoTracks()[0] || null;
        return true;
      } catch (fallbackErr) {
        throw new Error('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
      }
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.track = null;
    this.torchEnabled = false;
  }

  async toggleTorch() {
    if (!this.track) return false;
    const capabilities = this.track.getCapabilities ? this.track.getCapabilities() : {};
    if (!capabilities.torch) {
      return false; // Torch not supported by hardware
    }

    try {
      this.torchEnabled = !this.torchEnabled;
      await this.track.applyConstraints({
        advanced: [{ torch: this.torchEnabled }]
      });
      return this.torchEnabled;
    } catch (err) {
      console.warn('Failed to toggle torch:', err);
      return false;
    }
  }

  captureFrame(targetAspectRatio = null) {
    if (!this.videoElement || this.videoElement.readyState < 2) {
      throw new Error('Video belum siap diambil.');
    }

    const video = this.videoElement;
    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;

    // Tentukan rasio viewfinder yang dilihat pengguna (default 4/3 sesuai kontainer atau ukuran riil)
    let ratio = targetAspectRatio;
    if (!ratio && video.clientWidth && video.clientHeight) {
      ratio = video.clientWidth / video.clientHeight;
    }
    if (!ratio || ratio <= 0) {
      ratio = 4 / 3; // Default rasio pemindai kulkas
    }

    const currentRatio = vWidth / vHeight;
    let sx = 0, sy = 0, sWidth = vWidth, sHeight = vHeight;

    // Hitung crop region sesuai behavior CSS object-cover
    if (currentRatio > ratio) {
      // Video lebih lebar daripada kontainer -> crop horizontal (kiri-kanan)
      sWidth = Math.round(vHeight * ratio);
      sx = Math.round((vWidth - sWidth) / 2);
    } else if (currentRatio < ratio) {
      // Video lebih tinggi daripada kontainer (misal kamera HP potrait di frame landscape 4:3) -> crop vertikal (atas-bawah)
      sHeight = Math.round(vWidth / ratio);
      sy = Math.round((vHeight - sHeight) / 2);
    }

    // Resolusi output yang tajam dan optimal (maks 1200px)
    const maxDim = 1200;
    let outWidth = sWidth;
    let outHeight = sHeight;
    if (outWidth > maxDim || outHeight > maxDim) {
      if (outWidth > outHeight) {
        outHeight = Math.round((outHeight * maxDim) / outWidth);
        outWidth = maxDim;
      } else {
        outWidth = Math.round((outWidth * maxDim) / outHeight);
        outHeight = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, outWidth, outHeight);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const base64 = dataUrl.split(',')[1];

    return {
      canvas,
      dataUrl,
      base64,
      mimeType: 'image/jpeg',
      width: canvas.width,
      height: canvas.height
    };
  }
}
