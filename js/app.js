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
  }

  showOnboardingModal() {
    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    let currentStep = 1;
    let selectedBumbu = [...CONFIG.DEFAULT_BUMBU_DASAR];
    let userName = 'Sari';

    const renderProgressBar = (step) => `
      <div class="flex items-center justify-between gap-1.5 w-full my-1">
        <div class="flex-1 flex flex-col gap-1">
          <div class="h-1.5 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-surface-container-highest'} transition-all"></div>
          <span class="text-[10px] ${step === 1 ? 'font-bold text-primary' : 'text-slate-400'}">1. Profil</span>
        </div>
        <div class="flex-1 flex flex-col gap-1">
          <div class="h-1.5 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-surface-container-highest'} transition-all"></div>
          <span class="text-[10px] ${step === 2 ? 'font-bold text-primary' : 'text-slate-400'}">2. Bumbu</span>
        </div>
        <div class="flex-1 flex flex-col gap-1">
          <div class="h-1.5 rounded-full ${step >= 3 ? 'bg-emerald-500' : 'bg-surface-container-highest'} transition-all"></div>
          <span class="text-[10px] ${step === 3 ? 'font-bold text-emerald-600' : 'text-slate-400'}">3. Selesai</span>
        </div>
      </div>
    `;

    const renderWizard = () => {
      if (currentStep === 1) {
        modal.innerHTML = `
          <div class="bg-surface-container-lowest rounded-t-3xl p-6 flex flex-col gap-4 shadow-2xl max-w-lg mx-auto w-full">
            <div class="w-12 h-1.5 rounded-full bg-surface-container-highest mx-auto"></div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">Langkah 1 dari 3: Profil</span>
              <span class="text-xs text-slate-400 font-semibold">Setup 30 Detik</span>
            </div>
            ${renderProgressBar(1)}
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-on-primary">
                <span class="material-symbols-outlined text-[28px]">kitchen</span>
              </div>
              <div>
                <h2 class="font-headline-md text-base font-bold text-on-surface">Selamat Datang di Dapur Pintar!</h2>
                <p class="text-xs text-on-surface-variant">Langkah 1: Masukkan nama untuk personalisasi dapurmu.</p>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-on-surface mb-1">Siapa nama panggilanmu?</label>
              <input id="wizard-name" type="text" value="${userName}" placeholder="Contoh: Sari" class="w-full h-11 px-4 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            </div>
            <button id="btn-next-step-1" type="button" class="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition">
              <span>Lanjut: Atur Bumbu Dasar</span>
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
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">Langkah 2 dari 3: Stok Bumbu</span>
              <button id="btn-back-step-2" class="text-xs text-slate-400 font-bold hover:underline">Kembali</button>
            </div>
            ${renderProgressBar(2)}
            <div>
              <h2 class="font-headline-md text-base font-bold text-on-surface">Bumbu & Bahan Selalu Ada</h2>
              <p class="text-xs text-on-surface-variant">Langkah 2: Centang bumbu yang biasa tersedia di dapurmu agar rekomendasi resep akurat:</p>
            </div>
            <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              ${CONFIG.DEFAULT_BUMBU_DASAR.map(b => `
                <label class="flex items-center gap-2 p-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary">
                  <input type="checkbox" class="bumbu-check rounded text-primary focus:ring-primary" value="${b}" ${selectedBumbu.includes(b) ? 'checked' : ''}>
                  <span class="capitalize">${b}</span>
                </label>
              `).join('')}
            </div>
            <button id="btn-next-step-2" type="button" class="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition">
              <span>Lanjut: Selesai & Pindai Kulkas</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        `;

        document.getElementById('btn-back-step-2')?.addEventListener('click', () => {
          currentStep = 1;
          renderWizard();
        });

        document.getElementById('btn-next-step-2')?.addEventListener('click', () => {
          selectedBumbu = Array.from(modal.querySelectorAll('.bumbu-check:checked')).map(el => el.value);
          currentStep = 3;
          renderWizard();
        });
      } else if (currentStep === 3) {
        modal.innerHTML = `
          <div class="bg-surface-container-lowest rounded-t-3xl p-6 flex flex-col gap-4 shadow-2xl max-w-lg mx-auto w-full">
            <div class="w-12 h-1.5 rounded-full bg-surface-container-highest mx-auto"></div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Langkah 3 dari 3: Siap!</span>
              <span class="text-xs text-emerald-600 font-bold">Setup Selesai</span>
            </div>
            ${renderProgressBar(3)}
            <div class="text-center py-2">
              <div class="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <span class="material-symbols-outlined text-[36px]">verified</span>
              </div>
              <h2 class="font-headline-md text-base font-bold text-on-surface">Dapur Pintar Siap, ${userName}!</h2>
              <p class="text-xs text-on-surface-variant max-w-xs mx-auto mt-1 leading-relaxed">
                Setup selesai! Langkah terakhir, kamu bisa langsung memotret isi kulkasmu sekarang atau mengeksplorasi beranda.
              </p>
            </div>
            <div class="flex flex-col gap-2 mt-2">
              <button id="btn-finish-scan" type="button" class="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition">
                <span class="material-symbols-outlined text-[18px]">photo_camera</span>
                <span>Pindai Kulkas Sekarang</span>
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
            bumbuDasar: selectedBumbu,
            onboardingDone: true
          });

          // Isi bumbu dasar ke stok dapur jika dapur kosong
          const curStok = StorageService.getStok();
          if (curStok.dapur.length === 0) {
            const initialBumbuItems = selectedBumbu.map(b => ({
              nama: b.charAt(0).toUpperCase() + b.slice(1),
              jumlah: 1,
              satuan: 'botol',
              kategori: 'bumbu_dasar',
              lokasi: 'dapur',
              catatan: 'Bumbu dasar dapur',
              status: 'Segar'
            }));
            StorageService.addItemsToStok(initialBumbuItems, 'dapur');
          }

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
