// Pindai (Scan) Page — Mode Pindai Kulkas (Multi-Sudut) vs Scan Barcode (Deteksi Otomatis)

import { CONFIG } from '../config.js';
import { CameraService } from '../services/camera.js';
import { ImageService } from '../services/image.js';
import { GeminiService } from '../services/gemini.js';
import { BarcodeService } from '../services/barcode.js';
import { StorageService } from '../core/storage.js';
import { calculateBrightness, getBrightnessStatus } from '../utils/brightness.js';
import { buildPromptDeteksiKulkas, buildPromptDeteksiBelanja } from '../utils/prompts.js';
import { renderHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { ModalService } from '../components/modal.js';
import { store } from '../core/state.js';

let cameraServiceInstance = null;
let barcodeServiceInstance = null;
let brightnessInterval = null;
let barcodeScanInterval = null;
let isProcessingBarcode = false;
let lastDetectedBarcode = null;
let lastDetectedTime = 0;

export function stopPindaiCamera() {
  if (barcodeScanInterval) {
    clearInterval(barcodeScanInterval);
    barcodeScanInterval = null;
  }
  if (brightnessInterval) {
    clearInterval(brightnessInterval);
    brightnessInterval = null;
  }
  if (cameraServiceInstance) {
    cameraServiceInstance.stop();
  }
  isProcessingBarcode = false;
}

export function renderPindaiPage(params = new URLSearchParams()) {
  const mainEl = document.getElementById('app-main');
  if (!mainEl) return;

  // Mode: 'kulkas' (Ambil Foto) | 'barcode' (Pemindai Otomatis)
  const queryType = params.get('type') || store.getState().scanType || 'kulkas';
  const scanType = queryType === 'barcode' ? 'barcode' : 'kulkas';
  store.setState({ scanType });

  const pageSubtitle = scanType === 'barcode'
    ? 'Deteksi Barcode Otomatis'
    : 'Inventaris Kulkas (Deteksi Foto)';

  renderHeader({
    type: 'tab',
    title: 'Pemindai Cerdas',
    subtitle: pageSubtitle
  });

  const slots = CONFIG.PHOTO_SLOTS;

  // Ambil draft foto untuk mode kulkas
  const currentState = store.getState();
  let photos = currentState.kulkasPhotos || [];

  if (scanType !== 'barcode') {
    if (!photos || photos.length !== slots.length) {
      photos = slots.map(s => ({
        slotId: s.id,
        label: s.label,
        icon: s.icon,
        dataUrl: null,
        base64: null,
        mimeType: 'image/jpeg'
      }));
      store.saveDraftPhotos('kulkas', photos);
    }
  }

  let activeSlotIndex = 0;
  if (scanType !== 'barcode') {
    activeSlotIndex = photos.findIndex(p => !p.dataUrl);
    if (activeSlotIndex === -1) activeSlotIndex = 0;
  }

  mainEl.innerHTML = `
    <div class="page-enter flex flex-col w-full max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-24 gap-5">

      <!-- Mode Switcher: 2 Tab Bersih (Pindai Kulkas vs Scan Barcode) -->
      <div class="p-1 rounded-2xl bg-surface-container-high border border-outline-variant/30 flex items-center shadow-xs">
        <button id="tab-scan-kulkas" type="button" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${scanType === 'kulkas'
      ? 'bg-primary text-on-primary shadow-sm'
      : 'text-on-surface-variant hover:text-on-surface'
    }">
          <span class="material-symbols-outlined text-[18px]">kitchen</span>
          <span>Pindai Kulkas</span>
        </button>

        <button id="tab-scan-barcode" type="button" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${scanType === 'barcode'
      ? 'bg-primary text-on-primary shadow-sm'
      : 'text-on-surface-variant hover:text-on-surface'
    }">
          <span class="material-symbols-outlined text-[18px]">barcode_scanner</span>
          <span>Scan Barcode</span>
        </button>
      </div>

      <!-- Panduan Mode -->
      <div class="bg-surface-container-low rounded-2xl p-3.5 shadow-sm border border-outline-variant/30">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full ${scanType === 'barcode' ? 'bg-amber-100 text-amber-800' : 'bg-secondary-fixed text-on-secondary-fixed'} flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-[22px]">
              ${scanType === 'barcode' ? 'qr_code_scanner' : 'auto_awesome'}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs text-on-surface">
                ${scanType === 'barcode' ? 'Mode Scan Barcode' : 'Mode Pindai Kulkas'}
              </span>
              <button id="btn-open-tips" type="button" class="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                <span class="material-symbols-outlined text-[14px]">lightbulb</span>
                <span>Panduan</span>
              </button>
            </div>
            <p class="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
              ${scanType === 'barcode'
      ? 'Arahkan kotak kamera ke barcode produk kemasan. Pemindaian berlangsung otomatis tanpa perlu menekan tombol jepret.'
      : 'Ambil 3-4 foto kulkas dari sudut berbeda (Rak, Laci, Freezer, Pintu), lalu klik Analisis agar sistem mendeteksi semua bahan.'
    }
            </p>
          </div>
        </div>

        <!-- Photo Slots Grid (HANYA tampil pada mode Foto Kulkas / Belanja) -->
        ${scanType !== 'barcode' ? `
          <div class="grid ${scanType === 'belanja' ? 'grid-cols-3' : 'grid-cols-4'} gap-2 mt-3 pt-3 border-t border-outline-variant/30">
            ${slots.map((s, idx) => {
      const hasPhoto = Boolean(photos[idx]?.dataUrl);
      const isActive = idx === activeSlotIndex;
      return `
                <div class="relative group">
                  <button type="button" class="slot-item w-full flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${isActive
          ? 'border-2 border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
          : hasPhoto
            ? 'border-emerald-300 bg-emerald-50/60'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }" data-index="${idx}">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden transition-colors ${hasPhoto ? 'bg-emerald-100' : 'bg-slate-100 text-slate-600'
        }">
                      ${hasPhoto
          ? `<img src="${photos[idx].dataUrl}" class="w-full h-full object-cover">`
          : `<span class="material-symbols-outlined text-[20px]">${s.icon}</span>`
        }
                    </div>
                    <span class="text-[10px] text-center line-clamp-1 ${isActive ? 'text-primary font-extrabold' : 'text-slate-600 font-semibold'}">${s.label}</span>
                  </button>

                  <!-- Tombol Hapus Foto per Slot -->
                  ${hasPhoto
          ? `<button type="button" class="btn-delete-slot absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 active:scale-90 transition-transform z-10" data-delete-idx="${idx}" title="Hapus foto ${s.label}">
                           <span class="material-symbols-outlined text-[13px]">close</span>
                         </button>`
          : ''
        }
                </div>
              `;
    }).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Live Viewfinder Section -->
      <div class="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 shadow-lg border border-slate-700/50 flex items-center justify-center">
        <!-- Live Video Element -->
        <video id="camera-video" playsinline autoplay muted class="w-full h-full object-cover"></video>

        <!-- Preview Snapshot Overlay (HANYA untuk mode Foto saat slot sudah ada foto) -->
        ${scanType !== 'barcode' ? `
          <div id="preview-overlay" class="absolute inset-0 bg-slate-900 hidden flex flex-col items-center justify-between p-3 z-20">
            <img id="preview-image" class="w-full h-full object-cover rounded-2xl" src="" alt="Preview">
            
            <div class="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
              <span class="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">Foto Tersimpan</span>
            </div>

            <!-- Aksi di Preview: Ambil Ulang, Putar, & Hapus -->
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
        ` : ''}

        <!-- Barcode Scanner Frame Overlay (HANYA tampil pada mode Scan Barcode) -->
        ${scanType === 'barcode' ? `
          <div class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
            <!-- Focused Reticle Box -->
            <div class="relative w-64 h-40 border-2 border-amber-400 rounded-2xl overflow-hidden shadow-[0_0_24px_rgba(251,191,36,0.3)] bg-black/10">
              <!-- Corner Marks -->
              <div class="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-amber-400"></div>
              <div class="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-amber-400"></div>
              <div class="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-amber-400"></div>
              <div class="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-amber-400"></div>

              <!-- Animated Laser Line -->
              <div class="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-[scanLaser_2s_ease-in-out_infinite]"></div>
            </div>
            
            <p class="text-white text-xs font-bold mt-4 px-3 py-1 bg-black/60 rounded-full backdrop-blur-md">
              Posisikan barcode di dalam kotak
            </p>
          </div>
        ` : `
          <!-- Viewfinder Frame Corner Brackets untuk mode Foto Kulkas -->
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
        `}

        <!-- Top Indicator: Mode / Slot Target & Status -->
        <div class="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
          <span class="text-[11px] font-bold px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md flex items-center gap-1.5 shadow-sm">
            <span class="w-2 h-2 rounded-full ${scanType === 'barcode' ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping"></span>
            ${scanType === 'barcode'
      ? 'Scan Barcode Aktif'
      : `Target: <span id="current-slot-title">${slots[activeSlotIndex]?.label || 'Kulkas'}</span>`
    }
          </span>

          <div id="brightness-pill" class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/90 text-white backdrop-blur-md flex items-center gap-1 shadow-sm transition-colors">
            <span class="material-symbols-outlined text-[14px]">brightness_5</span>
            <span id="brightness-text">Cahaya Optimal</span>
          </div>
        </div>

        <!-- Hidden File Upload Input -->
        <input type="file" id="file-input-upload" accept="image/*" class="hidden">
      </div>

      <!-- Action Area: Dibedakan Secara Jelas Antara Mode Kulkas dan Barcode -->
      ${scanType === 'barcode' ? `
        <!-- MODE B: SCAN BARCODE (TANPA TOMBOL JEPRET) -->
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col items-center gap-3">
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <span class="text-xs font-bold text-slate-800">Pemindai Otomatis Aktif</span>
            </div>
            <button id="btn-torch" type="button" class="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 active:scale-95 transition">
              <span class="material-symbols-outlined text-[16px]">flash_on</span>
              <span>Lampu Flash</span>
            </button>
          </div>

          <div id="barcode-status-card" class="w-full bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-center gap-2.5">
            <span class="material-symbols-outlined text-amber-600 text-[20px] animate-spin flex-shrink-0">sync</span>
            <div class="flex-1 min-w-0">
              <span class="text-xs font-bold text-amber-950 block">Menunggu Barcode...</span>
              <span class="text-[11px] text-amber-900/80">Dekatkan barcode ke dalam kotak kamera di atas.</span>
            </div>
          </div>

          <!-- Tombol Input Manual Cepat jika Barcode Rusak / Tak Terbaca -->
          <button id="btn-manual-barcode-input" type="button" class="w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-primary text-slate-600 hover:text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition">
            <span class="material-symbols-outlined text-[16px]">keyboard</span>
            <span>Ketik Angka Barcode / Nama Barang Manual</span>
          </button>
        </div>
      ` : `
        <!-- MODE A: PINDAI KULKAS (AMBIL FOTO DENGAN TOMBOL SHUTTER BESAR) -->
        <div class="flex items-center justify-around px-4 py-2">
          <!-- Torch / Flash Toggle -->
          <button id="btn-torch" type="button" class="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition hover:bg-slate-50" title="Flash">
            <span class="material-symbols-outlined text-[22px]">flash_on</span>
          </button>

          <!-- Main Large Shutter Button -->
          <button id="btn-shutter" type="button" class="w-20 h-20 rounded-full bg-emerald-600 ring-4 ring-emerald-600/30 text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg" title="Ambil Foto">
            <div class="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center">
              <span class="material-symbols-outlined text-[32px]">photo_camera</span>
            </div>
          </button>

          <!-- Gallery / File Upload Button -->
          <button id="btn-trigger-upload" type="button" class="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 text-slate-700 flex items-center justify-center active:scale-95 transition hover:bg-slate-50" title="Unggah dari Galeri">
            <span class="material-symbols-outlined text-[22px]">add_photo_alternate</span>
          </button>
        </div>

        <!-- Analysis Dock -->
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
              <span class="text-xs font-bold text-slate-800">Status Pindai Multi-Sudut</span>
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
            Ambil 3-4 sudut berbeda untuk hasil deteksi bahan yang paling akurat.
          </p>
        </div>
      `}

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

  // Switch Sub-Tab Listeners
  document.getElementById('tab-scan-kulkas')?.addEventListener('click', () => {
    if (scanType !== 'kulkas') {
      stopPindaiCamera();
      renderPindaiPage(new URLSearchParams('type=kulkas'));
    }
  });

  document.getElementById('tab-scan-barcode')?.addEventListener('click', () => {
    if (scanType !== 'barcode') {
      stopPindaiCamera();
      renderPindaiPage(new URLSearchParams('type=barcode'));
    }
  });

  // Inisialisasi Kamera
  if (!cameraServiceInstance) {
    cameraServiceInstance = new CameraService();
  }

  try {
    if (videoEl) {
      await cameraServiceInstance.start(videoEl);
    }
  } catch (err) {
    console.warn('Camera stream failed or permission denied:', err);
    showToast('Kamera tidak dapat diakses otomatis. Pastikan izin kamera telah diberikan.', 'warning', 4000);
  }

  // Real-time brightness sensor
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

  // Torch Toggle
  torchBtn?.addEventListener('click', async () => {
    const isTorchOn = await cameraServiceInstance.toggleTorch();
    torchBtn.className = `w-12 h-12 rounded-full shadow-sm border text-slate-700 flex items-center justify-center active:scale-95 transition ${isTorchOn ? 'bg-amber-400 text-slate-900 border-amber-500' : 'bg-white border-slate-200'
      }`;
  });

  // ========================================================
  // CABANG 1: ALUR SCAN BARCODE (DETEKSI OTOMATIS TANPA KLIK)
  // ========================================================
  if (scanType === 'barcode') {
    if (!barcodeServiceInstance) {
      barcodeServiceInstance = new BarcodeService();
    }

    isProcessingBarcode = false;
    clearInterval(barcodeScanInterval);

    // Loop pendeteksian frame otomatis setiap 350ms
    barcodeScanInterval = setInterval(async () => {
      if (isProcessingBarcode) return;
      if (!videoEl || videoEl.readyState < 2) return;

      try {
        const detectedCode = await barcodeServiceInstance.detect(videoEl);
        if (detectedCode) {
          const now = Date.now();
          // Hindari spamming barcode yang sama dalam 3 detik
          if (detectedCode === lastDetectedBarcode && (now - lastDetectedTime) < 3000) {
            return;
          }

          lastDetectedBarcode = detectedCode;
          lastDetectedTime = now;
          isProcessingBarcode = true;

          // Haptic feedback jika didukung perangkat
          if (navigator.vibrate) {
            try { navigator.vibrate(100); } catch (e) { }
          }

          handleBarcodeFound(detectedCode);
        }
      } catch (err) {
        // frame decode error, lanjutkan loop
      }
    }, 350);

    // Tombol input barcode manual jika barcode rusak/tak terbaca
    document.getElementById('btn-manual-barcode-input')?.addEventListener('click', () => {
      openBarcodeConfirmModal({
        found: false,
        barcode: '',
        nama: '',
        ukuran: '',
        kategori: 'olahan'
      });
    });

    async function handleBarcodeFound(barcode) {
      const statusCard = document.getElementById('barcode-status-card');
      if (statusCard) {
        statusCard.innerHTML = `
          <span class="material-symbols-outlined text-emerald-600 text-[20px] animate-spin flex-shrink-0">sync</span>
          <div class="flex-1 min-w-0">
            <span class="text-xs font-bold text-emerald-950 block">Barcode Terdeteksi: ${barcode}</span>
            <span class="text-[11px] text-emerald-900/80">Sedang mencari data produk di database...</span>
          </div>
        `;
        statusCard.className = 'w-full bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center gap-2.5';
      }

      showToast(`🔍 Barcode ${barcode} terdeteksi! Mencari produk...`, 'info', 2000);

      // Cari ke Open Food Facts
      const productInfo = await BarcodeService.lookupProduct(barcode);
      openBarcodeConfirmModal(productInfo);
    }

    function openBarcodeConfirmModal(productInfo) {
      const isFound = productInfo.found;
      const initialQty = 1;
      let selectedLocation = 'kulkas';
      let currentQty = initialQty;

      ModalService.open(`
        <div class="py-2 flex flex-col gap-4 text-left">
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/30">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined ${isFound ? 'text-primary' : 'text-amber-600'} text-[24px]">
                ${isFound ? 'check_circle' : 'edit_note'}
              </span>
              <div>
                <h3 class="font-headline-sm text-sm font-bold text-on-surface">
                  ${isFound ? 'Produk Terdaftar Ditemukan!' : 'Tambah Barang Barcode'}
                </h3>
                <span class="text-[10px] text-slate-400 font-mono">Barcode: ${productInfo.barcode || 'Manual'}</span>
              </div>
            </div>
            <button data-close-modal class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-on-surface mb-1">Nama Produk / Bahan:</label>
              <input id="input-barcode-nama" type="text" value="${productInfo.nama || ''}" placeholder="Contoh: Minyak Goreng 1L" class="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary">
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-bold text-on-surface mb-1">Ukuran / Satuan:</label>
                <input id="input-barcode-ukuran" type="text" value="${productInfo.ukuran || 'buah'}" placeholder="Misal: 1L / bungkus" class="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary">
              </div>

              <div>
                <label class="block text-xs font-bold text-on-surface mb-1">Jumlah:</label>
                <div class="flex items-center h-11 rounded-xl bg-surface-container border border-outline-variant px-2 justify-between">
                  <button id="btn-qty-minus" type="button" class="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center font-bold text-sm text-slate-700 active:scale-90 transition">-</button>
                  <span id="barcode-qty-display" class="font-bold text-xs text-on-surface">${currentQty}</span>
                  <button id="btn-qty-plus" type="button" class="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center font-bold text-sm text-slate-700 active:scale-90 transition">+</button>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-on-surface mb-1">Lokasi Penyimpanan:</label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" id="btn-loc-kulkas" class="h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-2 border-primary bg-primary/10 text-primary">
                  <span class="material-symbols-outlined text-[16px]">kitchen</span>
                  <span>Kulkas</span>
                </button>
                <button type="button" id="btn-loc-dapur" class="h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-200 bg-white text-slate-600">
                  <span class="material-symbols-outlined text-[16px]">shelves</span>
                  <span>Dapur / Rak</span>
                </button>
              </div>
            </div>
          </div>

          <button id="btn-save-barcode-item" type="button" class="w-full h-12 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition mt-2">
            <span class="material-symbols-outlined text-[18px]">done</span>
            <span>Simpan ke Inventaris</span>
          </button>
        </div>
      `, {
        onClose: () => {
          // Jeda sebentar sebelum mengaktifkan kembali pemindai otomatis
          setTimeout(() => {
            isProcessingBarcode = false;
            resetBarcodeStatusUI();
          }, 1200);
        }
      });

      // Quantity buttons
      document.getElementById('btn-qty-minus')?.addEventListener('click', () => {
        if (currentQty > 1) {
          currentQty--;
          const disp = document.getElementById('barcode-qty-display');
          if (disp) disp.textContent = currentQty;
        }
      });

      document.getElementById('btn-qty-plus')?.addEventListener('click', () => {
        currentQty++;
        const disp = document.getElementById('barcode-qty-display');
        if (disp) disp.textContent = currentQty;
      });

      // Location buttons
      const btnKulkas = document.getElementById('btn-loc-kulkas');
      const btnDapur = document.getElementById('btn-loc-dapur');

      btnKulkas?.addEventListener('click', () => {
        selectedLocation = 'kulkas';
        btnKulkas.className = 'h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-2 border-primary bg-primary/10 text-primary';
        btnDapur.className = 'h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-200 bg-white text-slate-600';
      });

      btnDapur?.addEventListener('click', () => {
        selectedLocation = 'dapur';
        btnDapur.className = 'h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-2 border-primary bg-primary/10 text-primary';
        btnKulkas.className = 'h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-200 bg-white text-slate-600';
      });

      // Simpan item ke inventaris
      document.getElementById('btn-save-barcode-item')?.addEventListener('click', () => {
        const inputNama = document.getElementById('input-barcode-nama');
        const inputUkuran = document.getElementById('input-barcode-ukuran');
        const finalNama = inputNama?.value.trim() || productInfo.nama || 'Barang Barcode';
        const finalSatuan = inputUkuran?.value.trim() || 'buah';

        StorageService.addItemsToStok([{
          nama: finalNama,
          jumlah: currentQty,
          satuan: finalSatuan,
          kategori: productInfo.kategori || 'olahan',
          lokasi: selectedLocation,
          status: 'Segar',
          confidence: 100,
          catatan: productInfo.barcode ? `Barcode: ${productInfo.barcode}` : ''
        }], selectedLocation);

        ModalService.close();
        showToast(`✓ ${finalNama} berhasil disimpan ke inventaris!`, 'success', 2500);

        // Kamera tetap menyala & siap memindai barang berikutnya!
        setTimeout(() => {
          isProcessingBarcode = false;
          resetBarcodeStatusUI();
        }, 1500);
      });
    }

    function resetBarcodeStatusUI() {
      const statusCard = document.getElementById('barcode-status-card');
      if (statusCard) {
        statusCard.innerHTML = `
          <span class="material-symbols-outlined text-amber-600 text-[20px] animate-spin flex-shrink-0">sync</span>
          <div class="flex-1 min-w-0">
            <span class="text-xs font-bold text-amber-950 block">Menunggu Barcode...</span>
            <span class="text-[11px] text-amber-900/80">Dekatkan barcode ke dalam kotak kamera di atas.</span>
          </div>
        `;
        statusCard.className = 'w-full bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-center gap-2.5';
      }
    }

    return; // Selesai setup mode barcode
  }

  // ========================================================
  // CABANG 2: ALUR PINDAI KULKAS (MULTI-SUDUT DENGAN SHUTTER BESAR)
  // ========================================================

  // Slot selector
  const slotButtons = document.querySelectorAll('.slot-item');
  slotButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      activeSlotIndex = idx;
      updateActiveSlotUI();
    });
  });

  // Hapus foto di thumbnail slot
  const deleteSlotButtons = document.querySelectorAll('.btn-delete-slot');
  deleteSlotButtons.forEach(delBtn => {
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(delBtn.getAttribute('data-delete-idx'), 10);
      deletePhotoAtSlot(idx);
    });
  });

  // Retake photo
  retakeBtn?.addEventListener('click', () => {
    if (previewOverlay) previewOverlay.classList.add('hidden');
  });

  // Rotate photo 90°
  rotateBtn?.addEventListener('click', async () => {
    if (!photos[activeSlotIndex]?.dataUrl) return;
    try {
      showToast('Memutar foto...', 'info', 1000);
      const rotated = await ImageService.rotate90(photos[activeSlotIndex].dataUrl);
      photos[activeSlotIndex].dataUrl = rotated.dataUrl;
      photos[activeSlotIndex].base64 = rotated.base64;
      store.saveDraftPhotos(scanType, photos);
      if (previewImg) previewImg.src = rotated.dataUrl;
      const activeBtn = document.querySelector(`.slot-item[data-index="${activeSlotIndex}"]`);
      const imgInSlot = activeBtn?.querySelector('img');
      if (imgInSlot) imgInSlot.src = rotated.dataUrl;
      showToast('Foto berhasil diputar 90°', 'success', 1500);
    } catch (err) {
      console.error('Rotate error:', err);
      showToast('Gagal memutar foto.', 'error');
    }
  });

  // Delete photo from preview
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
      btn.className = `slot-item w-full flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${isActive
        ? 'border-2 border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
        : hasPhoto
          ? 'border-emerald-300 bg-emerald-50/60'
          : 'border-slate-200 bg-white hover:border-slate-300'
        }`;

      const iconBox = btn.querySelector('div');
      if (iconBox) {
        iconBox.className = `w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden transition-colors ${hasPhoto ? 'bg-emerald-100' : 'bg-slate-100 text-slate-600'
          }`;
      }

      const labelSpan = btn.querySelector('span:not(.material-symbols-outlined)');
      if (labelSpan) {
        labelSpan.className = `text-[10px] text-center line-clamp-1 ${isActive ? 'text-primary font-extrabold' : 'text-slate-600 font-semibold'
          }`;
      }
    });

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

  // Shutter action (Ambil Foto)
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

  // Gallery upload
  uploadBtn?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Format foto harus JPG, PNG, atau WebP.', 'error', 3000);
      fileInput.value = '';
      return;
    }

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

    // Otomatis pindah ke slot kosong berikutnya
    const nextEmpty = photos.findIndex((p, i) => i > activeSlotIndex && !p.dataUrl);
    if (nextEmpty !== -1) {
      activeSlotIndex = nextEmpty;
    } else {
      const anyEmpty = photos.findIndex(p => !p.dataUrl);
      if (anyEmpty !== -1) activeSlotIndex = anyEmpty;
    }

    renderPindaiPage(new URLSearchParams(`type=${scanType}`));
  }

  updateActiveSlotUI();

  // Tombol Analisis Bahan Makanan
  analyzeBtn?.addEventListener('click', async () => {
    if (!navigator.onLine) {
      showToast('Kamu sedang offline. Analisis foto memerlukan koneksi internet.', 'warning', 4000);
      return;
    }

    const validPhotos = photos.filter(p => Boolean(p.dataUrl && p.base64));
    if (validPhotos.length === 0) {
      showToast('Harap ambil minimal 1 foto terlebih dahulu.', 'warning');
      return;
    }

    let isCancelled = false;
    ModalService.open(`
      <div class="py-8 flex flex-col items-center text-center">
        <div class="w-16 h-16 rounded-3xl bg-primary text-on-primary flex items-center justify-center animate-bounce shadow-lg">
          <span class="material-symbols-outlined text-[36px]">document_scanner</span>
        </div>
        <h3 class="font-headline-sm text-headline-sm text-on-surface mt-4">Sistem sedang menganalisis...</h3>
        <p class="text-xs text-on-surface-variant max-w-xs mt-1.5 leading-relaxed">
          Sedang menganalisis ${validPhotos.length} foto ${scanType === 'belanja' ? 'belanjaan & struk' : 'kulkas'} untuk mengenali jenis bahan makanan, kuantitas, dan kesegaran.
        </p>
        <div class="w-full max-w-xs bg-surface-container rounded-full h-2 mt-6 overflow-hidden">
          <div class="bg-primary h-full rounded-full animate-pulse w-3/4"></div>
        </div>
        <span class="text-[11px] text-slate-400 mt-2">Estimasi waktu: ~5-8 detik</span>

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

      const detectedItems = aiResponse.bahan || aiResponse.belanjaan || [];
      store.setState({
        detectionResults: {
          items: detectedItems,
          total: aiResponse.total_terdeteksi || aiResponse.total_item || detectedItems.length,
          generalNote: aiResponse.catatan_umum || 'Semua bahan berhasil dipindai.',
          photos: validPhotos
        }
      });

      stopPindaiCamera();
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
              Simpan Draft Foto
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

  // Tips Dialog
  document.getElementById('btn-open-tips')?.addEventListener('click', () => {
    ModalService.open(`
      <div class="flex items-center justify-between pb-3 border-b border-outline-variant/30">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-secondary text-[24px]">tips_and_updates</span>
          <h2 class="font-headline-sm text-headline-sm text-on-surface">Panduan Pemindai Cerdas</h2>
        </div>
        <button data-close-modal class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div class="mt-4 space-y-3.5 text-xs text-on-surface-variant">
        <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
          <span class="text-xl">📸</span>
          <div>
            <strong class="text-on-surface block text-xs">Pindai Kulkas (Multi-Sudut)</strong>
            Ambil foto kulkas dari 3-4 sudut berbeda (Rak, Laci, Freezer, Pintu). Tekan tombol jepret besar lalu klik "Analisis Bahan Makanan".
          </div>
        </div>
        <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
          <span class="text-xl">🏷️</span>
          <div>
            <strong class="text-on-surface block text-xs">Scan Barcode (Deteksi Instan)</strong>
            Arahkan kamera ke barcode kemasan barang. Sistem langsung mendeteksi tanpa klik, mencari data produk (Open Food Facts), dan siap simpan ke stok.
          </div>
        </div>
        <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
          <span class="text-xl">💡</span>
          <div>
            <strong class="text-on-surface block text-xs">Pencahayaan Cukup</strong>
            Gunakan tombol lampu flash jika bagian dalam kulkas atau kemasan produk agak redup.
          </div>
        </div>
      </div>

      <button data-close-modal class="mt-5 w-full h-11 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center">
        Mengerti, Siap Pindai
      </button>
    `);
  });
}
