import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Polyfill localStorage and window for Node.js environment
const store = new Map();
const localStorageMock = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
  removeItem(key) {
    store.delete(key);
  },
  clear() {
    store.clear();
  }
};

globalThis.localStorage = localStorageMock;
if (typeof window === 'undefined') {
  globalThis.window = {
    localStorage: localStorageMock,
    dispatchEvent() {}
  };
}

// Import StorageService dynamically after mock is assigned
const { StorageService } = await import('../js/core/storage.js');

describe('StorageService Inventory & Cooking Logic', () => {
  beforeEach(async () => {
    await StorageService.clearAllData();
  });

  test('getStok returns initial structure with kulkas and dapur lists', () => {
    const stok = StorageService.getStok();
    assert.ok(Array.isArray(stok.kulkas));
    assert.ok(Array.isArray(stok.dapur));
    assert.equal(stok.kulkas.length, 0);
    assert.equal(stok.dapur.length, 0);
  });

  test('addItemsToStok successfully adds an item', () => {
    StorageService.addItemsToStok([{
      nama: 'Telur Ayam',
      jumlah: 10,
      satuan: 'butir'
    }], 'kulkas');

    const stok = StorageService.getStok();
    assert.equal(stok.kulkas.length, 1);
    assert.equal(stok.kulkas[0].nama, 'Telur Ayam');
    assert.equal(stok.kulkas[0].jumlah, 10);
  });

  test('kurangiStokMasak correctly deducts quantity from matching ingredient', () => {
    StorageService.addItemsToStok([{
      id: 'telur-1',
      nama: 'Telur Ayam',
      jumlah: 6,
      satuan: 'butir'
    }], 'kulkas');

    const berkurang = StorageService.kurangiStokMasak([
      { nama: 'Telur Ayam', jumlah: 2, satuan: 'butir' }
    ]);

    assert.equal(berkurang.length, 1);
    assert.equal(berkurang[0].nama, 'Telur Ayam');
    assert.equal(berkurang[0].sisa, 4);

    const stok = StorageService.getStok();
    assert.equal(stok.kulkas[0].jumlah, 4);
  });

  test('kurangiStokMasak prevents quantity from dropping below zero', () => {
    StorageService.addItemsToStok([{
      id: 'bawang-1',
      nama: 'Bawang Putih',
      jumlah: 3,
      satuan: 'siung'
    }], 'dapur');

    const berkurang = StorageService.kurangiStokMasak([
      { nama: 'Bawang Putih', jumlah: 5, satuan: 'siung' }
    ]);

    assert.equal(berkurang.length, 1);
    assert.equal(berkurang[0].sisa, 0);

    const stok = StorageService.getStok();
    assert.equal(stok.dapur[0].jumlah, 0);
  });

  test('kurangiStokMasak handles case-insensitive and partial name matching', () => {
    StorageService.addItemsToStok([{
      id: 'wortel-1',
      nama: 'Wortel Segar',
      jumlah: 4,
      satuan: 'buah'
    }], 'kulkas');

    const berkurang = StorageService.kurangiStokMasak([
      { nama: 'wortel', jumlah: 1, satuan: 'buah' }
    ]);

    assert.equal(berkurang.length, 1);
    assert.equal(berkurang[0].sisa, 3);
  });

  test('deleteStokItem removes item by id from any storage section', () => {
    StorageService.addItemsToStok([{
      id: 'kecap-1',
      nama: 'Kecap Manis',
      jumlah: 1,
      satuan: 'botol'
    }], 'dapur');

    assert.equal(StorageService.getStok().dapur.length, 1);

    StorageService.deleteStokItem('kecap-1');
    assert.equal(StorageService.getStok().dapur.length, 0);
  });
});
