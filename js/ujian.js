let bankSoalData = null;
let timerInterval = null;

// Backup alert dan confirm asli browser
const nativeAlert = window.alert;
const nativeConfirm = window.confirm;

document.addEventListener("DOMContentLoaded", async function() {
    // 1. Inisialisasi Fitur Pengawasan (Proctoring)
    if (typeof Proctor !== 'undefined' && typeof Proctor.init === 'function') {
        Proctor.init();
    }

    // 2. Proteksi Halaman: Peringatan saat mencoba me-refresh atau menutup halaman
    window.addEventListener('beforeunload', function (e) {
        if (bankSoalData) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // 3. Ambil Data Session Pengerjaan (Konsistensi Key SessionStorage)
    let kelasSiswa = sessionStorage.getItem('cbt_kelas') || "9 Al-Quran";
    let mapelUjian = sessionStorage.getItem('cbt_mapel') || "MTK";
    let namaSiswa = sessionStorage.getItem('cbt_siswa') || sessionStorage.getItem('cbt_siswa_aktif') || "Siswa Ujian";
    let emailSiswa = sessionStorage.getItem('cbt_email') || "Tidak ada email";

    // Simpan kembali secara konsisten
    sessionStorage.setItem('cbt_siswa', namaSiswa);

    // Deteksi Pergantian Siswa / Mapel (Reset State Ujian Lama)
    let siswaTerakhir = sessionStorage.getItem('cbt_siswa_aktif');
    let mapelTerakhir = sessionStorage.getItem('cbt_mapel_aktif');

    if (siswaTerakhir !== namaSiswa || mapelTerakhir !== mapelUjian) {
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('soal_') || key === 'exam_end_time' || key === 'exam_start_time') {
                sessionStorage.removeItem(key);
            }
        });
        sessionStorage.setItem('cbt_siswa_aktif', namaSiswa);
        sessionStorage.setItem('cbt_mapel_aktif', mapelUjian);
        sessionStorage.setItem('exam_start_time', Date.now());
    }

    // Tampilkan Informasi Siswa pada Header
    const elemEmail = document.getElementById('infoEmail');
    if (elemEmail) elemEmail.innerText = emailSiswa;

    const elemNama = document.getElementById('infoNama');
    if (elemNama) elemNama.innerText = namaSiswa;

    const elemKelas = document.getElementById('infoKelas');
    if (elemKelas) elemKelas.innerText = kelasSiswa;

    const tingkatKelas = kelasSiswa.charAt(0);

    // 4. Load Soal Ujian dari API / File JSON
    try {
        const data = await API.fetchSoal(tingkatKelas, mapelUjian);
        bankSoalData = data;

        const daftarSoal = data?.bank_soal || data?.soal || data?.data || (Array.isArray(data) ? data : []);

        if (!daftarSoal || daftarSoal.length === 0) {
            throw new Error(`Berkas soal untuk kelas '${tingkatKelas}' mapel '${mapelUjian}' tidak ditemukan atau kosong.`);
        }

        // Tampilkan Nama Ujian Aktif di Header
        const elemJudul = document.getElementById('judulMapel');
        if (elemJudul) {
            const namaUjian = (typeof CONFIG !== 'undefined' && typeof CONFIG.getUjianAktif === 'function')
                ? CONFIG.getUjianAktif().nama
                : "Sumatif Tengah Semester";
            const namaMapel = data.metadata?.mata_pelajaran || mapelUjian;
            elemJudul.innerText = `${namaUjian} | ${namaMapel}`;
        }

        // Inisialisasi Timer & Render Soal Ujian
        initTimer(data, mapelUjian);
        renderSoal(daftarSoal);

        // Auto-load jawaban tersimpan & pasang handler autosave
        initAutosave();

        // Render Persamaan Matematika MathJax jika ada
        if (typeof MathJax !== 'undefined' && typeof MathJax.typesetPromise === 'function') {
            MathJax.typesetPromise();
        }

    } catch (error) {
        const lembarSoal = document.getElementById('lembar-soal');
        if (lembarSoal) {
            lembarSoal.innerHTML = `
                <div style='background:#fee2e2; border:1px solid #f87171; color:#991b1b; padding:20px; border-radius:8px; margin:20px 0;'>
                    <h3 style="margin-top:0;">⚠️ Gagal Memuat Soal Ujian</h3>
                    <p><b>Detail Error:</b> ${error.message}</p>
                    <p>Silakan pastikan berkas JSON soal sudah ada untuk tingkat kelas <b>${tingkatKelas}</b> dan mapel <b>${mapelUjian}</b>.</p>
                </div>`;
        }
        console.error("Error memuat soal:", error);
    }
});

// LOGIKA TIMER (Countdown Berbasis Timestamp Akurat)
function initTimer(data, mapelUjian) {
    let durasiMenit = (data.metadata && data.metadata.durasi_menit) 
                    ? data.metadata.durasi_menit 
                    : (typeof CONFIG !== 'undefined' && CONFIG.DURASI_MAPEL && CONFIG.DURASI_MAPEL[mapelUjian] ? CONFIG.DURASI_MAPEL[mapelUjian] : 120);

    let targetEndTime = sessionStorage.getItem('exam_end_time');
    if (!targetEndTime) {
        targetEndTime = Date.now() + (durasiMenit * 60 * 1000);
        sessionStorage.setItem('exam_end_time', targetEndTime);
    } else {
        targetEndTime = parseInt(targetEndTime, 10);
    }

    if (timerInterval) clearInterval(timerInterval);

    function updateTimerDisplay() {
        let now = Date.now();
        let timeLeft = Math.max(0, Math.floor((targetEndTime - now) / 1000));

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            let jedaAcak = Math.floor(Math.random() * 2000); 
            setTimeout(() => {
                alert("Waktu ujian telah habis! Jawaban Anda akan dikumpulkan otomatis.");
                selesaiUjian();
            }, jedaAcak);
        } else {
            let hours = Math.floor(timeLeft / 3600);
            let minutes = Math.floor((timeLeft % 3600) / 60);
            let seconds = timeLeft % 60;

            const timerDisplay = document.getElementById('timer-display');
            if (timerDisplay) {
                timerDisplay.innerText = 
                    (hours < 10 ? "0" : "") + hours + ":" +
                    (minutes < 10 ? "0" : "") + minutes + ":" +
                    (seconds < 10 ? "0" : "") + seconds;
            }
        }
    }

    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

// RENDER SOAL & OPSI JAWABAN
function renderSoal(daftarSoal) {
    let htmlSoal = "";
    
    const jenisUjian = (typeof CONFIG !== 'undefined' && CONFIG.UJIAN_AKTIF) ? CONFIG.UJIAN_AKTIF : 'STS_1';
    const mapelAktif = (sessionStorage.getItem('cbt_mapel') || 'MTK').toUpperCase();
    const kelasSiswa = sessionStorage.getItem('cbt_kelas') || '9';
    const tingkatKelas = kelasSiswa.charAt(0);

    daftarSoal.forEach((soal, index) => {
        htmlSoal += `<div class="soal-box">`;
        
        let teksPertanyaan = soal.teks_pertanyaan || soal.pertanyaan || "";
        
        // Penyesuaian Otomatis URL Gambar Inline
        if (teksPertanyaan.includes('<img')) {
            teksPertanyaan = teksPertanyaan.replace(
                /src=["'](.*?)(images_[^"']+)["']/gi, 
                `src="./Images/${jenisUjian}/$2"`
            );
        }

        let bagianTeks = teksPertanyaan.split('\n\n');
        let teksPertanyaanBersih = "";

        if (bagianTeks.length > 1) {
            let bacaan = bagianTeks[0];
            bacaan = bacaan.replace(/ • /g, "\n• "); 
            bacaan = bacaan.replace(/ (\d+\.) /g, "\n$1 "); 
            bacaan = bacaan.replace(/Materials:/g, "\nMaterials:\n");
            bacaan = bacaan.replace(/Steps:/g, "\nSteps:\n");

            const adaArabBacaan = /[\u0600-\u06FF]/.test(bacaan);
            const kelasBacaan = adaArabBacaan ? "teks-arab font-khusus-arab" : "";

            htmlSoal += `<div class="bacaan ${kelasBacaan}">${bacaan.trim()}</div>`;
            teksPertanyaanBersih = bagianTeks[1];
        } else {
            teksPertanyaanBersih = teksPertanyaan;
        }

        teksPertanyaanBersih = teksPertanyaanBersih.replace(/^\d+\.\s*/, '');

        const adaArabPertanyaan = /[\u0600-\u06FF]/.test(teksPertanyaanBersih);
        const kelasPertanyaan = adaArabPertanyaan ? "teks-arab font-khusus-arab" : "";

        htmlSoal += `
            <div class="pertanyaan">
                <span style="font-weight:bold; margin-right:4px;">${index + 1}.</span>
                <span class="${kelasPertanyaan}">${teksPertanyaanBersih}</span>
            </div>`;
        
        // Render Gambar dari Property JSON
        if (soal.gambar && soal.gambar.trim() !== "") {
            let srcGambarLengkap = "";

            if (soal.gambar.startsWith("images_") || soal.gambar.startsWith("Images_") || soal.gambar.includes("/")) {
                srcGambarLengkap = `./Images/${jenisUjian}/${soal.gambar}`;
            } else {
                srcGambarLengkap = `./Images/${jenisUjian}/images_${mapelAktif}_${tingkatKelas}/${soal.gambar}`;
            }

            htmlSoal += `
                <div class="gambar-container" style="margin: 12px 0; text-align: left;">
                    <img src="${srcGambarLengkap}" alt="Gambar Soal ${index + 1}" style="max-width: 100%; max-height: 350px; border-radius: 6px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                </div>`;
        }

        htmlSoal += `<div class="opsi-container">`;
        
        const pilihanJawaban = soal.pilihan_jawaban || soal.opsi || [];
        const idSoal = soal.id_soal || (index + 1);

        pilihanJawaban.forEach((opsi, i) => {
            let nilaiOpsi = String.fromCharCode(65 + i);
            
            const adaArabOpsi = /[\u0600-\u06FF]/.test(opsi);
            const kelasOpsi = adaArabOpsi ? "teks-arab font-khusus-arab" : "";

            htmlSoal += `
                <div class="opsi">
                    <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; width: 100%;">
                        <input type="radio" name="soal_${idSoal}" value="${nilaiOpsi}" style="margin-top: 3px;"> 
                        <span class="${kelasOpsi}"><strong>${nilaiOpsi}.</strong> ${opsi}</span>
                    </label>
                </div>`;
        });
        htmlSoal += `</div></div>`;
    });

    const elemLembarSoal = document.getElementById('lembar-soal');
    if (elemLembarSoal) {
        elemLembarSoal.innerHTML = htmlSoal;
    }
}

// AUTOSAVE & HIGHLIGHT PILIHAN JAWABAN
function initAutosave() {
    const radioInputs = document.querySelectorAll('input[type="radio"]');

    radioInputs.forEach(input => {
        let savedValue = sessionStorage.getItem(input.name);
        
        // Restore jawaban dari session jika ada
        if (savedValue && input.value === savedValue) {
            input.checked = true;
            let parentOpsi = input.closest('.opsi');
            if (parentOpsi) parentOpsi.classList.add('selected');
        }

        // Listener saat pilihan berubah
        input.addEventListener('change', function() {
            sessionStorage.setItem(this.name, this.value);

            // Bersihkan highlight lama di grup opsi yang sama
            const sameGroup = document.querySelectorAll(`input[name="${this.name}"]`);
            sameGroup.forEach(radio => {
                let p = radio.closest('.opsi');
                if (p) p.classList.remove('selected');
            });

            // Highlight opsi yang baru dipilih
            let parentOpsi = this.closest('.opsi');
            if (parentOpsi) parentOpsi.classList.add('selected');
        });
    });
}

// VALIDASI DAN KONFIRMASI SUBMIT
function sebelumSubmit() {
    if (!bankSoalData) return;

    const daftarSoal = bankSoalData?.bank_soal || bankSoalData?.soal || bankSoalData?.data || (Array.isArray(bankSoalData) ? bankSoalData : []);
    let belumTerjawab = [];
    
    daftarSoal.forEach((soal, index) => {
        const idSoal = soal.id_soal || (index + 1);
        let opsiDipilih = document.querySelector(`input[name="soal_${idSoal}"]:checked`);
        if (!opsiDipilih) {
            belumTerjawab.push(index + 1);
        }
    });

    if (belumTerjawab.length > 0) {
        alert("Ada soal yang belum dijawab!\n\nSilakan periksa nomor: " + belumTerjawab.join(', '));
        return;
    }

    showCustomConfirm("Apakah Anda yakin ingin mengumpulkan seluruh jawaban ujian?", function() {
        selesaiUjian();
    });
}

// KALKULASI SKOR & SUBMIT JAWABAN
function selesaiUjian() {
    if (!bankSoalData) return;

    const daftarSoal = bankSoalData?.bank_soal || bankSoalData?.soal || bankSoalData?.data || (Array.isArray(bankSoalData) ? bankSoalData : []);
    let totalSoal = daftarSoal.length;
    let jumlahBenar = 0;
    let jumlahSalah = 0;

    daftarSoal.forEach((soal, index) => {
        const idSoal = soal.id_soal || (index + 1);
        let opsiDipilih = document.querySelector(`input[name="soal_${idSoal}"]:checked`);
        
        // Ambil kunci jawaban fleksibel (Object key, 1-indexed, atau 0-indexed)
        let kunciJawaban = undefined;
        if (bankSoalData.kunci_jawaban_rahasia) {
            kunciJawaban = bankSoalData.kunci_jawaban_rahasia[idSoal] 
                        || bankSoalData.kunci_jawaban_rahasia[String(idSoal)]
                        || bankSoalData.kunci_jawaban_rahasia[index];
        }

        if (opsiDipilih && kunciJawaban && String(opsiDipilih.value).trim().toUpperCase() === String(kunciJawaban).trim().toUpperCase()) {
            jumlahBenar++;
        } else {
            jumlahSalah++;
        }
    });

    let skorAkhir = totalSoal > 0 ? ((jumlahBenar / totalSoal) * 100).toFixed(2) : "0.00";
    let rekapJawaban = kumpulkanJawaban(daftarSoal);

    let namaSiswa = sessionStorage.getItem('cbt_siswa') || sessionStorage.getItem('cbt_siswa_aktif') || "Siswa Ujian";
    let kelasSiswa = sessionStorage.getItem('cbt_kelas') || "-";
    let mapelSiswa = sessionStorage.getItem('cbt_mapel') || "-";

    simpanKeSpreadsheet(
        namaSiswa,
        kelasSiswa,
        mapelSiswa,
        skorAkhir,
        jumlahBenar,
        jumlahSalah,
        rekapJawaban
    );
}

function kumpulkanJawaban(daftarSoal) {
    let jawaban = [];
    daftarSoal.forEach((soal, index) => {
        const idSoal = soal.id_soal || (index + 1);
        const inputDipilih = document.querySelector(`input[name="soal_${idSoal}"]:checked`);
        jawaban.push(inputDipilih ? inputDipilih.value : "-");
    });
    return jawaban;
}

// KIRIM DATA KE DATABASE SPREADSHEET (Penanganan Akurat Error Kirim)
async function simpanKeSpreadsheet(nama, kelas, mapel, skor, benar, salah, arrayJawaban) {
    const btnSubmit = document.querySelector('button[onclick="sebelumSubmit()"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "⏳ Sedang Mengirim Jawaban...";
        btnSubmit.style.background = "#94a3b8";
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
        
        if (res && res.status === "error") {
            throw new Error(res.message || "Database menolak menyimpan data.");
        }

        // Matikan proteksi refresh/close
        window.onbeforeunload = null;

        // Hentikan timer
        if (timerInterval) clearInterval(timerInterval);

        // Tampilkan modal selesai
        const popupModal = document.getElementById('popupModal');
        if (popupModal) {
            popupModal.style.display = 'flex';
        } else {
            alert("✅ Jawaban Anda telah berhasil dikumpulkan!");
            keluarKeLogin();
        }

    } catch (err) {
        console.error("Gagal mengirim jawaban:", err);
        alert("❌ GAGAL MENGIRIM JAWABAN!\n\nDetail Error: " + (err.message || "Masalah Koneksi Server"));
        
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = "Coba Kumpulkan Lagi";
            btnSubmit.style.background = "#007bff";
        }
    }
}

// HANDLER MODAL ALERT KUSTOM
window.alert = function(message) {
    const title = document.getElementById('customAlertTitle');
    const msg = document.getElementById('customAlertMessage');
    const btnCancel = document.getElementById('customAlertBtnCancel');
    const btnOk = document.getElementById('customAlertBtnOk');
    const modal = document.getElementById('customAlertModal');

    if (title && msg && modal) {
        title.innerText = 'Informasi Ujian';
        msg.innerText = message;
        if (btnCancel) btnCancel.style.display = 'none';
        if (btnOk) {
            btnOk.innerText = 'OK';
            btnOk.onclick = function() { tutupCustomAlert(); };
        }
        modal.style.display = 'flex';
    } else {
        nativeAlert(message);
    }
};

// HANDLER MODAL CONFIRM KUSTOM
function showCustomConfirm(message, onConfirmCallback) {
    const title = document.getElementById('customAlertTitle');
    const msg = document.getElementById('customAlertMessage');
    const btnCancel = document.getElementById('customAlertBtnCancel');
    const btnOk = document.getElementById('customAlertBtnOk');
    const modal = document.getElementById('customAlertModal');

    if (title && msg && modal) {
        title.innerText = 'Konfirmasi Pengumpulan';
        msg.innerText = message;
        if (btnCancel) btnCancel.style.display = 'inline-block';
        if (btnOk) {
            btnOk.innerText = 'Ya, Kumpulkan';
            btnOk.onclick = function() {
                tutupCustomAlert();
                if (typeof onConfirmCallback === 'function') onConfirmCallback();
            };
        }
        if (btnCancel) {
            btnCancel.onclick = function() { tutupCustomAlert(); };
        }
        modal.style.display = 'flex';
    } else {
        if (nativeConfirm(message)) {
            if (typeof onConfirmCallback === 'function') onConfirmCallback();
        }
    }
}

function tutupCustomAlert() {
    const modal = document.getElementById('customAlertModal');
    if (modal) modal.style.display = 'none';
}

function keluarKeLogin() {
    window.onbeforeunload = null;
    sessionStorage.clear();
    window.location.href = 'index.html';
}
