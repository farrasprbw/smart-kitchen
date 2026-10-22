// Format utilities for dates, numbers, and units

export function formatTanggal(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatWaktuLalu(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatTanggal(dateInput);
}

export function formatJumlah(jumlah, satuan = '') {
  if (jumlah === null || jumlah === undefined || isNaN(jumlah)) {
    return `? ${satuan}`.trim();
  }
  return `${jumlah} ${satuan}`.trim();
}

/**
 * Escape HTML string to prevent XSS injection
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Menghitung durasi penyimpanan bahan berdasarkan tanggal ditambahkan
 * @param {string|Date} ditambahkan
 * @param {string} kategori
 * @returns {{ text: string, badgeClass: string, days: number, isPrioritas: boolean }}
 */
export function getDurasiSimpanInfo(ditambahkan, kategori = '') {
  if (!ditambahkan) {
    return { text: 'Hari ini', badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200', days: 0, isPrioritas: false };
  }

  const d = new Date(ditambahkan);
  if (isNaN(d.getTime())) {
    return { text: 'Hari ini', badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200', days: 0, isPrioritas: false };
  }

  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.max(0, Math.floor(diffMs / 86400000));

  const kat = String(kategori || '').toLowerCase().trim();
  const isSegar = ['sayur', 'protein', 'buah', 'dairy'].includes(kat);

  let text = diffDays === 0 ? 'Hari ini' : `Hari ke-${diffDays + 1}`;
  let badgeClass = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
  let isPrioritas = false;

  if (isSegar && diffDays >= 3) {
    text = `${diffDays} hari • Prioritas masak`;
    badgeClass = 'bg-amber-50 text-amber-900 border border-amber-300 font-bold';
    isPrioritas = true;
  } else if (diffDays >= 7) {
    text = `${diffDays} hari tersimpan`;
    badgeClass = 'bg-slate-100 text-slate-700 border border-slate-200';
  }

  return { text, badgeClass, days: diffDays, isPrioritas };
}
