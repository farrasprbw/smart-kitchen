import { store } from '../core/state.js';
import { StorageService } from '../core/storage.js';

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

async function verifyConnectivity() {
  if (typeof window === 'undefined') return;
  // Jika browser melaporkan online, percaya online
  if (navigator.onLine) {
    updateOnlineState(true);
    return;
  }
  // Jika browser melaporkan offline, verifikasi dengan fetch ringan sebelum menampilkan offline
  try {
    const res = await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
    updateOnlineState(res.ok || res.status < 500);
  } catch (e) {
    updateOnlineState(false);
  }
}

function updateOnlineState(online) {
  isOnline = online;
  const badge = document.getElementById('header-offline-badge');
  if (badge) {
    if (isOnline) {
      badge.classList.add('hidden');
    } else {
      badge.classList.remove('hidden');
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => updateOnlineState(true));
  window.addEventListener('offline', () => verifyConnectivity());
  // Verifikasi saat startup
  setTimeout(verifyConnectivity, 1000);
}

export function renderHeader({
  type = 'tab', // 'tab' | 'stack'
  title = 'Beranda & Dapur',
  subtitle = 'Halo, Sari',
  backHash = 'beranda',
  onBack = null,
  rightAction = null
} = {}) {
  const container = document.getElementById('app-header');
  if (!container) return;

  const activeRoute = store?.getState()?.activeTab || (typeof window !== 'undefined' ? window.location.hash.replace('#', '').split('?')[0] : 'beranda') || 'beranda';
  const settings = StorageService.getSettings();
  const userName = settings?.userName || 'Sari';

  const offlineBadgeHtml = `
    <span id="header-offline-badge" class="${isOnline ? 'hidden' : ''} px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 text-[10px] font-bold flex items-center gap-1 shadow-xs">
      <span class="material-symbols-outlined text-[13px]">cloud_off</span>
      <span>Offline</span>
    </span>
  `;

  const desktopNavHtml = `
    <nav class="hidden md:flex items-center gap-1.5 lg:gap-2">
      <a href="#beranda" data-desktop-nav="beranda" class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all ${activeRoute === 'beranda' ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'}">
        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' ${activeRoute === 'beranda' ? 1 : 0};">cottage</span>
        <span>Beranda</span>
      </a>
      <a href="#pindai" data-desktop-nav="pindai" class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all ${activeRoute === 'pindai' ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'}">
        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' ${activeRoute === 'pindai' ? 1 : 0};">document_scanner</span>
        <span>Pindai</span>
      </a>
      <a href="#ide-masak" data-desktop-nav="ide-masak" class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all ${activeRoute === 'ide-masak' ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'}">
        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' ${activeRoute === 'ide-masak' ? 1 : 0};">skillet</span>
        <span>Ide Masak</span>
      </a>
      <a href="#catatan" data-desktop-nav="catatan" class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all ${activeRoute === 'catatan' ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'}">
        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' ${activeRoute === 'catatan' ? 1 : 0};">menu_book</span>
        <span>Catatan</span>
      </a>
    </nav>
  `;

  if (type === 'stack') {
    container.innerHTML = `
      <div class="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 max-w-md md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto">
        <div class="flex items-center gap-3">
          <a href="#${backHash}" id="header-btn-back" class="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container-highest transition active:scale-95" title="Kembali">
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-bold text-on-surface leading-tight">${title}</h1>
              ${offlineBadgeHtml}
            </div>
            <p class="text-xs text-on-surface-variant">${subtitle}</p>
          </div>
        </div>
        ${desktopNavHtml}
        <div class="flex items-center gap-2">
          ${rightAction ? rightAction : ''}
        </div>
      </div>
    `;

    if (onBack) {
      const btn = container.querySelector('#header-btn-back');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          onBack();
        });
      }
    }
    return;
  }

  // Default Tab Header (Logo DP Resmi Dapur Pintar)
  container.innerHTML = `
    <div class="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 max-w-md md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-extrabold text-sm tracking-tight shadow-sm ring-2 ring-emerald-500/20 shrink-0 select-none">
          DP
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-on-surface-variant">${subtitle}</span>
            ${offlineBadgeHtml}
          </div>
          <h1 class="text-base font-bold text-on-surface leading-tight">${title}</h1>
        </div>
      </div>

      ${desktopNavHtml}

      <div class="flex items-center gap-2">
        <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>${userName}</span>
        </div>
        <button id="btn-open-settings" aria-label="Pengaturan" class="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition active:scale-95" title="Pengaturan">
          <span class="material-symbols-outlined text-[22px]">settings</span>
        </button>
        ${rightAction ? rightAction : ''}
      </div>
    </div>
  `;
}
