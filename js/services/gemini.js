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
    if (!text) throw new Error('Respon dari AI kosong. Silakan coba lagi.');
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
      throw new Error('Format respon AI tidak terbaca. Klik coba lagi ya.');
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
            throw new Error('Respon AI kosong.');
          }
          return GeminiService.parseJsonResponse(candidate.content.parts[0].text);
        }

        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || '';

        if (response.status === 429) {
          throw new Error('Server sedang sibuk, coba lagi sebentar ya.');
        }
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          if (msg.includes('API_KEY_INVALID') || msg.includes('quota')) {
            throw new Error('API Key tidak valid atau kuota habis. Periksa kembali di Pengaturan.');
          }
        }

        lastError = new Error(`Server sedang sibuk, coba lagi sebentar ya.`);
      } catch (err) {
        if (err.message.includes('Server sedang sibuk') || err.message.includes('API Key') || err.message.includes('Koneksi internet')) {
          throw err;
        }
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          throw new Error('Koneksi internet terputus. Cek WiFi atau kuota-mu ya.');
        }
        lastError = err;
      }
    }

    throw lastError || new Error('Gagal menghubungi server AI. Coba beberapa saat lagi.');
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
   * Text-only prompt for recipe generation
   * @param {string} prompt
   */
  static async generateRecipes(prompt) {
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json'
      }
    };

    return GeminiService.executeApiCall(payload);
  }
}
