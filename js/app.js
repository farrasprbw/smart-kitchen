import { CONFIG, loadServerConfig } from './config.js';
import { StorageService } from './core/storage.js';
import { Router } from './core/router.js';
import { store } from './core/state.js';
import { updateBottomNav } from './components/bottom-nav.js';
import { ModalService } from './components/modal.js';
import { showToast } from './components/toast.js';

import { renderBerandaPage } from './pages/beranda.js';
import { renderPindaiPage, stopPindaiCamera } from './pages/pindai.js';
import { renderKonfirmasiPage } from './pages/konfirmasi.js';
import { renderIdeMasakPage } from './pages/ide-masak.js';
import { renderCatatanPage } from './pages/catatan.js';
import { initAppUpdater } from './services/updater.js';

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

    this.router.setBeforeNavigate((targetRoute) => {
      if (targetRoute !== 'pindai') {
        stopPindaiCamera();
      }
      return true;
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

    // 6. Initialize Service Worker & PWA Updater
    initAppUpdater();
  }

  showOnboardingModal() {
    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    let currentStep = 1;
    let userName = 'Sari';

    const renderProgressBar = (step) => `
      <div class="flex items-center justify-between gap-1.5 w-full my-1">
        <div class="flex-1 flex flex-col gap-1">
          <div class="h-1.5 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-surface-container-highest'} transition-all"></div>
          <span class="text-[10px] ${step === 1 ? 'font-bold text-primary' : 'text-slate-400'}">1. Profil</span>
        </div>
        <div class="flex-1 flex flex-col gap-1">
          <div class="h-1.5 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-surface-container-highest'} transition-all"></div>
          <span class="text-[10px] ${step === 2 ? 'font-bold text-emerald-600' : 'text-slate-400'}">2. Siap</span>
        </div>
      </div>
    `;

    const renderWizard = () => {
      if (currentStep === 1) {
        modal.innerHTML = `
          <div class="bg-surface-container-lowest rounded-t-3xl p-6 flex flex-col gap-4 shadow-2xl max-w-lg mx-auto w-full">
            <div class="w-12 h-1.5 rounded-full bg-surface-container-highest mx-auto"></div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">Langkah 1 dari 2: Profil</span>
              <span class="text-xs text-slate-400 font-semibold">Setup Cepat</span>
            </div>
            ${renderProgressBar(1)}
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-on-primary">
                <span class="material-symbols-outlined text-[28px]">kitchen</span>
              </div>
              <div>
                <h2 class="font-headline-md text-base font-bold text-on-surface">Selamat Datang di Dapur Pintar!</h2>
                <p class="text-xs text-on-surface-variant">Masukkan nama untuk personalisasi dapurmu.</p>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-on-surface mb-1">Siapa nama panggilanmu?</label>
              <input id="wizard-name" type="text" value="${userName}" placeholder="Contoh: Sari" class="w-full h-11 px-4 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            </div>
            <button id="btn-next-step-1" type="button" class="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition">
              <span>Lanjut</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        `;

        document.getElementById('btn-next-step-1')?.addEventListener('click', () => {
          userName = document.getElementById('wizard-name')?.value.trim() || 'Sari';
          currentStep = 2;
          renderWizard();
        });
      } else if (currentStep === 2) {
        modal.innerHTML = `
          <div class="bg-surface-container-lowest rounded-t-3xl p-6 flex flex-col gap-4 shadow-2xl max-w-lg mx-auto w-full">
            <div class="w-12 h-1.5 rounded-full bg-surface-container-highest mx-auto"></div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Langkah 2 dari 2: Siap!</span>
              <span class="text-xs text-emerald-600 font-bold">Setup Selesai</span>
            </div>
            ${renderProgressBar(2)}
            <div class="text-center py-2">
              <div class="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <span class="material-symbols-outlined text-[36px]">verified</span>
              </div>
              <h2 class="font-headline-md text-base font-bold text-on-surface">Dapur Pintar Siap, ${userName}!</h2>
              <p class="text-xs text-on-surface-variant max-w-xs mx-auto mt-1 leading-relaxed">
                Bumbu dasar dapur diasumsikan sudah lengkap di rumah. Kamu cukup memindai bahan-bahan utama di kulkas untuk mendapatkan ide masakan lezat!
              </p>
            </div>
            <div class="flex flex-col gap-2 mt-2">
              <button id="btn-finish-scan" type="button" class="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition">
                <span class="material-symbols-outlined text-[18px]">photo_camera</span>
                <span>Pindai Bahan Utama Sekarang</span>
              </button>
              <button id="btn-finish-dashboard" type="button" class="w-full h-11 rounded-xl bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center active:scale-95 transition">
                <span>Masuk ke Beranda Dulu</span>
              </button>
            </div>
          </div>
        `;

        const finishWizard = (goToScan = false) => {
          const curSettings = StorageService.getSettings();
          StorageService.saveSettings({
            ...curSettings,
            userName,
            onboardingDone: true
          });

          modal.classList.add('hidden');
          showToast(`Selamat datang di Dapur Pintar, ${userName}!`, 'success', 3500);

          if (goToScan) {
            window.location.hash = '#pindai?type=kulkas';
          } else {
            this.router.handleRoute();
          }
        };

        document.getElementById('btn-finish-scan')?.addEventListener('click', () => finishWizard(true));
        document.getElementById('btn-finish-dashboard')?.addEventListener('click', () => finishWizard(false));
      }
    };

    renderWizard();
  }
}

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
