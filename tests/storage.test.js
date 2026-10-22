import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService } from '../js/core/storage.js';

describe('StorageService Inventory & Cooking Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('initial inventory returns empty list or default structure', () => {
    const items = StorageService.getInventory();
    assert.ok(Array.isArray(items));
    assert.equal(items.length, 0);
  });

  test('adds and retrieves inventory items', () => {
    const item = { id: 'test-1', nama: 'Bawang Merah', jumlah: 10, satuan: 'siung' };
    StorageService.saveInventory([item]);
    const items = StorageService.getInventory();
    assert.equal(items.length, 1);
    assert.equal(items[0].nama, 'Bawang Merah');
    assert.equal(items[0].jumlah, 10);
  });

  test('kurangiStokMasak correctly deducts stock when quantity is sufficient', () => {
    const item = { id: 'test-1', nama: 'Telur Ayam', jumlah: 5, satuan: 'butir' };
    StorageService.saveInventory([item]);

    StorageService.kurangiStokMasak([
      { nama: 'Telur Ayam', jumlah: 2, satuan: 'butir' }
    ]);

    const updated = StorageService.getInventory();
    assert.equal(updated.length, 1);
    assert.equal(updated[0].jumlah, 3);
  });

  test('kurangiStokMasak removes item when used quantity equals or exceeds stock', () => {
    const item = { id: 'test-1', nama: 'Wortel', jumlah: 2, satuan: 'buah' };
    StorageService.saveInventory([item]);

    StorageService.kurangiStokMasak([
      { nama: 'Wortel', jumlah: 2, satuan: 'buah' }
    ]);

    const updated = StorageService.getInventory();
    assert.equal(updated.length, 0);
  });

  test('kurangiStokMasak handles case-insensitive name matching', () => {
    const item = { id: 'test-1', nama: 'Cabai Rawit', jumlah: 10, satuan: 'buah' };
    StorageService.saveInventory([item]);

    StorageService.kurangiStokMasak([
      { nama: 'cabai rawit ', jumlah: 4, satuan: 'buah' }
    ]);

    const updated = StorageService.getInventory();
    assert.equal(updated.length, 1);
    assert.equal(updated[0].jumlah, 6);
  });

  test('kurangiStokMasak safely ignores unknown ingredients or zero quantities', () => {
    const item = { id: 'test-1', nama: 'Beras', jumlah: 1000, satuan: 'gram' };
    StorageService.saveInventory([item]);

    StorageService.kurangiStokMasak([
      { nama: 'Gula Pasir', jumlah: 50, satuan: 'gram' },
      { nama: 'Beras', jumlah: 0, satuan: 'gram' },
      { nama: '', jumlah: 100 }
    ]);

    const updated = StorageService.getInventory();
    assert.equal(updated.length, 1);
    assert.equal(updated[0].jumlah, 1000);
  });
});
