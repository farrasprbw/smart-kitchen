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

ATURAN TAKARAN LENGKAP & VISUAL:
1. 'bahan_terpakai': Wajib ada nama bahan, jumlah realistis, dan satuan (misal: butir, ikat, buah, potong, gram).
2. 'bahan_bumbu': WAJIB gunakan array objek { "nama": "...", "takaran": "..." } dengan takaran jelas (misal: "2 siung (cincang)", "1 sdm", "1/2 sdt", "2 sdm", "1 sdt gula aren"). JANGAN HANYA MENYEBUTKAN NAMA BUMBU POLOS!
3. 'langkah': Dalam setiap langkah memasak, cantumkan bahan dan takarannya (misal: "Panaskan 2 sdm minyak goreng, tumis 2 siung bawang putih hingga harum...").
4. 'kategori_visual': Pilih tepat 1 kategori yang paling akurat dari daftar ini:
   - 'rujak_buah' (Wajib untuk semua olahan buah: rujak, asinan, salad buah, mangga, pisang, nanas, buah potong)
   - 'minuman_dessert' (Untuk jus buah, es, smoothie, puding, minuman)
   - 'tumis_sayur' (Untuk sayuran hijau, cah, oseng, capcay, salad sayur)
   - 'nasi_goreng' (Untuk semua olahan nasi)
   - 'mie_goreng' (Untuk mie, bihun, kwetiau, pasta)
   - 'ayam_goreng' (Untuk ayam, bebek, unggas)
   - 'telur_dadar' (Untuk telur dadar, ceplok, orak-arik)
   - 'tahu_tempe' (Untuk tahu, tempe)
   - 'soto_sup' (Untuk sup, soto, sayur asem, kuah, bakso)
   - 'ikan_seafood' (Untuk ikan, udang, cumi, seafood)
   - 'daging_sapi' (Khusus olahan daging sapi, rendang, semur, kambing)
   - 'sambal' (Untuk aneka sambal dan olahan balado pedas)

INSTRUKSI KECEPATAN:
Buat penjelasan padat, ringkas, dan to-the-point. Langkah memasak maksimal 3 langkah singkat per menu, dan alasan cukup 1 kalimat singkat. Hindari kata-kata bertele-tele agar pemrosesan super cepat.

Format JSON yang wajib diikuti:
{
  "rekomendasi": [
    {
      "id": "resep-1",
      "nama": "Nama Masakan Indonesia (misal: Tumis Sawi Tahu Gurih)",
      "kategori_visual": "tumis_sayur",
      "badge": "100% Cocok / Cepat & Praktis / Rekomendasi Hemat",
      "alasan": "Alasan singkat (misal: Menggunakan sawi layu & tahu)",
      "waktu_masak": "15 menit",
      "tingkat_kesulitan": "Mudah",
      "porsi": "2 porsi",
      "bahan_terpakai": [
        { "nama": "Sawi hijau", "jumlah": 1, "satuan": "ikat" },
        { "nama": "Tahu putih", "jumlah": 2, "satuan": "buah" }
      ],
      "bahan_bumbu": [
        { "nama": "Bawang putih", "takaran": "2 siung (cincang)" },
        { "nama": "Kecap manis", "takaran": "1 sdm" },
        { "nama": "Saus tiram", "takaran": "1 sdt" },
        { "nama": "Garam", "takaran": "1/2 sdt" },
        { "nama": "Minyak goreng", "takaran": "2 sdm" }
      ],
      "langkah": [
        "Potong 2 buah tahu bentuk dadu kecil dan cuci bersih 1 ikat sawi lalu potong sesuai selera.",
        "Panaskan 2 sdm minyak di wajan, tumis 2 siung bawang putih cincang hingga harum kekuningan.",
        "Masukkan tahu dan sawi, tambahkan 1 sdm kecap manis, 1 sdt saus tiram, dan 1/2 sdt garam. Masak cepat 3 menit hingga matang."
      ],
      "tips": "Masak dengan api sedang agar sawi tetap renyah."
    }
  ]
}

Jawab HANYA dengan JSON valid.`;
}
