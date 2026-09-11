const API = {
    // 1. Ambil URL dasar untuk Database Siswa, Kelas, dan Token
    get spreadsheetUrl() {
        if (typeof CONFIG === 'undefined') return '';
        return CONFIG.DATABASE_API_URL || '';
    },

    // 2. Ambil URL khusus pengiriman jawaban (Dinamis sesuai sakelar UJIAN_AKTIF)
    get submitUrl() {
        if (typeof CONFIG === 'undefined') return '';
        return typeof CONFIG.getSubmitUrl === 'function' 
            ? CONFIG.getSubmitUrl() 
            : '';
    },

    // 1. AMBIL DATA AWAL (KELAS & MAPEL) DARI GOOGLE APPS SCRIPT
    async getInitialData() {
        try {
            const url = `${this.spreadsheetUrl}?action=getInitialData`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Gagal terhubung ke server Google Sheets");
            return await response.json();
        } catch (error) {
            console.error("API Error (getInitialData):", error);
            throw error;
        }
    },

    // 2. AMBIL DAFTAR SISWA BERDASARKAN KELAS
    async getSiswaByKelas(kelas) {
        try {
            const url = `${this.spreadsheetUrl}?action=getSiswa&kelas=${encodeURIComponent(kelas)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Gagal mengambil data siswa");
            return await response.json();
        } catch (error) {
            console.error("API Error (getSiswaByKelas):", error);
            throw error;
        }
    },

    // 3. AMBIL TOKEN BERDASARKAN MAPEL
    async getTokenByMapel(mapel) {
        try {
            const url = `${this.spreadsheetUrl}?action=getToken&mapel=${encodeURIComponent(mapel)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Gagal mengambil data token");
            return await response.json();
        } catch (error) {
            console.error("API Error (getTokenByMapel):", error);
            throw error;
        }
    },

    // 4. AMBIL BERKAS SOAL JSON DARI REPOSITORI GITHUB (Dinamis per Jenis Ujian & Kelas)
    async fetchSoal(tingkat, mapel) {
        try {
            // Mengambil folder path dinamis dari config, contoh: "Soal/STS_1/Kelas_7"
            const folderPath = (typeof CONFIG !== 'undefined' && CONFIG.getFolderPath)
                ? CONFIG.getFolderPath(tingkat)
                : `Soal_Kelas_${tingkat}`;

            const pathSoal = `./${folderPath}/soal_${tingkat}_${mapel.toUpperCase()}.json`;
            const response = await fetch(pathSoal);

            if (!response.ok) {
                throw new Error(`Berkas soal tidak ditemukan pada jalur: ${pathSoal}`);
            }

            return await response.json();
        } catch (error) {
            console.error("API Error (fetchSoal):", error);
            throw error;
        }
    },

    // 5. KIRIM JAWABAN SISWA KE GOOGLE SHEETS
    async submitJawaban(dataSiswa) {
        try {
            const targetUrl = this.submitUrl;
            if (!targetUrl) {
                throw new Error("URL Pengiriman Jawaban tidak ditemukan di CONFIG.");
            }

            // Menyisipkan label jenis_ujian ke dalam payload untuk validasi di Google Sheets
            const payload = {
                ...dataSiswa,
                jenis_ujian: (typeof CONFIG !== 'undefined') ? CONFIG.UJIAN_AKTIF : ''
            };

            const response = await fetch(targetUrl, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Gagal mengirim jawaban ke server (Status " + response.status + ")");
            
            const resultText = await response.text();
            try {
                return JSON.parse(resultText);
            } catch (e) {
                return { status: "success", message: resultText };
            }
        } catch (error) {
            console.error("API Error (submitJawaban):", error);
            throw error;
        }
    }
};
