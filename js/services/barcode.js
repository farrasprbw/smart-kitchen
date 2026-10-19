// Barcode Scanning & Product Lookup Service (Open Food Facts)

export class BarcodeService {
  constructor() {
    this.detector = null;
    this.isSupported = false;
    this.initDetector();
  }

  async initDetector() {
    if ('BarcodeDetector' in window) {
      try {
        const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
        const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
          .filter(f => supportedFormats.includes(f));
        this.detector = new window.BarcodeDetector({ formats: formats.length > 0 ? formats : supportedFormats });
        this.isSupported = true;
        return;
      } catch (e) {
        console.warn('BarcodeDetector init error:', e);
      }
    }

    // Fallback: load ZXing library dynamically jika BarcodeDetector tidak didukung oleh browser
    this.loadZXingFallback();
  }

  async loadZXingFallback() {
    if (window.ZXing) {
      this.isSupported = true;
      return;
    }

    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';
        script.onload = () => {
          this.isSupported = true;
          resolve();
        };
        script.onerror = () => {
          console.warn('Failed to load ZXing barcode library');
          reject(new Error('Barcode library unavailable'));
        };
        document.head.appendChild(script);
      });
    } catch {
      this.isSupported = false;
    }
  }

  /**
   * Deteksi barcode dari video element atau canvas
   * @param {HTMLVideoElement|HTMLCanvasElement} source
   * @returns {Promise<string|null>} Barcode string atau null jika tidak terdeteksi
   */
  async detect(source) {
    if (!source) return null;

    // Prioritaskan native BarcodeDetector
    if (this.detector) {
      try {
        const barcodes = await this.detector.detect(source);
        if (barcodes && barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue?.trim();
          if (rawValue) return rawValue;
        }
      } catch (err) {
        // Frame might be blank or video stopped
      }
    }

    // Fallback ZXing
    if (window.ZXing && source instanceof HTMLVideoElement && source.readyState >= 2) {
      try {
        if (!this.zxingReader) {
          this.zxingReader = new window.ZXing.BrowserMultiFormatReader();
        }
        // Gunakan canvas sementara dari tengah video (focus area) untuk deteksi cepat
        const canvas = document.createElement('canvas');
        const vW = source.videoWidth || 640;
        const vH = source.videoHeight || 480;
        // Ambil area tengah 70%
        const cropW = Math.round(vW * 0.7);
        const cropH = Math.round(vH * 0.7);
        const startX = Math.round((vW - cropW) / 2);
        const startY = Math.round((vH - cropH) / 2);

        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(source, startX, startY, cropW, cropH, 0, 0, cropW, cropH);

        const result = this.zxingReader.decodeFromCanvas(canvas);
        if (result && result.getText()) {
          return result.getText().trim();
        }
      } catch {
        // ZXing throws if no barcode in frame, ignore
      }
    }

    return null;
  }

  /**
   * Cari informasi produk berdasarkan nomor barcode di Open Food Facts
   * @param {string} barcode
   * @returns {Promise<{ found: boolean, nama?: string, ukuran?: string, kategori?: string, brand?: string, raw?: any }>}
   */
  static async lookupProduct(barcode) {
    if (!barcode) return { found: false };
    const cleanBarcode = barcode.trim();

    try {
      // Timeout 4 detik agar user tidak menunggu terlalu lama jika koneksi lambat
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json?fields=product_name,product_name_id,product_name_en,quantity,brands,categories,categories_tags`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'DapurPintar - WebPWA - Version 1.0 (https://dapur-pintar.web.app)'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return { found: false, barcode: cleanBarcode };
      }

      const data = await res.json();
      if (data && (data.status === 1 || data.product)) {
        const p = data.product || {};
        const nama = p.product_name_id || p.product_name || p.product_name_en || '';
        const ukuran = p.quantity || '';
        const brand = p.brands || '';

        // Deteksi kategori sederhana
        let kategori = 'olahan';
        const cats = (p.categories || '').toLowerCase();
        if (cats.includes('beverage') || cats.includes('minuman') || cats.includes('juice') || cats.includes('tea') || cats.includes('coffee') || cats.includes('susu') || cats.includes('milk')) {
          kategori = 'minuman';
        } else if (cats.includes('vegetable') || cats.includes('sayur')) {
          kategori = 'sayur';
        } else if (cats.includes('fruit') || cats.includes('buah')) {
          kategori = 'buah';
        } else if (cats.includes('meat') || cats.includes('daging') || cats.includes('chicken') || cats.includes('fish') || cats.includes('ikan') || cats.includes('egg') || cats.includes('telur')) {
          kategori = 'protein';
        } else if (cats.includes('spice') || cats.includes('sauce') || cats.includes('saus') || cats.includes('kecap') || cats.includes('bumbu') || cats.includes('oil') || cats.includes('minyak')) {
          kategori = 'bumbu';
        }

        // Susun nama tampilan lengkap: misal "Minyak Goreng Sania (1L)" atau "Indomie Goreng"
        let fullTitle = nama;
        if (brand && !fullTitle.toLowerCase().includes(brand.toLowerCase())) {
          fullTitle = `${brand} ${fullTitle}`.trim();
        }

        return {
          found: Boolean(nama),
          barcode: cleanBarcode,
          nama: fullTitle || `Produk Barcode ${cleanBarcode}`,
          ukuran: ukuran,
          brand: brand,
          kategori: kategori,
          raw: p
        };
      }

      return { found: false, barcode: cleanBarcode };
    } catch (e) {
      console.warn('Open Food Facts lookup error:', e);
      return { found: false, barcode: cleanBarcode };
    }
  }
}
