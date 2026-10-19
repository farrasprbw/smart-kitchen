// Catatan Dapur Page (Cooking & Shopping Logs)

import { StorageService } from '../core/storage.js';
import { formatTanggal, formatWaktuLalu } from '../utils/format.js';
import { renderHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';

export function renderCatatanPage() {
  const mainEl = document.getElementById('app-main');
  if (!mainEl) return;

  const settings = StorageService.getSettings();
  const userName = settings?.userName || 'Sari';

  renderHeader({
    type: 'tab',
    title: 'Catatan Dapur',
    subtitle: `Halo, ${userName}`
  });

  const logMasak = StorageService.getLogMasak()?.entries || [];
  const logBelanja = StorageService.getLogBelanja()?.entries || [];

  let activeTab = 'masak'; // 'masak' or 'belanja'

  function renderContent() {
    mainEl.innerHTML = `
      <div class="page-enter flex flex-col w-full max-w-md mx-auto px-4 pt-2 pb-24 gap-4">

        <!-- Header Summary Banner -->
        <section>
          <div class="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100/50 rounded-2xl p-4 border border-emerald-100 shadow-sm relative overflow-hidden">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Catatan & Riwayat</span>
                <h2 class="text-lg font-bold text-slate-900 mt-0.5">Aktivitas Dapur Pintar</h2>
              </div>
              <div class="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-sm">
                <span class="material-symbols-outlined text-[24px]">menu_book</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-emerald-200/60">
              <div class="bg-white/80 rounded-xl p-2.5 backdrop-blur-sm">
                <span class="text-[10px] text-slate-500 font-bold block uppercase">Menu Dimasak</span>
                <span class="text-xl font-extrabold text-slate-900">${logMasak.length} Resep</span>
              </div>
              <div class="bg-white/80 rounded-xl p-2.5 backdrop-blur-sm">
                <span class="text-[10px] text-slate-500 font-bold block uppercase">Sesi Belanja</span>
                <span class="text-xl font-extrabold text-slate-900">${logBelanja.length} Kali</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Tab Switcher -->
        <div class="flex p-1 bg-surface-container rounded-xl gap-1">
          <button id="catatan-tab-masak" class="flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'masak' ? 'bg-surface-container-lowest text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
            <span class="material-symbols-outlined text-[16px]">skillet</span>
            <span>Riwayat Masak (${logMasak.length})</span>
          </button>
          <button id="catatan-tab-belanja" class="flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'belanja' ? 'bg-surface-container-lowest text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
            <span class="material-symbols-outlined text-[16px]">shopping_bag</span>
            <span>Riwayat Belanja (${logBelanja.length})</span>
          </button>
        </div>

        <!-- Log List Container -->
        <div class="flex flex-col gap-3">
          ${activeTab === 'masak' ? renderLogMasakList(logMasak) : renderLogBelanjaList(logBelanja)}
        </div>

      </div>
    `;

    document.getElementById('catatan-tab-masak')?.addEventListener('click', () => {
      activeTab = 'masak';
      renderContent();
    });

    document.getElementById('catatan-tab-belanja')?.addEventListener('click', () => {
      activeTab = 'belanja';
      renderContent();
    });
  }

  function renderLogMasakList(entries) {
    if (entries.length === 0) {
      return `
        <div class="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
          <span class="material-symbols-outlined text-[32px] text-slate-300">skillet</span>
          <p class="text-xs mt-2 font-medium">Belum ada riwayat masakan.</p>
          <a href="#ide-masak" class="mt-3 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold inline-flex items-center gap-1">
            Masak Sekarang →
          </a>
        </div>
      `;
    }

    return entries.map(item => `
      <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[18px]">restaurant</span>
            </div>
            <div>
              <h3 class="text-xs font-bold text-slate-900">${item.resep}</h3>
              <span class="text-[10px] text-slate-400">${formatWaktuLalu(item.tanggal)} • ${formatTanggal(item.tanggal)}</span>
            </div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
            ${item.tingkat_kesulitan || 'Mudah'}
          </span>
        </div>

        <div class="pt-2 border-t border-slate-50">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bahan yang digunakan:</span>
          <div class="flex flex-wrap gap-1">
            ${(item.bahan_terpakai || []).map(b => `
              <span class="px-2 py-0.5 rounded bg-slate-50 text-slate-600 text-[11px] font-medium">
                ${b.nama} (${b.jumlah} ${b.satuan})
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderLogBelanjaList(entries) {
    if (entries.length === 0) {
      return `
        <div class="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
          <span class="material-symbols-outlined text-[32px] text-slate-300">shopping_bag</span>
          <p class="text-xs mt-2 font-medium">Belum ada riwayat belanja.</p>
          <a href="#pindai?type=barcode" class="mt-3 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold inline-flex items-center gap-1">
            Scan Barcode →
          </a>
        </div>
      `;
    }

    return entries.map(item => `
      <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
            </div>
            <div>
              <h3 class="text-xs font-bold text-slate-900">Sesi Belanja Baru</h3>
              <span class="text-[10px] text-slate-400">${formatWaktuLalu(item.tanggal)} • ${formatTanggal(item.tanggal)}</span>
            </div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${item.metode === 'foto' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}">
            ${item.metode === 'foto' ? '📸 Pindai Foto' : 'Manual'}
          </span>
        </div>

        <div class="pt-2 border-t border-slate-50">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Item ditambahkan:</span>
          <div class="flex flex-wrap gap-1">
            ${(item.items || []).map(b => `
              <span class="px-2 py-0.5 rounded bg-slate-50 text-slate-600 text-[11px] font-medium">
                ${b.nama} (${b.jumlah} ${b.satuan})
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }

  renderContent();
}
