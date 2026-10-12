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

  captureFrame() {
    if (!this.videoElement || this.videoElement.readyState < 2) {
      throw new Error('Video belum siap diambil.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth || 640;
    canvas.height = this.videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
