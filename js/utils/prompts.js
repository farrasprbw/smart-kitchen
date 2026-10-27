// Prompt templates for Gemini 2.0 Flash

export function buildPromptDeteksiKulkas(jumlahFoto = 1) {
  return `Kamu adalah asisten dapur yang sangat teliti dan ahli mengidentifikasi bahan makanan.
Saya mengirim ${jumlahFoto} foto isi kulkas dari sudut/bagian berbeda.

TUGAS:
1. Analisis SEMUA foto dan gabungkan menjadi SATU daftar bahan makanan utama unik.
2. Identifikasi nama bahan, perkiraan jumlah, satuan, kategori, lokasi penyimpanan, dan tingkat keyakinan (confidence).
3. Fokus utamakan mendeteksi BAHAN MAKANAN UTAMA (sayur, protein/daging/ayam/ikan/telur, buah, olahan, minuman). Bumbu dasar dapur standar (seperti garam, gula, kecap, merica, minyak) diasumsikan sudah ada di rumah.
4. Jika bahan tertutup atau kurang jelas, set "yakin": false dan beri catatan singkat.
5. Jangan mengarang bahan yang tidak terlihat.
6. Jawab HANYA dengan JSON valid tanpa formatting markdown lainnya jika memungkinkan, atau bungkus dalam block json.

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

export function buildPromptRekomendasiMasak(daftarStok, excludeNames = []) {
  const stokStr = daftarStok && daftarStok.length > 0
    ? daftarStok.map(b => `- ${b.nama}: ${b.jumlah ?? '?'} ${b.satuan || ''}${b.catatan ? ` (${b.catatan})` : ''}`).join('\n')
    : '(Stok bahan utama kosong, berikan rekomendasi menu kreatif dari bahan umum rumahan)';

  const excludePrompt = excludeNames && excludeNames.length > 0
    ? `\nMENU YANG SUDAH PERNAH DIREKOMENDASIKAN (JANGAN DIREKOMENDASIKAN ULANG / JANGAN DUPLIKAT):\n${excludeNames.map(n => `- ${n}`).join('\n')}\nPASTIKAN SEMUA MENU BARU BERIKUT TIDAK ADA YANG SAMA/MIRIP DENGAN DAFTAR DI ATAS!`
    : '';

  return `Kamu adalah chef rumahan Indonesia yang kreatif, praktis, dan ahli zero-waste cooking.

STOK BAHAN UTAMA TERSEDIA SAAT INI (HASIL SCAN):
${stokStr}
${excludePrompt}

ASUMSI BUMBU DASAR DAPUR:
User SUDAH MEMILIKI bumbu-bumbu dasar dapur umum di rumah (seperti garam, gula, minyak goreng, bawang merah, bawang putih, cabai, merica/lada, kecap manis, kecap asin, saus tiram, kaldu bubuk, dll). User HANYA memindai bahan makanan utama. Manfaatkan stok bahan utama hasil scan di atas dan kombinasikan secara wajar dengan bumbu dasar dapur standar untuk menghasilkan hidangan yang enak.

TUGAS:
Berikan 3 rekomendasi menu masakan Indonesia lezat yang BISA DIBUAT secara realistis dari bahan utama yang di-scan dan bumbu dapur standar.
Prioritaskan bahan makanan utama yang mudah layu atau mendekati batas konsumsi. Semua resep praktis (< 30 menit).

INSTRUKSI KECEPATAN:
Buat penjelasan padat, ringkas, dan to-the-point. Langkah memasak maksimal 3 langkah singkat per menu, dan alasan cukup 1 kalimat singkat. Hindari kata-kata bertele-tele agar pemrosesan super cepat.

Format JSON yang wajib diikuti:
{
  "rekomendasi": [
    {
      "id": "resep-1",
      "nama": "Nama Masakan Indonesia (misal: Tumis Sawi Tahu Gurih)",
      "kata_kunci_gambar": "sayur / ayam / daging / ikan / telur / tahu / sup / mie / nasi / pedas",
      "badge": "100% Bahan Cocok / Cepat & Praktis / Rekomendasi Hemat",
      "alasan": "Alasan singkat (misal: Menggunakan sawi layu & tahu)",
      "waktu_masak": "15 menit",
      "tingkat_kesulitan": "Mudah",
      "porsi": "2-3 porsi",
      "bahan_terpakai": [
        { "nama": "Sawi", "jumlah": 1, "satuan": "ikat" },
        { "nama": "Tahu", "jumlah": 2, "satuan": "potong" }
      ],
      "bahan_bumbu": ["Bawang putih", "Kecap manis", "Garam", "Minyak goreng"],
      "langkah": [
        "Potong tahu dadu kecil dan bersihkan sawi.",
        "Tumis bawang putih hingga harum, masukkan tahu dan sawi.",
        "Bumbui kecap manis dan garam, masak cepat hingga matang."
      ],
      "tips": "Masak cepat agar sayur tetap renyah."
    }
  ]
}

Jawab HANYA dengan JSON valid.`;
}
