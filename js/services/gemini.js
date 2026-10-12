// Google Gemini API Client

import { CONFIG } from '../config.js';
import { StorageService } from '../core/storage.js';

export class GeminiService {
  static getApiKey() {
    const settings = StorageService.getSettings();
    return settings?.apiKey?.trim() || CONFIG.DEFAULT_API_KEY || '';
  }

  /**
   * Cleans model output and parses JSON safely
   */
  static parseJsonResponse(text) {
    if (!text) throw new Error('Response dari Gemini kosong.');
    let clean = text.trim();
    // Remove markdown code fences if present
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    try {
      return JSON.parse(clean);
    } catch (err) {
      // Try regex search for first { and last } or first [ and last ]
      const jsonMatch = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error(`Gagal memproses hasil analisis data: ${err.message}`);
    }
  }

  /**
   * Execute API call with automatic model fallback
   */
  static async executeApiCall(payload) {
    const apiKey = GeminiService.getApiKey();
    if (!apiKey) {
      throw new Error('API Key Gemini belum disetel. Pastikan GEMINI_API_KEY terpasang di Vercel Environment Variables atau di Pengaturan.');
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
            throw new Error('Format respon Gemini kosong.');
          }
          return GeminiService.parseJsonResponse(candidate.content.parts[0].text);
        }

        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || `Status HTTP: ${response.status}`;

        if (response.status === 400 && msg.includes('API_KEY_INVALID')) {
          throw new Error('API Key Gemini tidak valid. Silakan periksa kembali di Pengaturan atau Vercel Env.');
        }
        if (response.status === 429) {
          throw new Error('Limit kuota Gemini tercapai (Rate limit). Tunggu sebentar lalu coba lagi.');
        }

        // Simpan error dan coba model alternatif berikutnya
        lastError = new Error(`Model ${model}: ${msg}`);
      } catch (err) {
        if (err.message.includes('API Key') || err.message.includes('Limit kuota')) {
          throw err;
        }
        lastError = err;
      }
    }

    throw lastError || new Error('Gagal memproses analisis gambar.');
  }

  /**
   * Analyze one or multiple images with a prompt
   * @param {Array<{ mimeType: string, base64: string }>} images
   * @param {string} prompt
   */
  static async analyzeImages(images, prompt) {
    const parts = [{ text: prompt }];

    for (const img of images) {
      // Ensure base64 without data URI prefix
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

    return GeminiService.executeApiCall(payload);
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
