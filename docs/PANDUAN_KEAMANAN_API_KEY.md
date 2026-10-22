# Panduan Keamanan API Key & Rahasia (Secret Management)

Dokumen ini menjelaskan tata cara pengelolaan API Key dan kredensial rahasia pada proyek **Dapur Pintar / Smart Kitchen** agar aman dan tidak bocor ke publik.

---

## 1. Penyebab Error "API Key Reported as Leaked" (HTTP 403)

Google secara otomatis memindai (*secret scanning*) repositori Git publik dan semipublik. Jika Google mendeteksi ada API Key yang tertulis langsung (*hardcoded*) di dalam file kode JavaScript/HTML yang ter-commit ke Git:
- Google akan langsung **mencabut dan memblokir** API Key tersebut seketika demi keamanan akun Anda.
- API akan mengembalikan respons:
  ```json
  {
    "error": {
      "code": 403,
      "message": "Your API key was reported as leaked. Please use another API key.",
      "status": "PERMISSION_DENIED"
    }
  }
  ```

---

## 2. Aturan Emas (Best Practices)

1. **JANGAN PERNAH menaruh API Key mentah di dalam file kode:**
   - Hindari: `apiKey: 'AIzaSy...'` di file `js/config.js`, `api/config.js`, `js/core/storage.js`, dsb.
2. **Gunakan file `.env` untuk Development Lokal:**
   - Simpan key di file `.env` di root proyek:
     ```env
     GEMINI_API_KEY=your_gemini_api_key_here
     ```
   - File `.env` sudah masuk ke `.gitignore` sehingga **tidak akan pernah ter-commit** ke Git.
3. **Gunakan Environment Variables di Vercel (Production):**
   - Buka Dashboard Vercel > Proyek Smart Kitchen > **Settings** > **Environment Variables**.
   - Tambahkan key:
     - **Key:** `GEMINI_API_KEY`
     - **Value:** `your_gemini_api_key_here`
     - **Target:** Production, Preview, Development.
   - Simpan dan lakukan **Redeploy**.
4. **Arsitektur Pengambilan Key di Aplikasi:**
   - Vercel Serverless Function [`api/config.js`](file:///D:/Work/Code/smart-kitchen/api/config.js) membaca `process.env.GEMINI_API_KEY` dari server dan memberikannya ke klien saat aplikasi dibuka.
   - Dengan demikian, file source code yang di-push ke GitHub tetap bersih dari rahasia.

---

## 3. Checklist Sebelum Melakukan Git Commit & Push

Sebelum menjalankan `git push`, pastikan selalu menjalankan perintah verifikasi:
```bash
# 1. Pastikan .env tetap berstatus ignored (tidak muncul di git status)
git status -s

# 2. Cek apakah ada key atau secret yang tidak sengaja tertulis di file yang diubah
git diff
```

Jika tidak sengaja ter-commit:
1. Segera hapus key tersebut dari [Google AI Studio](https://aistudio.google.com/apikey).
2. Buat key baru dan masukkan HANYA ke `.env` lokal dan Environment Variables Vercel.
