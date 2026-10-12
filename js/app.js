import { CONFIG, loadServerConfig } from './config.js';
import { StorageService } from './core/storage.js';
import { Router } from './core/router.js';
import { store } from './core/state.js';
import { updateBottomNav } from './components/bottom-nav.js';
import { ModalService } from './components/modal.js';
import { showToast } from './components/toast.js';

import { renderBerandaPage } from './pages/beranda.js';
import { renderPindaiPage } from './pages/pindai.js';
import { renderKonfirmasiPage } from './pages/konfirmasi.js';
import { renderIdeMasakPage } from './pages/ide-masak.js';
import { renderCatatanPage } from './pages/catatan.js';

class App {
  constructor() {
    this.router = null;
  }

  async init() {
    // 1. Fetch server config if deployed (Vercel env vars)
    await loadServerConfig();

    // 2. Initialize Default Seeds in localStorage
    StorageService.initDefaults();

    // 2. Setup Router
    this.router = new Router({
      beranda: () => {
        store.setState({ activeTab: 'beranda' });
        updateBottomNav('beranda');
        renderBerandaPage();
      },
      pindai: (params) => {
        store.setState({ activeTab: 'pindai' });
        updateBottomNav('pindai');
        renderPindaiPage(params);
      },
      konfirmasi: () => {
        store.setState({ activeTab: 'konfirmasi' });
        updateBottomNav('konfirmasi');
        renderKonfirmasiPage();
      },
      'ide-masak': () => {
        store.setState({ activeTab: 'ide-masak' });
        updateBottomNav('ide-masak');
        renderIdeMasakPage();
      },
      catatan: () => {
        store.setState({ activeTab: 'catatan' });
        updateBottomNav('catatan');
        renderCatatanPage();
      }
    });

    // 3. Global Settings Listener
    document.addEventListener('click', (e) => {
      const settingsBtn = e.target.closest('#btn-open-settings');
      if (settingsBtn) {
        ModalService.openSettings(({ userName }) => {
          showToast(`Pengaturan disimpan. Halo, ${userName}!`, 'success');
          // Refresh active page
          this.router.handleRoute();
        });
      }
    });

    // 4. Start Router
    this.router.init();

    // 5. Check Onboarding
    const settings = StorageService.getSettings();
    if (!settings?.onboardingDone) {
      this.showOnboardingModal();
    }
  }

  showOnboardingModal() {
    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    const btnStart = document.getElementById('btn-start-app');
    const inputName = document.getElementById('input-name');

    btnStart?.addEventListener('click', () => {
      const name = inputName?.value.trim() || 'Sari';

      const curSettings = StorageService.getSettings();
      StorageService.saveSettings({
        ...curSettings,
        userName: name,
        onboardingDone: true
      });

      modal.classList.add('hidden');
      showToast(`Selamat datang di Dapur Pintar, ${name}!`, 'success', 3500);
      this.router.handleRoute();
    });
  }
}

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
