// Beranda & Dapur Dashboard Page

import { StorageService } from '../core/storage.js';
import { renderHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { ModalService } from '../components/modal.js';
import { store } from '../core/state.js';

export function renderBerandaPage() {
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

  function renderContent() {
    const currentList = activeTabSection === 'kulkas' ? kulkasItems : dapurItems;

    mainEl.innerHTML = `
      <div class="page-enter flex flex-col w-full max-w-md mx-auto px-4 pt-3 pb-8 gap-5">

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
                <span>${kritisItems.length > 0 ? `${kritisItems.length} Kritis` : 'Semua Segar'}</span>
              </div>
            </div>
            <div class="mt-3.5 pt-3 border-t border-emerald-100/80 flex items-center justify-between text-xs text-slate-600">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
                <span class="font-medium">Penyimpanan optimal • ${Math.max(10, Math.round(((totalBahan - kritisItems.length) / (totalBahan || 1)) * 100))}% siap saji</span>
              </div>
              <span class="text-[11px] text-slate-400">Update ${new Date(stokData.lastUpdated || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
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
                    <span class="material-symbols-outlined text-[20px]">photo_camera</span>
                  </div>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-100">Auto</span>
                </div>
                <div>
                  <h3 class="text-xs font-bold leading-tight">Foto Kulkas</h3>
                  <p class="text-[10px] text-emerald-100/90 mt-0.5">Pindai isi rak & laci</p>
                </div>
              </a>

              <!-- Action 2: Foto Belanja -->
              <a href="#pindai?type=belanja" class="flex flex-col justify-between p-3.5 h-32 rounded-2xl bg-amber-600 text-white shadow-sm hover:bg-amber-700 active:scale-95 transition text-left group">
                <div class="flex justify-between items-start w-full">
                  <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition">
                    <span class="material-symbols-outlined text-[20px]">shopping_bag</span>
                  </div>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-100">Auto</span>
                </div>
                <div>
                  <h3 class="text-xs font-bold leading-tight">Foto Belanja</h3>
                  <p class="text-[10px] text-amber-100/90 mt-0.5">Catat barang baru</p>
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

        <!-- Rekomendasi Cepat Hari Ini -->
        <section>
          <div class="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm hover:border-emerald-300 transition">
            <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-amber-500 text-[18px]">skillet</span>
                <span class="text-xs font-bold text-slate-800">Rekomendasi Cepat Hari Ini</span>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">100% Cocok</span>
            </div>
            <div class="mt-2.5 flex items-start gap-3">
              <div class="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 relative">
                <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=80"
                  alt="Tumis Sawi Tahu" class="w-full h-full object-cover">
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-bold text-slate-900 truncate">Tumis Sawi Tahu Gurih</h3>
                <p class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">Solusi tepat menghabiskan sawi hijau & tahu putih segar.</p>
                <div class="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                  <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px] text-slate-400">schedule</span>15 mnt</span>
                  <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px] text-slate-400">eco</span>Zero-waste</span>
                  <a href="#ide-masak" class="ml-auto font-bold text-emerald-700 hover:text-emerald-800 text-[11px]">Masak →</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Inventaris Bahan -->
        <section>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-base font-bold text-slate-800">Inventaris Bahan</h2>
            <button id="btn-tambah-manual" class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1 hover:bg-emerald-100 transition active:scale-95">
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Tambah Bahan</span>
            </button>
          </div>

          <!-- Section Switcher Tabs -->
          <div class="flex p-1 bg-surface-container rounded-xl gap-1 mb-3">
            <button id="tab-btn-kulkas" class="flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTabSection === 'kulkas' ? 'bg-surface-container-lowest text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
              <span class="material-symbols-outlined text-[16px]">kitchen</span>
              <span>Kulkas (${kulkasItems.length})</span>
            </button>
            <button id="tab-btn-dapur" class="flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTabSection === 'dapur' ? 'bg-surface-container-lowest text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
              <span class="material-symbols-outlined text-[16px]">shelves</span>
              <span>Dapur Kering (${dapurItems.length})</span>
            </button>
          </div>

          <!-- Search Input -->
          <div class="relative mb-3">
            <span class="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
            <input type="text" id="inventory-search" placeholder="Cari di ${activeTabSection === 'kulkas' ? 'kulkas' : 'dapur'}..."
              class="w-full h-10 pl-9 pr-4 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition">
          </div>

          <!-- Inventory List -->
          <div id="inventory-list-container" class="flex flex-col gap-2">
            ${renderItemsList(currentList)}
          </div>
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
        <div class="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
          <span class="material-symbols-outlined text-[32px] text-slate-300">inventory_2</span>
          <p class="text-xs mt-2 font-medium">Belum ada bahan di bagian ini.</p>
          <button id="btn-empty-add" class="mt-3 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1 shadow-sm">
            <span class="material-symbols-outlined text-[16px]">add</span> Tambah Bahan Sekarang
          </button>
        </div>
      `;
    }

    return items.map(item => `
      <div class="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-slate-200 transition group" data-item-id="${item.id}">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center flex-shrink-0 font-bold text-sm">
            <span class="material-symbols-outlined text-[20px]">${item.icon || 'kitchen'}</span>
          </div>
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
      </div>
    `).join('');
  }

  function setupEvents() {
    // Switch tabs
    document.getElementById('tab-btn-kulkas')?.addEventListener('click', () => {
      activeTabSection = 'kulkas';
      renderContent();
    });

    document.getElementById('tab-btn-dapur')?.addEventListener('click', () => {
      activeTabSection = 'dapur';
      renderContent();
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

    // Filter search
    document.getElementById('inventory-search')?.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const currentList = activeTabSection === 'kulkas' ? kulkasItems : dapurItems;
      const filtered = currentList.filter(item =>
        item.nama.toLowerCase().includes(query) ||
        (item.catatan && item.catatan.toLowerCase().includes(query)) ||
        (item.kategori && item.kategori.toLowerCase().includes(query))
      );
      const container = document.getElementById('inventory-list-container');
      if (container) container.innerHTML = renderItemsList(filtered);
      attachItemButtons();
    });

    attachItemButtons();
  }

  function attachItemButtons() {
    // Minus
    mainEl.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const allItems = [...kulkasItems, ...dapurItems];
        const item = allItems.find(x => x.id === id);
        if (item && typeof item.jumlah === 'number') {
          const newQty = Math.max(0, item.jumlah - 1);
          if (newQty === 0) {
            if (confirm(`Jumlah ${item.nama} menjadi 0. Hapus dari stok?`)) {
              StorageService.deleteStokItem(id);
              showToast(`${item.nama} telah dihapus dari stok.`, 'info');
              renderBerandaPage();
              return;
            }
          }
          StorageService.updateStokItem(id, { jumlah: newQty });
          renderBerandaPage();
        }
      });
    });

    // Plus
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

    // Delete
    mainEl.querySelectorAll('.btn-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const allItems = [...kulkasItems, ...dapurItems];
        const item = allItems.find(x => x.id === id);
        if (item && confirm(`Hapus "${item.nama}" dari daftar bahan?`)) {
          StorageService.deleteStokItem(id);
          showToast(`"${item.nama}" dihapus.`, 'info');
          renderBerandaPage();
        }
      });
    });
  }

  renderContent();
}
