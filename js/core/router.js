// Hash-based SPA Router

export class Router {
  constructor(routes = {}) {
    this.routes = routes;
    this.currentRoute = null;
    this.beforeNavigate = null;

    window.addEventListener('hashchange', () => this.handleRoute());
  }

  setBeforeNavigate(fn) {
    this.beforeNavigate = fn;
  }

  addRoute(path, handler) {
    this.routes[path] = handler;
  }

  getRouteFromHash() {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    return hash || 'beranda';
  }

  navigate(path) {
    window.location.hash = `#${path}`;
  }

  handleRoute() {
    const rawPath = this.getRouteFromHash();
    const [route, ...queryParts] = rawPath.split('?');
    const queryString = queryParts.join('?');
    const params = new URLSearchParams(queryString);

    if (this.beforeNavigate) {
      const allowed = this.beforeNavigate(route, params);
      if (allowed === false) return;
    }

    const handler = this.routes[route] || this.routes['beranda'];
    if (handler) {
      // Cegah trigger ganda jika route tidak berubah
    if (this.currentRoute === route && document.getElementById('main-content')?.children?.length > 0) {
      return;
    }

    this.currentRoute = route;
      handler(params);
    } else {
      console.warn(`No route handler for: ${route}`);
    }
  }

  init() {
    this.handleRoute();
  }
}
