let masterBankSoal = [];
let bankSoalData = [];   
let timerInterval = null;

const nativeAlert = window.alert;
const nativeConfirm = window.confirm;

// FUNGSI KONVERSI OTOMATIS TEKS MATEMATIKA KE MATHJAX LATEX
function formatMathTeX(text) {
    if (!text || typeof text !== 'string') return text || '';

    const supMap = { '⁰':'0', '¹':'1', '²':'2', '³':'3', '⁴':'4', '⁵':'5', '⁶':'6', '⁷':'7', '⁸':'8', '⁹':'9' };

    // 1. Ubah format ¹²√12¹¹ menjadi \(\sqrt[12]{12^{11}}\)
    text = text.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)√(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)/g, function(match, degSup, base, expSup) {
        let degree = degSup.split('').map(function(c) { return supMap[c] || c; }).join('');
        let exp = expSup ? expSup.split('').map(function(c) { return supMap[c] || c; }).join('') : '';
        if (exp) {
            return '\\(\\sqrt[' + degree + ']{' + base + '^{' + exp + '}}\\)';
        } else {
            return '\\(\\sqrt[' + degree + ']{' + base + '}\\)';
        }
    });

    // 2. Ubah format pecahan eksponen 12^(2/3) menjadi \(12^{\frac{2}{3}}\)
    text = text.replace(/(\d+|\w+)\^\((\d+)\/(\d+)\)/g, function(match, base, num, den) {
        return '\\(' + base + '^{\\frac{' + num + '}{' + den + '}}\\)';
    });

    return text;
}

function triggerMathJax() {
    try {
        if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
            const promise = window.MathJax.typesetPromise();
            if (promise && typeof promise.then === 'function') {
                promise.catch(err => console.warn("MathJax error:", err));
            }
        }
    } catch (error) {
        console.warn("MathJax belum siap saat render soal:", error);
    }
}

document.addEventListener("DOMContentLoaded", async function() {
    if (typeof Proctor !== 'undefined' && typeof Proctor.init === 'function') {
        Proctor.init();
    }

    let kelasSiswa = sessionStorage.getItem('cbt_kelas');
    let mapelUjian = sessionStorage.getItem('cbt_mapel');
    let namaSiswa = sessionStorage.getItem('cbt_siswa') || "Siswa Ujian";
    let emailSiswa = sessionStorage.getItem('cbt_email') || "Tidak ada email";

    if (!kelasSiswa || !mapelUjian) {
        kelasSiswa = "9 Al-Quran";
        mapelUjian = "MTK";
    }

    let siswaTerakhir = sessionStorage.getItem('cbt_siswa_aktif');
    let mapelTerakhir = sessionStorage.getItem('cbt_mapel_aktif');

    if (siswaTerakhir !== namaSiswa || mapelTerakhir !== mapelUjian) {
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('soal_') || key.startsWith('cbt_soal_order') || key === 'exam_end_time' || key === 'exam_start_time') {
                sessionStorage.removeItem(key);
            }
        });
        sessionStorage.setItem('cbt_siswa_aktif', namaSiswa);
        sessionStorage.setItem('cbt_mapel_aktif', mapelUjian);
        sessionStorage.setItem('exam_start_time', Date.now());
    }

    const elemEmail = document.getElementById('infoEmail');
    if (elemEmail) elemEmail.innerText = emailSiswa;

    const elemNama = document.getElementById('infoNama');
    if (elemNama) elemNama.innerText = namaSiswa;

    const elemKelas = document.getElementById('infoKelas');
    if (elemKelas) elemKelas.innerText = kelasSiswa;

    const tingkatKelas = kelasSiswa.charAt(0);

    try {
        const data = await API.fetchSoal(tingkatKelas, mapelUjian);
        let rawSoal = data?.bank_soal || data?.soal || data?.data || (Array.isArray(data) ? data : []);

        if (!rawSoal || rawSoal.length === 0) {
            throw new Error(`Berkas soal untuk kelas '${tingkatKelas}' mapel '${mapelUjian}' tidak ditemukan atau kosong.`);
        }

        masterBankSoal = rawSoal.map((s, idx) => ({
            ...s,
            id_soal: s.id_soal !== undefined ? s.id_soal : (idx + 1)
        }));

        let daftarSoalAcak = [...masterBankSoal];

        if (typeof Shuffle !== 'undefined' && typeof Shuffle.soal === 'function') {
            let orderKey = `cbt_soal_order_${mapelUjian}`;
            let savedOrder = sessionStorage.getItem(orderKey);

            if (!savedOrder) {
                daftarSoalAcak = Shuffle.soal(daftarSoalAcak);
                let orderIds = daftarSoalAcak.map(s => s.id_soal);
                sessionStorage.setItem(orderKey, JSON.stringify(orderIds));
            } else {
                try {
                    let orderIds = JSON.parse(savedOrder);
                    let soalMap = new Map(masterBankSoal.map(s => [s.id_soal, s]));
                    let orderedSoal = orderIds.map(id => soalMap.get(id)).filter(Boolean);

                    if (orderedSoal.length === masterBankSoal.length) {
                        daftarSoalAcak = orderedSoal;
                    } else {
                        daftarSoalAcak = Shuffle.soal(daftarSoalAcak);
                    }
                } catch (e) {
                    daftarSoalAcak = Shuffle.soal(daftarSoalAcak);
                }
            }
        }

        bankSoalData = daftarSoalAcak;

        const elemJudul = document.getElementById('judulMapel');
        if (elemJudul) {
            const namaUjian = (typeof CONFIG !== 'undefined' && typeof CONFIG.getUjianAktif === 'function')
                ? CONFIG.getUjianAktif().nama
                : "Sumatif Tengah Semester";
            const namaMapel = data.metadata?.mata_pelajaran || mapelUjian;
            elemJudul.innerText = `${namaUjian} | ${namaMapel}`;
        }

        initTimer(data, mapelUjian);
        renderSoal(bankSoalData);

        if (typeof StorageManager !== 'undefined' && typeof StorageManager.initAutosave === 'function') {
            StorageManager.initAutosave();
        }

    } catch (error) {
        const lembarSoal = document.getElementById('lembar-soal');
        if (lembarSoal) {
            lembarSoal.innerHTML = `
                <div style='background:#fee2e2; border:1px solid #f87171; color:#991b1b; padding:20px; border-radius:8px; margin:20px 0;'>
                    <h3 style="margin-top:0;">⚠️ Gagal Memuat Soal Ujian</h3>
                    <p><b>Detail Error:</b> ${error.message}</p>
                </div>`;
        }
        console.error("Error memuat soal:", error);
    }
});

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

function renderSoal(daftarSoal) {
    let htmlSoal = "";
    daftarSoal.forEach((soal, index) => {
        htmlSoal += `<div class="soal-box">`;
        
        let teksPertanyaan = soal.teks_pertanyaan || soal.pertanyaan || "";
        let bagianTeks = teksPertanyaan.split('\n\n');
        let teksPertanyaanBersih = "";

        if (bagianTeks.length > 1) {
            let bacaan = bagianTeks[0];
            bacaan = bacaan.replace(/ • /g, "\n• "); 
            bacaan = bacaan.replace(/ (\d+\.) /g, "\n$1 "); 

            const adaArabBacaan = /[\u0600-\u06FF]/.test(bacaan);
            const kelasBacaan = adaArabBacaan ? "teks-arab font-khusus-arab" : "";

            htmlSoal += `<div class="bacaan ${kelasBacaan}">${formatMathTeX(bacaan.trim())}</div>`;
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
                <span class="${kelasPertanyaan}">${formatMathTeX(teksPertanyaanBersih)}</span>
            </div>`;
        
        // MENAMPILKAN GAMBAR JIKA ADA DI JSON
        if (soal.gambar) {
            htmlSoal += `
                <div class="gambar-soal" style="margin: 10px 0; text-align: center;">
                    <img src="${soal.gambar}" alt="Gambar Soal ${index + 1}" style="max-width: 100%; max-height: 350px; border-radius: 8px; border: 1px solid #ddd; padding: 4px;">
                </div>`;
        }

        htmlSoal += `<div class="opsi-container">`;
        
        const idSoal = soal.id_soal;
        const tipe = soal.tipe_soal || "PG"; 

        if (tipe === "PG" || tipe === "PGK") {
            const pilihanJawaban = soal.pilihan_jawaban || soal.opsi || [];
            const inputType = tipe === "PG" ? "radio" : "checkbox";
            pilihanJawaban.forEach((opsi, i) => {
                let nilaiOpsi = String.fromCharCode(65 + i);
                const adaArabOpsi = /[\u0600-\u06FF]/.test(opsi);
                const kelasOpsi = adaArabOpsi ? "teks-arab font-khusus-arab" : "";

                htmlSoal += `
                    <div class="opsi">
                        <label>
                            <input type="${inputType}" name="soal_${idSoal}" value="${nilaiOpsi}"> 
                            <span class="${kelasOpsi}">${formatMathTeX(opsi)}</span>
                        </label>
                    </div>`;
            });
        } 
        else if (tipe === "BS") {
            const daftarPernyataan = soal.pernyataan || [];
            htmlSoal += `<div class="container-bs" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">`;
            
            daftarPernyataan.forEach((itemPernyataan, subIndex) => {
                const adaArabPernyataan = /[\u0600-\u06FF]/.test(itemPernyataan);
                const kelasPernyataanBs = adaArabPernyataan ? "teks-arab font-khusus-arab" : "";

                htmlSoal += `
                    <div class="item-bs" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding-bottom: 8px;">
                        <div class="teks-pernyataan ${kelasPernyataanBs}" style="flex: 1; padding-right: 15px;">
                            ${formatMathTeX(itemPernyataan)}
                        </div>
                        <div class="pilihan-bs" style="display: flex; gap: 15px; flex-shrink: 0;">
                            <label style="cursor: pointer;">
                                <input type="radio" name="soal_${idSoal}_bs_${subIndex}" value="B"> Benar (B)
                            </label>
                            <label style="cursor: pointer;">
                                <input type="radio" name="soal_${idSoal}_bs_${subIndex}" value="S"> Salah (S)
                            </label>
                        </div>
                    </div>`;
            });
            htmlSoal += `</div>`;
        }

        htmlSoal += `</div></div>`;
    });

    const elemLembarSoal = document.getElementById('lembar-soal');
    if (elemLembarSoal) {
        elemLembarSoal.innerHTML = htmlSoal;
    }

    triggerMathJax();
}

function sebelumSubmit() {
    if (!bankSoalData || bankSoalData.length === 0) return;

    let belumTerjawab = [];
    bankSoalData.forEach((soal, index) => {
        const idSoal = soal.id_soal;
        const tipe = soal.tipe_soal || "PG";
        let terisi = false;

        if (tipe === "PG") {
            terisi = document.querySelector(`input[name="soal_${idSoal}"]:checked`) !== null || sessionStorage.getItem(`soal_${idSoal}`) !== null;
        } else if (tipe === "PGK") {
            terisi = document.querySelectorAll(`input[name="soal_${idSoal}"]:checked`).length > 0 || sessionStorage.getItem(`soal_${idSoal}`) !== null;
        } else if (tipe === "BS") {
            const totalBs = soal.pernyataan ? soal.pernyataan.length : 0;
            let countBs = 0;
            for (let i = 0; i < totalBs; i++) {
                if (document.querySelector(`input[name="soal_${idSoal}_bs_${i}"]:checked`) || sessionStorage.getItem(`soal_${idSoal}_bs_${i}`)) {
                    countBs++;
                }
            }
            terisi = (countBs === totalBs);
        }

        if (!terisi) {
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
    if (!masterBankSoal || masterBankSoal.length === 0) return;

    let rekapJawabanMaster = StorageManager.kumpulkanJawaban(masterBankSoal);
    const hasilSkor = Scoring.hitung(masterBankSoal, rekapJawabanMaster);

    StorageManager.simpanKeSpreadsheet(
        sessionStorage.getItem('cbt_siswa'),
        sessionStorage.getItem('cbt_kelas'),
        sessionStorage.getItem('cbt_mapel'),
        hasilSkor.skor,
        hasilSkor.benar,
        hasilSkor.salah,
        rekapJawabanMaster
    );
}

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
