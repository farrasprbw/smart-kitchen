// Ide Masak (Recipe Recommendation) Page

import { StorageService } from '../core/storage.js';
import { GeminiService } from '../services/gemini.js';
import { buildPromptRekomendasiMasak } from '../utils/prompts.js';
import { renderHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { ModalService } from '../components/modal.js';
import { store } from '../core/state.js';

let isGeneratingRecipes = false;
let isFetchingMore = false;
const BATCH_SIZE = 3;
let displayedCount = 3;

export function renderIdeMasakPage() {
  const mainEl = document.getElementById('app-main');
  if (!mainEl) return;

  const settings = StorageService.getSettings();
  const userName = settings?.userName || 'Sari';

  renderHeader({
    type: 'tab',
    title: 'Ide Masak',
    subtitle: `Halo, ${userName}`
  });

  const stokData = StorageService.getStok();
  const kulkasItems = stokData.kulkas || [];
  const dapurItems = stokData.dapur || [];
  const allStok = [...kulkasItems, ...dapurItems];
  const totalBahan = allStok.length;

  // Identify expiring or critical items
  const expiringItems = kulkasItems.filter(i =>
    (i.status && (i.status.includes('Layu') || i.status.includes('Sisa') || i.status.includes('Olah'))) ||
    (i.catatan && (i.catatan.includes('layu') || i.catatan.includes('kering')))
  );

  let currentRecipes = store.getState().generatedRecipes || [];
  let activeSelectedRecipe = currentRecipes[0] || null;

  // Pastikan displayedCount minimal BATCH_SIZE
  if (displayedCount < BATCH_SIZE) displayedCount = BATCH_SIZE;

  function renderContent() {
    const visibleRecipes = currentRecipes.slice(0, displayedCount);
    const hasMoreInPool = displayedCount < currentRecipes.length;

    mainEl.innerHTML = `
      <div class="page-enter flex flex-col w-full max-w-md mx-auto px-4 pt-2 pb-32 gap-5">

        <!-- Kitchen Pantry Status & Zero Waste Indicator -->
        <section class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3 relative overflow-hidden">
          <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-primary-fixed/30 rounded-full blur-2xl pointer-events-none"></div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-primary">
              <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">inventory_2</span>
              <span class="text-[11px] font-bold uppercase tracking-wide">Penyelamat Dapur Pintar</span>
            </div>
            <span class="text-xs ${totalBahan > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'} px-2.5 py-0.5 rounded-full font-bold">
              ${totalBahan} Bahan Siap Pakai
            </span>
          </div>

          <div class="space-y-0.5">
            <h2 class="text-sm font-bold text-slate-900 leading-snug">
              ${totalBahan > 0 ? `Dianalisis dari ${totalBahan} bahan di kulkas & dapurmu` : 'Belum Ada Stok Bahan'}
            </h2>
            <p class="text-xs text-slate-500 leading-relaxed">
              ${totalBahan > 0
                ? `${userName}, mari olah bahan yang butuh perhatian hari ini agar tetap lezat & bebas sampah makanan.`
                : 'Pindai kulkas atau tambah bahan terlebih dahulu untuk membuat ide menu otomatis.'
              }
            </p>
          </div>

          <!-- Zero Waste Rescue Highlight Chip -->
          <div class="bg-amber-50/90 text-amber-900 border border-amber-200/70 rounded-xl p-3 flex items-start gap-2.5 transition active:scale-[0.99]">
            <span class="material-symbols-outlined text-amber-600 text-[20px] flex-shrink-0 mt-0.5" style="font-variation-settings: 'FILL' 1;">eco</span>
            <div class="flex-1 min-w-0">
              <span class="text-xs block font-bold text-amber-950">💡 Status Kesegaran Stok:</span>
              <span class="text-xs text-amber-900/90 leading-relaxed">
                ${
                  expiringItems.length > 0
                    ? `Prioritas olah <strong>${expiringItems.map(i => i.nama).slice(0, 2).join(' & ')}</strong> sebelum kesegarannya hilang.`
                    : (totalBahan > 0
                        ? 'Semua bahan dalam kondisi prima. Rekomendasi disusun berdasarkan variasi nutrisi seimbang.'
                        : 'Inventaris kosong. Tambahkan bahan untuk memantau masa simpan dan kesegaran.')
                }
              </span>
            </div>
          </div>
        </section>

        <!-- Recipes Section Header (Hapus tombol redundan, hanya header bersih) -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Rekomendasi Menu</h2>
            <p class="text-[11px] text-slate-500">Disesuaikan dengan stok nyata saat ini</p>
          </div>
          ${currentRecipes.length > 0 ? `
            <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Tampil ${visibleRecipes.length} dari ${currentRecipes.length}
            </span>
          ` : ''}
        </div>

        <!-- Recipe Content / Empty State -->
        ${currentRecipes.length === 0 ? `
          <div class="bg-surface-container-lowest rounded-3xl p-6 text-center border border-slate-100 shadow-sm space-y-4">
            <div class="w-16 h-16 rounded-full ${totalBahan > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'} flex items-center justify-center mx-auto">
              <span class="material-symbols-outlined text-[32px]">${totalBahan > 0 ? 'skillet' : 'kitchen'}</span>
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900">
                ${totalBahan > 0 ? 'Siap Meracik Ide Menu Lezat?' : 'Stok Bahan Belum Tersedia'}
              </h3>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
                ${totalBahan > 0
                  ? `Ada ${totalBahan} bahan di kulkasmu. Tekan tombol di bawah untuk membuat rekomendasi menu praktis sesuai stok saat ini.`
                  : 'Pindai kulkas dengan kamera atau tambahkan bahan secara manual untuk mendapatkan resep otomatis.'
                }
              </p>
            </div>
            ${totalBahan > 0 ? `
              <!-- Satu Tombol Utama / Primary Button Tanpa Redundansi -->
              <button id="btn-primary-generate" ${isGeneratingRecipes ? 'disabled' : ''} class="w-full h-12 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:bg-emerald-800 active:scale-95 transition ${isGeneratingRecipes ? 'opacity-70 cursor-not-allowed' : ''}">
                ${isGeneratingRecipes
                  ? `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>⏳ Meracik menu...</span>`
                  : `<span class="material-symbols-outlined text-[18px]">auto_awesome</span><span>Buat Rekomendasi Menu</span>`
                }
              </button>
            ` : `
              <div class="flex items-center gap-2 pt-1">
                <a href="#pindai" class="flex-1 h-11 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition">
                  <span class="material-symbols-outlined text-[18px]">photo_camera</span>
                  <span>Pindai Kulkas</span>
                </a>
                <a href="#beranda" class="flex-1 h-11 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition">
                  <span class="material-symbols-outlined text-[18px]">inventory_2</span>
                  <span>Input Stok</span>
                </a>
              </div>
            `}
          </div>
        ` : `
          <!-- Recipe List (Infinite Scroll Cards Container) -->
          <div id="recipe-cards-container" class="space-y-4">
            <!-- Hero Card (Kartu Pertama) -->
            ${renderHeroCard(visibleRecipes[0])}

            <!-- Compact Cards (Kartu Berikutnya) -->
            ${visibleRecipes.length > 1 ? `
              <div class="space-y-3 pt-1" id="compact-cards-wrapper">
                <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Alternatif Menu Lain</h3>
                ${visibleRecipes.slice(1).map(r => renderCompactCard(r)).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Scroll Indicator / Action Section -->
          <div id="infinite-scroll-dock" class="pt-2 flex flex-col items-center gap-2 text-center">
            ${hasMoreInPool ? `
              <div class="py-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 animate-pulse">
                <span class="material-symbols-outlined text-[18px]">arrow_downward</span>
                <span>Gulir ke bawah untuk melihat menu lainnya...</span>
              </div>
            ` : `
              <!-- Semua rekomendasi habis -> Munculkan Tombol 'Cari Rekomendasi Lainnya' -->
              <div class="w-full bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 flex flex-col items-center gap-2 shadow-xs">
                <p class="text-xs text-slate-600 font-medium">Semua menu rekomendasi telah ditampilkan.</p>
                <button id="btn-fetch-more-recipes" ${isFetchingMore ? 'disabled' : ''} class="w-full h-11 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:bg-emerald-800 active:scale-95 transition ${isFetchingMore ? 'opacity-70 cursor-not-allowed' : ''}">
                  ${isFetchingMore
                    ? `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>⏳ Meracik menu baru lainnya...</span>`
                    : `<span class="material-symbols-outlined text-[18px]">auto_awesome</span><span>Cari Rekomendasi Lainnya</span>`
                  }
                </button>
                <span class="text-[10px] text-slate-400">Sistem akan meracik menu baru tanpa duplikat dengan menu di atas.</span>
              </div>
            `}
          </div>
        `}

      </div>

      <!-- Floating Cooking Dock -->
      ${activeSelectedRecipe ? `
        <div id="cooking-dock" class="fixed bottom-16 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 p-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
          <div class="max-w-md mx-auto flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <span class="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Menu Terpilih</span>
              <h4 id="dock-recipe-title" class="text-xs font-extrabold text-slate-900 truncate">${activeSelectedRecipe.nama}</h4>
              <p class="text-[10px] text-slate-500 truncate mt-0.5">
                Bahan: ${(activeSelectedRecipe.bahan_terpakai || []).map(b => `${b.nama} (${b.jumlah} ${b.satuan})`).join(', ')}
              </p>
            </div>
            <button id="btn-dock-cook" type="button" class="h-11 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition flex-shrink-0">
              <span class="material-symbols-outlined text-[18px]">skillet</span>
              <span>Sudah Masak Ini 🍳</span>
            </button>
          </div>
        </div>
      ` : ''}
    `;

    setupEvents();
  }

  function renderHeroCard(recipe) {
    if (!recipe) return '';
    return `
      <div class="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md hover:border-slate-200 transition group" data-recipe-id="${recipe.id}">
        <div class="relative w-full h-44 overflow-hidden bg-slate-900">
          <img src="${recipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}"
            alt="${recipe.nama}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30"></div>

          <!-- Badges on Image -->
          <div class="absolute top-3 inset-x-3 flex items-center justify-between">
            <span class="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold backdrop-blur-md shadow-sm">
              ${recipe.badge || '100% Cocok'}
            </span>
            <span class="px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-md">
              ${recipe.waktu_masak || '15 Menit'} • ${recipe.tingkat_kesulitan || 'Mudah'}
            </span>
          </div>

          <div class="absolute bottom-3 inset-x-3 text-white">
            <h3 class="text-lg font-bold leading-tight drop-shadow-sm">${recipe.nama}</h3>
            <p class="text-xs text-white/90 line-clamp-1 mt-0.5">${recipe.alasan}</p>
          </div>
        </div>

        <div class="p-4 space-y-3">
          <!-- Ingredients Chips -->
          <div>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Bahan dari Stok:</span>
            <div class="flex flex-wrap gap-1.5">
              ${(recipe.bahan_terpakai || []).map(b => `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold">
                  <span class="material-symbols-outlined text-[14px]">check</span>
                  ${b.nama} (${b.jumlah} ${b.satuan})
                </span>
              `).join('')}
              ${(recipe.bahan_bumbu || []).slice(0, 3).map(b => `
                <span class="inline-flex items-center px-2 py-1 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-medium">
                  + ${b}
                </span>
              `).join('')}
            </div>
          </div>

          <!-- 3-Step Preview -->
          <div class="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs text-slate-700">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Langkah Singkat:</span>
            <ol class="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
              ${(recipe.langkah || []).slice(0, 3).map(step => `
                <li class="line-clamp-2">${step}</li>
              `).join('')}
            </ol>
          </div>

          <div class="pt-1 flex items-center gap-2">
            <button class="btn-select-recipe flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95" data-id="${recipe.id}">
              <span class="material-symbols-outlined text-[18px]">visibility</span>
              <span>Lihat Detail Langkah</span>
            </button>
            <button class="btn-quick-cook h-11 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm" data-id="${recipe.id}">
              <span class="material-symbols-outlined text-[18px]">done</span>
              <span>Pilih Menu</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderCompactCard(recipe) {
    if (!recipe) return '';
    return `
      <div class="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm hover:border-slate-200 transition flex items-start gap-3 group" data-recipe-id="${recipe.id}">
        <div class="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 relative">
          <img src="${recipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80'}"
            alt="${recipe.nama}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-bold px-1.5 py-0.2 rounded ${recipe.badgeClass || 'bg-emerald-100 text-emerald-800'}">
              ${recipe.badge || 'Cocok'}
            </span>
            <span class="text-[11px] text-slate-400">• ${recipe.waktu_masak || '15 Menit'}</span>
          </div>

          <h4 class="text-xs font-bold text-slate-900 mt-1 truncate">${recipe.nama}</h4>
          <p class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">${recipe.alasan}</p>

          <div class="mt-2 flex items-center justify-between">
            <span class="text-[10px] text-slate-500 truncate">
              ${(recipe.bahan_terpakai || []).map(b => b.nama).join(', ')}
            </span>
            <button class="btn-select-recipe text-xs font-bold text-emerald-700 hover:text-emerald-800 ml-2 flex-shrink-0" data-id="${recipe.id}">
              Detail →
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function setupEvents() {
    // Select recipe buttons
    mainEl.querySelectorAll('.btn-select-recipe').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const recipe = currentRecipes.find(r => r.id === id);
        if (recipe) {
          activeSelectedRecipe = recipe;
          updateDockUI();
          openRecipeDetailModal(recipe);
        }
      });
    });

    // Quick cook / select menu
    mainEl.querySelectorAll('.btn-quick-cook').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const recipe = currentRecipes.find(r => r.id === id);
        if (recipe) {
          activeSelectedRecipe = recipe;
          updateDockUI();
          showToast(`Menu terpilih: ${recipe.nama}`, 'success');
        }
      });
    });

    // Primary Single Button: "Buat Rekomendasi Menu"
    document.getElementById('btn-primary-generate')?.addEventListener('click', async () => {
      if (totalBahan === 0) {
        showToast('Stok bahan kosong. Tambahkan atau pindai bahan terlebih dahulu.', 'warning');
        return;
      }

      if (isGeneratingRecipes) return;

      isGeneratingRecipes = true;
      renderContent();

      ModalService.open(`
        <div class="py-3 flex flex-col items-center text-center relative">
          <div class="w-full flex justify-end">
            <button data-close-modal class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div class="w-16 h-16 rounded-3xl bg-primary text-on-primary flex items-center justify-center animate-bounce shadow-lg mt-1">
            <span class="material-symbols-outlined text-[36px]">restaurant_menu</span>
          </div>

          <h3 class="font-headline-sm text-base font-bold text-on-surface mt-4">⏳ Meracik menu...</h3>
          <p class="text-xs text-on-surface-variant max-w-xs mt-1.5 leading-relaxed">
            Menyesuaikan stok ${totalBahan} bahan makanan dan bumbu dapur untuk menyusun menu praktis lezat.
          </p>

          <div class="w-full mt-6 flex flex-col gap-2">
            <button data-close-modal type="button" class="w-full h-11 rounded-xl bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-surface-container-high active:scale-95 transition">
              <span class="material-symbols-outlined text-[16px]">visibility_off</span>
              <span>Lanjut Menjelajah (Tutup Modal)</span>
            </button>
          </div>
        </div>
      `, {
        onClose: () => {
          if (isGeneratingRecipes) {
            showToast('Chef tetap meracik menu di latar belakang...', 'info', 2500);
          }
        }
      });

      try {
        const prompt = buildPromptRekomendasiMasak(allStok, []);
        const result = await GeminiService.generateRecipes(prompt, true);

        ModalService.close();
        isGeneratingRecipes = false;

        if (result.rekomendasi && result.rekomendasi.length > 0) {
          currentRecipes = result.rekomendasi.map((r, idx) => ({
            id: `resep-${Date.now()}-${idx + 1}`,
            nama: r.nama,
            isHero: idx === 0,
            badge: r.badge || (idx === 0 ? '100% Cocok' : 'Rekomendasi Cepat'),
            badgeClass: 'bg-emerald-100 text-emerald-800',
            waktu_masak: r.waktu_masak || '15 Menit',
            tingkat_kesulitan: r.tingkat_kesulitan || 'Mudah',
            porsi: r.porsi || '2 Porsi',
            image: idx === 0
              ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop&q=80',
            alasan: r.alasan || 'Dibuat khusus dari bahan yang tersedia.',
            bahan_terpakai: r.bahan_terpakai || [],
            bahan_bumbu: r.bahan_bumbu || ['Garam', 'Minyak goreng'],
            langkah: r.langkah || ['Siapkan bahan', 'Masak hingga matang', 'Sajikan hangat'],
            tips: r.tips || 'Sajikan selagi hangat.'
          }));
          activeSelectedRecipe = currentRecipes[0];
          displayedCount = BATCH_SIZE;
          store.setState({ generatedRecipes: currentRecipes });
          showToast('🎉 Rekomendasi menu berhasil diracik!', 'success');
          if (store.getState().activeTab === 'ide-masak') {
            renderContent();
          }
        } else {
          showToast('Tidak ada menu yang cocok. Coba tambahkan lebih banyak bahan.', 'info');
          if (store.getState().activeTab === 'ide-masak') {
            renderContent();
          }
        }
      } catch (err) {
        ModalService.close();
        isGeneratingRecipes = false;
        console.error('Recipe generation error:', err);
        showToast(`Gagal meracik menu: ${err.message}`, 'error', 4000);
        if (store.getState().activeTab === 'ide-masak') {
          renderContent();
        }
      }
    });

    // "Cari Rekomendasi Lainnya" Button (Saat kartu habis dan ingin menu baru tanpa duplikat)
    document.getElementById('btn-fetch-more-recipes')?.addEventListener('click', async () => {
      if (isFetchingMore) return;
      isFetchingMore = true;
      renderContent();

      try {
        const existingNames = currentRecipes.map(r => r.nama);
        const prompt = buildPromptRekomendasiMasak(allStok, existingNames);
        const result = await GeminiService.generateRecipes(prompt, true);

        isFetchingMore = false;

        if (result.rekomendasi && result.rekomendasi.length > 0) {
          const existingLower = new Set(existingNames.map(n => n.toLowerCase().trim()));
          // Deduplikasi ketat
          const freshList = result.rekomendasi.filter(r => !existingLower.has(r.nama.toLowerCase().trim()));

          if (freshList.length > 0) {
            const mappedNew = freshList.map((r, idx) => ({
              id: `resep-more-${Date.now()}-${idx + 1}`,
              nama: r.nama,
              isHero: false,
              badge: r.badge || 'Variasi Menu Baru',
              badgeClass: 'bg-emerald-100 text-emerald-800',
              waktu_masak: r.waktu_masak || '20 Menit',
              tingkat_kesulitan: r.tingkat_kesulitan || 'Mudah',
              porsi: r.porsi || '2 Porsi',
              image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop&q=80',
              alasan: r.alasan || 'Variasi kreasi baru dari stok bahan yang sama.',
              bahan_terpakai: r.bahan_terpakai || [],
              bahan_bumbu: r.bahan_bumbu || ['Garam', 'Minyak goreng'],
              langkah: r.langkah || ['Siapkan bahan', 'Masak hingga matang', 'Sajikan hangat'],
              tips: r.tips || 'Sajikan selagi hangat.'
            }));

            currentRecipes = [...currentRecipes, ...mappedNew];
            displayedCount += mappedNew.length;
            store.setState({ generatedRecipes: currentRecipes });
            showToast(`✨ ${mappedNew.length} menu variasi baru berhasil ditambahkan!`, 'success');
          } else {
            showToast('Semua variasi utama sudah dicoba oleh Chef.', 'info');
          }
        } else {
          showToast('Tidak ada menu baru tambahan dari bahan saat ini.', 'info');
        }
      } catch (err) {
        isFetchingMore = false;
        console.error('Fetch more recipes error:', err);
        showToast('Gagal memuat rekomendasi lainnya. Coba sesaat lagi.', 'error');
      }

      if (store.getState().activeTab === 'ide-masak') {
        renderContent();
      }
    });

    // Infinite Scroll Handler on #app-main
    const scrollContainer = document.getElementById('app-main');
    if (scrollContainer) {
      scrollContainer.onscroll = () => {
        if (store.getState().activeTab !== 'ide-masak') return;
        if (displayedCount >= currentRecipes.length) return;

        const scrollBottom = scrollContainer.scrollTop + scrollContainer.clientHeight;
        const totalHeight = scrollContainer.scrollHeight;

        // Jika user mendekati bagian bawah (toleransi 100px)
        if (scrollBottom >= totalHeight - 100) {
          displayedCount += BATCH_SIZE;
          renderContent();
        }
      };
    }

    // Cooking Dock Button
    document.getElementById('btn-dock-cook')?.addEventListener('click', () => {
      confirmCooking(activeSelectedRecipe);
    });
  }

  function updateDockUI() {
    const titleEl = document.getElementById('dock-recipe-title');
    if (titleEl && activeSelectedRecipe) titleEl.textContent = activeSelectedRecipe.nama;
  }

  function openRecipeDetailModal(recipe) {
    const modalContent = `
      <div class="flex items-center justify-between pb-3 border-b border-outline-variant/30">
        <div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${recipe.badgeClass || 'bg-emerald-100 text-emerald-800'}">
            ${recipe.badge || '100% Cocok'}
          </span>
          <h2 class="font-headline-sm text-headline-sm text-on-surface mt-1">${recipe.nama}</h2>
        </div>
        <button data-close-modal class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div class="mt-3.5 space-y-4">
        <!-- Metrics Bar -->
        <div class="grid grid-cols-3 gap-2 bg-surface-container rounded-2xl p-2.5 text-center">
          <div>
            <span class="text-[10px] text-on-surface-variant block">Waktu</span>
            <strong class="text-xs text-on-surface font-bold">${recipe.waktu_masak}</strong>
          </div>
          <div>
            <span class="text-[10px] text-on-surface-variant block">Kesulitan</span>
            <strong class="text-xs text-on-surface font-bold">${recipe.tingkat_kesulitan}</strong>
          </div>
          <div>
            <span class="text-[10px] text-on-surface-variant block">Porsi</span>
            <strong class="text-xs text-on-surface font-bold">${recipe.porsi}</strong>
          </div>
        </div>

        <!-- Bahan Terpakai -->
        <div>
          <h4 class="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">Bahan yang Digunakan:</h4>
          <div class="space-y-1.5">
            ${(recipe.bahan_terpakai || []).map(b => `
              <div class="flex items-center justify-between p-2 rounded-xl bg-surface-container text-xs">
                <span class="font-semibold text-on-surface">✓ ${b.nama}</span>
                <span class="text-primary font-bold">${b.jumlah} ${b.satuan}</span>
              </div>
            `).join('')}
            ${(recipe.bahan_bumbu || []).map(b => `
              <div class="flex items-center justify-between px-2 py-1 text-[11px] text-on-surface-variant">
                <span>• ${b}</span>
                <span>Bumbu dapur</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Langkah Masak -->
        <div>
          <h4 class="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">Langkah Memasak:</h4>
          <ol class="space-y-2 text-xs text-on-surface leading-relaxed">
            ${(recipe.langkah || []).map((step, idx) => `
              <li class="flex items-start gap-2">
                <span class="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  ${idx + 1}
                </span>
                <span>${step}</span>
              </li>
            `).join('')}
          </ol>
        </div>

        ${recipe.tips ? `
          <div class="p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2">
            <span class="material-symbols-outlined text-amber-600 text-[18px] flex-shrink-0 mt-0.5">lightbulb</span>
            <div>
              <strong class="block text-xs">Tips Chef:</strong>
              ${recipe.tips}
            </div>
          </div>
        ` : ''}

        <!-- Bottom Modal Action: Cook & Share -->
        <div class="pt-2 space-y-2">
          <button id="modal-btn-cook" class="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition">
            <span class="material-symbols-outlined text-[18px]">skillet</span>
            <span>Sudah Masak Menu Ini 🍳</span>
          </button>

          <button id="modal-btn-share" type="button" class="w-full h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition">
            <span class="material-symbols-outlined text-[18px]">share</span>
            <span>Bagikan Resep (WhatsApp / Salin)</span>
          </button>
        </div>
      </div>
    `;

    ModalService.open(modalContent);

    document.getElementById('modal-btn-share')?.addEventListener('click', async () => {
      const shareText = `🍲 Resep ${recipe.nama} (Dapur Pintar)\n⏱️ Waktu: ${recipe.waktu_masak} | Porsi: ${recipe.porsi}\n\n🥗 Bahan yang Digunakan:\n${recipe.bahan_terpakai.map(b => `• ${b.nama}: ${b.jumlah} ${b.satuan}`).join('\n')}\n\n👨‍🍳 Langkah Memasak:\n${(recipe.langkah || []).map((l, i) => `${i + 1}. ${l}`).join('\n')}\n\n💡 Tips: ${recipe.tips || 'Sajikan selagi hangat!'}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `Resep ${recipe.nama}`,
            text: shareText
          });
        } catch (e) {}
      } else {
        await navigator.clipboard.writeText(shareText);
        showToast('Resep berhasil disalin ke clipboard!', 'success');
      }
    });

    document.getElementById('modal-btn-cook')?.addEventListener('click', () => {
      ModalService.close();
      confirmCooking(recipe);
    });
  }

  function confirmCooking(recipe) {
    const deductList = (recipe.bahan_terpakai || []).map(b => `• ${b.nama}: ${b.jumlah} ${b.satuan}`).join('<br>');

    ModalService.open(`
      <div class="text-center py-4 space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-sm">
          <span class="material-symbols-outlined text-[32px]">skillet</span>
        </div>
        <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Selesai Memasak ${recipe.nama}?</h3>
        <p class="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
          Stok bahan berikut akan dikurangi otomatis dari inventaris dapur kamu:
        </p>

        <div class="bg-surface-container rounded-xl p-3 text-xs text-left font-semibold text-on-surface max-w-xs mx-auto">
          ${deductList}
        </div>

        <div class="flex items-center gap-2 pt-2 max-w-xs mx-auto">
          <button data-close-modal class="flex-1 h-11 rounded-xl bg-surface-container-high text-on-surface font-bold text-xs">
            Batal
          </button>
          <button id="confirm-deduct-btn" class="flex-1 h-11 rounded-xl bg-primary text-white font-bold text-xs shadow-md active:scale-95 transition">
            Ya, Kurangi Stok
          </button>
        </div>
      </div>
    `);

    document.getElementById('confirm-deduct-btn')?.addEventListener('click', () => {
      StorageService.kurangiStokMasak(recipe.bahan_terpakai);

      StorageService.addLogMasak({
        resep: recipe.nama,
        waktu_masak: recipe.waktu_masak,
        tingkat_kesulitan: recipe.tingkat_kesulitan,
        bahan_terpakai: recipe.bahan_terpakai
      });

      ModalService.close();
      showToast(`Selamat makan! Stok ${recipe.nama} telah dikurangi otomatis.`, 'success', 3500);

      renderIdeMasakPage();
    });
  }

  renderContent();
}
