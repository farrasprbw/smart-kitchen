// Beranda & Dapur Dashboard Page with Search, Filter, Sort, Bulk Action, and Undo Delete

import { StorageService } from '../core/storage.js';
import { renderHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { ModalService } from '../components/modal.js';
import { store } from '../core/state.js';
import { escapeHtml } from '../utils/format.js';

let lastDeletedItem = null;
let undoTimeout = null;
let isSyncListenerAttached = false;

const TIPS_DAPUR = [
  'Bungkus pangkal daun bawang dengan tisu basah sebelum disimpan di kulkas agar tetap renyah hingga 2 minggu!',
  'Jangan mencuci telur sebelum dimasukkan ke kulkas agar lapisan pelindung alami (kutikula) tidak hilang.',
  'Simpan tomat dan pisang di suhu ruangan, bukan di dalam kulkas, agar rasa manis alami dan teksturnya tetap prima.',
  'Simpan jamur dalam kantong kertas cokelat, hindari plastik tertutup rapat agar jamur tidak cepat basah dan berlendir.',
  'Alasi laci sayur dengan selembar tisu dapur tebal untuk menyerap kelembapan berlebih dan mencegah sayur cepat busuk.',
  'Bekukan sisa roti tawar di freezer jika tidak habis dalam 3 hari. Saat ingin dimakan, cukup panggang langsung dari beku!',
  'Pisahkan tempat penyimpanan kentang dan bawang bombay, karena gas yang dikeluarkan bawang mempercepat kentang bertunas.',
  'Letakkan daging mentah dan unggas di rak kulkas paling bawah dalam wadah tertutup agar airnya tidak menetes ke makanan lain.',
  'Bungkus keju dengan kertas baking/parchment paper lalu masukkan kantong zip longgar agar keju tetap bernapas tanpa mengering.',
  'Simpan potongan wortel dan seledri dalam toples berisi air dingin di kulkas agar tetap renyah hingga berminggu-minggu!'
];

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
      <div class="page-enter w-full max-w-md md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20 md:pb-12 overflow-x-hidden min-w-0 max-w-full">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full min-w-0">

          <!-- SISI KIRI (Kolom Utama): Inventaris Bahan -->
          <section class="order-2 lg:order-1 lg:col-span-7 xl:col-span-8 flex flex-col gap-4 w-full min-w-0">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight">Inventaris Bahan</h2>
                <p class="text-xs sm:text-sm text-slate-500 hidden sm:block">Kelola stok kulkas & dapur kering secara real-time</p>
              </div>
              <div class="flex items-center gap-2">
                <button id="btn-toggle-bulk" class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${isBulkMode ? 'bg-primary text-white shadow-xs' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
      }">
                  <span class="material-symbols-outlined text-[18px]">checklist</span>
                  <span>${isBulkMode ? 'Selesai Pilih' : 'Pilih Banyak'}</span>
                </button>
                <button id="btn-tambah-manual" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm hover:shadow">
                  <span class="material-symbols-outlined text-[18px]">add</span>
                  <span>Tambah Bahan</span>
                </button>
              </div>
            </div>

            <!-- Section Switcher Tabs (Proporsional di Mobile & Desktop) -->
            <div class="flex p-1.5 bg-slate-100/90 rounded-2xl gap-1.5 w-full sm:max-w-md lg:max-w-lg shadow-2xs">
              <button id="tab-btn-kulkas" class="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTabSection === 'kulkas' ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}">
                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' ${activeTabSection === 'kulkas' ? 1 : 0};">kitchen</span>
                <span>Kulkas</span>
                <span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold ${activeTabSection === 'kulkas' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}">${kulkasItems.length}</span>
              </button>
              <button id="tab-btn-dapur" class="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTabSection === 'dapur' ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}">
                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' ${activeTabSection === 'dapur' ? 1 : 0};">shelves</span>
                <span>Dapur Kering</span>
                <span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold ${activeTabSection === 'dapur' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}">${dapurItems.length}</span>
              </button>
            </div>

            <!-- Search & Sorting Toolbar -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div class="relative flex-1">
                <span class="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-[19px]">search</span>
                <input type="text" id="inventory-search" value="${searchQuery}" placeholder="Cari nama bahan atau catatan..."
                  class="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-slate-200/90 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition shadow-2xs hover:border-slate-300">
              </div>
              <select id="inventory-sort" class="h-11 px-3.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition cursor-pointer shadow-2xs hover:border-slate-300">
                <option value="nama" ${currentSort === 'nama' ? 'selected' : ''}>Urut: A-Z</option>
                <option value="jumlah" ${currentSort === 'jumlah' ? 'selected' : ''}>Urut: Jumlah</option>
                <option value="terbaru" ${currentSort === 'terbaru' ? 'selected' : ''}>Urut: Terkini</option>
              </select>
            </div>

            <!-- Filter Chips -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] sm:text-xs font-semibold text-slate-600">
              <button class="filter-chip px-3.5 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${activeFilter === 'all' ? 'bg-primary text-white font-bold ring-2 ring-primary/20 shadow-xs' : 'bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700'}" data-filter="all">Semua</button>
              <button class="filter-chip px-3.5 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${activeFilter === 'kritis' ? 'bg-amber-500 text-white font-bold ring-2 ring-amber-500/20 shadow-xs' : 'bg-white border border-slate-200/80 hover:bg-amber-50 hover:text-amber-800 text-slate-700'}" data-filter="kritis">⚠️ Segera Olah</button>
              <button class="filter-chip px-3.5 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${activeFilter === 'sayur' ? 'bg-primary text-white font-bold ring-2 ring-primary/20 shadow-xs' : 'bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700'}" data-filter="sayur">Sayur</button>
              <button class="filter-chip px-3.5 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${activeFilter === 'protein' ? 'bg-primary text-white font-bold ring-2 ring-primary/20 shadow-xs' : 'bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700'}" data-filter="protein">Protein</button>
              <button class="filter-chip px-3.5 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${activeFilter === 'buah' ? 'bg-primary text-white font-bold ring-2 ring-primary/20 shadow-xs' : 'bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700'}" data-filter="buah">Buah</button>
              <button class="filter-chip px-3.5 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${activeFilter === 'bumbu' ? 'bg-primary text-white font-bold ring-2 ring-primary/20 shadow-xs' : 'bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700'}" data-filter="bumbu">Bumbu</button>
            </div>

            <!-- Inventory List Container (Grid 2-3 kolom di Desktop) -->
            <div id="inventory-list-container" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              ${renderItemsList(displayedList)}
            </div>

            <!-- Bulk Action Floating Bar -->
            ${isBulkMode && selectedItemIds.size > 0
        ? `
                  <div class="fixed bottom-20 md:bottom-6 inset-x-4 max-w-lg mx-auto z-40 bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 border border-slate-700">
                    <span class="text-xs sm:text-sm font-bold pl-2">${selectedItemIds.size} Bahan Dipilih</span>
                    <div class="flex items-center gap-2">
                      <button id="btn-bulk-move" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1 active:scale-95 transition cursor-pointer">
                        <span class="material-symbols-outlined text-[18px]">swap_horiz</span>
                        <span>Pindah</span>
                      </button>
                      <button id="btn-bulk-delete" class="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1 active:scale-95 transition shadow-sm cursor-pointer">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                `
        : ''
      }
          </section>

          <!-- SISI KANAN (Sidebar Desktop Sticky): Status Ringkasan, Aksi Cepat, Tips Cerdas -->
          <aside class="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 flex flex-col gap-4 lg:gap-5 lg:sticky lg:top-20 self-start w-full min-w-0">

            <!-- Card 1: Kondisi Dapur Terpantau (Ringkasan Status) -->
            <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-100 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between gap-2">
                <div class="flex flex-col">
                  <div class="flex items-center gap-1.5 text-emerald-800">
                    <span class="material-symbols-outlined text-[18px]">eco</span>
                    <span class="text-[11px] font-bold uppercase tracking-wider">Kondisi Dapur Terpantau</span>
                  </div>
                  <div class="mt-1 flex items-baseline gap-2">
                    <span class="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">${totalBahan} Bahan</span>
                    <span class="text-xs sm:text-sm font-medium text-slate-500">Tersimpan</span>
                  </div>
                </div>
                <div class="inline-flex items-center gap-1.5 rounded-full ${totalBahan === 0
        ? 'bg-slate-200 text-slate-700'
        : kritisItems.length > 0
          ? 'bg-amber-500 text-white animate-pulse'
          : 'bg-emerald-600 text-white'
      } px-3 py-1 shadow-sm text-xs font-bold">
                  <span class="material-symbols-outlined text-[15px]">${totalBahan === 0
        ? 'inventory_2'
        : kritisItems.length > 0
          ? 'warning'
          : 'check_circle'
      }</span>
                  <span>${totalBahan === 0
        ? 'Kulkas Kosong'
        : kritisItems.length > 0
          ? `${kritisItems.length} Segera Olah`
          : 'Semua Segar'
      }</span>
                </div>
              </div>
              <div class="mt-3.5 pt-3 border-t border-emerald-100/80 flex items-center justify-between text-xs sm:text-sm text-slate-600">
                <div class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 rounded-full ${totalBahan === 0 ? 'bg-slate-400' : 'bg-emerald-500 ring-4 ring-emerald-100'}"></span>
                  <span class="font-medium text-xs sm:text-sm">${totalBahan === 0
        ? 'Penyimpanan optimal • Belum ada data'
        : `Penyimpanan optimal • ${Math.round(((totalBahan - kritisItems.length) / totalBahan) * 100)}% siap saji`
      }</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[11px] text-slate-400">Update ${new Date(stokData.lastUpdated || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                  <button id="btn-sync-cloud" type="button" class="w-7 h-7 rounded-lg bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition active:scale-95 cursor-pointer" title="Sinkronkan dengan Cloud Firestore">
                    <span class="material-symbols-outlined text-[16px]">sync</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Card 2: Aksi Cepat Dapur (Responsif: Vertikal Rapi di Mobile, Horizontal Elegan di Desktop Sidebar) -->
            <div class="w-full min-w-0">
              <div class="flex items-center justify-between mb-2.5">
                <h2 class="text-sm sm:text-base font-bold text-slate-800">Aksi Cepat Dapur</h2>
                <span class="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[15px]">bolt</span>Pindai Cepat
                </span>
              </div>
              <div class="grid grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-3 w-full min-w-0">
                <!-- Action 1: Pindai Kulkas -->
                <a href="#pindai?type=kulkas" class="flex flex-col lg:flex-row lg:items-center justify-between p-2.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-95 transition-all text-left group cursor-pointer min-w-0 overflow-hidden">
                  <div class="flex flex-col lg:flex-row items-start lg:items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-0 w-full">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 group-hover:bg-white/25 transition shrink-0">
                      <span class="material-symbols-outlined text-[18px] sm:text-[22px]">kitchen</span>
                    </div>
                    <div class="min-w-0 w-full">
                      <h3 class="text-[11px] sm:text-sm font-bold leading-tight truncate">Pindai Kulkas</h3>
                      <p class="text-[9px] sm:text-xs text-emerald-100/90 mt-0.5 truncate">Kamera AI</p>
                    </div>
                  </div>
                  <span class="material-symbols-outlined text-white/70 group-hover:text-white group-hover:translate-x-1 transition text-[20px] hidden lg:block shrink-0">arrow_forward</span>
                </a>

                <!-- Action 2: Scan Barcode -->
                <a href="#pindai?type=barcode" class="flex flex-col lg:flex-row lg:items-center justify-between p-2.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-95 transition-all text-left group cursor-pointer min-w-0 overflow-hidden">
                  <div class="flex flex-col lg:flex-row items-start lg:items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-0 w-full">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 group-hover:bg-white/25 transition shrink-0">
                      <span class="material-symbols-outlined text-[18px] sm:text-[22px]">barcode_scanner</span>
                    </div>
                    <div class="min-w-0 w-full">
                      <h3 class="text-[11px] sm:text-sm font-bold leading-tight truncate">Scan Barcode</h3>
                      <p class="text-[9px] sm:text-xs text-amber-100/90 mt-0.5 truncate">Kemasan instan</p>
                    </div>
                  </div>
                  <span class="material-symbols-outlined text-white/70 group-hover:text-white group-hover:translate-x-1 transition text-[20px] hidden lg:block shrink-0">arrow_forward</span>
                </a>

                <!-- Action 3: Ide Masak -->
                <a href="#ide-masak" class="flex flex-col lg:flex-row lg:items-center justify-between p-2.5 sm:p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-95 transition-all text-left group cursor-pointer min-w-0 overflow-hidden">
                  <div class="flex flex-col lg:flex-row items-start lg:items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-0 w-full">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 group-hover:bg-white/25 transition shrink-0">
                      <span class="material-symbols-outlined text-[18px] sm:text-[22px]">restaurant_menu</span>
                    </div>
                    <div class="min-w-0 w-full">
                      <h3 class="text-[11px] sm:text-sm font-bold leading-tight truncate">Ide Masak</h3>
                      <p class="text-[9px] sm:text-xs text-orange-100/90 mt-0.5 truncate">Dari stok dapur</p>
                    </div>
                  </div>
                  <span class="material-symbols-outlined text-white/70 group-hover:text-white group-hover:translate-x-1 transition text-[20px] hidden lg:block shrink-0">arrow_forward</span>
                </a>
              </div>
            </div>

            <!-- Card 3: Tips Cerdas Dapur Dinamis -->
            <div class="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 p-4 sm:p-5 shadow-xs hover:shadow-sm transition-shadow">
              <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-amber-600 text-[24px] flex-shrink-0 mt-0.5">tips_and_updates</span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="text-xs sm:text-sm font-bold text-amber-900">Tips Cerdas Dapur</h3>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">Tips Harian</span>
                  </div>
                  <p id="tip-text-content" class="text-xs sm:text-sm text-amber-900/90 mt-1.5 leading-relaxed">
                    ${TIPS_DAPUR[Math.floor(Math.random() * TIPS_DAPUR.length)]}
                  </p>
                  <button id="btn-next-tip" type="button" class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 hover:underline mt-2.5 active:scale-95 transition cursor-pointer">
                    <span class="material-symbols-outlined text-[15px]">refresh</span>
                    <span>Tips Lainnya</span>
                  </button>
                </div>
              </div>
            </div>

          </aside>

        </div>
      </div>
    `;

    setupEvents();
  }

  function renderItemsList(items) {
    if (!items || items.length === 0) {
      return `
        <div class="col-span-full p-6 sm:p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-500 shadow-xs">
          <div class="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <span class="material-symbols-outlined text-[36px]">inventory_2</span>
          </div>
          <h3 class="text-sm sm:text-base font-bold text-slate-800">Tidak ada bahan ditemukan</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            ${searchQuery ? `Tidak ada bahan yang cocok dengan kata kunci "${searchQuery}".` : 'Mulai tambahkan bahan kulkas atau belanjaan Anda dengan 3 cara mudah:'}
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 max-w-md mx-auto">
            <a href="#pindai?type=kulkas" class="px-3 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition hover:bg-primary/90">
              <span class="material-symbols-outlined text-[18px]">kitchen</span>
              <span>Pindai Kulkas</span>
            </a>
            <a href="#pindai?type=barcode" class="px-3 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition hover:bg-amber-700">
              <span class="material-symbols-outlined text-[18px]">barcode_scanner</span>
              <span>Scan Barcode</span>
            </a>
            <button id="btn-empty-add" class="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">edit_note</span>
              <span>Input Manual</span>
            </button>
          </div>
        </div>
      `;
    }

    return items.map(item => {
      const isSelected = selectedItemIds.has(item.id);
      return `
        <div class="p-4 rounded-2xl bg-white border ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-slate-200/80 hover:border-emerald-400 hover:shadow-md'} shadow-2xs hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-3.5 group" data-item-id="${item.id}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              ${isBulkMode
          ? `
                    <input type="checkbox" class="bulk-item-checkbox w-5 h-5 rounded text-primary focus:ring-primary cursor-pointer mt-0.5" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                  `
          : `
                    <div class="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-2xs group-hover:bg-emerald-100 group-hover:scale-105 transition-all">
                      <span class="material-symbols-outlined text-[22px]">${item.icon || 'kitchen'}</span>
                    </div>
                  `
        }
              <div class="min-w-0 flex-1">
                <h4 class="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-950 transition-colors truncate" title="${escapeHtml(item.nama)}">${escapeHtml(item.nama)}</h4>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-md ${item.statusClass || 'bg-slate-100 text-slate-700'}">${escapeHtml(item.status || 'Segar')}</span>
                  ${item.catatan ? `<span class="truncate text-xs text-slate-400" title="${escapeHtml(item.catatan)}">• ${escapeHtml(item.catatan)}</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2.5 border-t border-slate-100">
            <div class="flex items-center gap-1.5">
              <span class="text-xs sm:text-sm font-extrabold text-emerald-800 bg-emerald-50/90 px-3 py-1 rounded-xl border border-emerald-100/80">
                ${item.jumlah ?? '?'} ${item.satuan || ''}
              </span>
            </div>

            ${!isBulkMode
          ? `
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button class="btn-qty-minus w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-90 transition cursor-pointer hover:ring-2 hover:ring-slate-300/40" data-id="${item.id}" title="Kurangi (minus)">
                      <span class="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <button class="btn-qty-plus w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-90 transition cursor-pointer hover:ring-2 hover:ring-slate-300/40" data-id="${item.id}" title="Tambah (plus)">
                      <span class="material-symbols-outlined text-[18px]">add</span>
                    </button>
                    <button class="btn-item-delete w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center active:scale-90 transition cursor-pointer hover:ring-2 hover:ring-rose-200" data-id="${item.id}" title="Hapus bahan">
                      <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                `
          : ''
        }
          </div>
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

    // Ganti Tips Acak
    document.getElementById('btn-next-tip')?.addEventListener('click', () => {
      const p = document.getElementById('tip-text-content');
      if (p) {
        const next = TIPS_DAPUR[Math.floor(Math.random() * TIPS_DAPUR.length)];
        p.textContent = next;
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
