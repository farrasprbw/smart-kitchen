// Pindai (Scan) Page — Multi-Sudut Camera, AI Vision, Sub-Tab Switcher, & Draft Persistence

import { CONFIG } from '../config.js';
import { CameraService } from '../services/camera.js';
import { ImageService } from '../services/image.js';
import { GeminiService } from '../services/gemini.js';
import { calculateBrightness, getBrightnessStatus } from '../utils/brightness.js';
import { buildPromptDeteksiKulkas, buildPromptDeteksiBelanja } from '../utils/prompts.js';
import { renderHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { ModalService } from '../components/modal.js';
import { store } from '../core/state.js';

let cameraServiceInstance = null;
let brightnessInterval = null;

export function stopPindaiCamera() {
  if (cameraServiceInstance) {
    cameraServiceInstance.stop();
  }
  if (brightnessInterval) {
    clearInterval(brightnessInterval);
    brightnessInterval = null;
  }
}

export function renderPindaiPage(params = new URLSearchParams()) {
  const mainEl = document.getElementById('app-main');
  if (!mainEl) return;

  // Cek apakah parameter url atau store yang aktif
  const currentScanType = params.get('type') || store.getState().scanType || 'kulkas';
  const scanType = currentScanType === 'belanja' ? 'belanja' : 'kulkas';
  store.setState({ scanType });

  const pageTitle = scanType === 'belanja' ? 'Pindai Belanjaan & Struk' : 'Pindai Isi Kulkas';
  renderHeader({
    type: 'tab',
    title: 'Pemindai Cerdas',
    subtitle: scanType === 'belanja' ? 'Bahan & Struk Belanja' : 'Inventaris Isi Kulkas'
  });

  const slots = scanType === 'belanja' ? CONFIG.BELANJA_SLOTS : CONFIG.PHOTO_SLOTS;

  // Ambil draft foto yang persisten per tipe
  const currentState = store.getState();
  let photos = scanType === 'belanja' ? (currentState.belanjaPhotos || []) : (currentState.kulkasPhotos || []);

  // Jika belum ada slot, inisialisasi slot kosong
  if (!photos || photos.length !== slots.length) {
    photos = slots.map(s => ({
      slotId: s.id,
      label: s.label,
      icon: s.icon,
      dataUrl: null,
      base64: null,
      mimeType: 'image/jpeg'
    }));
    store.saveDraftPhotos(scanType, photos);
  }

  // Pilih slot aktif pertama yang masih kosong, atau slot ke-0
  let activeSlotIndex = photos.findIndex(p => !p.dataUrl);
  if (activeSlotIndex === -1) activeSlotIndex = 0;

  mainEl.innerHTML = `
    <div class="page-enter flex flex-col w-full max-w-md mx-auto px-4 pt-2 pb-16 gap-4">

      <!-- Sub-Tab Switcher: Kulkas vs Belanjaan / Struk -->
      <div class="p-1 rounded-2xl bg-surface-container-high border border-outline-variant/30 flex items-center shadow-xs">
        <button id="tab-scan-kulkas" type="button" class="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
          scanType === 'kulkas'
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        }">
          <span class="material-symbols-outlined text-[18px]">kitchen</span>
          <span>Isi Kulkas</span>
        </button>
        <button id="tab-scan-belanja" type="button" class="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
          scanType === 'belanja'
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        }">
          <span class="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>Belanjaan & Struk</span>
        </button>
      </div>

      <!-- Panduan Pemindaian & Tips Trigger -->
      <div class="bg-surface-container-low rounded-2xl p-3.5 shadow-sm border border-outline-variant/30">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0 text-on-secondary-fixed">
            <span class="material-symbols-outlined text-[22px]">auto_awesome</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs text-on-surface">${pageTitle}</span>
              <button id="btn-open-tips" type="button" class="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                <span class="material-symbols-outlined text-[14px]">lightbulb</span>
                <span>Tips Foto</span>
              </button>
            </div>
            <p class="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
              ${
                scanType === 'belanja'
                  ? 'Foto bahan belanjaan dan struk kasir untuk inventarisasi & hitung total pengeluaran otomatis.'
                  : 'Cukup foto bahan makanan utama (sayur, lauk, buah). Bumbu dapur dasar diasumsikan sudah tersedia di rumah.'
              }
            </p>
          </div>
        </div>

        <!-- Photo Slots Grid -->
        <div class="grid ${scanType === 'belanja' ? 'grid-cols-3' : 'grid-cols-4'} gap-2 mt-3 pt-3 border-t border-outline-variant/30">
          ${slots.map((s, idx) => {
            const hasPhoto = Boolean(photos[idx]?.dataUrl);
            const isActive = idx === activeSlotIndex;
            return `
              <div class="relative group">
                <button type="button" class="slot-item w-full flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${
                  isActive
                    ? 'border-2 border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                    : hasPhoto
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }" data-index="${idx}">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden transition-colors ${
                    hasPhoto ? 'bg-emerald-100' : 'bg-slate-100 text-slate-600'
                  }">
                    ${
                      hasPhoto
                        ? `<img src="${photos[idx].dataUrl}" class="w-full h-full object-cover">`
                        : `<span class="material-symbols-outlined text-[20px]">${s.icon}</span>`
                    }
                  </div>
                  <span class="text-[10px] text-center line-clamp-1 ${isActive ? 'text-primary font-extrabold' : 'text-slate-600 font-semibold'}">${s.label}</span>
                </button>

                <!-- Tombol Hapus Foto per Slot -->
                ${
                  hasPhoto
                    ? `<button type="button" class="btn-delete-slot absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 active:scale-90 transition-transform z-10" data-delete-idx="${idx}" title="Hapus foto ${s.label}">
                         <span class="material-symbols-outlined text-[13px]">close</span>
                       </button>`
                    : ''
                }
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Live Viewfinder Section -->
      <div class="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 shadow-lg border border-slate-700/50 flex items-center justify-center">
        <!-- Live Video -->
        <video id="camera-video" playsinline autoplay muted class="w-full h-full object-cover"></video>

        <!-- Preview Snapshot Overlay (Saat slot terpilih sudah ada fotonya) -->
        <div id="preview-overlay" class="absolute inset-0 bg-slate-900 hidden flex flex-col items-center justify-between p-3 z-20">
          <img id="preview-image" class="w-full h-full object-cover rounded-2xl" src="" alt="Preview">
          
          <div class="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
            <span class="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">Foto Tersimpan</span>
          </div>

          <!-- Aksi di Preview: Ambil Ulang, Putar 90°, & Hapus -->
          <div class="absolute bottom-4 inset-x-4 flex items-center justify-center gap-2">
            <button id="btn-retake-photo" type="button" class="px-3.5 py-2 rounded-xl bg-white/95 text-slate-800 backdrop-blur-md text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition">
              <span class="material-symbols-outlined text-[18px]">photo_camera</span>
              <span>Ambil Ulang</span>
            </button>
            <button id="btn-rotate-photo" type="button" class="px-3.5 py-2 rounded-xl bg-slate-800/95 text-white backdrop-blur-md text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition">
              <span class="material-symbols-outlined text-[18px]">rotate_right</span>
              <span>Putar</span>
            </button>
            <button id="btn-delete-active-photo" type="button" class="px-3.5 py-2 rounded-xl bg-red-600/95 text-white backdrop-blur-md text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition">
              <span class="material-symbols-outlined text-[18px]">delete</span>
              <span>Hapus</span>
            </button>
          </div>
        </div>

        <!-- Viewfinder Overlay: Corner Brackets & Grid Lines -->
        <div class="absolute inset-4 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-2">
          <div class="flex justify-between">
            <div class="w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
            <div class="w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
          </div>
          <div class="self-center w-12 h-12 rounded-full border border-white/40 flex items-center justify-center animate-pulse">
            <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
          </div>
          <div class="flex justify-between">
            <div class="w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
            <div class="w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
          </div>
        </div>

        <!-- Top Indicator: Slot Target & Brightness Sensor -->
        <div class="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
          <span class="text-[11px] font-bold px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md flex items-center gap-1.5 shadow-sm">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Target: <span id="current-slot-title">${slots[activeSlotIndex].label}</span>
          </span>

          <div id="brightness-pill" class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/90 text-white backdrop-blur-md flex items-center gap-1 shadow-sm transition-colors">
            <span class="material-symbols-outlined text-[14px]">brightness_5</span>
            <span id="brightness-text">Cahaya Optimal</span>
          </div>
        </div>

        <!-- Hidden File Upload Input -->
        <input type="file" id="file-input-upload" accept="image/*" class="hidden">
      </div>

      <!-- Camera Action Controls -->
      <div class="flex items-center justify-around px-4 py-2">
        <!-- Torch / Flash Toggle -->
        <button id="btn-torch" type="button" class="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition hover:bg-slate-50" title="Flash">
          <span class="material-symbols-outlined text-[22px]">flash_on</span>
        </button>

        <!-- Main Shutter Button -->
        <button id="btn-shutter" type="button" class="w-18 h-18 rounded-full bg-emerald-600 ring-4 ring-emerald-600/30 text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg" title="Ambil Foto">
          <div class="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center">
            <span class="material-symbols-outlined text-[28px]">photo_camera</span>
          </div>
        </button>

        <!-- Gallery / File Upload Button -->
        <button id="btn-trigger-upload" type="button" class="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition hover:bg-slate-50" title="Unggah dari Galeri">
          <span class="material-symbols-outlined text-[22px]">add_photo_alternate</span>
        </button>
      </div>

      <!-- AI Analysis Dock -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
            <span class="text-xs font-bold text-slate-800">Status Pindai Multi-Foto</span>
          </div>
          <span id="scan-counter-badge" class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            ${photos.filter(p => Boolean(p.dataUrl)).length} dari ${slots.length} Siap
          </span>
        </div>

        <button id="btn-analyze-ai" type="button" class="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition disabled:opacity-50 disabled:pointer-events-none" ${photos.filter(p => Boolean(p.dataUrl)).length === 0 ? 'disabled' : ''}>
          <span class="material-symbols-outlined text-[20px]">document_scanner</span>
          <span>Analisis Bahan Makanan</span>
        </button>

        <p class="text-[11px] text-slate-500 text-center">
          Minimal 1 foto sudah dapat dianalisis. Ambil semua sudut untuk akurasi maksimal.
        </p>
      </div>

    </div>
  `;

  setupCameraAndEvents(slots, activeSlotIndex, photos, scanType);
}

async function setupCameraAndEvents(slots, initialSlotIndex, photos, scanType) {
  let activeSlotIndex = initialSlotIndex;
  const videoEl = document.getElementById('camera-video');
  const previewOverlay = document.getElementById('preview-overlay');
  const previewImg = document.getElementById('preview-image');
  const shutterBtn = document.getElementById('btn-shutter');
  const torchBtn = document.getElementById('btn-torch');
  const uploadBtn = document.getElementById('btn-trigger-upload');
  const fileInput = document.getElementById('file-input-upload');
  const analyzeBtn = document.getElementById('btn-analyze-ai');
  const brightnessPill = document.getElementById('brightness-pill');
  const brightnessText = document.getElementById('brightness-text');
  const counterBadge = document.getElementById('scan-counter-badge');
  const retakeBtn = document.getElementById('btn-retake-photo');
  const rotateBtn = document.getElementById('btn-rotate-photo');
  const deleteActiveBtn = document.getElementById('btn-delete-active-photo');

  // Sub-Tab Switcher Event Listeners
  document.getElementById('tab-scan-kulkas')?.addEventListener('click', () => {
    if (scanType !== 'kulkas') {
      renderPindaiPage(new URLSearchParams('type=kulkas'));
    }
  });

  document.getElementById('tab-scan-belanja')?.addEventListener('click', () => {
    if (scanType !== 'belanja') {
      renderPindaiPage(new URLSearchParams('type=belanja'));
    }
  });

  // Start Camera
  if (!cameraServiceInstance) {
    cameraServiceInstance = new CameraService();
  }

  try {
    if (videoEl) {
      await cameraServiceInstance.start(videoEl);
    }
  } catch (err) {
    console.warn('Camera stream failed or permission denied:', err);
    showToast('Kamera tidak dapat diakses otomatis. Anda bisa mengunggah foto via tombol galeri.', 'warning', 4000);
  }

  // Real-time brightness monitor
  clearInterval(brightnessInterval);
  brightnessInterval = setInterval(() => {
    if (videoEl && videoEl.readyState >= 2) {
      const score = calculateBrightness(videoEl);
      const status = getBrightnessStatus(score);
      if (brightnessPill && brightnessText) {
        brightnessText.textContent = status.label;
        brightnessPill.className = `text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1 shadow-sm transition-colors ${status.pillClass}`;
      }
    }
  }, 1200);

  // Switch Slot target
  const slotButtons = document.querySelectorAll('.slot-item');
  slotButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      activeSlotIndex = idx;
      updateActiveSlotUI();
    });
  });

  // Delete slot button listeners (pada thumbnail)
  const deleteSlotButtons = document.querySelectorAll('.btn-delete-slot');
  deleteSlotButtons.forEach(delBtn => {
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Mencegah klik ke slot item
      const idx = parseInt(delBtn.getAttribute('data-delete-idx'), 10);
      deletePhotoAtSlot(idx);
    });
  });

  // Retake photo action from preview overlay
  retakeBtn?.addEventListener('click', () => {
    if (previewOverlay) previewOverlay.classList.add('hidden');
  });

  // Rotate photo action (90 degrees clockwise)
  rotateBtn?.addEventListener('click', async () => {
    if (!photos[activeSlotIndex]?.dataUrl) return;
    try {
      showToast('Memutar foto...', 'info', 1000);
      const rotated = await ImageService.rotate90(photos[activeSlotIndex].dataUrl);
      photos[activeSlotIndex].dataUrl = rotated.dataUrl;
      photos[activeSlotIndex].base64 = rotated.base64;
      store.saveDraftPhotos(scanType, photos);
      if (previewImg) previewImg.src = rotated.dataUrl;
      // Refresh thumbnail di slot item
      const activeBtn = document.querySelector(`.slot-item[data-index="${activeSlotIndex}"]`);
      const imgInSlot = activeBtn?.querySelector('img');
      if (imgInSlot) imgInSlot.src = rotated.dataUrl;
      showToast('Foto berhasil diputar 90°', 'success', 1500);
    } catch (err) {
      console.error('Rotate error:', err);
      showToast('Gagal memutar foto.', 'error');
    }
  });

  // Delete photo action from preview overlay
  deleteActiveBtn?.addEventListener('click', () => {
    deletePhotoAtSlot(activeSlotIndex);
  });

  function deletePhotoAtSlot(idx) {
    if (!photos[idx]) return;
    const removedLabel = photos[idx].label || slots[idx].label;
    photos[idx] = {
      slotId: slots[idx].id,
      label: slots[idx].label,
      icon: slots[idx].icon,
      dataUrl: null,
      base64: null,
      mimeType: 'image/jpeg'
    };

    store.saveDraftPhotos(scanType, photos);
    showToast(`Foto ${removedLabel} berhasil dihapus.`, 'info', 2000);

    // Refresh UI
    renderPindaiPage(new URLSearchParams(`type=${scanType}`));
  }

  function updateActiveSlotUI() {
    const slotTitle = document.getElementById('current-slot-title');
    if (slotTitle && slots[activeSlotIndex]) {
      slotTitle.textContent = slots[activeSlotIndex].label;
    }

    slotButtons.forEach((btn, idx) => {
      const hasPhoto = Boolean(photos[idx]?.dataUrl);
      const isActive = idx === activeSlotIndex;
      btn.className = `slot-item w-full flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${
        isActive
          ? 'border-2 border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
          : hasPhoto
          ? 'border-emerald-300 bg-emerald-50/60'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`;

      const iconBox = btn.querySelector('div');
      if (iconBox) {
        iconBox.className = `w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden transition-colors ${
          hasPhoto ? 'bg-emerald-100' : 'bg-slate-100 text-slate-600'
        }`;
      }

      const labelSpan = btn.querySelector('span:not(.material-symbols-outlined)');
      if (labelSpan) {
        labelSpan.className = `text-[10px] text-center line-clamp-1 ${
          isActive ? 'text-primary font-extrabold' : 'text-slate-600 font-semibold'
        }`;
      }
    });

    // If slot has photo, show preview overlay with retake & delete buttons
    if (photos[activeSlotIndex]?.dataUrl) {
      if (previewImg && previewOverlay) {
        previewImg.src = photos[activeSlotIndex].dataUrl;
        previewOverlay.classList.remove('hidden');
      }
    } else {
      if (previewOverlay) previewOverlay.classList.add('hidden');
    }

    const takenCount = photos.filter(p => Boolean(p.dataUrl)).length;
    if (counterBadge) counterBadge.textContent = `${takenCount} dari ${slots.length} Siap`;
    if (analyzeBtn) analyzeBtn.disabled = takenCount === 0;
  }

  // Shutter action
  shutterBtn?.addEventListener('click', async () => {
    try {
      let captureResult = null;
      if (videoEl && videoEl.readyState >= 2) {
        captureResult = cameraServiceInstance.captureFrame(4 / 3);
      } else {
        fileInput?.click();
        return;
      }

      savePhotoToSlot(captureResult.dataUrl, captureResult.base64, captureResult.mimeType);
    } catch (err) {
      console.error('Shutter capture error:', err);
      fileInput?.click();
    }
  });

  // Torch toggle
  torchBtn?.addEventListener('click', async () => {
    const isTorchOn = await cameraServiceInstance.toggleTorch();
    torchBtn.className = `w-12 h-12 rounded-full shadow-sm border text-slate-700 flex items-center justify-center active:scale-95 transition ${
      isTorchOn ? 'bg-amber-400 text-slate-900 border-amber-500' : 'bg-white border-slate-200'
    }`;
  });

  // Gallery upload trigger
  uploadBtn?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Format foto harus JPG, PNG, atau WebP.', 'error', 3000);
      fileInput.value = '';
      return;
    }

    // Validasi ukuran max 5MB
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran foto maksimal 5MB. Silakan pilih foto lain.', 'error', 3000);
      fileInput.value = '';
      return;
    }

    try {
      showToast('Memproses gambar...', 'info', 1500);
      const processed = await ImageService.compressAndResize(file, 1200, 0.85);
      savePhotoToSlot(processed.dataUrl, processed.base64, processed.mimeType);
    } catch (err) {
      console.error('Upload processing error:', err);
      showToast('Gagal memproses gambar.', 'error');
    }
  });

  function savePhotoToSlot(dataUrl, base64, mimeType) {
    photos[activeSlotIndex] = {
      slotId: slots[activeSlotIndex].id,
      label: slots[activeSlotIndex].label,
      icon: slots[activeSlotIndex].icon,
      dataUrl,
      base64,
      mimeType
    };

    store.saveDraftPhotos(scanType, photos);
    showToast(`Foto ${slots[activeSlotIndex].label} berhasil diambil!`, 'success');

    // Otomatis pindah ke slot kosong berikutnya jika ada
    const nextEmpty = photos.findIndex((p, i) => i > activeSlotIndex && !p.dataUrl);
    if (nextEmpty !== -1) {
      activeSlotIndex = nextEmpty;
    } else {
      const anyEmpty = photos.findIndex(p => !p.dataUrl);
      if (anyEmpty !== -1) activeSlotIndex = anyEmpty;
    }

    renderPindaiPage(new URLSearchParams(`type=${scanType}`));
  }

  // Update initial active slot UI
  updateActiveSlotUI();

  // AI Analysis Button
  analyzeBtn?.addEventListener('click', async () => {
    const validPhotos = photos.filter(p => Boolean(p.dataUrl && p.base64));
    if (validPhotos.length === 0) {
      showToast('Harap ambil minimal 1 foto terlebih dahulu.', 'warning');
      return;
    }

    // Show Loading Modal / Overlay dengan Cancel Action
    let isCancelled = false;
    ModalService.open(`
      <div class="py-8 flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-3xl bg-primary text-on-primary flex items-center justify-center animate-bounce shadow-lg">
          <span class="material-symbols-outlined text-[36px]">document_scanner</span>
        </div>
        <h3 class="font-headline-sm text-headline-sm text-on-surface mt-4">Menganalisis Bahan Makanan...</h3>
        <p class="text-xs text-on-surface-variant max-w-xs mt-1.5 leading-relaxed">
          Sedang memindai ${validPhotos.length} foto ${scanType === 'belanja' ? 'belanjaan & struk' : 'kulkas'} untuk mengenali jenis bahan, perkiraan kuantitas, dan kondisi kesegaran.
        </p>
        <div class="w-full max-w-xs bg-surface-container rounded-full h-2 mt-6 overflow-hidden">
          <div class="bg-primary h-full rounded-full animate-pulse w-3/4"></div>
        </div>
        <span class="text-[11px] text-slate-400 mt-2">Estimasi waktu: ~5-10 detik</span>

        <button id="btn-cancel-ai" type="button" class="mt-6 px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50 active:scale-95 transition">
          Batal Analisis
        </button>
      </div>
    `, { onClose: () => { isCancelled = true; } });

    document.getElementById('btn-cancel-ai')?.addEventListener('click', () => {
      isCancelled = true;
      ModalService.close();
      showToast('Analisis dibatalkan.', 'info');
    });

    try {
      const prompt = scanType === 'belanja'
        ? buildPromptDeteksiBelanja()
        : buildPromptDeteksiKulkas(validPhotos.length);

      const aiResponse = await GeminiService.analyzeImages(validPhotos, prompt);

      if (isCancelled) return;

      ModalService.close();

      // Normalize response
      const detectedItems = aiResponse.bahan || aiResponse.belanjaan || [];
      store.setState({
        detectionResults: {
          items: detectedItems,
          total: aiResponse.total_terdeteksi || aiResponse.total_item || detectedItems.length,
          generalNote: aiResponse.catatan_umum || 'Semua bahan berhasil dipindai.',
          photos: validPhotos
        }
      });

      // Stop camera before navigating
      stopPindaiCamera();

      // Navigate to Konfirmasi Page
      window.location.hash = '#konfirmasi';
    } catch (err) {
      if (isCancelled) return;
      ModalService.close();
      console.error('Analysis failed:', err);

      ModalService.open(`
        <div class="py-6 flex flex-col items-center text-center">
          <div class="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
            <span class="material-symbols-outlined text-[32px]">warning</span>
          </div>
          <h3 class="font-headline-sm text-headline-sm text-on-surface mt-3.5">Ups! Ada Kendala</h3>
          <p class="text-xs text-on-surface-variant max-w-xs mt-1.5 leading-relaxed">
            ${err.message || 'Server sedang sibuk, coba lagi sebentar ya.'}
          </p>
          <div class="flex flex-col gap-2 w-full mt-6">
            <button id="btn-retry-ai" type="button" class="w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm">
              <span class="material-symbols-outlined text-[16px]">refresh</span>
              <span>Coba Lagi</span>
            </button>
            <button data-close-modal type="button" class="w-full h-11 rounded-xl bg-surface-container text-on-surface-variant font-bold text-xs flex items-center justify-center active:scale-95 transition">
              Simpan Draft Foto & Nanti Saja
            </button>
          </div>
        </div>
      `);

      document.getElementById('btn-retry-ai')?.addEventListener('click', () => {
        ModalService.close();
        setTimeout(() => analyzeBtn?.click(), 300);
      });
    }
  });

  // Tips Modal
  document.getElementById('btn-open-tips')?.addEventListener('click', () => {
    ModalService.open(`
      <div class="flex items-center justify-between pb-3 border-b border-outline-variant/30">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-secondary text-[24px]">tips_and_updates</span>
          <h2 class="font-headline-sm text-headline-sm text-on-surface">Tips Foto ${scanType === 'belanja' ? 'Belanjaan & Struk' : 'Kulkas'} Akurat</h2>
        </div>
        <button data-close-modal class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div class="mt-4 space-y-3.5 text-xs text-on-surface-variant">
        <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
          <span class="text-xl">📸</span>
          <div>
            <strong class="text-on-surface block text-xs">1. Foto Bertahap (Multi-Sudut)</strong>
            ${scanType === 'belanja'
              ? 'Pisahkan bahan segar dari kemasan bumbu agar deteksi kuantitas tidak tertukar.'
              : 'Buka laci sayur dan wadah tertutup agar bahan di dalamnya terlihat jelas oleh kamera.'}
          </div>
        </div>
        <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
          <span class="text-xl">💡</span>
          <div>
            <strong class="text-on-surface block text-xs">2. Perhatikan Pencahayaan</strong>
            Pastikan lampu ruangan menyala terang. Jika bagian dalam agak gelap, gunakan flash kamera.
          </div>
        </div>
        <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
          <span class="text-xl">🧾</span>
          <div>
            <strong class="text-on-surface block text-xs">3. Foto Struk Datar & Jelas</strong>
            Ratakan struk kasir dan ambil tegak lurus agar teks harga & item terbaca tajam.
          </div>
        </div>
      </div>

      <button data-close-modal class="mt-5 w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center">
        Mengerti, Siap Foto
      </button>
    `);
  });
}
