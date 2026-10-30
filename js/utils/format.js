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
 * Parse a fraction, mixed fraction, or decimal number
 * @param {string} str
 * @returns {number|null}
 */
export function parseFractionOrNumber(str) {
  if (!str) return null;
  const cleaned = String(str).trim()
    .replace(/½/g, ' 1/2')
    .replace(/¼/g, ' 1/4')
    .replace(/¾/g, ' 3/4')
    .replace(/⅓/g, ' 1/3')
    .replace(/⅔/g, ' 2/3')
    .trim();

  const mixed = cleaned.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const num = parseInt(mixed[1], 10) + (parseInt(mixed[2], 10) / parseInt(mixed[3], 10));
    return isNaN(num) ? null : num;
  }
  const frac = cleaned.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const num = parseInt(frac[1], 10) / parseInt(frac[2], 10);
    return isNaN(num) ? null : num;
  }
  const floatVal = parseFloat(cleaned.replace(',', '.'));
  return isNaN(floatVal) ? null : floatVal;
}

/**
 * Format scaled culinary number into clean fraction or decimal
 * @param {number} num
 * @returns {string}
 */
export function formatScaledNumber(num) {
  if (num === null || num === undefined || isNaN(num) || num <= 0) return '';
  const whole = Math.floor(num);
  const frac = Math.round((num - whole) * 100) / 100;

  let fracStr = '';
  if (Math.abs(frac - 0.5) < 0.06) fracStr = '1/2';
  else if (Math.abs(frac - 0.25) < 0.06) fracStr = '1/4';
  else if (Math.abs(frac - 0.75) < 0.06) fracStr = '3/4';
  else if (Math.abs(frac - 0.33) < 0.06) fracStr = '1/3';
  else if (Math.abs(frac - 0.67) < 0.06) fracStr = '2/3';

  if (fracStr) {
    return whole > 0 ? `${whole} ${fracStr}` : fracStr;
  }

  const rounded = Math.round(num * 10) / 10;
  return String(rounded);
}

/**
 * Scale takaran string (e.g. '3 sdm', '1/2 sdt', '200 ml', '3 buah (haluskan)') proportionally
 * @param {string} takaran
 * @param {number} ratio
 * @returns {string}
 */
export function scaleTakaran(takaran, ratio = 1) {
  if (!takaran || typeof takaran !== 'string' || ratio === 1 || isNaN(ratio) || ratio <= 0) {
    return takaran || 'Secukupnya';
  }
  if (!/[\d½¼¾⅓⅔]/.test(takaran)) return takaran;

  // Range format, e.g. '2-3 siung' or '1/2 - 1 sdt'
  const rangeMatch = takaran.match(/^([\d/½¼¾⅓⅔\s.,]+)\s*-\s*([\d/½¼¾⅓⅔\s.,]+)\s*(.*)$/);
  if (rangeMatch) {
    const val1 = parseFractionOrNumber(rangeMatch[1]);
    const val2 = parseFractionOrNumber(rangeMatch[2]);
    if (val1 !== null && val2 !== null) {
      const scaled1 = formatScaledNumber(val1 * ratio);
      const scaled2 = formatScaledNumber(val2 * ratio);
      const rest = rangeMatch[3] ? rangeMatch[3].trim() : '';
      return rest ? `${scaled1}-${scaled2} ${rest}` : `${scaled1}-${scaled2}`;
    }
  }

  // Single value, e.g. '3 buah (haluskan)', '1/2 sdt', '200 ml', '3sdm'
  const singleMatch = takaran.match(/^([\d/½¼¾⅓⅔\s.,]+)\s*(.*)$/);
  if (singleMatch) {
    const val = parseFractionOrNumber(singleMatch[1]);
    if (val !== null && val > 0) {
      const scaled = formatScaledNumber(val * ratio);
      const rest = singleMatch[2] ? singleMatch[2].trim() : '';
      return rest ? `${scaled} ${rest}` : scaled;
    }
  }

  return takaran;
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
