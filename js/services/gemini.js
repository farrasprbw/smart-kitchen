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
      throw new Error(`Gagal mem-parse response AI sebagai JSON: ${err.message}`);
    }
  }

  /**
   * Analyze one or multiple images with a prompt
   * @param {Array<{ mimeType: string, base64: string }>} images
   * @param {string} prompt
   */
  static async analyzeImages(images, prompt) {
    const apiKey = GeminiService.getApiKey();
    if (!apiKey) {
      throw new Error('API Key Gemini belum disetel. Buka Pengaturan untuk memasukkan API Key.');
    }

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

    const url = `${CONFIG.GEMINI_API_URL}?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || `Status HTTP: ${response.status}`;
      if (response.status === 400 && msg.includes('API_KEY_INVALID')) {
        throw new Error('API Key Gemini tidak valid. Silakan periksa kembali di Pengaturan.');
      }
      if (response.status === 429) {
        throw new Error('Limit kuota Gemini habis (Rate limit). Tunggu 1 menit lalu coba lagi.');
      }
      throw new Error(`Gagal menghubungi Gemini: ${msg}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (!candidate?.content?.parts?.[0]?.text) {
      throw new Error('Format respon Gemini tidak sesuai atau kosong.');
    }

    return GeminiService.parseJsonResponse(candidate.content.parts[0].text);
  }

  /**
   * Text-only prompt for recipe generation
   * @param {string} prompt
   */
  static async generateRecipes(prompt) {
    const apiKey = GeminiService.getApiKey();
    if (!apiKey) {
      throw new Error('API Key Gemini belum disetel.');
    }

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

    const url = `${CONFIG.GEMINI_API_URL}?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || `Status HTTP: ${response.status}`;
      throw new Error(`Gagal rekomendasi resep: ${msg}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (!candidate?.content?.parts?.[0]?.text) {
      throw new Error('Respon resep kosong.');
    }

    return GeminiService.parseJsonResponse(candidate.content.parts[0].text);
  }
}
