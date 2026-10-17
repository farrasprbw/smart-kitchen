// LocalStorage management with schema versioning and default seeds

import { CONFIG } from '../config.js';
import { generateId } from '../utils/uuid.js';
import { FirebaseService } from '../services/firebase.js';

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
  theme: 'light',
  onboardingDone: false
};

let realtimeUnsubscribe = null;

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

  /**
   * Mendapatkan User ID unik perangkat/pengguna saat ini.
   * Jika belum ada, otomatis membuat User ID baru.
   */
  static getUserId() {
    let uid = localStorage.getItem('dapur_pintar_active_user_id');
    if (!uid) {
      uid = 'usr_' + generateId().replace(/-/g, '').slice(0, 10);
      localStorage.setItem('dapur_pintar_active_user_id', uid);
    }
    return uid;
  }

  /**
   * Menetapkan atau mengganti User ID aktif (misal untuk multi-user / tautkan dapur keluarga)
   */
  static setUserId(uid) {
    if (!uid || typeof uid !== 'string') return;
    const clean = uid.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    localStorage.setItem('dapur_pintar_active_user_id', clean);
    return clean;
  }

  /**
   * Menghasilkan key localStorage yang terisolasi per user
   */
  static getUserKey(baseKey) {
    const uid = StorageService.getUserId();
    return `${baseKey}_${uid}`;
  }

  static initDefaults() {
    const uid = StorageService.getUserId();
    const stokKey = StorageService.getUserKey(CONFIG.STORAGE_KEYS.STOK);
    const masakKey = StorageService.getUserKey(CONFIG.STORAGE_KEYS.LOG_MASAK);
    const belanjaKey = StorageService.getUserKey(CONFIG.STORAGE_KEYS.LOG_BELANJA);
    const settingsKey = StorageService.getUserKey(CONFIG.STORAGE_KEYS.SETTINGS);

    // Cek apakah data user sudah ada, jika belum coba migrasi dari legacy key jika ada
    let currentStok = StorageService.get(stokKey);
    if (!currentStok) {
      const legacyStok = StorageService.get(CONFIG.STORAGE_KEYS.STOK);
      if (legacyStok && legacyStok.version && (legacyStok.kulkas?.length > 0 || legacyStok.dapur?.length > 0)) {
        currentStok = { ...legacyStok, userId: uid };
      } else {
        currentStok = { ...INITIAL_STOK, userId: uid };
      }
      StorageService.set(stokKey, currentStok);
    }

    let currentLogMasak = StorageService.get(masakKey);
    if (!currentLogMasak) {
      const legacyMasak = StorageService.get(CONFIG.STORAGE_KEYS.LOG_MASAK);
      currentLogMasak = legacyMasak || { ...INITIAL_LOG_MASAK };
      StorageService.set(masakKey, currentLogMasak);
    }

    let currentLogBelanja = StorageService.get(belanjaKey);
    if (!currentLogBelanja) {
      const legacyBelanja = StorageService.get(CONFIG.STORAGE_KEYS.LOG_BELANJA);
      currentLogBelanja = legacyBelanja || { ...INITIAL_LOG_BELANJA };
      StorageService.set(belanjaKey, currentLogBelanja);
    }

    let currentSettings = StorageService.get(settingsKey);
    if (!currentSettings) {
      const legacySettings = StorageService.get(CONFIG.STORAGE_KEYS.SETTINGS);
      currentSettings = legacySettings || { ...INITIAL_SETTINGS, userId: uid };
      StorageService.set(settingsKey, currentSettings);
    }

    // Trigger cloud synchronization immediately and attach realtime listener
    StorageService.syncFromCloud();
    StorageService.listenToRealtimeSync();
  }

  static async syncFromCloud(force = false) {
    try {
      const uid = StorageService.getUserId();
      await FirebaseService.init();
      const cloudStok = await FirebaseService.fetchStokFromCloud(uid);
      if (cloudStok && (Array.isArray(cloudStok.kulkas) || Array.isArray(cloudStok.dapur))) {
        const local = StorageService.getStok();
        const cloudTime = new Date(cloudStok.lastUpdated || 0).getTime();
        const localTime = new Date(local.lastUpdated || 0).getTime();
        const localEmpty = (!local.kulkas || local.kulkas.length === 0) && (!local.dapur || local.dapur.length === 0);
        const cloudHasData = (cloudStok.kulkas && cloudStok.kulkas.length > 0) || (cloudStok.dapur && cloudStok.dapur.length > 0);

        if (force || cloudTime > localTime || (localEmpty && cloudHasData)) {
          cloudStok.kulkas = cloudStok.kulkas || [];
          cloudStok.dapur = cloudStok.dapur || [];
          cloudStok.userId = uid;
          StorageService.set(StorageService.getUserKey(CONFIG.STORAGE_KEYS.STOK), cloudStok);
          console.log(`Stok user [${uid}] berhasil disinkronkan dari Cloud Firestore`);
          window.dispatchEvent(new CustomEvent('dapur-stok-synced', { detail: cloudStok }));
          return cloudStok;
        }
      }
      return null;
    } catch (e) {
      console.warn('Sync from cloud error:', e);
      return null;
    }
  }

  static async listenToRealtimeSync() {
    try {
      if (typeof realtimeUnsubscribe === 'function') {
        realtimeUnsubscribe();
        realtimeUnsubscribe = null;
      }
      const uid = StorageService.getUserId();
      realtimeUnsubscribe = await FirebaseService.listenToStokChanges((cloudStok) => {
        if (cloudStok && (Array.isArray(cloudStok.kulkas) || Array.isArray(cloudStok.dapur))) {
          cloudStok.kulkas = cloudStok.kulkas || [];
          cloudStok.dapur = cloudStok.dapur || [];
          cloudStok.userId = uid;
          StorageService.set(StorageService.getUserKey(CONFIG.STORAGE_KEYS.STOK), cloudStok);
          window.dispatchEvent(new CustomEvent('dapur-stok-synced', { detail: cloudStok }));
        }
      }, uid);
    } catch (e) {
      console.warn('Realtime sync setup error:', e);
    }
  }

  /**
   * Beralih ke User ID lain (misal menautkan ID akun keluarga atau membuat profil baru)
   */
  static async switchUser(newUserId) {
    if (!newUserId || !newUserId.trim()) return false;
    const cleanUid = StorageService.setUserId(newUserId);
    StorageService.initDefaults();
    await StorageService.syncFromCloud(true);
    await StorageService.listenToRealtimeSync();
    window.dispatchEvent(new CustomEvent('dapur-stok-synced', { detail: StorageService.getStok() }));
    return cleanUid;
  }

  static clearAllData() {
    const uid = StorageService.getUserId();
    const emptyStok = { ...INITIAL_STOK, userId: uid };
    StorageService.set(StorageService.getUserKey(CONFIG.STORAGE_KEYS.STOK), emptyStok);
    StorageService.set(StorageService.getUserKey(CONFIG.STORAGE_KEYS.LOG_MASAK), INITIAL_LOG_MASAK);
    StorageService.set(StorageService.getUserKey(CONFIG.STORAGE_KEYS.LOG_BELANJA), INITIAL_LOG_BELANJA);
    FirebaseService.syncStokToCloud(emptyStok, uid);
    window.dispatchEvent(new CustomEvent('dapur-stok-synced', { detail: emptyStok }));
  }

  // Stok CRUD
  static getStok() {
    return StorageService.get(StorageService.getUserKey(CONFIG.STORAGE_KEYS.STOK), { ...INITIAL_STOK, userId: StorageService.getUserId() });
  }

  static saveStok(stokData) {
    const uid = StorageService.getUserId();
    stokData.lastUpdated = new Date().toISOString();
    stokData.userId = uid;
    const result = StorageService.set(StorageService.getUserKey(CONFIG.STORAGE_KEYS.STOK), stokData);
    // Background sync to Cloud Firestore per user
    FirebaseService.syncStokToCloud(stokData, uid);
    window.dispatchEvent(new CustomEvent('dapur-stok-synced', { detail: stokData }));
    return result;
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
    return StorageService.get(StorageService.getUserKey(CONFIG.STORAGE_KEYS.LOG_MASAK), INITIAL_LOG_MASAK);
  }

  static addLogMasak(entry) {
    const uid = StorageService.getUserId();
    const log = StorageService.getLogMasak();
    log.entries.unshift({
      id: generateId(),
      tanggal: new Date().toISOString(),
      ...entry
    });
    StorageService.set(StorageService.getUserKey(CONFIG.STORAGE_KEYS.LOG_MASAK), log);
    FirebaseService.syncLogMasakToCloud(log, uid);
    return log;
  }

  // Log Belanja
  static getLogBelanja() {
    return StorageService.get(StorageService.getUserKey(CONFIG.STORAGE_KEYS.LOG_BELANJA), INITIAL_LOG_BELANJA);
  }

  static addLogBelanja(entry) {
    const uid = StorageService.getUserId();
    const log = StorageService.getLogBelanja();
    log.entries.unshift({
      id: generateId(),
      tanggal: new Date().toISOString(),
      ...entry
    });
    StorageService.set(StorageService.getUserKey(CONFIG.STORAGE_KEYS.LOG_BELANJA), log);
    FirebaseService.syncLogBelanjaToCloud(log, uid);
    return log;
  }

  // Settings
  static getSettings() {
    return StorageService.get(StorageService.getUserKey(CONFIG.STORAGE_KEYS.SETTINGS), { ...INITIAL_SETTINGS, userId: StorageService.getUserId() });
  }

  static saveSettings(settings) {
    settings.userId = StorageService.getUserId();
    return StorageService.set(StorageService.getUserKey(CONFIG.STORAGE_KEYS.SETTINGS), settings);
  }
}
