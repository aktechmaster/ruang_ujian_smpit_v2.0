const CONFIG = {
    // ===================================================
    // 🗄️ DATABASE UTAMA (Data Kelas, Nama Siswa, Token)
    // ===================================================
    URL_DATA_SISWA: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1Mkf4X5IzQEZJNj4Z3MlJmuGb5jZKZ7Q8Xskv5K-m-Ni4MFOk4CFbpkgTAE7J_Zw56rCP40ch3BY1/pub?gid=0&single=true&output=csv",

    URL_TOKEN_MAPEL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1Mkf4X5IzQEZJNj4Z3MlJmuGb5jZKZ7Q8Xskv5K-m-Ni4MFOk4CFbpkgTAE7J_Zw56rCP40ch3BY1/pub?gid=1977703741&single=true&output=csv",

    // ===================================================
    // 🔘 SAKELAR UTAMA (Ubah nilai ini sesuai pekan ujian)
    // Pilihan: "UJI_COBA" | "STS_1" | "SAS_1" | "STS_2" | "SAT" | "USBN"
    // ===================================================
    UJIAN_AKTIF: "STS_1", // <-- UBAH DI SINI UNTUK MENGAKTIFKAN

    // ===================================================
    // 📁 DAFTAR KONFIGURASI JENIS UJIAN & SPREADSHEET
    // ===================================================
    LIST_UJIAN: {
        // <-- TAMBAHKAN BLOK UJI_COBA DI SINI
        "UJI_COBA": {
            nama: "Uji Coba Sistem",
            folder: "UJI_COBA", // Mengarah ke folder UJI_COBA di GitHub
            submit_url: "https://script.google.com/macros/s/GANTI_DENGAN_URL_GAS_UJI_COBA/exec" // URL Apps Script penampung data uji coba
        },
        "STS_1": {
            nama: "Sumatif Tengah Semester 1",
            folder: "STS_1",
            submit_url: "https://script.google.com/macros/s/AKfycby_sBpuFZVROqDjEuM6XMMHlpvCYSAo2xIPgNbJUNGaAyEtr7Y6KOoSMkmwG2uetEr_/exec"
        },
        "SAS_1": {
            nama: "Sumatif Akhir Semester 1",
            folder: "SAS_1",
            submit_url: "https://script.google.com/macros/s/GANTI_DENGAN_URL_GAS_SAS_1/exec"
        },
        "STS_2": {
            nama: "Sumatif Tengah Semester 2",
            folder: "STS_2",
            submit_url: "https://script.google.com/macros/s/GANTI_DENGAN_URL_GAS_STS_2/exec"
        },
        "SAT": {
            nama: "Sumatif Akhir Tahun",
            folder: "SAT",
            submit_url: "https://script.google.com/macros/s/GANTI_DENGAN_URL_GAS_SAT/exec"
        },
        "USBN": {
            nama: "Ujian Sekolah Berstandar Nasional",
            folder: "USBN",
            submit_url: "https://script.google.com/macros/s/GANTI_DENGAN_URL_GAS_USBN/exec"
        }
    },

    // ... sisa kode di bawahnya tetap sama
