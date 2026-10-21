// Bottom Navigation component (Mobile) and Top Navigation sync (Desktop)

export function updateBottomNav(activeRoute) {
  const nav = document.getElementById('app-nav');
  if (nav) {
    // Stack pages hide the bottom nav
    const stackPages = ['konfirmasi'];
    if (stackPages.includes(activeRoute)) {
      nav.classList.add('hidden');
    } else {
      nav.classList.remove('hidden');
    }
    nav.classList.add('md:hidden');

    const links = nav.querySelectorAll('a[data-path]');
    links.forEach(link => {
      const path = link.getAttribute('data-path');
      const isCurrent = (path === activeRoute);

      if (isCurrent) {
        link.className = 'flex flex-col items-center justify-center flex-1 h-full py-1 text-primary font-bold transition-all';
        link.setAttribute('aria-current', 'page');
        const icon = link.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.style.fontVariationSettings = "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24";
        }
      } else {
        link.className = 'flex flex-col items-center justify-center flex-1 h-full py-1 text-on-surface-variant hover:text-primary transition-all font-medium';
        link.removeAttribute('aria-current');
        const icon = link.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.style.fontVariationSettings = "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
        }
      }
    });
  }

  // Sync Desktop Top Navigation links in header
  const desktopLinks = document.querySelectorAll('#app-header [data-desktop-nav]');
  desktopLinks.forEach(link => {
    const path = link.getAttribute('data-desktop-nav');
    const isCurrent = (path === activeRoute);
    if (isCurrent) {
      link.className = 'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-bold bg-primary text-white shadow-xs transition-all';
      link.setAttribute('aria-current', 'page');
    } else {
      link.className = 'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all';
      link.removeAttribute('aria-current');
    }
  });
}
