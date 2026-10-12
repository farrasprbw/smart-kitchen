// LocalStorage management with schema versioning and default seeds

import { CONFIG } from '../config.js';
import { generateId } from '../utils/uuid.js';

const INITIAL_STOK = {
  version: 2,
  lastUpdated: new Date().toISOString(),
  kulkas: [],
  dapur: []
};

const INITIAL_LOG_MASAK = {
  version: 2,
  entries: []
};

const INITIAL_LOG_BELANJA = {
  version: 2,
  entries: []
};

const INITIAL_SETTINGS = {
  version: 2,
  apiKey: '',
  userName: 'Sari',
  bumbuDasar: [...CONFIG.DEFAULT_BUMBU_DASAR],
  theme: 'light',
  onboardingDone: false
};

export class StorageService {
  static get(key, defaultValue = null) {
    try {
      const val = localStorage.getItem(key);
      if (val === null) return defaultValue;
      return JSON.parse(val);
    } catch (e) {
      console.warn(`Error reading localStorage ${key}:`, e);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error saving localStorage ${key}:`, e);
      return false;
    }
  }

  static initDefaults() {
    // If not set or old mock version (< 2), migrate to clean empty state
    const currentStok = StorageService.get(CONFIG.STORAGE_KEYS.STOK);
    if (!currentStok || !currentStok.version || currentStok.version < 2) {
      StorageService.set(CONFIG.STORAGE_KEYS.STOK, INITIAL_STOK);
    }

    const currentLogMasak = StorageService.get(CONFIG.STORAGE_KEYS.LOG_MASAK);
    if (!currentLogMasak || !currentLogMasak.version || currentLogMasak.version < 2) {
      StorageService.set(CONFIG.STORAGE_KEYS.LOG_MASAK, INITIAL_LOG_MASAK);
    }

    const currentLogBelanja = StorageService.get(CONFIG.STORAGE_KEYS.LOG_BELANJA);
    if (!currentLogBelanja || !currentLogBelanja.version || currentLogBelanja.version < 2) {
      StorageService.set(CONFIG.STORAGE_KEYS.LOG_BELANJA, INITIAL_LOG_BELANJA);
    }

    const currentSettings = StorageService.get(CONFIG.STORAGE_KEYS.SETTINGS);
    if (!currentSettings) {
      StorageService.set(CONFIG.STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    }
  }

  static clearAllData() {
    StorageService.set(CONFIG.STORAGE_KEYS.STOK, INITIAL_STOK);
    StorageService.set(CONFIG.STORAGE_KEYS.LOG_MASAK, INITIAL_LOG_MASAK);
    StorageService.set(CONFIG.STORAGE_KEYS.LOG_BELANJA, INITIAL_LOG_BELANJA);
  }

  // Stok CRUD
  static getStok() {
    return StorageService.get(CONFIG.STORAGE_KEYS.STOK, INITIAL_STOK);
  }

  static saveStok(stokData) {
    stokData.lastUpdated = new Date().toISOString();
    return StorageService.set(CONFIG.STORAGE_KEYS.STOK, stokData);
  }

  static addItemsToStok(items, targetLocation = 'kulkas') {
    const data = StorageService.getStok();
    const list = targetLocation === 'dapur' ? data.dapur : data.kulkas;

    for (const item of items) {
      const existing = list.find(x => x.nama.toLowerCase().trim() === item.nama.toLowerCase().trim());
      if (existing) {
        if (typeof item.jumlah === 'number' && typeof existing.jumlah === 'number') {
          existing.jumlah += item.jumlah;
        }
        existing.diperbarui = new Date().toISOString();
        if (item.catatan) existing.catatan = item.catatan;
      } else {
        list.push({
          id: item.id || generateId(),
          nama: item.nama,
          jumlah: item.jumlah,
          satuan: item.satuan || 'buah',
          kategori: item.kategori || 'lainnya',
          lokasi: item.lokasi || targetLocation,
          status: item.status || 'Segar',
          statusClass: item.statusClass || 'bg-primary-container/15 text-primary-container',
          yakin: item.yakin !== undefined ? item.yakin : true,
          confidence: item.confidence || 90,
          catatan: item.catatan || '',
          icon: item.icon || (targetLocation === 'dapur' ? 'kitchen' : 'egg'),
          ditambahkan: new Date().toISOString(),
          diperbarui: new Date().toISOString()
        });
      }
    }

    StorageService.saveStok(data);
    return data;
  }

  static updateStokItem(id, updates) {
    const data = StorageService.getStok();
    for (const section of ['kulkas', 'dapur']) {
      const idx = data[section].findIndex(x => x.id === id);
      if (idx !== -1) {
        data[section][idx] = { ...data[section][idx], ...updates, diperbarui: new Date().toISOString() };
        StorageService.saveStok(data);
        return data[section][idx];
      }
    }
    return null;
  }

  static deleteStokItem(id) {
    const data = StorageService.getStok();
    for (const section of ['kulkas', 'dapur']) {
      data[section] = data[section].filter(x => x.id !== id);
    }
    StorageService.saveStok(data);
    return true;
  }

  static kurangiStokMasak(bahanTerpakaiList) {
    const data = StorageService.getStok();
    const berkurang = [];

    for (const bt of bahanTerpakaiList) {
      const targetName = bt.nama.toLowerCase().trim();
      let found = false;

      for (const section of ['kulkas', 'dapur']) {
        const item = data[section].find(x => x.nama.toLowerCase().trim().includes(targetName) || targetName.includes(x.nama.toLowerCase().trim()));
        if (item) {
          found = true;
          if (typeof item.jumlah === 'number' && typeof bt.jumlah === 'number') {
            item.jumlah = Math.max(0, item.jumlah - bt.jumlah);
          }
          item.diperbarui = new Date().toISOString();
          berkurang.push({ nama: item.nama, sisa: item.jumlah, satuan: item.satuan });
          break;
        }
      }
      if (!found) {
        berkurang.push({ nama: bt.nama, sisa: '-', satuan: bt.satuan });
      }
    }

    StorageService.saveStok(data);
    return berkurang;
  }

  // Log Masak
  static getLogMasak() {
    return StorageService.get(CONFIG.STORAGE_KEYS.LOG_MASAK, INITIAL_LOG_MASAK);
  }

  static addLogMasak(entry) {
    const log = StorageService.getLogMasak();
    log.entries.unshift({
      id: generateId(),
      tanggal: new Date().toISOString(),
      ...entry
    });
    StorageService.set(CONFIG.STORAGE_KEYS.LOG_MASAK, log);
    return log;
  }

  // Log Belanja
  static getLogBelanja() {
    return StorageService.get(CONFIG.STORAGE_KEYS.LOG_BELANJA, INITIAL_LOG_BELANJA);
  }

  static addLogBelanja(entry) {
    const log = StorageService.getLogBelanja();
    log.entries.unshift({
      id: generateId(),
      tanggal: new Date().toISOString(),
      ...entry
    });
    StorageService.set(CONFIG.STORAGE_KEYS.LOG_BELANJA, log);
    return log;
  }

  // Settings
  static getSettings() {
    return StorageService.get(CONFIG.STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  static saveSettings(settings) {
    return StorageService.set(CONFIG.STORAGE_KEYS.SETTINGS, settings);
  }
}
