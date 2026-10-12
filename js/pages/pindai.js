// Pindai (Scan) Page — Multi-Sudut Camera & AI Vision

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

export function renderPindaiPage(params = new URLSearchParams()) {
  const mainEl = document.getElementById('app-main');
  if (!mainEl) return;

  const scanType = params.get('type') === 'belanja' ? 'belanja' : 'kulkas';
  store.setState({ scanType });

  const pageTitle = scanType === 'belanja' ? 'Pindai Belanjaan' : 'Pindai Isi Kulkas';
  renderHeader({
    type: 'tab',
    title: pageTitle,
    subtitle: 'Kamera Pintar AI'
  });

  const slots = scanType === 'belanja'
    ? [
        { id: 'belanja-1', label: 'Bahan Segar', icon: 'nutrition' },
        { id: 'belanja-2', label: 'Kemasan / Bumbu', icon: 'inventory_2' },
        { id: 'belanja-3', label: 'Struk / Total', icon: 'receipt_long' },
      ]
    : CONFIG.PHOTO_SLOTS;

  let activeSlotIndex = 0;
  // Initialize photos array if empty
  let photos = store.getState().scanPhotos || [];
  if (photos.length === 0) {
    photos = slots.map(s => ({ slotId: s.id, label: s.label, icon: s.icon, dataUrl: null, base64: null, mimeType: 'image/jpeg' }));
    store.setState({ scanPhotos: photos });
  }

  mainEl.innerHTML = `
    <div class="page-enter flex flex-col w-full max-w-md mx-auto px-4 pt-2 pb-16 gap-4">

      <!-- Sub-Nav & Modal Tips Trigger -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[22px]">photo_camera</span>
          <h2 class="font-headline-sm text-headline-sm text-on-surface">${pageTitle}</h2>
        </div>
        <button id="btn-open-tips" type="button" class="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary active:scale-95 transition text-xs font-semibold">
          <span class="material-symbols-outlined text-[16px] text-secondary">lightbulb</span>
          <span>Tips Foto</span>
        </button>
      </div>

      <!-- Panduan Multi-Sudut Interactive Card -->
      <div class="bg-surface-container-low rounded-2xl p-3.5 shadow-sm border border-outline-variant/30">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0 text-on-secondary-fixed">
            <span class="material-symbols-outlined text-[22px]">auto_awesome</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs text-on-surface">Panduan Multi-Sudut AI</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-bold">Langkah Cepat</span>
            </div>
            <p class="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
              ${scanType === 'belanja'
                ? 'Foto bahan belanjaan dan struk agar AI dapat mendata item secara otomatis.'
                : 'Ambil 3-4 foto bertahap agar AI melihat semua bahan tanpa terhalang kemasan lain.'}
            </p>
          </div>
        </div>

        <!-- 4 Photo Slots Grid -->
        <div class="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-outline-variant/30">
          ${slots.map((s, idx) => {
            const hasPhoto = Boolean(photos[idx]?.dataUrl);
            const isActive = idx === activeSlotIndex;
            return `
              <button type="button" class="slot-item flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${
                isActive
                  ? 'border-primary bg-primary-container/10 ring-2 ring-primary/30'
                  : hasPhoto
                  ? 'border-emerald-300 bg-emerald-50/60'
                  : 'border-slate-200 bg-white'
              }" data-index="${idx}">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center relative overflow-hidden ${
                  hasPhoto ? 'bg-emerald-100' : isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
                }">
                  ${
                    hasPhoto
                      ? `<img src="${photos[idx].dataUrl}" class="w-full h-full object-cover">
                         <span class="absolute inset-0 bg-emerald-900/40 flex items-center justify-center text-white">
                           <span class="material-symbols-outlined text-[18px]">check</span>
                         </span>`
                      : `<span class="material-symbols-outlined text-[20px]">${s.icon}</span>`
                  }
                </div>
                <span class="text-[10px] font-bold text-center line-clamp-1 ${isActive ? 'text-primary' : 'text-slate-600'}">${s.label}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Live Viewfinder Section -->
      <div class="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 shadow-lg border border-slate-700/50 flex items-center justify-center">
        <!-- Live Video -->
        <video id="camera-video" playsinline autoplay muted class="w-full h-full object-cover"></video>

        <!-- Fallback / Preview Snapshot -->
        <div id="preview-overlay" class="absolute inset-0 bg-slate-900 hidden flex items-center justify-center">
          <img id="preview-image" class="w-full h-full object-cover" src="" alt="Preview">
          <div class="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span class="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">Foto Tersimpan</span>
          </div>
        </div>

        <!-- Viewfinder Overlay: Corner Brackets & Grid Lines -->
        <div class="absolute inset-4 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-2">
          <!-- Top corners -->
          <div class="flex justify-between">
            <div class="w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
            <div class="w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
          </div>
          <!-- Center Reticle Focus Target -->
          <div class="self-center w-12 h-12 rounded-full border border-white/40 flex items-center justify-center animate-pulse">
            <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
          </div>
          <!-- Bottom corners -->
          <div class="flex justify-between">
            <div class="w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
            <div class="w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
          </div>
        </div>

        <!-- Top Indicator: Slot Target & Brightness Sensor -->
        <div class="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
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
          <span class="material-symbols-outlined text-[20px]">psychology</span>
          <span>Analisis Bahan dengan Gemini AI</span>
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

  function updateActiveSlotUI() {
    const slotTitle = document.getElementById('current-slot-title');
    if (slotTitle) slotTitle.textContent = slots[activeSlotIndex].label;

    slotButtons.forEach((btn, idx) => {
      const hasPhoto = Boolean(photos[idx]?.dataUrl);
      const isActive = idx === activeSlotIndex;
      btn.className = `slot-item flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${
        isActive
          ? 'border-primary bg-primary-container/10 ring-2 ring-primary/30'
          : hasPhoto
          ? 'border-emerald-300 bg-emerald-50/60'
          : 'border-slate-200 bg-white'
      }`;
    });

    // If slot has photo, show preview briefly or allow retake
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
        captureResult = cameraServiceInstance.captureFrame();
      } else {
        // Fallback file picker if camera video isn't ready
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

    store.setState({ scanPhotos: [...photos] });

    showToast(`Foto ${slots[activeSlotIndex].label} berhasil diambil!`, 'success');

    // Automatically advance to next empty slot if any
    const nextEmpty = photos.findIndex((p, i) => i > activeSlotIndex && !p.dataUrl);
    if (nextEmpty !== -1) {
      activeSlotIndex = nextEmpty;
    } else {
      const anyEmpty = photos.findIndex(p => !p.dataUrl);
      if (anyEmpty !== -1) activeSlotIndex = anyEmpty;
    }

    renderPindaiPage(new URLSearchParams(`type=${scanType}`));
  }

  // AI Analysis Button
  analyzeBtn?.addEventListener('click', async () => {
    const validPhotos = photos.filter(p => Boolean(p.dataUrl && p.base64));
    if (validPhotos.length === 0) {
      showToast('Harap ambil minimal 1 foto terlebih dahulu.', 'warning');
      return;
    }

    // Show Loading Modal / Overlay
    ModalService.open(`
      <div class="py-8 flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-3xl bg-primary text-on-primary flex items-center justify-center animate-bounce shadow-lg">
          <span class="material-symbols-outlined text-[36px]">psychology</span>
        </div>
        <h3 class="font-headline-sm text-headline-sm text-on-surface mt-4">Menganalisis dengan Gemini 2.0 Flash...</h3>
        <p class="text-xs text-on-surface-variant max-w-xs mt-1.5 leading-relaxed">
          AI sedang memindai ${validPhotos.length} foto kulkasmu untuk mengenali jenis bahan, perkiraan jumlah, dan kesegaran.
        </p>
        <div class="w-full max-w-xs bg-surface-container rounded-full h-2 mt-6 overflow-hidden">
          <div class="bg-primary h-full rounded-full animate-pulse w-3/4"></div>
        </div>
        <span class="text-[11px] text-slate-400 mt-2">Biasanya butuh 5-10 detik</span>
      </div>
    `, { onClose: () => {} });

    try {
      const prompt = scanType === 'belanja'
        ? buildPromptDeteksiBelanja()
        : buildPromptDeteksiKulkas(validPhotos.length);

      const aiResponse = await GeminiService.analyzeImages(validPhotos, prompt);

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
      cameraServiceInstance?.stop();
      clearInterval(brightnessInterval);

      // Navigate to Konfirmasi Page
      window.location.hash = '#konfirmasi';
    } catch (err) {
      ModalService.close();
      console.error('AI Analysis failed:', err);
      showToast(`Gagal: ${err.message}`, 'error', 5000);
    }
  });

  // Tips Modal
  document.getElementById('btn-open-tips')?.addEventListener('click', () => {
    ModalService.open(`
      <div class="flex items-center justify-between pb-3 border-b border-outline-variant/30">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-secondary text-[24px]">tips_and_updates</span>
          <h2 class="font-headline-sm text-headline-sm text-on-surface">Tips Foto Kulkas Akurat</h2>
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
            Buka laci sayur dan wadah tertutup agar bahan di dalamnya terlihat jelas oleh kamera.
          </div>
        </div>
        <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
          <span class="text-xl">💡</span>
          <div>
            <strong class="text-on-surface block text-xs">2. Perhatikan Pencahayaan</strong>
            Pastikan lampu kulkas menyala terang. Jika bagian dalam agak gelap, gunakan flash kamera.
          </div>
        </div>
        <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
          <span class="text-xl">🔍</span>
          <div>
            <strong class="text-on-surface block text-xs">3. Jarak Pengambilan</strong>
            Ambil foto dengan jarak sekitar 30-50 cm agar label kemasan dan jenis sayur terbaca akurat.
          </div>
        </div>
      </div>

      <button data-close-modal class="mt-5 w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center">
        Mengerti, Siap Foto
      </button>
    `);
  });
}
