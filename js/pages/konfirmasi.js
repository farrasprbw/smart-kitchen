// Konfirmasi Deteksi Bahan Page (Stack View)

import { StorageService } from '../core/storage.js';
import { renderHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { ModalService } from '../components/modal.js';
import { store } from '../core/state.js';

export function renderKonfirmasiPage() {
  const mainEl = document.getElementById('app-main');
  if (!mainEl) return;

  const scanState = store.getState();
  const detectionData = scanState.detectionResults;

  // Fallback sample items if navigated directly without camera capture
  const defaultItems = [
    { id: 'c-1', nama: 'Telur Ayam', jumlah: 10, satuan: 'butir', kategori: 'protein', lokasi: 'kulkas', confidence: 98, yakin: true, status: 'Yakin', statusClass: 'bg-emerald-100 text-emerald-800', catatan: '' },
    { id: 'c-2', nama: 'Sawi Hijau', jumlah: 1, satuan: 'ikat', kategori: 'sayur', lokasi: 'kulkas', confidence: 85, yakin: true, status: 'Yakin', statusClass: 'bg-emerald-100 text-emerald-800', catatan: 'Mulai layu di ujung daun' },
    { id: 'c-3', nama: 'Tomat Merah', jumlah: 4, satuan: 'buah', kategori: 'sayur', lokasi: 'kulkas', confidence: 92, yakin: true, status: 'Yakin', statusClass: 'bg-emerald-100 text-emerald-800', catatan: '' },
    { id: 'c-4', nama: 'Susu UHT Segar', jumlah: 1, satuan: 'liter', kategori: 'minuman', lokasi: 'pintu_kulkas', confidence: 60, yakin: false, status: 'Perlu Cek', statusClass: 'bg-amber-100 text-amber-800', catatan: 'Sisa sekitar separuh botol' },
    { id: 'c-5', nama: 'Kecap Asin / Manis', jumlah: 1, satuan: 'botol', kategori: 'bumbu_dasar', lokasi: 'pintu_kulkas', confidence: 50, yakin: false, status: 'Kurang Jelas', statusClass: 'bg-rose-100 text-rose-800', catatan: 'Label botol agak terhalang' },
    { id: 'c-6', nama: 'Tahu Putih Sutra', jumlah: 1, satuan: 'bungkus', kategori: 'protein', lokasi: 'kulkas', confidence: 94, yakin: true, status: 'Yakin', statusClass: 'bg-emerald-100 text-emerald-800', catatan: '' },
    { id: 'c-7', nama: 'Daun Bawang', jumlah: 2, satuan: 'batang', kategori: 'sayur', lokasi: 'laci_sayur', confidence: 75, yakin: false, status: 'Perlu Cek', statusClass: 'bg-amber-100 text-amber-800', catatan: 'Sebagian ujung agak kering' },
    { id: 'c-8', nama: 'Wortel Impor', jumlah: 3, satuan: 'buah', kategori: 'sayur', lokasi: 'laci_sayur', confidence: 95, yakin: true, status: 'Yakin', statusClass: 'bg-emerald-100 text-emerald-800', catatan: '' },
  ];

  let rawItems = detectionData?.items || defaultItems;

  // Normalize items
  let confirmedItems = rawItems.map((item, idx) => {
    const conf = item.confidence || (item.yakin ? 92 : 60);
    let status = 'Yakin';
    let statusClass = 'bg-emerald-100 text-emerald-800';
    if (conf < 70) {
      status = 'Kurang Jelas';
      statusClass = 'bg-rose-100 text-rose-800';
    } else if (conf < 88 || !item.yakin) {
      status = 'Perlu Cek';
      statusClass = 'bg-amber-100 text-amber-800';
    }

    return {
      id: item.id || `c-${idx + 1}`,
      nama: item.nama || 'Bahan Makanan',
      jumlah: item.jumlah ?? 1,
      satuan: item.satuan || 'buah',
      kategori: item.kategori || 'sayur',
      lokasi: item.lokasi || (scanState.scanType === 'belanja' ? (item.simpan_di || 'kulkas') : 'kulkas'),
      confidence: conf,
      yakin: conf >= 70,
      status,
      statusClass,
      catatan: item.catatan || ''
    };
  });

  let activeFilter = 'semua'; // 'semua' | 'perlu-cek' | 'yakin'

  // Header
  renderHeader({
    type: 'stack',
    title: 'Konfirmasi Deteksi Bahan',
    subtitle: 'Hasil Pindai Multi-Foto',
    backHash: 'pindai',
    rightAction: `
      <button id="btn-header-add" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition active:scale-95">
        <span class="material-symbols-outlined text-[16px]">add</span>
        <span>Tambah</span>
      </button>
    `
  });

  function renderContent() {
    const photos = detectionData?.photos || [];
    const filteredItems = confirmedItems.filter(item => {
      if (activeFilter === 'perlu-cek') return item.status === 'Perlu Cek' || item.status === 'Kurang Jelas';
      if (activeFilter === 'yakin') return item.status === 'Yakin';
      return true;
    });

    const countPerluCek = confirmedItems.filter(i => i.status === 'Perlu Cek' || i.status === 'Kurang Jelas').length;
    const countYakin = confirmedItems.filter(i => i.status === 'Yakin').length;

    mainEl.innerHTML = `
      <div class="page-enter flex flex-col w-full max-w-md mx-auto px-4 pt-2 pb-28 gap-4">

        <!-- Status Banner & Summary -->
        <section>
          <div class="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div class="flex items-start gap-3 relative z-10">
              <div class="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                <span class="material-symbols-outlined text-[24px]">auto_awesome</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[10px] font-bold mb-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  Hasil Pemindaian Otomatis
                </div>
                <h2 class="text-base font-bold text-slate-900 leading-snug">
                  Terdeteksi ${confirmedItems.length} bahan makanan
                </h2>
                <p class="text-xs text-slate-600 mt-1 leading-relaxed">
                  Periksa nama, perkiraan jumlah, dan lokasi simpan sebelum dimasukkan ke stok.
                </p>
              </div>
            </div>

            <!-- Thumbnails Row -->
            <div class="mt-3.5 pt-2.5 border-t border-emerald-100/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <div class="flex items-center gap-1 text-slate-500 text-[11px] font-medium mr-1 flex-shrink-0">
                <span class="material-symbols-outlined text-[15px]">photo_camera</span>
                <span>Foto:</span>
              </div>
              ${
                photos.length > 0
                  ? photos.map((p, i) => `
                      <div class="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200/70 shadow-sm">
                        <img src="${p.dataUrl}" class="w-full h-full object-cover" alt="Foto ${i+1}">
                        <span class="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[9px] px-1 font-medium rounded-tl">Sudut ${i+1}</span>
                      </div>
                    `).join('')
                  : `
                      <div class="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200/70 shadow-sm bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">
                        <span class="material-symbols-outlined text-[20px]">shelves</span>
                      </div>
                      <div class="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200/70 shadow-sm bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">
                        <span class="material-symbols-outlined text-[20px]">grass</span>
                      </div>
                      <div class="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200/70 shadow-sm bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">
                        <span class="material-symbols-outlined text-[20px]">ac_unit</span>
                      </div>
                    `
              }
            </div>
          </div>
        </section>

        <!-- Filter Tabs -->
        <div class="flex items-center gap-2">
          <button id="filter-all" class="px-3.5 py-1.5 rounded-full text-xs font-bold transition ${activeFilter === 'semua' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">
            Semua (${confirmedItems.length})
          </button>
          <button id="filter-perlu-cek" class="px-3.5 py-1.5 rounded-full text-xs font-bold transition ${activeFilter === 'perlu-cek' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">
            Perlu Cek (${countPerluCek})
          </button>
          <button id="filter-yakin" class="px-3.5 py-1.5 rounded-full text-xs font-bold transition ${activeFilter === 'yakin' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}">
            Yakin (${countYakin})
          </button>
        </div>

        <!-- Ingredient Cards -->
        <div class="flex flex-col gap-3" id="cards-container">
          ${filteredItems.map(item => `
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-slate-200 transition" data-card-id="${item.id}">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold px-2 py-0.5 rounded-md ${item.statusClass}">
                    ${item.confidence}% ${item.status}
                  </span>
                  <span class="text-[11px] text-slate-500 capitalize">📍 ${item.lokasi.replace('_', ' ')}</span>
                </div>
                <button class="btn-remove-card text-slate-400 hover:text-rose-500 active:scale-90 transition p-1" data-id="${item.id}" title="Hapus">
                  <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>

              <!-- Item Name -->
              <div class="mt-2.5">
                <input type="text" class="input-card-name text-sm font-bold text-slate-900 w-full border-b border-transparent focus:border-emerald-500 focus:outline-none transition py-0.5" value="${item.nama}" data-id="${item.id}">
              </div>

              <!-- Quantity Stepper & Unit -->
              <div class="mt-3 flex items-center justify-between pt-3 border-t border-slate-100">
                <div class="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-100">
                  <button class="btn-step-minus w-7 h-7 rounded-lg bg-white shadow-xs text-slate-700 flex items-center justify-center font-bold active:scale-90 transition" data-id="${item.id}">
                    <span class="material-symbols-outlined text-[14px]">remove</span>
                  </button>
                  <span class="text-xs font-bold text-slate-800 px-2 min-w-[24px] text-center">${item.jumlah}</span>
                  <button class="btn-step-plus w-7 h-7 rounded-lg bg-white shadow-xs text-slate-700 flex items-center justify-center font-bold active:scale-90 transition" data-id="${item.id}">
                    <span class="material-symbols-outlined text-[14px]">add</span>
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <select class="select-satuan text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" data-id="${item.id}">
                    ${['butir', 'ikat', 'buah', 'potong', 'bungkus', 'botol', 'liter', 'gram', 'kg'].map(sat => `
                      <option value="${sat}" ${item.satuan === sat ? 'selected' : ''}>${sat}</option>
                    `).join('')}
                  </select>

                  <select class="select-lokasi text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" data-id="${item.id}">
                    <option value="kulkas" ${item.lokasi === 'kulkas' ? 'selected' : ''}>Kulkas</option>
                    <option value="freezer" ${item.lokasi === 'freezer' ? 'selected' : ''}>Freezer</option>
                    <option value="pintu_kulkas" ${item.lokasi === 'pintu_kulkas' ? 'selected' : ''}>Pintu</option>
                    <option value="dapur" ${item.lokasi === 'dapur' ? 'selected' : ''}>Dapur</option>
                  </select>
                </div>
              </div>

              ${item.catatan ? `
                <div class="mt-2 text-[11px] text-amber-700 bg-amber-50/70 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[14px]">info</span>
                  <span>${item.catatan}</span>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

      </div>

      <!-- Sticky Save Dock -->
      <div class="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 p-3 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div class="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Terdeteksi</span>
            <span class="text-sm font-extrabold text-slate-900">${confirmedItems.length} Bahan Siap Disimpan</span>
          </div>
          <button id="btn-save-to-stock" type="button" class="h-12 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 transition">
            <span class="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Simpan ke Stok</span>
          </button>
        </div>
      </div>
    `;

    setupEvents();
  }

  function setupEvents() {
    // Header Add Manual
    document.getElementById('btn-header-add')?.addEventListener('click', () => {
      ModalService.openAddManualItem('kulkas', (newItem, targetLocation) => {
        confirmedItems.unshift({
          ...newItem,
          id: `c-${Date.now()}`,
          confidence: 100,
          status: 'Yakin',
          statusClass: 'bg-emerald-100 text-emerald-800',
          lokasi: targetLocation
        });
        showToast(`Ditambahkan: ${newItem.nama}`, 'success');
        renderContent();
      });
    });

    // Filters
    document.getElementById('filter-all')?.addEventListener('click', () => {
      activeFilter = 'semua';
      renderContent();
    });
    document.getElementById('filter-perlu-cek')?.addEventListener('click', () => {
      activeFilter = 'perlu-cek';
      renderContent();
    });
    document.getElementById('filter-yakin')?.addEventListener('click', () => {
      activeFilter = 'yakin';
      renderContent();
    });

    // Input Name change
    mainEl.querySelectorAll('.input-card-name').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        const item = confirmedItems.find(x => x.id === id);
        if (item) item.nama = e.target.value.trim();
      });
    });

    // Select Satuan change
    mainEl.querySelectorAll('.select-satuan').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        const item = confirmedItems.find(x => x.id === id);
        if (item) item.satuan = e.target.value;
      });
    });

    // Select Lokasi change
    mainEl.querySelectorAll('.select-lokasi').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        const item = confirmedItems.find(x => x.id === id);
        if (item) item.lokasi = e.target.value;
      });
    });

    // Stepper Minus
    mainEl.querySelectorAll('.btn-step-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const item = confirmedItems.find(x => x.id === id);
        if (item && item.jumlah > 1) {
          item.jumlah -= 1;
          renderContent();
        }
      });
    });

    // Stepper Plus
    mainEl.querySelectorAll('.btn-step-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const item = confirmedItems.find(x => x.id === id);
        if (item) {
          item.jumlah += 1;
          renderContent();
        }
      });
    });

    // Remove Card
    mainEl.querySelectorAll('.btn-remove-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        confirmedItems = confirmedItems.filter(x => x.id !== id);
        renderContent();
      });
    });

    // Save To Stock Button
    document.getElementById('btn-save-to-stock')?.addEventListener('click', () => {
      if (confirmedItems.length === 0) {
        showToast('Tidak ada bahan untuk disimpan.', 'warning');
        return;
      }

      // Group items by storage location: kulkas vs dapur
      const kulkasItems = confirmedItems.filter(i => i.lokasi !== 'dapur');
      const dapurItems = confirmedItems.filter(i => i.lokasi === 'dapur');

      if (kulkasItems.length > 0) {
        StorageService.addItemsToStok(kulkasItems, 'kulkas');
      }
      if (dapurItems.length > 0) {
        StorageService.addItemsToStok(dapurItems, 'dapur');
      }

      // If this was shopping scan, record into log belanja
      if (scanState.scanType === 'belanja') {
        StorageService.addLogBelanja({
          items: confirmedItems.map(i => ({ nama: i.nama, jumlah: i.jumlah, satuan: i.satuan })),
          metode: 'foto'
        });
      }

      // Clear scan store
      store.clearScan();

      showToast(`Berhasil menyimpan ${confirmedItems.length} bahan ke inventaris!`, 'success', 3500);

      // Return to Beranda
      window.location.hash = '#beranda';
    });
  }

  renderContent();
}
