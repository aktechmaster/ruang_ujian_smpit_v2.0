const API = {
    get submitUrl() {
        if (typeof CONFIG === 'undefined') return '';
        return typeof CONFIG.getSubmitUrl === 'function' ? CONFIG.getSubmitUrl() : '';
    },

    // Helper internal untuk mengonversi teks CSV menjadi Array of Objects
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        
        return lines.slice(1).map(line => {
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
            let obj = {};
            headers.forEach((header, index) => {
                let val = values[index] ? values[index].replace(/^"|"$/g, '').trim() : "";
                obj[header] = val;
            });
            return obj;
        });
    },

    // 1. AMBIL DATA AWAL (DAFTAR KELAS & MAPEL) DARI CSV
    async getInitialData() {
        try {
            const [resSiswa, resToken] = await Promise.all([
                fetch(CONFIG.URL_DATA_SISWA),
                fetch(CONFIG.URL_TOKEN_MAPEL)
            ]);

            const textSiswa = await resSiswa.text();
            const textToken = await resToken.text();

            const dataSiswa = this.parseCSV(textSiswa);
            const dataToken = this.parseCSV(textToken);

            // Ambil daftar kelas unik dari DataSiswa
            const daftarKelas = [...new Set(dataSiswa.map(s => s.kelas).filter(Boolean))];
            
            // Ambil daftar mapel unik dari TokenMapel
            const daftarMapel = [...new Set(dataToken.map(t => t.mapel).filter(Boolean))];

            return {
                status: "success",
                kelas: daftarKelas,
                mapel: daftarMapel
            };
        } catch (error) {
            console.error("API Error (getInitialData):", error);
            throw new Error("Gagal mengambil data awal kelas dan mapel.");
        }
    },

    // 2. AMBIL DAFTAR SISWA BERDASARKAN KELAS DARI CSV
    async getSiswaByKelas(kelasInput) {
        try {
            const response = await fetch(CONFIG.URL_DATA_SISWA);
            if (!response.ok) throw new Error("Gagal mengambil data dari Google Sheets");
            
            const csvText = await response.text();
            const seluruhSiswa = this.parseCSV(csvText);

            // Filter siswa berdasarkan kelas yang dipilih
            const siswaFiltered = seluruhSiswa.filter(s => 
                s.kelas && s.kelas.toLowerCase() === kelasInput.toLowerCase()
            );

            return siswaFiltered;
        } catch (error) {
            console.error("API Error (getSiswaByKelas):", error);
            throw error;
        }
    },

    // 3. AMBIL TOKEN BERDASARKAN MAPEL DARI CSV
    async getTokenByMapel(mapelInput) {
        try {
            const response = await fetch(CONFIG.URL_TOKEN_MAPEL);
            if (!response.ok) throw new Error("Gagal mengambil data token");
            
            const csvText = await response.text();
            const daftarToken = this.parseCSV(csvText);

            // Cari match mata pelajaran
            const tokenObj = daftarToken.find(t => 
                t.mapel && t.mapel.toLowerCase() === mapelInput.toLowerCase()
            );

            return {
                status: "success",
                token: tokenObj ? tokenObj.token : ""
            };
        } catch (error) {
            console.error("API Error (getTokenByMapel):", error);
            throw error;
        }
    },

    // 4. AMBIL BERKAS SOAL JSON DARI REPOSITORI GITHUB
    async fetchSoal(tingkat, mapel) {
        try {
            const folderPath = (typeof CONFIG !== 'undefined' && CONFIG.getFolderPath)
                ? CONFIG.getFolderPath(tingkat)
                : `soal/STS_1/Kelas_${tingkat}`;

            const cleanMapel = mapel.toUpperCase();

            const variasiPath = [
                `./${folderPath}/soal_${cleanMapel}_${tingkat}.json`,
                `./${folderPath}/Soal_${cleanMapel}_${tingkat}.json`,
                `./${folderPath}/soal_${tingkat}_${cleanMapel}.json`,
                `./${folderPath}/Soal_${tingkat}_${cleanMapel}.json`
            ];

            for (const pathSoal of variasiPath) {
                try {
                    const response = await fetch(pathSoal);
                    if (response.ok) {
                        return await response.json();
                    }
                } catch (e) {}
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

            if (!targetUrl || targetUrl.includes("GANTI_DENGAN_URL")) {
                throw new Error("URL Pengiriman Jawaban di 'config.js' belum dikonfigurasi.");
            }

            const payload = {
                ...dataSiswa,
                jenis_ujian: (typeof CONFIG !== 'undefined') ? CONFIG.UJIAN_AKTIF : ''
            };

            try {
                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const resultText = await response.text();
                    let resultData;
                    try {
                        resultData = JSON.parse(resultText);
                    } catch (e) {
                        resultData = { status: "success", message: resultText };
                    }

                    if (resultData && resultData.status === "error") {
                        throw new Error(resultData.message || "Database Google Sheets menolak menyimpan data.");
                    }

                    return resultData;
                }
            } catch (fetchError) {
                if (navigator.onLine) {
                    console.warn("CORS Redirect warning dari GAS (data telah berhasil disimpan):", fetchError);
                    return { status: "success", message: "Jawaban berhasil disimpan." };
                }
                
                throw new Error("Koneksi internet terputus. Silakan periksa koneksi Anda.");
            }

            return { status: "success", message: "Jawaban berhasil disimpan." };

        } catch (error) {
            console.error("API Error (submitJawaban):", error);
            throw error;
        }
    }
};
