// Google Gemini API Client with Humanized Errors & Result Caching

import { CONFIG } from '../config.js';
import { StorageService } from '../core/storage.js';

export class GeminiService {
  static cache = new Map();

  static getApiKey() {
    const settings = StorageService.getSettings();
    return settings?.apiKey?.trim() || CONFIG.DEFAULT_API_KEY || '';
  }

  /**
   * Cleans model output and parses JSON safely
   */
  static parseJsonResponse(text) {
    if (!text) throw new Error('Respon kosong. Silakan coba lagi.');
    let clean = text.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    try {
      return JSON.parse(clean);
    } catch (err) {
      const jsonMatch = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Format respon tidak terbaca. Klik coba lagi ya.');
    }
  }

  /**
   * Execute API call with automatic model fallback & humanized error handling
   */
  static async executeApiCall(payload) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Koneksi internet terputus. Cek WiFi atau kuota-mu ya.');
    }

    const apiKey = GeminiService.getApiKey();
    if (!apiKey) {
      throw new Error('API Key Gemini belum disetel. Masukkan API Key di menu Pengaturan (ikon gear di kanan atas).');
    }

    const models = CONFIG.GEMINI_MODELS?.length ? CONFIG.GEMINI_MODELS : ['gemini-flash-lite-latest', 'gemini-3-flash-preview', 'gemini-3.8-flash'];
    let lastError = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          const candidate = result.candidates?.[0];
          if (!candidate?.content?.parts?.[0]?.text) {
            throw new Error('Respon kosong.');
          }
          return GeminiService.parseJsonResponse(candidate.content.parts[0].text);
        }

        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || '';
        console.error(`[GeminiService] Error calling model ${model} (HTTP ${response.status}):`, msg || errData);

        if (response.status === 400 || response.status === 401 || response.status === 403) {
          if (msg.includes('leaked') || msg.toLowerCase().includes('leak')) {
            throw new Error('API Key diblokir Google karena terdeteksi bocor (leaked). Buat API Key baru di Google AI Studio lalu masukkan di menu Pengaturan.');
          }
          if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
            throw new Error('API Key tidak valid. Periksa kembali di menu Pengaturan.');
          }
          if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
            throw new Error('Kuota API habis atau terlampaui. Periksa batas penggunaan di Google AI Studio.');
          }
          throw new Error(`Akses API ditolak (${response.status}): ${msg || 'Periksa API Key di Pengaturan.'}`);
        }

        if (response.status === 429) {
          lastError = new Error('Server sedang sibuk atau limit tercapai, coba lagi sebentar ya.');
          continue;
        }

        if (response.status === 404) {
          lastError = new Error(`Model ${model} tidak ditemukan atau deprecated.`);
          continue;
        }

        lastError = new Error(msg || `Server error (HTTP ${response.status})`);
      } catch (err) {
        if (err.message.includes('API Key') || err.message.includes('Koneksi internet') || err.message.includes('Akses API ditolak')) {
          throw err;
        }
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          throw new Error('Koneksi internet terputus. Cek WiFi atau kuota-mu ya.');
        }
        lastError = err;
      }
    }

    throw lastError || new Error('Gagal menghubungi server. Coba beberapa saat lagi.');
  }

  /**
   * Analyze one or multiple images with caching
   * @param {Array<{ mimeType: string, base64: string }>} images
   * @param {string} prompt
   */
  static async analyzeImages(images, prompt) {
    // Generate simple cache key
    const cacheKey = prompt.slice(0, 30) + '_' + images.map(img => img.base64?.slice(0, 40) || '').join('_');
    if (GeminiService.cache.has(cacheKey)) {
      console.log('Menggunakan hasil cache analisis foto');
      return GeminiService.cache.get(cacheKey);
    }

    const parts = [{ text: prompt }];

    for (const img of images) {
      const base64Data = img.base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      parts.push({
        inline_data: {
          mime_type: img.mimeType || 'image/jpeg',
          data: base64Data
        }
      });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json'
      }
    };

    const result = await GeminiService.executeApiCall(payload);
    // Cache the result
    GeminiService.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Text-only prompt for recipe generation with caching & speed optimization
   * @param {string} prompt
   * @param {boolean} [forceFresh]
   */
  static async generateRecipes(prompt, forceFresh = false) {
    const cacheKey = 'recipes_' + prompt.trim();
    if (!forceFresh && GeminiService.cache.has(cacheKey)) {
      console.log('Menggunakan rekomendasi resep dari cache');
      return GeminiService.cache.get(cacheKey);
    }

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json'
      }
    };

    const result = await GeminiService.executeApiCall(payload);
    GeminiService.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Mengambil gambar resep dari Global Shared Cache Firestore atau generate via Google Imagen 3 API
   * Dilengkapi graceful fallback otomatis ke katalog kuliner
   * @param {string} recipeName Nama masakan
   * @param {string} visualCategory Kategori masakan (opsional)
   * @param {string} fallbackUrl URL gambar katalog fallback jika gagal/limit
   * @returns {Promise<string>}
   */
  static async getOrGenerateRecipeImage(recipeName, visualCategory = '', fallbackUrl = '') {
    if (!recipeName) return fallbackUrl;

    const slug = String(recipeName)
      .toLowerCase()
      .trim()
      .replace(/^(resep|menu|olahan|kreasi)\s+/i, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48);

    if (!slug) return fallbackUrl;

    // 1. Cek memory runtime cache
    const memKey = `img_recipe_v2_${slug}`;
    if (GeminiService.cache.has(memKey)) {
      return GeminiService.cache.get(memKey);
    }

    // 2. Cek Global Shared Cache di Cloud Firestore
    try {
      const { FirebaseService } = await import('./firebase.js');
      const cloudCached = await FirebaseService.getCachedRecipeImage(`v2_${slug}`);
      if (cloudCached) {
        GeminiService.cache.set(memKey, cloudCached);
        return cloudCached;
      }
    } catch (err) {
      console.warn('Firestore cache lookup skipped:', err);
    }

    // 3. Jika belum pernah di-generate, panggil Google Imagen 3 API
    const apiKey = GeminiService.getApiKey();
    if (!apiKey) {
      return fallbackUrl;
    }

    try {
      let dishServingStyle = 'plated beautifully on an authentic Indonesian ceramic or earthenware dinner plate, ready to eat, strictly served on a plate or food bowl, never in a drinking cup, glass, jar, or bottle';
      const lowerName = recipeName.toLowerCase();

      if (lowerName.includes('sambal')) {
        dishServingStyle = 'served traditionally in a rustic black stone mortar (cobek batu) or small clay condiment saucer, garnished with sliced fresh red bird eye chilies and kaffir lime leaf, glistening chili oil texture, strictly inside a stone cobek or small sauce dish, never in a drinking glass, never in a glass bottle, jar, or tumbler';
      } else if (lowerName.includes('sup') || lowerName.includes('soto') || lowerName.includes('sayur asem') || lowerName.includes('sayur lodeh') || lowerName.includes('bakso') || lowerName.includes('rawon') || lowerName.includes('kuah')) {
        dishServingStyle = 'served in a traditional deep ceramic soup bowl with clear steaming broth, garnished with fried shallots and celery, strictly in a food bowl, never in a drinking glass';
      } else if (lowerName.includes('rujak') || lowerName.includes('asinan') || lowerName.includes('salad buah')) {
        dishServingStyle = 'sliced fresh tropical fruits neatly arranged on a flat ceramic dish or woven bamboo plate, accompanied by a small bowl of spicy palm sugar dip';
      } else if (lowerName.includes('jus') || lowerName.includes('es ') || lowerName.includes('smoothie') || lowerName.includes('minuman')) {
        dishServingStyle = 'served in a chilled drinking beverage glass with ice cubes and fresh garnish';
      }

      const prompt = `Authentic Indonesian cuisine food photography: ${recipeName}. ${dishServingStyle}. Mouth-watering, realistic appetizing textures, 4k resolution, professional food studio lighting, high-end culinary photography, centered composition, clean background, strictly no text, no labels, no watermark.';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // Max 12 detik

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '4:3',
            outputOptions: { mimeType: 'image/jpeg' }
          }
        })
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const base64 = data?.predictions?.[0]?.bytesBase64Encoded;
        if (base64) {
          const generatedUrl = `data:image/jpeg;base64,${base64}`;
          GeminiService.cache.set(memKey, generatedUrl);

          // Simpan ke Firestore secara asinkron agar pengguna lain hemat kuota
          import('./firebase.js').then(({ FirebaseService }) => {
            FirebaseService.saveCachedRecipeImage(`v2_${slug}`, generatedUrl, recipeName).catch(() => {});
          }).catch(() => {});

          return generatedUrl;
        }
      } else {
        console.warn(`Imagen 3 API status ${response.status}: beralih ke katalog fallback.`);
      }
    } catch (err) {
      console.warn('Imagen 3 API fallback:', err.message);
    }

    return fallbackUrl;
  }
}
