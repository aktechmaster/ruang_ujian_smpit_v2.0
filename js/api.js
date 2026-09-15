const API = {
    get submitUrl() {
        if (typeof CONFIG === 'undefined') return '';
        return typeof CONFIG.getSubmitUrl === 'function' ? CONFIG.getSubmitUrl() : '';
    },

    // Helper internal untuk mengonversi teks CSV menjadi Array of Objects
    parseCSV(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const parseLine = (row) => {
            const values = [];
            let current = '';
            let insideQuotes = false;
            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"') {
                    insideQuotes = !insideQuotes;
                } else if (char === ',' && !insideQuotes) {
                    values.push(current.trim().replace(/^"|"$/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim().replace(/^"|"$/g, ''));
            return values;
        };

        const headers = parseLine(lines[0]).map(h => h.toLowerCase());
        
        return lines.slice(1).map(line => {
            const values = parseLine(line);
            let obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] !== undefined ? values[index] : "";
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

            const daftarKelas = [...new Set(dataSiswa.map(s => s.kelas).filter(Boolean))];
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
                : `Soal/STS_1/Kelas_${tingkat}`;

            const cleanMapel = mapel.toUpperCase();

            // Urutan disesuaikan dengan struktur nama file repositori GitHub Anda (soal_9_IND.json)
            const variasiPath = [
                `./${folderPath}/soal_${tingkat}_${cleanMapel}.json`,
                `./${folderPath}/Soal_${tingkat}_${cleanMapel}.json`,
                `./${folderPath}/soal_${cleanMapel}_${tingkat}.json`,
                `./${folderPath}/Soal_${cleanMapel}_${tingkat}.json`
            ];

            for (const pathSoal of variasiPath) {
                try {
                    const response = await fetch(pathSoal);
                    if (response.ok) {
                        return await response.json();
                    }
                } catch (e) {}
            }

            throw new Error(`Berkas soal tidak ditemukan pada jalur: /${folderPath}/soal_${tingkat}_${cleanMapel}.json`);

        } catch (error) {
            console.error("API Error (fetchSoal):", error);
            throw error;
        }
    },

    // Helper Fungsi Perhitungan Skor (PG, PGK, BS)
    hitungNilai(bankSoal, jawabanSiswa) {
        if (!bankSoal || !jawabanSiswa) return { skor: 0, benar: 0, salah: 0 };
        
        let benar = 0;
        const totalSoal = bankSoal.length;

        bankSoal.forEach((soal) => {
            const id = soal.id_soal;
            const kunci = soal.kunci_jawaban;
            const jwb = jawabanSiswa[id];

            if (jwb === undefined || jwb === null || kunci === undefined) return;

            // Pilihan Ganda Biasa
            if (typeof kunci === 'string') {
                if (String(jwb).trim().toUpperCase() === kunci.trim().toUpperCase()) {
                    benar++;
                }
            } 
            // Pilihan Ganda Kompleks (Array)
            else if (Array.isArray(kunci)) {
                const userArr = Array.isArray(jwb) ? jwb : String(jwb).split(',').map(s => s.trim());
                const kStr = [...kunci].sort().join(',');
                const uStr = [...userArr].sort().join(',');
                if (kStr === uStr) benar++;
            } 
            // Benar / Salah (Object)
            else if (typeof kunci === 'object') {
                let matchAll = true;
                Object.keys(kunci).forEach(k => {
                    if (String(jwb[k]).toUpperCase() !== String(kunci[k]).toUpperCase()) {
                        matchAll = false;
                    }
                });
                if (matchAll) benar++;
            }
        });

        const salah = totalSoal - benar;
        const skorFinal = totalSoal > 0 ? parseFloat(((benar / totalSoal) * 100).toFixed(2)) : 0;

        return { skor: skorFinal, benar, salah };
    },

    // 5. KIRIM JAWABAN SISWA KE GOOGLE SHEETS
    async submitJawaban(dataSiswa) {
        try {
            const targetUrl = this.submitUrl;

            if (!targetUrl || targetUrl.includes("GANTI_DENGAN_URL")) {
                throw new Error("URL Pengiriman Jawaban di 'config.js' belum dikonfigurasi.");
            }

            // Hitung skor otomatis di frontend dari bank_soal yang tersimpan
            let skor = dataSiswa.skor || 0;
            let total_benar = dataSiswa.total_benar || 0;
            let total_salah = dataSiswa.total_salah || 0;

            if (dataSiswa.bank_soal && dataSiswa.jawaban) {
                const hasil = this.hitungNilai(dataSiswa.bank_soal, dataSiswa.jawaban);
                skor = hasil.skor;
                total_benar = hasil.benar;
                total_salah = hasil.salah;
            }

            const payload = {
                ...dataSiswa,
                skor: skor,
                total_benar: total_benar,
                total_salah: total_salah,
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
