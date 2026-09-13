/**
 * STORAGE & DATA MANAGER - Autosave, Rekap Input DOM, & Submission
 */
const StorageManager = {
    // Autosave Pilihan Siswa ke SessionStorage
    initAutosave: function() {
        document.querySelectorAll('input[type="radio"]').forEach(input => {
            let savedValue = sessionStorage.getItem(input.name);
            if (savedValue && input.value === savedValue) {
                input.checked = true;
            }

            input.addEventListener('change', function() {
                sessionStorage.setItem(this.name, this.value);
            });
        });

        document.querySelectorAll('input[type="checkbox"]').forEach(input => {
            let savedValue = sessionStorage.getItem(input.name);
            if (savedValue) {
                let checkedArr = savedValue.split(',');
                if (checkedArr.includes(input.value)) {
                    input.checked = true;
                }
            }

            input.addEventListener('change', function() {
                let name = this.name;
                let checkedInputs = document.querySelectorAll(`input[name="${name}"]:checked`);
                if (checkedInputs.length > 0) {
                    let listJawaban = Array.from(checkedInputs).map(el => el.value);
                    sessionStorage.setItem(name, listJawaban.join(','));
                } else {
                    sessionStorage.removeItem(name);
                }
            });
        });
    },

    // Ekstraksi Pilihan Siswa Berdasarkan URUTAN MASTER SOAL (1, 2, 3...)
    kumpulkanJawaban: function(daftarSoal) {
        let jawaban = [];
        
        // URUTKAN KEMBALI daftarSoal berdasarkan id_soal (Urutan Master 1, 2, 3...)
        // Ini kunci utama agar susunan jawaban di Spreadsheet TIDAK ACAK
        const daftarMaster = [...daftarSoal].sort((a, b) => {
            let idA = Number(a.id_soal) || 0;
            let idB = Number(b.id_soal) || 0;
            return idA - idB;
        });

        // Ekstraksi jawaban berdasarkan urutan master yang sudah rapi
        daftarMaster.forEach((soal, index) => {
            const idSoal = soal.id_soal || (index + 1);
            const tipe = soal.tipe_soal || "PG";

            if (tipe === "PG") {
                const inputDipilih = document.querySelector(`input[name="soal_${idSoal}"]:checked`);
                if (inputDipilih) {
                    jawaban.push(inputDipilih.value);
                } else {
                    let saved = sessionStorage.getItem(`soal_${idSoal}`);
                    jawaban.push(saved ? saved : "-");
                }
            } 
            else if (tipe === "PGK") {
                const inputsDipilih = document.querySelectorAll(`input[name="soal_${idSoal}"]:checked`);
                if (inputsDipilih.length > 0) {
                    const listJawaban = Array.from(inputsDipilih).map(el => el.value);
                    jawaban.push(listJawaban.join(","));
                } else {
                    let saved = sessionStorage.getItem(`soal_${idSoal}`);
                    jawaban.push(saved ? saved : "-");
                }
            } 
            else if (tipe === "BS") {
                const totalSub = (soal.pernyataan || []).length;
                let subJawaban = [];

                for (let i = 0; i < totalSub; i++) {
                    const inputSub = document.querySelector(`input[name="soal_${idSoal}_bs_${i}"]:checked`);
                    if (inputSub) {
                        subJawaban.push(inputSub.value);
                    } else {
                        let saved = sessionStorage.getItem(`soal_${idSoal}_bs_${i}`);
                        subJawaban.push(saved ? saved : "-");
                    }
                }

                const hasilBs = subJawaban.join(",");
                jawaban.push(subJawaban.every(val => val === "-") ? "-" : hasilBs);
            }
        });

        return jawaban;
    },

    // Pengiriman Data Hasil Ujian ke Database / Apps Script
    simpanKeSpreadsheet: async function(nama, kelas, mapel, skor, benar, salah, arrayJawaban) {
        const btnSubmit = document.querySelector('button[onclick="sebelumSubmit()"]');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerText = "⏳ Mempersiapkan Antrean Pengiriman...";
            btnSubmit.style.background = "#94a3b8";
        }

        const jedaAcak = Math.floor(Math.random() * 2500) + 500;
        await new Promise(resolve => setTimeout(resolve, jedaAcak));

        if (btnSubmit) {
            btnSubmit.innerText = "⏳ Sedang Mengirim Jawaban... Mohon Tunggu";
        }

        let email = sessionStorage.getItem('cbt_email') || "-"; 
        let startTime = parseInt(sessionStorage.getItem('exam_start_time')) || Date.now();
        let durasiMenit = Math.round((Date.now() - startTime) / 60000);
        let durasiFinal = durasiMenit <= 0 ? 1 : durasiMenit;

        let dataSiswa = {
            nama: nama,
            kelas: kelas,
            mapel: mapel,
            skor: skor,
            benar: benar,
            salah: salah,
            waktu: durasiFinal + " Menit",
            email: email,
            jawaban: arrayJawaban
        };

        try {
            const res = await API.submitJawaban(dataSiswa);
            if (res && res.status === "success") {
                const popupModal = document.getElementById('popupModal');
                if (popupModal) popupModal.style.display = 'flex';
            } else {
                throw new Error((res && res.message) || "Database menolak menyimpan data.");
            }
        } catch (err) {
            alert("❌ GAGAL MENGIRIM JAWABAN!\n\nPenyebab: " + err.message + "\n\nJawaban Anda belum terkirim. Silakan periksa koneksi internet lalu klik tombol 'Kumpulkan Jawaban' sekali lagi.");
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerText = "Kumpulkan Jawaban";
                btnSubmit.style.background = "#007bff";
            }
        }
    }
};
