let bankSoalData = null;
let timerInterval = null;

// Backup alert dan confirm asli untuk menghindari Infinite Loop
const nativeAlert = window.alert;
const nativeConfirm = window.confirm;

document.addEventListener("DOMContentLoaded", async function() {
    // 1. Inisialisasi Fitur Pengawasan
    if (typeof Proctor !== 'undefined' && typeof Proctor.init === 'function') {
        Proctor.init();
    }

    // 2. Ambil Data Session
    let kelasSiswa = sessionStorage.getItem('cbt_kelas');
    let mapelUjian = sessionStorage.getItem('cbt_mapel');
    let namaSiswa = sessionStorage.getItem('cbt_siswa') || "Siswa Ujian";
    let emailSiswa = sessionStorage.getItem('cbt_email') || "Tidak ada email";

    if (!kelasSiswa || !mapelUjian) {
        kelasSiswa = "9 Al-Quran";
        mapelUjian = "MTK";
    }

    // Deteksi Pergantian Siswa / Mapel
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

    const elemEmail = document.getElementById('infoEmail');
    if (elemEmail) elemEmail.innerText = emailSiswa;

    const tingkatKelas = kelasSiswa.charAt(0);

    // 3. Load Soal dari Server/JSON
    try {
        const data = await API.fetchSoal(tingkatKelas, mapelUjian);
        bankSoalData = data;

        // Ekstraksi bank_soal secara fleksibel
        const daftarSoal = data?.bank_soal || data?.soal || data?.data || (Array.isArray(data) ? data : []);

        if (!daftarSoal || daftarSoal.length === 0) {
            throw new Error(`Berkas soal untuk kelas '${tingkatKelas}' mapel '${mapelUjian}' tidak ditemukan atau kosong.`);
        }

        // Tampilkan nama ujian aktif secara dinamis dari CONFIG
        const elemJudul = document.getElementById('judulMapel');
        if (elemJudul) {
            const namaUjian = (typeof CONFIG !== 'undefined' && typeof CONFIG.getUjianAktif === 'function')
                ? CONFIG.getUjianAktif().nama
                : "Sumatif Tengah Semester";
            const namaMapel = data.metadata?.mata_pelajaran || mapelUjian;
            elemJudul.innerText = `${namaUjian} | ${namaMapel}`;
        }

        const elemNama = document.getElementById('infoNama');
        if (elemNama) elemNama.innerText = namaSiswa;

        const elemKelas = document.getElementById('infoKelas');
        if (elemKelas) elemKelas.innerText = kelasSiswa;

        // Inisialisasi Timer & Render Soal
        initTimer(data, mapelUjian);
        renderSoal(daftarSoal);

        // Render Formula MathJax jika tersedia
        if (typeof MathJax !== 'undefined' && typeof MathJax.typesetPromise === 'function') {
            MathJax.typesetPromise();
        }

        // Pasang Autosave Jawaban
        initAutosave();

    } catch (error) {
        const lembarSoal = document.getElementById('lembar-soal');
        if (lembarSoal) {
            lembarSoal.innerHTML = `
                <div style='background:#fee2e2; border:1px solid #f87171; color:#991b1b; padding:20px; border-radius:8px; margin:20px 0;'>
                    <h3 style="margin-top:0;">⚠️ Gagal Memuat Soal Ujian</h3>
                    <p><b>Detail Error:</b> ${error.message}</p>
                    <p>Silakan pastikan berkas JSON soal sudah ada di repositori untuk tingkat kelas <b>${tingkatKelas}</b> dan mapel <b>${mapelUjian}</b>.</p>
                </div>`;
        }
        console.error("Error memuat soal:", error);
    }
});

// LOGIKA TIMER (Berbasis Timestamp Akurat)
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
            let jedaAcak = Math.floor(Math.random() * 3000); 
            setTimeout(() => {
                alert("Waktu habis! Ujian akan dikumpulkan otomatis.");
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

// RENDER SOAL (Sudah Dilengkapi Penanganan Gambar Otomatis)
function renderSoal(daftarSoal) {
    let htmlSoal = "";
    
    // Ambil data jenis ujian, mapel, dan kelas untuk menentukan jalur folder gambar
    const jenisUjian = (typeof CONFIG !== 'undefined' && CONFIG.UJIAN_AKTIF) ? CONFIG.UJIAN_AKTIF : 'STS_1';
    const mapelAktif = (sessionStorage.getItem('cbt_mapel') || 'MTK').toUpperCase();
    const kelasSiswa = sessionStorage.getItem('cbt_kelas') || '9';
    const tingkatKelas = kelasSiswa.charAt(0);

    daftarSoal.forEach((soal, index) => {
        htmlSoal += `<div class="soal-box">`;
        
        let teksPertanyaan = soal.teks_pertanyaan || soal.pertanyaan || "";
        
        // JIKA GAMBAR DITULIS LANGSUNG DALAM TEKS PERTANYAAN (Tag <img src="...">)
        // Otomatis ubah path lama (misal: src="images_MTK_9/10.png") menjadi path baru (src="./Images/STS_1/images_MTK_9/10.png")
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
                <span style="font-weight:bold;">${index + 1}.</span>
                <span class="${kelasPertanyaan}">${teksPertanyaanBersih}</span>
            </div>`;
        
        // --- FITUR GAMBAR DARI PROPERTI JSON (misal: "gambar": "10.png" atau "images_MTK_9/10.png") ---
        if (soal.gambar && soal.gambar.trim() !== "") {
            let srcGambarLengkap = "";

            if (soal.gambar.startsWith("images_") || soal.gambar.startsWith("Images_")) {
                // Jika di JSON diisi: "images_MTK_9/10.png"
                srcGambarLengkap = `./Images/${jenisUjian}/${soal.gambar}`;
            } else if (soal.gambar.includes("/")) {
                // Jika di JSON sudah ada subfolder lain
                srcGambarLengkap = `./Images/${jenisUjian}/${soal.gambar}`;
            } else {
                // Jika di JSON HANYA nama file: "10.png" -> Otomatis susun folder
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
                    <label>
                        <input type="radio" name="soal_${idSoal}" value="${nilaiOpsi}"> 
                        <span class="${kelasOpsi}">${opsi}</span>
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

// AUTOSAVE JAWABAN
function initAutosave() {
    document.querySelectorAll('input[type="radio"]').forEach(input => {
        let savedValue = sessionStorage.getItem(input.name);
        if (savedValue && input.value === savedValue) {
            input.checked = true;
        }

        input.addEventListener('change', function() {
            sessionStorage.setItem(this.name, this.value);
        });
    });
}

// VALIDASI DAN SUBMIT JAWABAN
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
        alert("Ada soal yang belum terjawab! Silakan periksa nomor: " + belumTerjawab.join(', '));
        return;
    }

    showCustomConfirm("Apakah Anda yakin ingin mengumpulkan jawaban?", function() {
        selesaiUjian();
    });
}

function selesaiUjian() {
    if (!bankSoalData) return;

    const daftarSoal = bankSoalData?.bank_soal || bankSoalData?.soal || bankSoalData?.data || (Array.isArray(bankSoalData) ? bankSoalData : []);
    let totalSoal = daftarSoal.length;
    let jumlahBenar = 0;
    let jumlahSalah = 0;

    daftarSoal.forEach((soal, index) => {
        const idSoal = soal.id_soal || (index + 1);
        let opsiDipilih = document.querySelector(`input[name="soal_${idSoal}"]:checked`);
        let kunciJawaban = bankSoalData.kunci_jawaban_rahasia ? bankSoalData.kunci_jawaban_rahasia[idSoal] : undefined;

        if (opsiDipilih && kunciJawaban && String(opsiDipilih.value).toUpperCase() === String(kunciJawaban).toUpperCase()) {
            jumlahBenar++;
        } else {
            jumlahSalah++;
        }
    });

    let skorAkhir = totalSoal > 0 ? ((jumlahBenar / totalSoal) * 100).toFixed(2) : "0.00";
    let rekapJawaban = kumpulkanJawaban(daftarSoal);

    simpanKeSpreadsheet(
        sessionStorage.getItem('cbt_siswa'),
        sessionStorage.getItem('cbt_kelas'),
        sessionStorage.getItem('cbt_mapel'),
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

async function simpanKeSpreadsheet(nama, kelas, mapel, skor, benar, salah, arrayJawaban) {
    const btnSubmit = document.querySelector('button[onclick="sebelumSubmit()"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "⏳ Sedang Mengirim Jawaban... Mohon Tunggu";
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

// Handler Alert Kustom
window.alert = function(message) {
    const title = document.getElementById('customAlertTitle');
    const msg = document.getElementById('customAlertMessage');
    const btnCancel = document.getElementById('customAlertBtnCancel');
    const btnOk = document.getElementById('customAlertBtnOk');
    const modal = document.getElementById('customAlertModal');

    if (title && msg && modal) {
        title.innerText = 'Informasi';
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

// Custom Confirm Helper (Khusus untuk panggilan async modal)
function showCustomConfirm(message, onConfirmCallback) {
    const title = document.getElementById('customAlertTitle');
    const msg = document.getElementById('customAlertMessage');
    const btnCancel = document.getElementById('customAlertBtnCancel');
    const btnOk = document.getElementById('customAlertBtnOk');
    const modal = document.getElementById('customAlertModal');

    if (title && msg && modal) {
        title.innerText = 'Konfirmasi';
        msg.innerText = message;
        if (btnCancel) btnCancel.style.display = 'inline-block';
        if (btnOk) {
            btnOk.innerText = 'Ya';
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
    sessionStorage.clear();
    window.location.href = 'index.html';
}
