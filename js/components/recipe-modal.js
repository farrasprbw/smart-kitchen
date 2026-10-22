// Recipe Modal Component — Detail Resep & Konfirmasi Selesai Masak

import { ModalService } from './modal.js';
import { showToast } from './toast.js';
import { StorageService } from '../core/storage.js';
import { escapeHtml } from '../utils/format.js';

/**
 * Buka modal detail lengkap resep masakan
 * @param {Object} recipe Data resep rekomendasi AI
 * @param {Function} [onCookFinished] Callback ketika pengguna selesai memasak & stok dikurangi
 */
export function openRecipeDetailModal(recipe, onCookFinished) {
  if (!recipe) return;

  const modalContent = `
    <div class="flex items-center justify-between pb-3 border-b border-outline-variant/30">
      <div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${recipe.badgeClass || 'bg-emerald-100 text-emerald-800'}">
          ${escapeHtml(recipe.badge || '100% Cocok')}
        </span>
        <h2 class="font-headline-sm text-headline-sm text-on-surface mt-1">${escapeHtml(recipe.nama)}</h2>
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
          <strong class="text-xs text-on-surface font-bold">${escapeHtml(recipe.waktu_masak || '15 Menit')}</strong>
        </div>
        <div>
          <span class="text-[10px] text-on-surface-variant block">Kesulitan</span>
          <strong class="text-xs text-on-surface font-bold">${escapeHtml(recipe.tingkat_kesulitan || 'Mudah')}</strong>
        </div>
        <div>
          <span class="text-[10px] text-on-surface-variant block">Porsi</span>
          <strong class="text-xs text-on-surface font-bold">${escapeHtml(recipe.porsi || '2 Porsi')}</strong>
        </div>
      </div>

      <!-- Bahan Terpakai -->
      <div>
        <h4 class="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">Bahan yang Digunakan:</h4>
        <div class="space-y-1.5">
          ${(recipe.bahan_terpakai || []).map(b => `
            <div class="flex items-center justify-between p-2 rounded-xl bg-surface-container text-xs">
              <span class="font-semibold text-on-surface">✓ ${escapeHtml(b.nama)}</span>
              <span class="text-primary font-bold">${escapeHtml(b.jumlah)} ${escapeHtml(b.satuan)}</span>
            </div>
          `).join('')}
          ${(recipe.bahan_bumbu || []).map(b => `
            <div class="flex items-center justify-between px-2 py-1 text-[11px] text-on-surface-variant">
              <span>• ${escapeHtml(b)}</span>
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
              <span>${escapeHtml(step)}</span>
            </li>
          `).join('')}
        </ol>
      </div>

      <!-- Tips Tambahan -->
      ${recipe.tips ? `
        <div class="bg-surface-container rounded-2xl p-3 text-xs text-on-surface-variant flex items-start gap-2">
          <span class="material-symbols-outlined text-primary text-[18px] flex-shrink-0 mt-0.5">tips_and_updates</span>
          <p><strong>Tips:</strong> ${escapeHtml(recipe.tips)}</p>
        </div>
      ` : ''}

      <!-- Share Button -->
      <button id="modal-btn-share" class="w-full h-10 rounded-2xl border border-outline-variant/50 text-on-surface text-xs font-semibold flex items-center justify-center gap-2 hover:bg-surface-container transition-colors">
        <span class="material-symbols-outlined text-[18px]">share</span>
        Bagikan Resep
      </button>

      <!-- Action Button -->
      <button id="modal-btn-cook-now" class="w-full h-12 rounded-2xl bg-primary text-on-primary font-bold text-sm shadow-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-2">
        <span class="material-symbols-outlined text-[20px]">skillet</span>
        Masak Menu Ini Sekarang
      </button>
    </div>
  `;

  ModalService.open({
    content: modalContent,
    onOpen: () => {
      document.getElementById('modal-btn-share')?.addEventListener('click', async () => {
        const shareText = `🍲 Resep ${recipe.nama} (Dapur Pintar)\n⏱️ Waktu: ${recipe.waktu_masak || '15 Menit'} | Porsi: ${recipe.porsi || '2 Porsi'}\n\n🥗 Bahan yang Digunakan:\n${(recipe.bahan_terpakai || []).map(b => `• ${b.nama}: ${b.jumlah} ${b.satuan}`).join('\n')}\n\n👨‍🍳 Langkah Memasak:\n${(recipe.langkah || []).map((l, i) => `${i + 1}. ${l}`).join('\n')}\n\n💡 Tips: ${recipe.tips || 'Sajikan selagi hangat!'}`;

        if (navigator.share) {
          try {
            await navigator.share({
              title: `Resep ${recipe.nama}`,
              text: shareText
            });
          } catch (err) {
            if (err.name !== 'AbortError') {
              navigator.clipboard?.writeText(shareText);
              showToast('Teks resep berhasil disalin ke clipboard!', 'info');
            }
          }
        } else {
          navigator.clipboard?.writeText(shareText);
          showToast('Teks resep berhasil disalin ke clipboard!', 'info');
        }
      });

      document.getElementById('modal-btn-cook-now')?.addEventListener('click', () => {
        ModalService.close();
        confirmCookingModal(recipe, onCookFinished);
      });
    }
  });
}

/**
 * Buka dialog konfirmasi selesai memasak dan deduksi bahan stok
 * @param {Object} recipe Data resep yang dimasak
 * @param {Function} [onCookFinished] Callback setelah stok dikurangi
 */
export function confirmCookingModal(recipe, onCookFinished) {
  if (!recipe) return;

  const modalContent = `
    <div class="text-center space-y-3">
      <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
        <span class="material-symbols-outlined text-[32px]">skillet</span>
      </div>
      <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Selesai Memasak ${escapeHtml(recipe.nama)}?</h3>
      <p class="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
        Stok bahan berikut akan dikurangi otomatis dari inventaris dapur kamu:
      </p>
      <div class="bg-surface-container rounded-2xl p-3 text-left space-y-1.5 max-h-48 overflow-y-auto text-xs">
        ${(recipe.bahan_terpakai || []).map(b => `
          <div class="flex items-center justify-between py-1 border-b border-outline-variant/20 last:border-0">
            <span class="text-on-surface font-medium">${escapeHtml(b.nama)}</span>
            <span class="text-primary font-bold">-${escapeHtml(b.jumlah)} ${escapeHtml(b.satuan)}</span>
          </div>
        `).join('')}
      </div>
      <div class="flex gap-2 pt-2">
        <button data-close-modal class="flex-1 h-12 rounded-2xl bg-surface-container text-on-surface-variant font-bold text-xs hover:bg-surface-container-high transition-colors">
          Batal
        </button>
        <button id="confirm-deduct-btn" class="flex-1 h-12 rounded-2xl bg-primary text-on-primary font-bold text-xs shadow-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5">
          <span class="material-symbols-outlined text-[18px]">check</span>
          Ya, Kurangi Stok
        </button>
      </div>
    </div>
  `;

  ModalService.open({
    content: modalContent
  });

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

    if (typeof onCookFinished === 'function') {
      onCookFinished(recipe);
    }
  });
}
