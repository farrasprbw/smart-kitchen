// LocalStorage management with schema versioning and default seeds

import { CONFIG } from '../config.js';
import { generateId } from '../utils/uuid.js';

const INITIAL_STOK = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  kulkas: [
    {
      id: 'kulkas-1',
      nama: 'Telur Ayam',
      jumlah: 10,
      satuan: 'butir',
      kategori: 'protein',
      lokasi: 'kulkas',
      status: 'Segar',
      statusClass: 'bg-primary-container/15 text-primary-container',
      yakin: true,
      confidence: 98,
      catatan: '',
      icon: 'egg',
      ditambahkan: new Date(Date.now() - 3600000 * 24).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'kulkas-2',
      nama: 'Tomat Merah',
      jumlah: 4,
      satuan: 'buah',
      kategori: 'sayur',
      lokasi: 'kulkas',
      status: 'Sisa 2 hari',
      statusClass: 'bg-secondary-container/20 text-secondary-container',
      yakin: true,
      confidence: 92,
      catatan: 'Segera gunakan',
      icon: 'nutrition',
      ditambahkan: new Date(Date.now() - 3600000 * 48).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'kulkas-3',
      nama: 'Sawi Hijau',
      jumlah: 1,
      satuan: 'ikat',
      kategori: 'sayur',
      lokasi: 'kulkas',
      status: 'Segera Olah',
      statusClass: 'bg-error-container text-error',
      yakin: true,
      confidence: 88,
      catatan: 'Mulai layu di ujung daun',
      icon: 'grass',
      ditambahkan: new Date(Date.now() - 3600000 * 72).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'kulkas-4',
      nama: 'Tahu Putih',
      jumlah: 1,
      satuan: 'bungkus',
      kategori: 'protein',
      lokasi: 'kulkas',
      status: 'Segar',
      statusClass: 'bg-primary-container/15 text-primary-container',
      yakin: true,
      confidence: 95,
      catatan: '',
      icon: 'inventory_2',
      ditambahkan: new Date(Date.now() - 3600000 * 12).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'kulkas-5',
      nama: 'Susu UHT',
      jumlah: 1,
      satuan: 'liter',
      kategori: 'minuman',
      lokasi: 'pintu_kulkas',
      status: 'Sisa 3 hari',
      statusClass: 'bg-secondary-container/20 text-secondary-container',
      yakin: true,
      confidence: 96,
      catatan: 'Sudah dibuka',
      icon: 'water_bottle',
      ditambahkan: new Date(Date.now() - 3600000 * 20).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'kulkas-6',
      nama: 'Daging Sapi',
      jumlah: 500,
      satuan: 'gram',
      kategori: 'protein',
      lokasi: 'freezer',
      status: 'Freezer',
      statusClass: 'bg-surface-container-highest text-on-surface-variant',
      yakin: true,
      confidence: 94,
      catatan: 'Beku dalam zipper pouch',
      icon: 'set_meal',
      ditambahkan: new Date(Date.now() - 3600000 * 96).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'kulkas-7',
      nama: 'Wortel',
      jumlah: 3,
      satuan: 'buah',
      kategori: 'sayur',
      lokasi: 'laci_sayur',
      status: 'Segar',
      statusClass: 'bg-primary-container/15 text-primary-container',
      yakin: true,
      confidence: 95,
      catatan: '',
      icon: 'nutrition',
      ditambahkan: new Date(Date.now() - 3600000 * 24).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'kulkas-8',
      nama: 'Daun Bawang',
      jumlah: 2,
      satuan: 'batang',
      kategori: 'sayur',
      lokasi: 'laci_sayur',
      status: 'Segera Olah',
      statusClass: 'bg-error-container text-error',
      yakin: true,
      confidence: 85,
      catatan: 'Ujung mulai kering',
      icon: 'eco',
      ditambahkan: new Date(Date.now() - 3600000 * 48).toISOString(),
      diperbarui: new Date().toISOString()
    }
  ],
  dapur: [
    {
      id: 'dapur-1',
      nama: 'Beras Ramos',
      jumlah: 5,
      satuan: 'kg',
      kategori: 'bahan_kering',
      lokasi: 'dapur',
      status: 'Stok Cukup',
      statusClass: 'bg-surface-container-high text-on-surface-variant',
      yakin: true,
      confidence: 100,
      catatan: 'Wadah kedap udara',
      icon: 'grain',
      ditambahkan: new Date(Date.now() - 3600000 * 120).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'dapur-2',
      nama: 'Minyak Goreng',
      jumlah: 2,
      satuan: 'liter',
      kategori: 'bumbu_dasar',
      lokasi: 'dapur',
      status: 'Stok Cukup',
      statusClass: 'bg-surface-container-high text-on-surface-variant',
      yakin: true,
      confidence: 100,
      catatan: 'Kemasan pouch refill',
      icon: 'oil_barrel',
      ditambahkan: new Date(Date.now() - 3600000 * 100).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'dapur-3',
      nama: 'Bawang Merah',
      jumlah: 250,
      satuan: 'gram',
      kategori: 'bumbu_dasar',
      lokasi: 'dapur',
      status: 'Sisa Sedikit',
      statusClass: 'bg-secondary-container/20 text-secondary-container',
      yakin: true,
      confidence: 100,
      catatan: 'Di keranjang bumbu kering',
      icon: 'spa',
      ditambahkan: new Date(Date.now() - 3600000 * 80).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'dapur-4',
      nama: 'Bawang Putih',
      jumlah: 200,
      satuan: 'gram',
      kategori: 'bumbu_dasar',
      lokasi: 'dapur',
      status: 'Sisa Sedikit',
      statusClass: 'bg-secondary-container/20 text-secondary-container',
      yakin: true,
      confidence: 100,
      catatan: 'Di keranjang bumbu kering',
      icon: 'spa',
      ditambahkan: new Date(Date.now() - 3600000 * 80).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'dapur-5',
      nama: 'Kecap Manis',
      jumlah: 1,
      satuan: 'botol',
      kategori: 'bumbu_dasar',
      lokasi: 'dapur',
      status: 'Stok Cukup',
      statusClass: 'bg-surface-container-high text-on-surface-variant',
      yakin: true,
      confidence: 100,
      catatan: 'Botol kaca 600ml',
      icon: 'liquor',
      ditambahkan: new Date(Date.now() - 3600000 * 60).toISOString(),
      diperbarui: new Date().toISOString()
    },
    {
      id: 'dapur-6',
      nama: 'Garam Dapur',
      jumlah: 1,
      satuan: 'bungkus',
      kategori: 'bumbu_dasar',
      lokasi: 'dapur',
      status: 'Stok Cukup',
      statusClass: 'bg-surface-container-high text-on-surface-variant',
      yakin: true,
      confidence: 100,
      catatan: 'Beryodium 250g',
      icon: 'grain',
      ditambahkan: new Date(Date.now() - 3600000 * 140).toISOString(),
      diperbarui: new Date().toISOString()
    }
  ]
};

const INITIAL_LOG_MASAK = {
  version: 1,
  entries: [
    {
      id: 'log-1',
      tanggal: new Date(Date.now() - 3600000 * 18).toISOString(),
      resep: 'Telur Dadar Daun Bawang',
      waktu_masak: '10 menit',
      tingkat_kesulitan: 'Mudah',
      bahan_terpakai: [
        { nama: 'Telur Ayam', jumlah: 2, satuan: 'butir' },
        { nama: 'Daun Bawang', jumlah: 1, satuan: 'batang' }
      ]
    }
  ]
};

const INITIAL_LOG_BELANJA = {
  version: 1,
  entries: [
    {
      id: 'belanja-1',
      tanggal: new Date(Date.now() - 3600000 * 48).toISOString(),
      metode: 'foto',
      items: [
        { nama: 'Telur Ayam', jumlah: 10, satuan: 'butir' },
        { nama: 'Tomat Merah', jumlah: 4, satuan: 'buah' },
        { nama: 'Susu UHT', jumlah: 1, satuan: 'liter' }
      ]
    }
  ]
};

const INITIAL_SETTINGS = {
  version: 1,
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
    if (!StorageService.get(CONFIG.STORAGE_KEYS.STOK)) {
      StorageService.set(CONFIG.STORAGE_KEYS.STOK, INITIAL_STOK);
    }
    if (!StorageService.get(CONFIG.STORAGE_KEYS.LOG_MASAK)) {
      StorageService.set(CONFIG.STORAGE_KEYS.LOG_MASAK, INITIAL_LOG_MASAK);
    }
    if (!StorageService.get(CONFIG.STORAGE_KEYS.LOG_BELANJA)) {
      StorageService.set(CONFIG.STORAGE_KEYS.LOG_BELANJA, INITIAL_LOG_BELANJA);
    }
    const currentSettings = StorageService.get(CONFIG.STORAGE_KEYS.SETTINGS);
    if (!currentSettings) {
      StorageService.set(CONFIG.STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    } else if (!currentSettings.apiKey) {
      currentSettings.apiKey = INITIAL_SETTINGS.apiKey;
      StorageService.set(CONFIG.STORAGE_KEYS.SETTINGS, currentSettings);
    }
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
