// Update manager for Service Worker & PWA lifecycle

let updateModalShown = false;

/**
 * Tampilkan modal notifikasi paksa untuk memperbarui aplikasi ke versi terbaru
 * @param {ServiceWorker} [waitingWorker]
 */
export function showUpdatePrompt(waitingWorker = null) {
  if (updateModalShown) return;
  updateModalShown = true;

  // Cek apakah modal sudah ada di DOM
  let existingModal = document.getElementById('app-update-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'app-update-modal';
  modal.className = 'fixed inset-0 z-[100] bg-inverse-surface/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300';
  modal.innerHTML = `
    <div class="bg-surface-container-lowest rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-outline-variant/30 flex flex-col items-center">
      <div class="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-xs">
        <span class="material-symbols-outlined text-[36px] animate-bounce">system_update</span>
      </div>
      
      <span class="text-[11px] font-bold px-3 py-1 rounded-full bg-primary/15 text-primary mb-2 uppercase tracking-wider">
        Pembaruan Sistem
      </span>
      
      <h3 class="font-headline-md text-lg font-bold text-on-surface mb-2">
        Versi Baru Tersedia!
      </h3>
      
      <p class="text-xs text-on-surface-variant leading-relaxed mb-6">
        Aplikasi Dapur Pintar telah diperbarui dengan fitur dan perbaikan terbaru. Silakan perbarui sekarang untuk melanjutkan.
      </p>

      <button id="btn-apply-update" type="button" class="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-95 transition-all">
        <span class="material-symbols-outlined text-[20px]">refresh</span>
        <span id="btn-update-text">Perbarui Sekarang</span>
      </button>
      
      <p class="text-[10px] text-slate-400 mt-3 font-medium">
        Data stok & preferensi kamu tetap aman tersimpan.
      </p>
    </div>
  `;

  document.body.appendChild(modal);

  const applyBtn = document.getElementById('btn-apply-update');
  const btnText = document.getElementById('btn-update-text');

  applyBtn?.addEventListener('click', async () => {
    applyBtn.disabled = true;
    if (btnText) btnText.textContent = 'Memuat versi terbaru...';

    // 1. Kirim sinyal SKIP_WAITING ke service worker yang sedang menunggu
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }

    // 2. Bersihkan cache browser lama untuk memastikan aset fresh dari server
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (err) {
        console.warn('Cache clearing notice:', err);
      }
    }

    // 3. Muat ulang halaman secara penuh
    setTimeout(() => {
      window.location.reload();
    }, 400);
  });
}

/**
 * Inisialisasi Service Worker dengan pendeteksi update otomatis
 */
export function initAppUpdater() {
  // 0. Jangan aktifkan Service Worker jika berjalan di aplikasi native Capacitor / Android APK
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    return;
  }

  if (!('serviceWorker' in navigator)) return;

  // Catat apakah halaman sudah dikontrol oleh Service Worker sebelumnya
  const hadController = Boolean(navigator.serviceWorker.controller);

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');

      // 1. Jika ada worker yang sudah menunggu (waiting) dari kunjungan sebelumnya
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdatePrompt(reg.waiting);
      }

      // 2. Deteksi update baru yang sedang diunduh di background
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Ada update baru dan siap dipakai
            showUpdatePrompt(newWorker);
          }
        });
      });

      // 3. Cek pembaruan saat tab browser kembali aktif
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
        }
      });

      // 4. Cek pembaruan secara berkala (setiap 10 menit)
      setInterval(() => {
        reg.update().catch(() => {});
      }, 10 * 60 * 1000);

    } catch (err) {
      console.warn('Service worker registration error:', err);
    }
  });

  // 5. Listener reload saat controller baru mengambil alih
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Jangan reload pada instalasi pertama kali (karena aplikasi baru saja dimuat dari awal)
    if (!hadController) {
      return;
    }

    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
