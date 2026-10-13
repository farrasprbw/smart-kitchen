// Header component with Active Online/Offline verification

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

  const offlineBadgeHtml = `
    <span id="header-offline-badge" class="${isOnline ? 'hidden' : ''} px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 text-[10px] font-bold flex items-center gap-1 shadow-xs">
      <span class="material-symbols-outlined text-[13px]">cloud_off</span>
      <span>Offline</span>
    </span>
  `;

  if (type === 'stack') {
    container.innerHTML = `
      <div class="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
        <div class="flex items-center gap-3">
          <a href="#${backHash}" id="header-btn-back" class="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container-highest transition active:scale-95">
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
        ${rightAction ? rightAction : ''}
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

  // Default Tab Header
  container.innerHTML = `
    <div class="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-base shadow-sm ring-2 ring-primary/20">
          ${subtitle.replace('Halo, ', '').charAt(0) || 'S'}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-on-surface-variant">${subtitle}</span>
            ${offlineBadgeHtml}
          </div>
          <h1 class="text-base font-bold text-on-surface leading-tight">${title}</h1>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button id="btn-open-settings" aria-label="Pengaturan" class="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition active:scale-95" title="Pengaturan">
          <span class="material-symbols-outlined text-[22px]">settings</span>
        </button>
      </div>
    </div>
  `;
}
