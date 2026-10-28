# 🍳 Dapur Pintar — Smart Kitchen Assistant

> Asisten dapur cerdas berbasis AI untuk mengelola stok kulkas, deteksi bahan via kamera, dan rekomendasi menu masakan harian untuk mencegah *food waste*.

---

## ✨ Fitur Utama

- **📸 Deteksi Kulkas Multi-Sudut**: Foto isi kulkas dari berbagai sudut (Rak, Laci, Pintu, Freezer) dan biarkan AI Gemini mengenali bahan makanan utama beserta kuantitas dan kesegarannya tanpa perlu input bumbu dasar manual.
- **🏷️ Scan Barcode Produk Otomatis**: Deteksi cepat barcode kemasan makanan/minuman dengan integrasi database global **Open Food Facts** untuk input instan ke kulkas atau dapur.
- **🍳 Ide Masak Pintar & Infinite Scroll**: Rekomendasi resep masakan rumahan Indonesia yang disesuaikan dengan stok nyata. Dilengkapi sistem *infinite scroll* dan tombol *"Cari Rekomendasi Lainnya"* anti-duplikasi.
- **📦 Manajemen Stok Nyata**: Mulai dari inventaris bersih, pembagian jelas antara stok kulkas & dapur, serta indikator prioritas bahan yang harus segera dimasak (*zero food waste*).
- **📋 Log & Riwayat**: Catatan aktivitas memasak dan belanja harian.
- **📱 Hybrid Mobile & PWA**: Tersedia sebagai Web App (PWA) dan aplikasi **Android Native (.apk)** menggunakan **Capacitor 8** (~4.2 MB) dengan dukungan asset splash screen & adaptive icons.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), Tailwind CSS (CDN), Material Symbols Outlined, Plus Jakarta Sans.
- **Mobile Wrapper**: **Capacitor 8** (`@capacitor/core`, `@capacitor/android`, `@capacitor/preferences`).
- **Barcode Engine**: BarcodeDetector API / Html5Qrcode + Open Food Facts API.
- **AI Engine**: Google Gemini Flash (`gemini-flash-lite-latest`, `gemini-3-flash-preview`) dengan multi-model failover fallback otomatis.
- **Storage**: Browser `localStorage` & native persistent storage via `@capacitor/preferences`.
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

## 📱 Build Aplikasi Android Native (Capacitor)

Proyek ini telah dilengkapi dengan wrapper **Capacitor 8** untuk menghasilkan file `.apk` mandiri yang siap diinstall ke smartphone Android:

### Prasyarat
- Node.js (v18+)
- JDK 17 atau JDK 21
- Android SDK (Platform 35/36, Build Tools)

### Perintah Build APK

```bash
# 1. Install dependensi
npm install

# 2. Siapkan aset web ke direktori www/ dan sinkronkan ke Android
npm run cap:sync

# 3. Kompilasi langsung menjadi file APK debug
npm run build:apk
```

File `.apk` yang dihasilkan akan otomatis tersedia di:
- `android/app/build/outputs/apk/debug/app-debug.apk` (atau salinan root `dapur-pintar.apk`).

### Buka di Android Studio (Opsional)
```bash
npm run cap:open
```

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
