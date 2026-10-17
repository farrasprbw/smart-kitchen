# 🍳 Dapur Pintar — Smart Kitchen Assistant

> Asisten dapur cerdas berbasis AI untuk mengelola stok kulkas, deteksi bahan via kamera, dan rekomendasi menu masakan harian untuk mencegah *food waste*.

---

## ✨ Fitur Utama

- **📸 Deteksi Kulkas Multi-Sudut**: Foto isi kulkas dari berbagai rak dan biarkan sistem mengenali bahan makanan utama beserta estimasi jumlah dan kondisinya. Pengguna tidak perlu repot memindai bumbu dasar (garam, gula, kecap, merica, dll) karena otomatis diasumsikan sudah tersedia di dapur.
- **🛒 Pindai Belanjaan**: Foto barang belanjaan Anda untuk langsung memperbarui inventaris kulkas dan dapur secara otomatis.
- **🍳 Ide Masak Pintar**: Dapatkan rekomendasi 3 resep masakan Indonesia praktis & lezat yang memadukan bahan makanan utama hasil pindai dengan bumbu dasar dapur rumahan tanpa perlu input bumbu manual.
- **📦 Manajemen Stok Nyata**: Mulai dari inventaris bersih (tanpa data mock), pisahkan stok kulkas dan bahan dapur, serta lengkapi status kesegaran bahan.
- **📋 Log & Riwayat**: Catatan aktivitas memasak dan belanja harian.
- **📱 Progressive Web App (PWA)**: Ringan, dapat diinstal di smartphone (Android/iOS) atau desktop, dan mendukung akses offline dasar.
- **🧹 Reset Data Fleksibel**: Kemudahan mengosongkan dan mengatur ulang seluruh inventaris kapan saja lewat menu Pengaturan.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), Tailwind CSS (CDN), Material Symbols Outlined, Plus Jakarta Sans.
- **AI Engine**: Google Gemini Flash (`gemini-flash-lite-latest`, `gemini-3-flash-preview`) dengan failover fallback otomatis.
- **Storage**: Browser `localStorage` (Privasi terjaga, data tersimpan di perangkat pengguna).
- **Backend / Deployment**: Vercel Serverless Function (`/api/config`).

---

## 🤖 Model AI & Informasi Biaya

Aplikasi ini menggunakan **Google Gemini Flash API** dengan kuota gratis resmi dari Google:

| Fitur | Model AI | Status Biaya | Keterangan |
|---|---|---|---|
| **Deteksi Bahan Kulkas (Vision)** | `gemini-flash-lite-latest`, `gemini-3-flash-preview` | **Gratis** (1.500 req/hari) | Analisis foto multi-sudut dan estimasi kuantitas |
| **Rekomendasi Resep (Text)** | `gemini-flash-lite-latest` | **Gratis** | Resep masakan kreatif berbasis bahan yang tersedia |

> **Failover Otomatis**: Jika model utama mengalami antrean atau limit kuota, sistem otomatis beralih ke model cadangan (`gemini-3-flash-preview` / `gemini-3.8-flash`) secara mulus.

---

## 🚀 Menjalankan Secara Lokal (Local Development)

Aplikasi ini menggunakan JavaScript ES Modules (`<script type="module">`), sehingga perlu dijalankan menggunakan local web server:

### Opsi A: Menggunakan Node.js / npx (Disarankan)

```bash
# Menggunakan npx serve
npx serve .

# Atau menggunakan http-server
npx http-server -p 3000
```

Buka browser Anda di `http://localhost:3000` (atau port yang ditampilkan di terminal).

### Opsi B: Menggunakan Python

```bash
python -m http.server 8080
```

Buka browser Anda di `http://localhost:8080`.

---

## ☁️ Panduan Deploy ke Vercel

Aplikasi ini sudah dioptimalkan untuk langsung di-deploy ke Vercel tanpa perlu konfigurasi build yang rumit.

1. **Push ke GitHub**:
   Pastikan kode aplikasi sudah ter-push ke repository GitHub Anda.
2. **Import ke Vercel**:
   - Buka dashboard [Vercel](https://vercel.com/) dan klik **Add New...** > **Project**.
   - Hubungkan repository GitHub `smart-kitchen`.
   - Pada bagian **Framework Preset**, pilih **Other** (karena ini adalah static site + serverless API).
3. **Atur Environment Variables di Vercel**:
   - Buka menu **Environment Variables**.
   - Tambahkan variabel berikut:
     | Name | Value | Deskripsi |
     |---|---|---|
     | `GEMINI_API_KEY` | `AIzaSy...` | API Key dari [Google AI Studio](https://aistudio.google.com/apikey) |
4. **Deploy**:
   - Klik tombol **Deploy**.
   - Aplikasi akan otomatis terhubung dengan API Key tersebut melalui endpoint serverless `/api/config`.

---

## 🔒 Privasi & Keamanan Data

- Kunci API tidak disimpan di dalam repositori publik.
- Jika dideploy ke Vercel, API Key diambil melalui environment variable serverless.
- Data inventaris kulkas, foto, dan preferensi sepenuhnya tersimpan di `localStorage` pada browser pengguna masing-masing.

---

## 📄 Lisensi

MIT License © 2026 Farras Prabowo
