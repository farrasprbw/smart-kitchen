// Toast Notification Component

let toastTimeout = null;

export function showToast(message, type = 'success', duration = 2800) {
  const container = document.getElementById('app-toast');
  if (!container) return;

  clearTimeout(toastTimeout);

  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };

  const bgClasses = {
    success: 'bg-inverse-surface text-inverse-on-surface border-inverse-primary/30',
    error: 'bg-error text-on-error border-error-container/30',
    warning: 'bg-secondary-container text-on-secondary-container border-secondary/30',
    info: 'bg-inverse-surface text-inverse-on-surface border-outline-variant/30'
  };

  const iconName = icons[type] || 'info';
  const colorClass = bgClasses[type] || bgClasses.info;

  container.innerHTML = `
    <div class="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md ${colorClass} transition-all">
      <span class="material-symbols-outlined text-[20px] flex-shrink-0">${iconName}</span>
      <span class="text-xs font-semibold leading-snug flex-1">${message}</span>
    </div>
  `;

  // Animate in
  container.classList.remove('opacity-0', '-translate-y-10', 'pointer-events-none');
  container.classList.add('opacity-100', 'translate-y-0');

  toastTimeout = setTimeout(() => {
    container.classList.remove('opacity-100', 'translate-y-0');
    container.classList.add('opacity-0', '-translate-y-10', 'pointer-events-none');
  }, duration);
}
