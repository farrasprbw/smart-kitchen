// Bottom sheet & modal manager with Theme, Export/Import, & Manual Entry

export class ModalService {
  static open(htmlContent, { onClose = null } = {}) {
    const modalEl = document.getElementById('app-modal');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div id="modal-backdrop" class="fixed inset-0 bg-inverse-surface/60 backdrop-blur-sm transition-opacity duration-300"></div>
      <div class="fixed inset-x-0 bottom-0 z-10 max-w-lg mx-auto bg-surface-container-lowest rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col transform transition-transform duration-300 ease-out translate-y-0">
        <div class="w-12 h-1.5 rounded-full bg-surface-container-highest mx-auto mt-3 mb-1"></div>
        <div class="overflow-y-auto px-5 pb-8 pt-2 flex-1">
          ${htmlContent}
        </div>
      </div>
    `;

    modalEl.classList.remove('hidden');

    const closeHandler = () => {
      ModalService.close();
      if (onClose) onClose();
    };

    modalEl.querySelector('#modal-backdrop')?.addEventListener('click', closeHandler);
    modalEl.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', closeHandler);
    });
  }

  static close() {
    const modalEl = document.getElementById('app-modal');
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    modalEl.innerHTML = '';
  }

  // Preset: Settings Modal with Theme, Export/Import, and Clear Data
  static openSettings(onSave = null) {
    import('../core/storage.js').then(({ StorageService }) => {
      const settings = StorageService.getSettings();

      const content = `
        <div class="flex items-center justify-between pb-3 border-b border-outline-variant/30">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[24px]">settings</span>
            <h2 class="font-headline-sm text-headline-sm text-on-surface">Pengaturan Dapur Pintar</h2>
          </div>
          <button data-close-modal class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form id="form-settings" class="mt-4 space-y-4">
          <!-- Identitas Akun Pengguna Terisolasi -->
          <div class="p-3 rounded-2xl bg-surface-container border border-outline-variant/40 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px] text-primary">person</span>
              <div>
                <span class="text-xs font-bold text-on-surface block">Profil Akun Mandiri</span>
                <span class="text-[10px] font-mono text-on-surface-variant">${StorageService.getUserId()}</span>
              </div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Tersimpan Otomatis</span>
          </div>

          <div>
            <label class="block text-xs font-bold text-on-surface mb-1">Nama Panggilan</label>
            <input type="text" id="setting-user-name" value="${settings.userName || 'Sari'}"
              class="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          </div>



          <div class="pt-1">
            <button type="submit" class="w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition shadow-sm">
              <span class="material-symbols-outlined text-[18px]">check</span>
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>

        <!-- Backup & Restore Data (Export / Import) -->
        <div class="pt-4 border-t border-outline-variant/30 mt-4 space-y-2">
          <label class="block text-xs font-bold text-on-surface">Cadangkan & Pulihkan Stok (JSON)</label>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" id="btn-export-data" class="h-10 px-3 rounded-xl bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition active:scale-95">
              <span class="material-symbols-outlined text-[18px]">download</span>
              <span>Unduh Backup</span>
            </button>
            <label class="h-10 px-3 rounded-xl bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition active:scale-95 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">upload</span>
              <span>Pulihkan File</span>
              <input type="file" id="input-import-data" accept=".json" class="hidden">
            </label>
          </div>
        </div>

        <!-- Danger Zone: Kosongkan Data -->
        <div class="pt-4 border-t border-outline-variant/30 mt-4 space-y-2">
          <label class="block text-xs font-bold text-red-600">Kosongkan Data Inventaris</label>
          <p class="text-[11px] text-on-surface-variant">Hapus semua stok bahan makanan, riwayat masak, dan catatan belanja di perangkat ini untuk memulai dari awal.</p>
          <button type="button" id="btn-reset-all-data" class="w-full h-10 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95">
            <span class="material-symbols-outlined text-[18px]">delete_sweep</span>
            <span>Kosongkan Semua Data Sekarang</span>
          </button>
        </div>
      `;

      ModalService.open(content);

      // Submit Settings Form
      document.getElementById('form-settings')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const userName = document.getElementById('setting-user-name').value.trim() || 'Sari';
        StorageService.saveSettings({
          ...settings,
          userName
        });

        ModalService.close();
        if (onSave) onSave({ ...settings, userName });
      });

      // Export JSON
      document.getElementById('btn-export-data')?.addEventListener('click', () => {
        const backupData = {
          stok: StorageService.getStok(),
          logMasak: StorageService.getLogMasak(),
          logBelanja: StorageService.getLogBelanja(),
          settings: StorageService.getSettings(),
          exportedAt: new Date().toISOString()
        };
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `dapur_pintar_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      });

      // Import JSON
      document.getElementById('input-import-data')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target.result);
            if (imported.stok) StorageService.saveStok(imported.stok);
            if (imported.logMasak) StorageService.set(CONFIG.STORAGE_KEYS.LOG_MASAK, imported.logMasak);
            if (imported.logBelanja) StorageService.set(CONFIG.STORAGE_KEYS.LOG_BELANJA, imported.logBelanja);
            alert('Data berhasil dipulihkan dari file backup!');
            window.location.reload();
          } catch (err) {
            alert('File backup tidak valid: ' + err.message);
          }
        };
        reader.readAsText(file);
      });

      // Clear all data with custom confirmation modal
      document.getElementById('btn-reset-all-data')?.addEventListener('click', () => {
        ModalService.close();
        setTimeout(() => {
          ModalService.open(`
            <div class="py-5 text-center flex flex-col items-center">
              <div class="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
                <span class="material-symbols-outlined text-[32px]">warning</span>
              </div>
              <h3 class="font-headline-sm text-sm font-bold text-slate-800 mt-3.5">Hapus Semua Data?</h3>
              <p class="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
                Tindakan ini akan mengosongkan seluruh stok kulkas, dapur, dan riwayat harian Anda. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div class="flex gap-2 w-full mt-6">
                <button data-close-modal class="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold active:scale-95 transition">Batal</button>
                <button id="btn-confirm-wipe" class="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold active:scale-95 transition shadow-sm">Ya, Hapus Semua</button>
              </div>
            </div>
          `);

          document.getElementById('btn-confirm-wipe')?.addEventListener('click', () => {
            StorageService.clearAllData();
            ModalService.close();
            window.location.reload();
          });
        }, 150);
      });
    });
  }

  // Preset: Tambah Bahan Manual Modal
  static openAddManualItem(defaultSection = 'kulkas', onSave = null) {
    const content = `
      <div class="flex items-center justify-between pb-3 border-b border-outline-variant/30">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[24px]">add_circle</span>
          <h2 class="font-headline-sm text-headline-sm text-on-surface">Tambah Bahan Manual</h2>
        </div>
        <button data-close-modal class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <form id="form-add-item" class="mt-4 space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-on-surface mb-1">Nama Bahan *</label>
          <input type="text" id="manual-nama" required placeholder="Misal: Brokoli, Keju Cheddar, Bawang Bombay"
            class="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-on-surface mb-1">Jumlah</label>
            <input type="number" id="manual-jumlah" value="1" min="0.1" step="any"
              class="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          </div>
          <div>
            <label class="block text-xs font-bold text-on-surface mb-1">Satuan</label>
            <select id="manual-satuan" class="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="buah">buah</option>
              <option value="butir">butir</option>
              <option value="ikat">ikat</option>
              <option value="bungkus">bungkus</option>
              <option value="potong">potong</option>
              <option value="liter">liter</option>
              <option value="gram">gram</option>
              <option value="kg">kg</option>
              <option value="botol">botol</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-on-surface mb-1">Lokasi Simpan</label>
            <select id="manual-lokasi" class="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="kulkas" ${defaultSection === 'kulkas' ? 'selected' : ''}>Kulkas Utama</option>
              <option value="freezer">Freezer</option>
              <option value="pintu_kulkas">Pintu Kulkas</option>
              <option value="dapur" ${defaultSection === 'dapur' ? 'selected' : ''}>Dapur Kering</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-on-surface mb-1">Kategori</label>
            <select id="manual-kategori" class="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="sayur">Sayur</option>
              <option value="protein">Protein</option>
              <option value="buah">Buah</option>
              <option value="bumbu_dasar">Bumbu</option>
              <option value="bahan_kering">Bahan Kering</option>
              <option value="minuman">Minuman</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-on-surface mb-1">Catatan (opsional)</label>
          <input type="text" id="manual-catatan" placeholder="Misal: Beli di pasar pagi, segera olah"
            class="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
        </div>

        <div class="pt-2">
          <button type="submit" class="w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition shadow-sm">
            <span class="material-symbols-outlined text-[18px]">add</span>
            <span>Simpan Bahan</span>
          </button>
        </div>
      </form>
    `;

    ModalService.open(content);

    document.getElementById('form-add-item')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nama = document.getElementById('manual-nama').value.trim();
      const jumlah = parseFloat(document.getElementById('manual-jumlah').value) || 1;
      const satuan = document.getElementById('manual-satuan').value;
      const lokasi = document.getElementById('manual-lokasi').value;
      const kategori = document.getElementById('manual-kategori').value;
      const catatan = document.getElementById('manual-catatan').value.trim();

      const item = {
        nama,
        jumlah,
        satuan,
        lokasi,
        kategori,
        catatan,
        yakin: true,
        confidence: 100,
        status: 'Segar',
        statusClass: 'bg-primary-container/15 text-primary-container'
      };

      ModalService.close();
      if (onSave) onSave(item, lokasi === 'dapur' ? 'dapur' : 'kulkas');
    });
  }
}
