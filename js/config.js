// Dapur Pintar — Configuration
// API key dapat di-inject dari Vercel Environment Variables (/api/config)
// atau dimasukkan oleh pengguna di Pengaturan & disimpan di localStorage.

export const CONFIG = {
  GEMINI_API_KEY: '',
  DEFAULT_API_KEY: '',
  GEMINI_MODELS: [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-flash-lite-latest'
  ],
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

  FIREBASE: {
    projectId: 'dapur-pintar-ai',
    appId: '1:859328494560:web:369293bf46989477e0c985',
    storageBucket: 'dapur-pintar-ai.firebasestorage.app',
    apiKey: 'AIzaSyCIVDH0oXGFjWjWa630gt4H5iHX9-TyFLA',
    authDomain: 'dapur-pintar-ai.firebaseapp.com',
    messagingSenderId: '859328494560',
    enabled: true
  },

  STORAGE_KEYS: {
    STOK: 'dapur_pintar_stok',
    LOG_MASAK: 'dapur_pintar_log_masak',
    LOG_BELANJA: 'dapur_pintar_log_belanja',
    SETTINGS: 'dapur_pintar_settings',
  },

  DEFAULT_BUMBU_DASAR: [
    'garam', 'gula', 'kecap manis', 'kecap asin',
    'bawang merah', 'bawang putih', 'cabai',
    'minyak goreng', 'merica',
  ],

  // Brightness thresholds
  BRIGHTNESS: {
    OPTIMAL: 120,
    ACCEPTABLE: 80,
  },

  // Max photos per scan session
  MAX_SCAN_PHOTOS: 4,

  // Photo slot labels
  PHOTO_SLOTS: [
    { id: 'rak-utama', label: 'Rak Utama', icon: 'shelves' },
    { id: 'laci-sayur', label: 'Laci Sayur', icon: 'grass' },
    { id: 'freezer', label: 'Freezer / Daging', icon: 'kitchen' },
    { id: 'pintu', label: 'Pintu Samping', icon: 'door_sliding' },
  ],

  // Belanja photo slot labels
  BELANJA_SLOTS: [
    { id: 'belanja-1', label: 'Bahan Segar', icon: 'nutrition' },
    { id: 'belanja-2', label: 'Kemasan / Bumbu', icon: 'inventory_2' },
    { id: 'belanja-3', label: 'Struk / Total', icon: 'receipt_long' },
  ],
};

/**
 * Cek apakah ada konfigurasi API key dari serverless function Vercel (/api/config)
 */
export async function loadServerConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data?.geminiApiKey) {
        CONFIG.DEFAULT_API_KEY = data.geminiApiKey;
      }
    }
  } catch {
    // Mode statis murni / offline, fallback ke localStorage
  }
}

