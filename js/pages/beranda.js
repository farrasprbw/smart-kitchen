// Beranda & Dapur Dashboard Page with Search, Filter, Sort, Bulk Action, and Undo Delete

import { StorageService } from '../core/storage.js';
import { renderHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { ModalService } from '../components/modal.js';
import { store } from '../core/state.js';

let lastDeletedItem = null;
let undoTimeout = null;
let isSyncListenerAttached = false;

function ensureSyncListener() {
  if (isSyncListenerAttached) return;
  isSyncListenerAttached = true;
  window.addEventListener('dapur-stok-synced', () => {
    if (store.getState().activeTab === 'beranda') {
      renderBerandaPage();
    }
  });
}

function hideUndoToast() {
  const toastEl = document.getElementById('app-toast');
  if (toastEl) {
    toastEl.classList.add('opacity-0', '-translate-y-10', 'pointer-events-none');
    toastEl.classList.remove('opacity-100', 'translate-y-0');
  }
}

function showUndoToast(item, onRestore) {
  const toastEl = document.getElementById('app-toast');
  if (!toastEl) return;

  clearTimeout(undoTimeout);
  toastEl.innerHTML = `
    <div class="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl text-xs gap-3 border border-slate-700/50">
      <div class="flex items-center gap-2 truncate">
        <span class="material-symbols-outlined text-[18px] text-amber-400">delete</span>
        <span class="truncate"><b>${item.nama}</b> dihapus</span>
      </div>
      <button id="btn-undo-delete" type="button" class="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs active:scale-95 transition flex-shrink-0 shadow-sm">
        Batalkan (5d)
      </button>
    </div>
  `;
  toastEl.classList.remove('opacity-0', '-translate-y-10', 'pointer-events-none');
  toastEl.classList.add('opacity-100', 'translate-y-0');

  document.getElementById('btn-undo-delete')?.addEventListener('click', () => {
    clearTimeout(undoTimeout);
    hideUndoToast();
    onRestore();
  });

  undoTimeout = setTimeout(() => {
    hideUndoToast();
    lastDeletedItem = null;
  }, 5000);
}

export function renderBerandaPage() {
  ensureSyncListener();
  const mainEl = document.getElementById('app-main');
  if (!mainEl) return;

  const settings = StorageService.getSettings();
  const userName = settings?.userName || 'Sari';

  renderHeader({
    type: 'tab',
    title: 'Beranda & Dapur',
    subtitle: `Halo, ${userName}`
  });

  const stokData = StorageService.getStok();
  const kulkasItems = stokData.kulkas || [];
  const dapurItems = stokData.dapur || [];
  const totalBahan = kulkasItems.length + dapurItems.length;

  const kritisItems = kulkasItems.filter(item =>
    (item.status && (item.status.includes('Layu') || item.status.includes('Sisa') || item.status.includes('Olah'))) ||
    (item.catatan && (item.catatan.includes('layu') || item.catatan.includes('kering') || item.catatan.includes('habis')))
  );

  let activeTabSection = 'kulkas'; // 'kulkas' or 'dapur'
  let activeFilter = 'all'; // 'all', 'kritis', 'sayur', 'protein', 'buah', 'bumbu'
  let currentSort = 'nama'; // 'nama', 'jumlah', 'terbaru'
  let searchQuery = '';
  let isBulkMode = false;
  let selectedItemIds = new Set();

  function getFilteredAndSortedList() {
    let list = activeTabSection === 'kulkas' ? [...kulkasItems] : [...dapurItems];

    // Filter by query
    if (searchQuery) {
      list = list.filter(item =>
        item.nama.toLowerCase().includes(searchQuery) ||
        (item.catatan && item.catatan.toLowerCase().includes(searchQuery)) ||
        (item.kategori && item.kategori.toLowerCase().includes(searchQuery))
      );
    }

    // Filter by chip
    if (activeFilter === 'kritis') {
      list = list.filter(item =>
        (item.status && (item.status.includes('Layu') || item.status.includes('Sisa') || item.status.includes('Olah'))) ||
        (item.catatan && (item.catatan.includes('layu') || item.catatan.includes('kering') || item.catatan.includes('habis')))
      );
    } else if (activeFilter !== 'all') {
      list = list.filter(item => item.kategori === activeFilter);
    }

    // Sort
    if (currentSort === 'nama') {
      list.sort((a, b) => a.nama.localeCompare(b.nama));
    } else if (currentSort === 'jumlah') {
      list.sort((a, b) => (b.jumlah || 0) - (a.jumlah || 0));
    } else if (currentSort === 'terbaru') {
      list.sort((a, b) => new Date(b.diperbarui || 0) - new Date(a.diperbarui || 0));
    }

    return list;
  }

  function renderContent() {
    const displayedList = getFilteredAndSortedList();

    mainEl.innerHTML = `
      <div class="page-enter flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-20 gap-5">

        <!-- Status Ringkasan Dapur -->
        <section>
          <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-100/80 p-4 shadow-sm">
            <div class="flex items-start justify-between gap-2">
              <div class="flex flex-col">
                <div class="flex items-center gap-1.5 text-emerald-800">
                  <span class="material-symbols-outlined text-[18px]">eco</span>
                  <span class="text-[11px] font-bold uppercase tracking-wider">Kondisi Dapur Terpantau</span>
                </div>
                <div class="mt-1 flex items-baseline gap-2">
                  <span class="text-2xl font-extrabold text-slate-800 tracking-tight">${totalBahan} Bahan</span>
                  <span class="text-xs font-medium text-slate-500">Tersimpan</span>
                </div>
              </div>
              <div class="inline-flex items-center gap-1.5 rounded-full ${kritisItems.length > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-emerald-600 text-white'} px-3 py-1 shadow-sm text-xs font-bold">
                <span class="material-symbols-outlined text-[15px]">${kritisItems.length > 0 ? 'warning' : 'check_circle'}</span>
                <span>${kritisItems.length > 0 ? `${kritisItems.length} Segera Olah` : 'Semua Segar'}</span>
              </div>
            </div>
            <div class="mt-3.5 pt-3 border-t border-emerald-100/80 flex items-center justify-between text-xs text-slate-600">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
                <span class="font-medium">Penyimpanan optimal • ${Math.max(10, Math.round(((totalBahan - kritisItems.length) / (totalBahan || 1)) * 100))}% siap saji</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] text-slate-400">Update ${new Date(stokData.lastUpdated || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                <button id="btn-sync-cloud" type="button" class="w-6 h-6 rounded-lg bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition active:scale-95" title="Sinkronkan dengan Cloud Firestore">
                  <span class="material-symbols-outlined text-[14px]">sync</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Aksi Cepat Dapur -->
        <section>
          <div>
            <div class="flex items-center justify-between mb-2.5">
              <h2 class="text-base font-bold text-slate-800">Aksi Cepat Dapur</h2>
              <span class="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">bolt</span>Pindai Cepat
              </span>
            </div>
            <div class="grid grid-cols-3 gap-2.5">
              <!-- Action 1: Foto Kulkas -->
              <a href="#pindai?type=kulkas" class="flex flex-col justify-between p-3.5 h-32 rounded-2xl bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 active:scale-95 transition text-left group">
                <div class="flex justify-between items-start w-full">
                  <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition">
                    <span class="material-symbols-outlined text-[20px]">kitchen</span>
                  </div>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-100">Auto</span>
                </div>
                <div>
                  <h3 class="text-xs font-bold leading-tight">Foto Kulkas</h3>
                  <p class="text-[10px] text-emerald-100/90 mt-0.5">Pindai 4 kompartemen</p>
                </div>
              </a>

              <!-- Action 2: Foto Belanja -->
              <a href="#pindai?type=belanja" class="flex flex-col justify-between p-3.5 h-32 rounded-2xl bg-amber-600 text-white shadow-sm hover:bg-amber-700 active:scale-95 transition text-left group">
                <div class="flex justify-between items-start w-full">
                  <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition">
                    <span class="material-symbols-outlined text-[20px]">receipt_long</span>
                  </div>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-100">Auto</span>
                </div>
                <div>
                  <h3 class="text-xs font-bold leading-tight">Foto Belanja</h3>
                  <p class="text-[10px] text-amber-100/90 mt-0.5">Bahan & struk kasir</p>
                </div>
              </a>

              <!-- Action 3: Masak Apa -->
              <a href="#ide-masak" class="flex flex-col justify-between p-3.5 h-32 rounded-2xl bg-orange-600 text-white shadow-sm hover:bg-orange-700 active:scale-95 transition text-left group">
                <div class="flex justify-between items-start w-full">
                  <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition">
                    <span class="material-symbols-outlined text-[20px]">restaurant_menu</span>
                  </div>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-900/40 text-orange-100">Chef</span>
                </div>
                <div>
                  <h3 class="text-xs font-bold leading-tight">Masak Apa?</h3>
                  <p class="text-[10px] text-orange-100/90 mt-0.5">Dari stok tersedia</p>
                </div>
              </a>
            </div>
          </div>
        </section>

        <!-- Inventaris Bahan -->
        <section>
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-base font-bold text-slate-800">Inventaris Bahan</h2>
            <div class="flex items-center gap-1.5">
              <button id="btn-toggle-bulk" class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                isBulkMode ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }">
                <span class="material-symbols-outlined text-[15px]">checklist</span>
                <span>${isBulkMode ? 'Selesai Pilih' : 'Pilih Banyak'}</span>
              </button>
              <button id="btn-tambah-manual" class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1 hover:bg-emerald-100 transition active:scale-95">
                <span class="material-symbols-outlined text-[16px]">add</span>
                <span>Tambah</span>
              </button>
            </div>
          </div>

          <!-- Section Switcher Tabs -->
          <div class="flex p-1 bg-surface-container rounded-xl gap-1 mb-2.5">
            <button id="tab-btn-kulkas" class="flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTabSection === 'kulkas' ? 'bg-surface-container-lowest text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
              <span class="material-symbols-outlined text-[16px]">kitchen</span>
              <span>Kulkas (${kulkasItems.length})</span>
            </button>
            <button id="tab-btn-dapur" class="flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTabSection === 'dapur' ? 'bg-surface-container-lowest text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
              <span class="material-symbols-outlined text-[16px]">shelves</span>
              <span>Dapur Kering (${dapurItems.length})</span>
            </button>
          </div>

          <!-- Search & Sorting Toolbar -->
          <div class="flex items-center gap-2 mb-2">
            <div class="relative flex-1">
              <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
              <input type="text" id="inventory-search" value="${searchQuery}" placeholder="Cari nama bahan atau catatan..."
                class="w-full h-9 pl-9 pr-4 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition">
            </div>
            <select id="inventory-sort" class="h-9 px-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition">
              <option value="nama" ${currentSort === 'nama' ? 'selected' : ''}>A-Z</option>
              <option value="jumlah" ${currentSort === 'jumlah' ? 'selected' : ''}>Jumlah</option>
              <option value="terbaru" ${currentSort === 'terbaru' ? 'selected' : ''}>Terkini</option>
            </select>
          </div>

          <!-- Filter Chips -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none text-[11px] font-semibold text-slate-600">
            <button class="filter-chip px-3 py-1 rounded-full whitespace-nowrap transition ${activeFilter === 'all' ? 'bg-primary text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}" data-filter="all">Semua</button>
            <button class="filter-chip px-3 py-1 rounded-full whitespace-nowrap transition ${activeFilter === 'kritis' ? 'bg-amber-500 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}" data-filter="kritis">⚠️ Segera Olah</button>
            <button class="filter-chip px-3 py-1 rounded-full whitespace-nowrap transition ${activeFilter === 'sayur' ? 'bg-primary text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}" data-filter="sayur">Sayur</button>
            <button class="filter-chip px-3 py-1 rounded-full whitespace-nowrap transition ${activeFilter === 'protein' ? 'bg-primary text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}" data-filter="protein">Protein</button>
            <button class="filter-chip px-3 py-1 rounded-full whitespace-nowrap transition ${activeFilter === 'buah' ? 'bg-primary text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}" data-filter="buah">Buah</button>
            <button class="filter-chip px-3 py-1 rounded-full whitespace-nowrap transition ${activeFilter === 'bumbu' ? 'bg-primary text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}" data-filter="bumbu">Bumbu</button>
          </div>

          <!-- Inventory List Container -->
          <div id="inventory-list-container" class="flex flex-col gap-2">
            ${renderItemsList(displayedList)}
          </div>

          <!-- Bulk Action Floating Bar (Muncul jika dalam bulk mode dan ada item terpilih) -->
          ${
            isBulkMode && selectedItemIds.size > 0
              ? `
                <div class="fixed bottom-20 inset-x-4 max-w-md mx-auto z-40 bg-slate-900 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-2 border border-slate-700">
                  <span class="text-xs font-bold pl-2">${selectedItemIds.size} Dipilih</span>
                  <div class="flex items-center gap-1.5">
                    <button id="btn-bulk-move" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1 active:scale-95 transition">
                      <span class="material-symbols-outlined text-[15px]">swap_horiz</span>
                      <span>Pindah</span>
                    </button>
                    <button id="btn-bulk-delete" class="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition shadow-sm">
                      <span class="material-symbols-outlined text-[15px]">delete</span>
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              `
              : ''
          }
        </section>

        <!-- Tips Dapur Pintar -->
        <section>
          <div class="rounded-2xl bg-amber-50/80 border border-amber-200/60 p-4 flex items-start gap-3">
            <span class="material-symbols-outlined text-amber-600 text-[22px] flex-shrink-0 mt-0.5">tips_and_updates</span>
            <div>
              <h3 class="text-xs font-bold text-amber-900">Tips Cerdas Dapur</h3>
              <p class="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                Bungkus pangkal daun bawang dengan tisu basah sebelum disimpan di kulkas agar tetap renyah hingga 2 minggu!
              </p>
            </div>
          </div>
        </section>

      </div>
    `;

    setupEvents();
  }

  function renderItemsList(items) {
    if (!items || items.length === 0) {
      return `
        <div class="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-500 shadow-xs">
          <div class="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <span class="material-symbols-outlined text-[36px]">inventory_2</span>
          </div>
          <h3 class="text-sm font-bold text-slate-800">Tidak ada bahan ditemukan</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            ${searchQuery ? `Tidak ada bahan yang cocok dengan kata kunci "${searchQuery}".` : 'Mulai tambahkan bahan kulkas atau dapur Anda.'}
          </p>
          <div class="flex items-center justify-center gap-2 mt-4">
            <a href="#pindai?type=kulkas" class="px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm inline-flex items-center gap-1 active:scale-95 transition">
              <span class="material-symbols-outlined text-[16px]">photo_camera</span> Pindai Kulkas
            </a>
            <button id="btn-empty-add" class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition">
              <span class="material-symbols-outlined text-[16px]">add</span> Input Manual
            </button>
          </div>
        </div>
      `;
    }

    return items.map(item => {
      const isSelected = selectedItemIds.has(item.id);
      return `
        <div class="flex items-center justify-between p-3 rounded-2xl bg-white border ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-slate-100'} shadow-sm hover:border-slate-200 transition group" data-item-id="${item.id}">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            ${
              isBulkMode
                ? `
                  <input type="checkbox" class="bulk-item-checkbox w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                `
                : `
                  <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    <span class="material-symbols-outlined text-[20px]">${item.icon || 'kitchen'}</span>
                  </div>
                `
            }
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <h4 class="text-xs font-bold text-slate-900 truncate">${item.nama}</h4>
                <span class="text-[10px] font-bold px-1.5 py-0.2 rounded ${item.statusClass || 'bg-slate-100 text-slate-700'}">${item.status || 'Segar'}</span>
              </div>
              <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                <span class="font-semibold text-emerald-800">${item.jumlah ?? '?'} ${item.satuan || ''}</span>
                ${item.catatan ? `<span class="truncate text-slate-400">• ${item.catatan}</span>` : ''}
              </div>
            </div>
          </div>

          ${
            !isBulkMode
              ? `
                <div class="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button class="btn-qty-minus w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center active:scale-90 transition" data-id="${item.id}" title="Kurangi">
                    <span class="material-symbols-outlined text-[14px]">remove</span>
                  </button>
                  <button class="btn-qty-plus w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center active:scale-90 transition" data-id="${item.id}" title="Tambah">
                    <span class="material-symbols-outlined text-[14px]">add</span>
                  </button>
                  <button class="btn-item-delete w-7 h-7 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center active:scale-90 transition" data-id="${item.id}" title="Hapus">
                    <span class="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              `
              : ''
          }
        </div>
      `;
    }).join('');
  }

  function setupEvents() {
    // Switch Section Tab
    document.getElementById('tab-btn-kulkas')?.addEventListener('click', () => {
      activeTabSection = 'kulkas';
      selectedItemIds.clear();
      renderContent();
    });

    document.getElementById('tab-btn-dapur')?.addEventListener('click', () => {
      activeTabSection = 'dapur';
      selectedItemIds.clear();
      renderContent();
    });

    // Toggle Bulk Mode
    document.getElementById('btn-toggle-bulk')?.addEventListener('click', () => {
      isBulkMode = !isBulkMode;
      selectedItemIds.clear();
      renderContent();
    });

    // Search Input
    document.getElementById('inventory-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      const container = document.getElementById('inventory-list-container');
      if (container) {
        container.innerHTML = renderItemsList(getFilteredAndSortedList());
        attachItemEvents();
      }
    });

    // Sort Dropdown
    document.getElementById('inventory-sort')?.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderContent();
    });

    // Filter Chips
    mainEl.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.getAttribute('data-filter');
        renderContent();
      });
    });

    // Add manual item
    const openAdd = () => {
      ModalService.openAddManualItem(activeTabSection, (newItem, targetLocation) => {
        StorageService.addItemsToStok([newItem], targetLocation);
        showToast(`Berhasil menambahkan ${newItem.nama}!`, 'success');
        renderBerandaPage();
      });
    };

    document.getElementById('btn-tambah-manual')?.addEventListener('click', openAdd);
    document.getElementById('btn-empty-add')?.addEventListener('click', openAdd);

    // Bulk Actions Handlers
    document.getElementById('btn-bulk-delete')?.addEventListener('click', () => {
      if (selectedItemIds.size === 0) return;
      ModalService.open(`
        <div class="py-5 text-center flex flex-col items-center">
          <div class="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
            <span class="material-symbols-outlined text-[28px]">delete</span>
          </div>
          <h3 class="font-headline-sm text-sm font-bold text-slate-800 mt-3">Hapus ${selectedItemIds.size} Bahan?</h3>
          <p class="text-xs text-slate-500 mt-1">Item yang dipilih akan dihapus dari daftar stok.</p>
          <div class="flex gap-2 w-full mt-5">
            <button data-close-modal class="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold active:scale-95 transition">Batal</button>
            <button id="btn-confirm-bulk-delete" class="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold active:scale-95 transition shadow-sm">Ya, Hapus Semua</button>
          </div>
        </div>
      `);

      document.getElementById('btn-confirm-bulk-delete')?.addEventListener('click', () => {
        ModalService.close();
        const count = selectedItemIds.size;
        selectedItemIds.forEach(id => {
          StorageService.deleteStokItem(id);
        });
        selectedItemIds.clear();
        isBulkMode = false;
        showToast(`${count} bahan berhasil dihapus.`, 'info');
        renderBerandaPage();
      });
    });

    document.getElementById('btn-bulk-move')?.addEventListener('click', () => {
      if (selectedItemIds.size === 0) return;
      const targetLoc = activeTabSection === 'kulkas' ? 'dapur' : 'kulkas';
      const targetLabel = targetLoc === 'kulkas' ? 'Kulkas' : 'Dapur Kering';

      const stok = StorageService.getStok();
      const fromList = activeTabSection === 'kulkas' ? stok.kulkas : stok.dapur;
      const toList = targetLoc === 'kulkas' ? stok.kulkas : stok.dapur;

      const movedItems = [];
      const remainingItems = [];

      fromList.forEach(item => {
        if (selectedItemIds.has(item.id)) {
          movedItems.push({ ...item, lokasi: targetLoc });
        } else {
          remainingItems.push(item);
        }
      });

      if (activeTabSection === 'kulkas') {
        stok.kulkas = remainingItems;
        stok.dapur.push(...movedItems);
      } else {
        stok.dapur = remainingItems;
        stok.kulkas.push(...movedItems);
      }

      StorageService.saveStok(stok);
      showToast(`${movedItems.length} bahan dipindahkan ke ${targetLabel}!`, 'success');
      selectedItemIds.clear();
      isBulkMode = false;
      renderBerandaPage();
    });

    // Cloud Manual Sync
    document.getElementById('btn-sync-cloud')?.addEventListener('click', async () => {
      const syncBtn = document.getElementById('btn-sync-cloud');
      const icon = syncBtn?.querySelector('span');
      if (icon) icon.classList.add('animate-spin');
      showToast('Memeriksa database Cloud...', 'info', 1500);
      try {
        const synced = await StorageService.syncFromCloud(true);
        if (icon) icon.classList.remove('animate-spin');
        if (synced) {
          showToast('Data inventaris berhasil diperbarui dari Cloud!', 'success');
          renderBerandaPage();
        } else {
          showToast('Data stok lokal sudah yang paling mutakhir.', 'info', 2000);
        }
      } catch (err) {
        if (icon) icon.classList.remove('animate-spin');
        showToast('Sinkronisasi Cloud gagal.', 'error');
      }
    });

    attachItemEvents();
  }

  function attachItemEvents() {
    // Checkbox in bulk mode
    mainEl.querySelectorAll('.bulk-item-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          selectedItemIds.add(id);
        } else {
          selectedItemIds.delete(id);
        }
        renderContent();
      });
    });

    // Minus Qty
    mainEl.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const allItems = [...kulkasItems, ...dapurItems];
        const item = allItems.find(x => x.id === id);
        if (item && typeof item.jumlah === 'number') {
          const newQty = Math.max(0, item.jumlah - 1);
          if (newQty === 0) {
            confirmAndDeleteItem(item);
            return;
          }
          StorageService.updateStokItem(id, { jumlah: newQty });
          renderBerandaPage();
        }
      });
    });

    // Plus Qty
    mainEl.querySelectorAll('.btn-qty-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const allItems = [...kulkasItems, ...dapurItems];
        const item = allItems.find(x => x.id === id);
        if (item && typeof item.jumlah === 'number') {
          StorageService.updateStokItem(id, { jumlah: item.jumlah + 1 });
          renderBerandaPage();
        }
      });
    });

    // Delete Item with Confirmation Modal & Undo Toast (5 detik)
    mainEl.querySelectorAll('.btn-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const allItems = [...kulkasItems, ...dapurItems];
        const item = allItems.find(x => x.id === id);
        if (item) {
          confirmAndDeleteItem(item);
        }
      });
    });
  }

  function confirmAndDeleteItem(item) {
    ModalService.open(`
      <div class="py-5 text-center flex flex-col items-center">
        <div class="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
          <span class="material-symbols-outlined text-[28px]">delete</span>
        </div>
        <h3 class="font-headline-sm text-sm font-bold text-slate-800 mt-3">Hapus Bahan Ini?</h3>
        <p class="text-xs text-slate-500 mt-1 max-w-xs">
          Apakah kamu yakin ingin menghapus <b>${item.nama}</b> dari daftar ${item.lokasi || 'kulkas'}?
        </p>
        <div class="flex gap-2 w-full mt-5">
          <button data-close-modal class="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold active:scale-95 transition">Batal</button>
          <button id="btn-confirm-single-delete" class="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold active:scale-95 transition shadow-sm">Ya, Hapus</button>
        </div>
      </div>
    `);

    document.getElementById('btn-confirm-single-delete')?.addEventListener('click', () => {
      ModalService.close();
      StorageService.deleteStokItem(item.id);
      lastDeletedItem = { ...item };

      showUndoToast(item, () => {
        StorageService.addItemsToStok([lastDeletedItem], lastDeletedItem.lokasi || 'kulkas');
        showToast(`${lastDeletedItem.nama} berhasil dipulihkan!`, 'success');
        renderBerandaPage();
      });

      renderBerandaPage();
    });
  }

  renderContent();
}
