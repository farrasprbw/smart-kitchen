// AI Prompt templates for Gemini 2.0 Flash

export function buildPromptDeteksiKulkas(jumlahFoto = 1) {
  return `Kamu adalah asisten dapur yang sangat teliti dan ahli mengidentifikasi bahan makanan.
Saya mengirim ${jumlahFoto} foto isi kulkas dari sudut/bagian berbeda.

TUGAS:
1. Analisis SEMUA foto dan gabungkan menjadi SATU daftar bahan makanan unik.
2. Identifikasi nama bahan, perkiraan jumlah, satuan, kategori, lokasi penyimpanan, dan tingkat keyakinan (confidence).
3. Jika bahan tertutup atau kurang jelas, set "yakin": false dan beri catatan singkat.
4. Jangan mengarang bahan yang tidak terlihat.
5. Jawab HANYA dengan JSON valid tanpa formatting markdown lainnya jika memungkinkan, atau bungkus dalam block json.

Format JSON yang wajib diikuti:
{
  "bahan": [
    {
      "nama": "nama bahan dalam Bahasa Indonesia (misal: Telur Ayam, Daun Bawang, Wortel)",
      "jumlah": 5,
      "satuan": "butir / ikat / buah / potong / bungkus / botol / liter / kg / gram",
      "kategori": "protein / sayur / buah / minuman / bumbu / olahan / lainnya",
      "lokasi": "kulkas / freezer / pintu_kulkas",
      "yakin": true,
      "confidence": 95,
      "catatan": "keterangan jika ada (misal: segar, sisa setengah botol, agak layu)"
    }
  ],
  "total_terdeteksi": 1,
  "catatan_umum": "Ringkasan kondisi isi kulkas secara umum"
}`;
}

export function buildPromptDeteksiBelanja() {
  return `Kamu adalah asisten belanja dapur yang teliti. Deteksi semua item bahan makanan dan kebutuhan dapur di foto belanjaan ini.

Output dalam format JSON:
{
  "belanjaan": [
    {
      "nama": "nama item dalam Bahasa Indonesia",
      "jumlah": 1,
      "satuan": "butir / ikat / buah / bungkus / botol / liter / kg / gram",
      "kategori": "protein / sayur / buah / minuman / bumbu / bahan_kering / lainnya",
      "simpan_di": "kulkas / dapur",
      "yakin": true,
      "confidence": 90,
      "catatan": ""
    }
  ],
  "total_item": 1
}

Jawab HANYA dengan JSON valid.`;
}

export function buildPromptRekomendasiMasak(daftarStok, bumbuDasar) {
  const stokStr = daftarStok && daftarStok.length > 0
    ? daftarStok.map(b => `- ${b.nama}: ${b.jumlah ?? '?'} ${b.satuan || ''}${b.catatan ? ` (${b.catatan})` : ''}`).join('\n')
    : '(Stok kosong, gunakan bumbu dasar dan bahan umum)';

  const bumbuStr = (bumbuDasar && bumbuDasar.length > 0)
    ? bumbuDasar.join(', ')
    : 'garam, gula, minyak goreng, bawang merah, bawang putih';

  return `Kamu adalah chef rumahan Indonesia yang kreatif, praktis, dan ahli zero-waste cooking.

STOK BAHAN TERSEDIA SAAT INI:
${stokStr}

BUMBU DASAR YANG SELALU TERSEDIA:
${bumbuStr}

TUGAS:
Berikan 3 rekomendasi menu masakan Indonesia lezat yang BISA DIBUAT secara realistis dari stok yang ada dan bumbu dasar.
Prioritaskan bahan yang mudah layu atau mendekati batas konsumsi. Semua resep praktis (< 30 menit).

Format JSON yang wajib diikuti:
{
  "rekomendasi": [
    {
      "id": "resep-1",
      "nama": "Nama Masakan Indonesia (misal: Tumis Sawi Tahu Gurih)",
      "badge": "100% Bahan Cocok / Cepat & Praktis / Rekomendasi Hemat",
      "alasan": "Alasan rekomendasi (misal: Menggunakan sawi yang mulai layu dan tahu agar tidak terbuang)",
      "waktu_masak": "15 menit",
      "tingkat_kesulitan": "Mudah",
      "porsi": "2-3 porsi",
      "bahan_terpakai": [
        { "nama": "Sawi", "jumlah": 1, "satuan": "ikat" },
        { "nama": "Tahu", "jumlah": 2, "satuan": "potong" }
      ],
      "bahan_bumbu": ["Bawang putih", "Kecap manis", "Garam", "Minyak goreng"],
      "langkah": [
        "Potong tahu dadu kecil dan sawi sesuai selera.",
        "Tumis bawang putih cincang hingga harum keemasan.",
        "Masukkan tahu, masak sebentar lalu masukkan sawi.",
        "Bumbui dengan kecap manis dan garam, masak cepat hingga sawi layu pas. Angkat dan sajikan."
      ],
      "tips": "Jangan terlalu lama memasak sawi agar nutrisi dan kerenyahannya tetap terjaga."
    }
  ]
}

Jawab HANYA dengan JSON valid.`;
}
