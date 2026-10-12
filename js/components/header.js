// Header component (Tab variant vs Stack variant)

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

  if (type === 'stack') {
    container.innerHTML = `
      <div class="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
        <div class="flex items-center gap-3">
          <a href="#${backHash}" id="header-btn-back" class="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container-highest transition active:scale-95">
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </a>
          <div>
            <h1 class="text-base font-bold text-on-surface leading-tight">${title}</h1>
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
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-semibold text-on-surface-variant">${subtitle}</span>
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 class="text-base font-bold text-on-surface leading-tight">${title}</h1>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button id="btn-open-settings" aria-label="Pengaturan" class="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition active:scale-95">
          <span class="material-symbols-outlined text-[22px]">settings</span>
        </button>
      </div>
    </div>
  `;
}
