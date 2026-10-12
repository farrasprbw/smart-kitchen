// Bottom Navigation component

export function updateBottomNav(activeRoute) {
  const nav = document.getElementById('app-nav');
  if (!nav) return;

  // Stack pages hide the bottom nav
  const stackPages = ['konfirmasi'];
  if (stackPages.includes(activeRoute)) {
    nav.classList.add('hidden');
    return;
  }
  nav.classList.remove('hidden');

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
