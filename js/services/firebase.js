// Firebase Service — Cloud Firestore Integration for Dapur Pintar
import { CONFIG } from '../config.js';

let db = null;
let isInitialized = false;
let syncListeners = [];

export class FirebaseService {
  /**
   * Inisialisasi Firebase App & Firestore
   */
  static async init() {
    if (isInitialized) return db;
    if (!CONFIG.FIREBASE?.enabled || !CONFIG.FIREBASE?.apiKey) {
      console.log('Firebase sync dinonaktifkan.');
      return null;
    }

    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js');
      const { 
        getFirestore
      } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');

      const app = initializeApp(CONFIG.FIREBASE);
      db = getFirestore(app);
      isInitialized = true;
      console.log('Firebase Cloud Firestore berhasil diinisialisasi untuk dapur-pintar-ai');
      return db;
    } catch (err) {
      console.warn('Gagal menginisialisasi Firebase Firestore:', err);
      return null;
    }
  }

  /**
   * Helper untuk mendapatkan document ID yang terisolasi per user
   */
  static getDocId(userId, type) {
    const cleanUid = (userId || 'default').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return `user_${cleanUid}_${type}`;
  }

  /**
   * Simpan data stok ke Firestore per user
   */
  static async syncStokToCloud(stokData, userId = 'default') {
    if (!db) await FirebaseService.init();
    if (!db) return false;

    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docId = FirebaseService.getDocId(userId, 'stok');
      const docRef = doc(db, 'dapur_pintar_data', docId);
      await setDoc(docRef, {
        ...stokData,
        userId,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      FirebaseService.notifyListeners('synced', 'Stok berhasil disinkronkan ke Cloud Firestore');
      return true;
    } catch (err) {
      console.warn('Gagal sync stok ke Firestore:', err);
      FirebaseService.notifyListeners('error', err.message);
      return false;
    }
  }

  /**
   * Tarik data stok dari Firestore per user
   */
  static async fetchStokFromCloud(userId = 'default') {
    if (!db) await FirebaseService.init();
    if (!db) return null;

    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docId = FirebaseService.getDocId(userId, 'stok');
      const docRef = doc(db, 'dapur_pintar_data', docId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data();
      }
      return null;
    } catch (err) {
      console.warn('Gagal membaca stok dari Firestore:', err);
      return null;
    }
  }

  /**
   * Simpan log masak ke Firestore per user
   */
  static async syncLogMasakToCloud(logData, userId = 'default') {
    if (!db) await FirebaseService.init();
    if (!db) return false;

    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docId = FirebaseService.getDocId(userId, 'log_masak');
      const docRef = doc(db, 'dapur_pintar_data', docId);
      await setDoc(docRef, {
        ...logData,
        userId,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('Gagal sync log masak ke Firestore:', err);
      return false;
    }
  }

  /**
   * Simpan log belanja ke Firestore per user
   */
  static async syncLogBelanjaToCloud(logData, userId = 'default') {
    if (!db) await FirebaseService.init();
    if (!db) return false;

    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docId = FirebaseService.getDocId(userId, 'log_belanja');
      const docRef = doc(db, 'dapur_pintar_data', docId);
      await setDoc(docRef, {
        ...logData,
        userId,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('Gagal sync log belanja ke Firestore:', err);
      return false;
    }
  }

  /**
   * Pasang listener perubahan realtime dari Cloud Firestore per user
   */
  static async listenToStokChanges(callback, userId = 'default') {
    if (!db) await FirebaseService.init();
    if (!db) return () => {};

    try {
      const { doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docId = FirebaseService.getDocId(userId, 'stok');
      const docRef = doc(db, 'dapur_pintar_data', docId);
      return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data());
        }
      });
    } catch (err) {
      console.warn('Gagal memasang realtime listener Firestore:', err);
      return () => {};
    }
  }

  static onSyncStatus(fn) {
    syncListeners.push(fn);
    return () => {
      syncListeners = syncListeners.filter(l => l !== fn);
    };
  }

  static notifyListeners(status, message) {
    syncListeners.forEach(listener => {
      try {
        listener(status, message);
      } catch (e) {
        console.error(e);
      }
    });
  }

  /**
   * Mengambil gambar resep dari Global Shared Cache Firestore
   * @param {string} slug Slug nama resep
   * @returns {Promise<string|null>}
   */
  static async getCachedRecipeImage(slug) {
    if (!db) await FirebaseService.init();
    if (!db) return null;

    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docId = `recipe_img_${slug}`;
      const docRef = doc(db, 'dapur_pintar_data', docId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return data?.imageUrl || null;
      }
      return null;
    } catch (err) {
      console.warn('Gagal membaca cache gambar dari Firestore:', err);
      return null;
    }
  }

  /**
   * Menyimpan gambar resep ke Global Shared Cache Firestore agar user lain hemat kuota
   * @param {string} slug Slug nama resep
   * @param {string} imageUrl Data URL atau URL gambar
   * @param {string} recipeName Nama masakan
   */
  static async saveCachedRecipeImage(slug, imageUrl, recipeName = '') {
    if (!db) await FirebaseService.init();
    if (!db || !imageUrl) return false;

    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docId = `recipe_img_${slug}`;
      const docRef = doc(db, 'dapur_pintar_data', docId);
      await setDoc(docRef, {
        slug,
        recipeName,
        imageUrl,
        createdAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('Gagal menyimpan cache gambar ke Firestore:', err);
      return false;
    }
  }
}
