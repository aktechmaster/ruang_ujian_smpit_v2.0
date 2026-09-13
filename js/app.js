document.addEventListener("DOMContentLoaded", async function() {
    // 1. NONAKTIFKAN Proctor di Login (Proctor hanya untuk ujian.html)
    // Proctor.init() dihapus dari sini agar tidak menghadang navigasi halaman.

    // 2. Inisialisasi Event UI & Tampilkan Nama Ujian Aktif
    UI.initUI();
    if (typeof CONFIG !== 'undefined' && typeof CONFIG.getUjianAktif === 'function') {
        const ujianAktif = CONFIG.getUjianAktif();
        const headerTitle = document.getElementById("examTitle") || document.querySelector(".exam-title");
        if (headerTitle) {
            headerTitle.textContent = ujianAktif.nama;
        }
    }

    const btnSubmit = UI.elements.submitBtn || document.getElementById("btnSubmit");

    // 3. Set status loading pada tombol awal
    UI.setSubmitButtonState(true, "Memuat Sistem...");

    try {
        // 4. Ambil data awal (daftar kelas & mapel) dari Google Sheets
        const data = await API.getInitialData();

        if (!data || !data.kelas || !data.mapel) {
            throw new Error("Format data awal dari server tidak sesuai.");
        }

        // 5. Render tombol Kelas dan hubungkan ke fungsi ambil siswa saat diklik
        UI.populateKelas(data.kelas, handleSelectKelas);

        // 6. Render tombol Mapel
        UI.populateMapel(data.mapel);

        // 7. Kembalikan tombol submit ke status aktif
        UI.setSubmitButtonState(false, "Masuk Ujian");

    } catch (error) {
        console.error("Error Inisialisasi App:", error);
        UI.setSubmitButtonState(false, "⚡ Muat Ulang Sistem");
        if (btnSubmit) {
            btnSubmit.onclick = () => location.reload();
        }
        alert("⚠️ GAGAL MEMUAT DATA KELAS & MAPEL!\n\nDetail Error: " + error.message);
    }

    // 8. Pasang listener saat form/tombol Masuk Ujian diklik
    const form = UI.elements.form || document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    } else if (btnSubmit) {
        btnSubmit.addEventListener('click', handleFormSubmit);
    }
});

// FUNGSI SAAT KELAS DIKLIK -> MENGAMBIL DAFTAR SISWA DARI SPREADSHEET
async function handleSelectKelas(selectedKelas) {
    try {
        UI.setLoadingSiswa(true, `Memuat data siswa kelas ${selectedKelas}...`);
        
        const siswaList = await API.getSiswaByKelas(selectedKelas);
        
        UI.updateSiswaDatalist(siswaList);
        UI.setLoadingSiswa(false);
    } catch (error) {
        console.error("Error memuat siswa:", error);
        UI.setLoadingSiswa(false, "Gagal memuat daftar siswa");
        alert("❌ Gagal memuat data siswa untuk kelas " + selectedKelas + ".\nDetail: " + error.message);
    }
}

// FUNGSI VERIFIKASI TOKEN & MASUK KE HALAMAN UJIAN
async function handleFormSubmit(e) {
    if (e) e.preventDefault();

    // PERBAIKAN: Utamakan input UI terkini, baru fallback ke sessionStorage
    const kelas = UI.elements.kelasSelect?.value || sessionStorage.getItem('cbt_kelas');
    const siswa = UI.elements.siswaSelect?.value;
    const mapel = UI.elements.mapelSelect?.value || sessionStorage.getItem('cbt_mapel');
    const email = UI.elements.emailInput?.value;
    const tokenInput = UI.elements.tokenInput?.value;

    // Validasi Kelengkapan Isian
    if (!kelas) {
        alert("Silakan pilih Kelas terlebih dahulu!");
        return;
    }
    if (!siswa || siswa.trim() === "") {
        alert("Silakan pilih atau ketik Nama Siswa!");
        return;
    }
    if (!mapel) {
        alert("Silakan pilih Mata Pelajaran terlebih dahulu!");
        return;
    }
    if (!email || email.trim() === "") {
        alert("Silakan isi alamat Email Anda!");
        return;
    }
    if (!tokenInput || tokenInput.trim() === "") {
        alert("Silakan masukkan Token / Password Ujian!");
        return;
    }

    // Verifikasi Token
    try {
        UI.setSubmitButtonState(true, "Memvalidasi Token...");

        const tokenData = await API.getTokenByMapel(mapel);
        console.log("Data Token dari Server:", tokenData);

        let tokenResmi = "";

        if (typeof tokenData === 'string') {
            tokenResmi = tokenData;
        } else if (Array.isArray(tokenData)) {
            const item = tokenData[0];
            if (typeof item === 'string') {
                tokenResmi = item;
            } else if (typeof item === 'object' && item !== null) {
                tokenResmi = item.token || item.Token || item.password || item.Password || Object.values(item)[0] || "";
            }
        } else if (typeof tokenData === 'object' && tokenData !== null) {
            tokenResmi = tokenData.token || tokenData.Token || tokenData.password || tokenData.Password || tokenData.data || tokenData.result || "";
        }

        tokenResmi = String(tokenResmi).trim();
        const userToken = String(tokenInput).trim();

        // Pencocokan token (case-insensitive)
        if (tokenResmi !== "" && userToken.toLowerCase() === tokenResmi.toLowerCase()) {
            UI.setSubmitButtonState(true, "Membuka Halaman Ujian...");

            // Simpan ke Session Storage
            sessionStorage.setItem('cbt_kelas', kelas);
            sessionStorage.setItem('cbt_siswa', siswa.trim());
            sessionStorage.setItem('cbt_mapel', mapel);
            sessionStorage.setItem('cbt_email', email.trim());
            
            const jenisUjian = (typeof CONFIG !== 'undefined' && CONFIG.UJIAN_AKTIF) ? CONFIG.UJIAN_AKTIF : 'STS_1';
            sessionStorage.setItem('cbt_jenis_ujian', jenisUjian);

            // Pindah ke Halaman Ujian secara langsung
            window.location.replace('ujian.html');
        } else {
            UI.setSubmitButtonState(false, "Masuk Ujian");
            console.warn(`Token tidak cocok. Input User: "${userToken}", Token Server: "${tokenResmi}"`);
            alert(`❌ TOKEN / PASSWORD UJIAN SALAH!\n\nSilakan tanyakan token yang benar kepada pengawas.`);
        }
    } catch (error) {
        console.error("Error verifikasi token:", error);
        UI.setSubmitButtonState(false, "Masuk Ujian");
        alert("⚠️ GAGAL MEMVALIDASI TOKEN!\nDetail: " + error.message);
    }
}
