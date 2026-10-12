// Dapur Pintar — Configuration
// API key dapat di-inject dari Vercel Environment Variables (/api/config)
// atau dimasukkan oleh pengguna di Pengaturan & disimpan di localStorage.

export const CONFIG = {
  GEMINI_API_KEY: '',
  DEFAULT_API_KEY: '',
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

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
    { id: 'freezer', label: 'Freezer / Daging', icon: 'ac_unit' },
    { id: 'pintu', label: 'Pintu Samping', icon: 'door_sliding' },
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

