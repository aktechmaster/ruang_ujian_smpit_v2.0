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
            if (!this.spreadsheetUrl) {
                throw new Error("DATABASE_API_URL belum diatur di config.js.");
            }
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
            if (!this.spreadsheetUrl) {
                throw new Error("DATABASE_API_URL belum diatur di config.js.");
            }
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
            if (!this.spreadsheetUrl) {
                throw new Error("DATABASE_API_URL belum diatur di config.js.");
            }
            const url = `${this.spreadsheetUrl}?action=getToken&mapel=${encodeURIComponent(mapel)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Gagal mengambil data token");
            return await response.json();
        } catch (error) {
            console.error("API Error (getTokenByMapel):", error);
            throw error;
        }
    },

    // 4. AMBIL BERKAS SOAL JSON DARI REPOSITORI GITHUB (Pencarian Otomatis / Multi-Fallback)
    async fetchSoal(tingkat, mapel) {
        try {
            const folderPath = (typeof CONFIG !== 'undefined' && CONFIG.getFolderPath)
                ? CONFIG.getFolderPath(tingkat)
                : `soal/STS_1/Kelas_${tingkat}`;

            const cleanMapel = mapel.toUpperCase();

            // Variasi kemungkinan nama & urutan file JSON di repositori GitHub
            const variasiPath = [
                `./${folderPath}/soal_${cleanMapel}_${tingkat}.json`, // contoh: ./soal/STS_1/Kelas_9/soal_ING_9.json
                `./${folderPath}/Soal_${cleanMapel}_${tingkat}.json`, // contoh: ./soal/STS_1/Kelas_9/Soal_ING_9.json
                `./${folderPath}/soal_${tingkat}_${cleanMapel}.json`, // contoh: ./soal/STS_1/Kelas_9/soal_9_ING.json
                `./${folderPath}/Soal_${tingkat}_${cleanMapel}.json`  // contoh: ./soal/STS_1/Kelas_9/Soal_9_ING.json
            ];

            // Coba ambil dari setiap variasi path
            for (const pathSoal of variasiPath) {
                try {
                    const response = await fetch(pathSoal);
                    if (response.ok) {
                        return await response.json();
                    }
                } catch (e) {
                    // Lanjut mencoba opsi path berikutnya
                }
            }

            throw new Error(`Berkas soal tidak ditemukan pada jalur: /${folderPath}/soal_${cleanMapel}_${tingkat}.json`);

        } catch (error) {
            console.error("API Error (fetchSoal):", error);
            throw error;
        }
    },

    // 5. KIRIM JAWABAN SISWA KE GOOGLE SHEETS
    async submitJawaban(dataSiswa) {
        try {
            const targetUrl = this.submitUrl;

            // Validasi URL
            if (!targetUrl) {
                throw new Error("URL Pengiriman Jawaban tidak ditemukan di CONFIG.");
            }

            if (targetUrl.includes("GANTI_DENGAN_URL")) {
                throw new Error("URL Google Apps Script di 'js/config.js' belum diganti dengan URL Web App asli.");
            }

            // Menyisipkan label jenis_ujian ke dalam payload
            const payload = {
                ...dataSiswa,
                jenis_ujian: (typeof CONFIG !== 'undefined') ? CONFIG.UJIAN_AKTIF : ''
            };

            // Kirim data via POST
            const response = await fetch(targetUrl, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Gagal terhubung ke server Google (Status HTTP: ${response.status})`);
            }

            // Parse hasil kembalian dari Google Apps Script
            const resultText = await response.text();
            let resultData;

            try {
                resultData = JSON.parse(resultText);
            } catch (e) {
                resultData = { status: "success", message: resultText };
            }

            // Jika status dari Apps Script mengembalikan 'error'
            if (resultData && resultData.status === "error") {
                throw new Error(resultData.message || "Database Google Sheets menolak menyimpan data.");
            }

            return resultData;

        } catch (error) {
            console.error("API Error (submitJawaban):", error);
            throw error;
        }
    }
};
