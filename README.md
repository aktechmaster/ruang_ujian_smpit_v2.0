# ruang_ujian_smpit_v2.0
Ruang Ujian SMP IT New Version (Complete)

Format ringkasan di bawah ini sudah dirancang khusus agar siap langsung di-*copy-paste* ke dalam berkas `README.md` repositori Anda.

---

### 📂 Struktur & Arsitektur Berkas CBT

| Nama File | Fungsi Utama | Hubungi / Edit File Ini Saat: |
| --- | --- | --- |
| **`config.js`** | **Pusat Pengaturan & Sakelar** | Berganti periode ujian (STS/SAS), mengubah durasi mapel, memperbarui URL Google Sheets, atau mengatur batasan pengawasan. |
| **`app.js`** | **Manajer Otentikasi & Login** | Siswa gagal login, token ujian dinyatakan salah padahal benar, atau halaman tidak berpindah (*redirect*) ke `ujian.html`. |
| **`ui.js`** | **Pengelola Tampilan (DOM Handler)** | Pilihan kelas/mapel tidak muncul, daftar nama siswa tidak keluar di pencarian, atau modal *alert* kustom tidak bisa ditutup. |
| **`proctor.js`** | **Sistem Pengawas Anti-Curang** | Fitur anti-pindah tab tidak berjalan, ingin menyesuaikan pemblokiran klik kanan/F12, atau memperbarui teks peringatan kecurangan. |
| **`ujian.js`** | **Mesin Lembar Ujian (Exam Engine)** | Soal gagal dimuat/error, *timer* hitung mundur tidak berjalan, pilihan jawaban tidak tersimpan otomatis (*autosave*), atau kalkulasi skor salah. |
| **`api.js`** | **Jembatan Data (Fetch & Submit)** | Gagal mengambil berkas JSON soal dari server, data kelas/siswa tidak mau ditarik, atau pengiriman hasil ujian ke spreadsheet gagal. |

---

### 🛠️ Panduan Pemecahan Masalah Cepat (Quick Debugging)

* **Form Login Kosong / Nama Siswa Tidak Muncul** $\rightarrow$ Buka **`ui.js`** (fungsi `updateSiswaDatalist`) atau **`api.js`**.
* **Gagal Masuk Ujian Setelah Klik Tombol** $\rightarrow$ Buka **`app.js`** (validasi token & `sessionStorage`).
* **Fitur Anti-Curang Terlalu Ketat / Ingin Dimatikan** $\rightarrow$ Buka **`config.js`** (objek `PROCTOR`) atau **`proctor.js`**.
* **Teks Soal / Arab / Rumus Matematika Berantakan** $\rightarrow$ Buka **`ujian.js`** (fungsi `renderSoal` & integrasi MathJax).
* **Hasil Ujian Tidak Masuk ke Rekap Spreadsheet** $\rightarrow$ Buka **`config.js`** (periksa `submit_url`) dan **`ujian.js`** (fungsi `simpanKeSpreadsheet`).
