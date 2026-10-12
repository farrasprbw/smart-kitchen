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
   * Simpan data stok ke Firestore
   */
  static async syncStokToCloud(stokData) {
    if (!db) await FirebaseService.init();
    if (!db) return false;

    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docRef = doc(db, 'dapur_pintar_data', 'stok_utama');
      await setDoc(docRef, {
        ...stokData,
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
   * Tarik data stok dari Firestore
   */
  static async fetchStokFromCloud() {
    if (!db) await FirebaseService.init();
    if (!db) return null;

    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docRef = doc(db, 'dapur_pintar_data', 'stok_utama');
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
   * Simpan log masak ke Firestore
   */
  static async syncLogMasakToCloud(logData) {
    if (!db) await FirebaseService.init();
    if (!db) return false;

    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docRef = doc(db, 'dapur_pintar_data', 'log_masak');
      await setDoc(docRef, {
        ...logData,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('Gagal sync log masak ke Firestore:', err);
      return false;
    }
  }

  /**
   * Simpan log belanja ke Firestore
   */
  static async syncLogBelanjaToCloud(logData) {
    if (!db) await FirebaseService.init();
    if (!db) return false;

    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docRef = doc(db, 'dapur_pintar_data', 'log_belanja');
      await setDoc(docRef, {
        ...logData,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('Gagal sync log belanja ke Firestore:', err);
      return false;
    }
  }

  /**
   * Pasang listener perubahan realtime dari Cloud Firestore
   */
  static async listenToStokChanges(callback) {
    if (!db) await FirebaseService.init();
    if (!db) return () => {};

    try {
      const { doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const docRef = doc(db, 'dapur_pintar_data', 'stok_utama');
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
}
