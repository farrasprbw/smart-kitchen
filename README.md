# 🍳 Dapur Pintar — Smart Kitchen Assistant

> Asisten dapur cerdas berbasis AI untuk mengelola stok kulkas, deteksi bahan via kamera, dan rekomendasi menu masakan harian untuk mencegah *food waste*.

---

## ✨ Fitur Utama

- **📸 Deteksi Kulkas Multi-Sudut**: Foto isi kulkas dari berbagai rak dan biarkan AI mengenali bahan makanan beserta estimasi jumlah dan kondisinya.
- **🛒 Pindai Belanjaan**: Foto barang belanjaan Anda untuk langsung memperbarui inventaris kulkas dan dapur secara otomatis.
- **🍳 Ide Masak Pintar**: Dapatkan rekomendasi 3 resep masakan Indonesia lezat yang dibuat hanya menggunakan bahan-bahan yang saat ini tersedia di kulkas Anda.
- **📦 Manajemen Stok**: Pisahkan stok kulkas dan bahan kering dapur, lengkapi status kesegaran, serta riwayat tanggal penyimpanan.
- **📋 Log & Riwayat**: Catatan aktivitas memasak dan belanja harian.
- **📱 Progressive Web App (PWA)**: Ringan, dapat diinstal di smartphone (Android/iOS) atau desktop, dan mendukung akses offline dasar.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), Tailwind CSS (CDN), Material Symbols Outlined, Plus Jakarta Sans.
- **AI Engine**: Google Gemini Flash (`gemini-flash-lite-latest`, `gemini-3-flash-preview`) dengan failover fallback otomatis.
- **Dukungan Multi-AI Paralel**: Dapat diintegrasikan paralel dengan Grok (xAI Vision) atau Groq (Llama 3.2 Vision).
- **Storage**: Browser `localStorage` (Privasi terjaga, data tersimpan di perangkat pengguna).
- **Backend / Deployment**: Vercel Serverless Function (`/api/config`).

---

## 🤖 Model AI & Informasi Biaya (Gemini vs Grok vs Groq)

| Provider | Model | Status Biaya | Kegunaan |
|---|---|---|---|
| **Google Gemini Flash** | `gemini-flash-lite-latest`, `gemini-3-flash-preview` | **Gratis** (1.500 request/hari) | Vision deteksi kulkas & rekomendasi resep |
| **Grok (xAI)** | `grok-2-vision` | **Berbayar** (Pay-as-you-go setelah free credits) | Opsi paralel / cross-validation sekunder |
| **Groq** | `llama-3.2-11b-vision-preview` | **Gratis** (Free tier dengan rate limit) | Opsi cadangan gratis multi-provider |

### Pemrosesan Gambar Paralel:
Aplikasi dapat menjalankan deteksi foto secara paralel antara Gemini dan provider sekunder (Grok/Groq):
1. **Ensemble (Validasi Silang)**: Kedua AI menganalisis gambar bersamaan. Jika keduanya mendeteksi bahan yang sama, confidence level menjadi sangat tinggi (`yakin: true`).
2. **Race Latency**: Menggunakan `Promise.any` untuk mengambil respons dari AI yang tercepat.
3. **Failover Otomatis**: Jika satu provider limit/gangguan, otomatis dialihkan ke provider lain.

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
