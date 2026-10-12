// Bottom sheet & modal manager

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

  // Preset: Settings Modal
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
          <div>
            <label class="block text-xs font-bold text-on-surface mb-1">Nama Panggilan</label>
            <input type="text" id="setting-user-name" value="${settings.userName || 'Sari'}"
              class="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          </div>

          <div>
            <label class="block text-xs font-bold text-on-surface mb-1">Bumbu Dasar Selalu Ada (pisahkan dengan koma)</label>
            <textarea id="setting-bumbu" rows="3"
              class="w-full p-3 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary">${(settings.bumbuDasar || []).join(', ')}</textarea>
            <p class="text-[11px] text-on-surface-variant mt-1">Sistem mengasumsikan bumbu-bumbu ini selalu tersedia di dapur saat merekomendasikan resep.</p>
          </div>

          <div class="pt-2">
            <button type="submit" class="w-full h-11 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition shadow-sm">
              <span class="material-symbols-outlined text-[18px]">check</span>
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>

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

      document.getElementById('form-settings')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const userName = document.getElementById('setting-user-name').value.trim() || 'Sari';
        const bumbuStr = document.getElementById('setting-bumbu').value;
        const bumbuDasar = bumbuStr.split(',').map(s => s.trim()).filter(Boolean);

        StorageService.saveSettings({
          ...settings,
          userName,
          bumbuDasar
        });

        ModalService.close();
        if (onSave) onSave({ ...settings, userName, bumbuDasar });
      });

      document.getElementById('btn-reset-all-data')?.addEventListener('click', () => {
        if (confirm('Apakah kamu yakin ingin mengosongkan semua data inventaris kulkas dan dapur?')) {
          StorageService.clearAllData();
          ModalService.close();
          window.location.reload();
        }
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
          <button type="submit" class="w-full h-11 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition shadow-sm">
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
