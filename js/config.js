const CONFIG = {
    // ===================================================
    // 🗄️ DATABASE UTAMA (Data Kelas, Nama Siswa, Token)
    // ===================================================
    DATABASE_API_URL: "https://script.google.com/macros/s/AKfycbxF3g7LSwr61mNuVqOApDXnmjZsY5putWlumzL_GnJJN8hOPqhTk0MR9aPRnmbFJX1x/exec",

    // ===================================================
    // 🔘 SAKELAR UTAMA (Ubah nilai ini sesuai pekan ujian)
    // Pilihan: "STS_1" | "SAS_1" | "STS_2" | "SAT" | "USBN"
    // ===================================================
    UJIAN_AKTIF: "STS_1",

    // ===================================================
    // 📁 DAFTAR KONFIGURASI JENIS UJIAN & SPREADSHEET
    // ===================================================
    LIST_UJIAN: {
        "STS_1": {
            nama: "Sumatif Tengah Semester 1",
            folder: "STS_1",
            submit_url: "https://script.google.com/macros/s/GANTI_DENGAN_URL_GAS_STS_1/exec"
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

    // ===================================================
    // ⏱️ DURASI UJIAN PER MATA PELAJARAN (dalam menit)
    // ===================================================
    DURASI_MAPEL: {
        "PKN": 90,
        "MTK": 120,
        "IPA": 90,
        "IPS": 90,
        "B_INDO": 120,
        "B_INGG": 120,
        "PAI": 90
    },

    // ===================================================
    // 🛡️ FITUR PROCTORING / KEAMANAN
    // ===================================================
    PROCTOR: {
        ENABLE_ANTI_TAB_SWITCH: true,
        MAX_TAB_SWITCH_WARNINGS: 3,
        ENABLE_DISABLE_RIGHT_CLICK: true,
        ENABLE_DISABLE_DEVTOOLS_KEYS: true
    },

    // ===================================================
    // 🛠️ HELPER FUNCTIONS (Fungsi Pembantu Dinamis)
    // ===================================================
    getUjianAktif() {
        return this.LIST_UJIAN[this.UJIAN_AKTIF] || this.LIST_UJIAN["STS_1"];
    },

    getSubmitUrl() {
        return this.getUjianAktif().submit_url;
    },

    getFolderPath(kelas) {
        return `Soal/${this.getUjianAktif().folder}/Kelas_${kelas}`;
    }
};
