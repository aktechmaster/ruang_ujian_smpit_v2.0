/**
 * PROCTORING ENGINE - Sistem Proteksi & Keamanan Ujian CBT
 */
const Proctor = {
    tabSwitchCount: 0,
    lastViolationTime: 0,
    isBlocked: false,
    pressTimer: null,

    // Konfigurasi Default (Bisa ditimpa oleh objek CONFIG global jika ada)
    getConfig() {
        return {
            maxViolations: (typeof CONFIG !== 'undefined' && CONFIG.PROCTOR?.MAX_TAB_SWITCH_WARNINGS) || 5,
            passwordReset: (typeof CONFIG !== 'undefined' && CONFIG.PROCTOR?.PASSWORD_RESET) || "12345",
            autoSubmit: (typeof CONFIG !== 'undefined' && CONFIG.PROCTOR?.AUTO_SUBMIT_ON_MAX_VIOLATION) ?? true,
            enableRightClick: (typeof CONFIG !== 'undefined' && CONFIG.PROCTOR?.ENABLE_DISABLE_RIGHT_CLICK) ?? true,
            enableDevTools: (typeof CONFIG !== 'undefined' && CONFIG.PROCTOR?.ENABLE_DISABLE_DEVTOOLS_KEYS) ?? true,
            enableAntiTab: (typeof CONFIG !== 'undefined' && CONFIG.PROCTOR?.ENABLE_ANTI_TAB_SWITCH) ?? true,
            enableCopyPaste: (typeof CONFIG !== 'undefined' && CONFIG.PROCTOR?.ENABLE_DISABLE_COPY_PASTE) ?? true
        };
    },

    init() {
        // Load status terblokir & hitungan lama dari sessionStorage
        this.isBlocked = sessionStorage.getItem('cbt_is_blocked') === 'true';
        this.tabSwitchCount = parseInt(sessionStorage.getItem('cbt_tab_switches'), 10) || 0;
        
        this.updateDisplay();

        if (this.isBlocked) {
            this.blockExam();
            return;
        }

        const config = this.getConfig();

        if (config.enableRightClick) this.disableRightClick();
        if (config.enableDevTools) this.disableDevToolsKeys();
        if (config.enableCopyPaste) this.disableCopyPaste();
        if (config.enableAntiTab) this.initTabSwitchMonitoring();
        
        this.initAdminReset();
    },

    // Memperbarui teks dan warna status pelanggaran di layar
    updateDisplay() {
        // Update elemen info sederhana
        const elemInfo = document.getElementById('infoPelanggaran');
        if (elemInfo) {
            elemInfo.innerText = `Pelanggaran: ${this.tabSwitchCount} kali`;
            if (this.tabSwitchCount > 0) {
                elemInfo.style.color = '#dc2626';
                elemInfo.style.fontWeight = 'bold';
            }
        }

        // Update elemen penghitung spesifik
        const elemCount = document.getElementById('violationCount');
        if (elemCount) {
            elemCount.textContent = this.tabSwitchCount;
        }
    },

    // Pencatat Pelanggaran Utama (Dengan Guard Clause & Debounce)
    catatPelanggaran() {
        const modalPeringatan = document.getElementById('customPeringatan');
        const isModalOpen = modalPeringatan && modalPeringatan.style.display === 'flex';
        const isQuizActive = document.getElementById('quizArea')?.style.display !== 'none';

        // Guard Clause: Jangan catat jika ujian selesai, terblokir, modal terbuka, atau tidak di area ujian
        if (sessionStorage.getItem('ujianSelesai') === 'true' || window.isConfirming || this.isBlocked || isModalOpen || !isQuizActive) {
            return;
        }

        // Debounce: Jeda 2 detik untuk cegah double-count pada mobile browser
        const now = Date.now();
        if (now - this.lastViolationTime < 2000) return;
        this.lastViolationTime = now;

        this.tabSwitchCount++;
        sessionStorage.setItem('cbt_tab_switches', this.tabSwitchCount);
        this.updateDisplay();

        if (typeof simpanDataKeStorage === 'function') {
            simpanDataKeStorage();
        }

        const config = this.getConfig();
        if (this.tabSwitchCount >= config.maxViolations) {
            if (config.autoSubmit && typeof selesaiUjian === 'function') {
                selesaiUjian();
            }
            this.blockExam();
        } else {
            const sisa = config.maxViolations - this.tabSwitchCount;
            this.tampilkanAlert(`Kamu terdeteksi meninggalkan layar ujian sebanyak <span class="peringatan-angka">${this.tabSwitchCount} KALI</span>.<br>Sisa kesempatan: <b>${sisa} kali</b>.<br><br>Aktivitas ini dicatat oleh sistem. Harap tetap fokus!`);
        }
    },

    initTabSwitchMonitoring() {
        // 1. Visibilitas Layar / Pindah Tab
        document.addEventListener('visibilitychange', () => {
            if (document.hidden || document.visibilityState === 'hidden') {
                this.catatPelanggaran();
            }
        });

        // 2. Kehilangan Fokus Windows / Blur
        window.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.activeElement !== document.body) {
                    const customAlert = document.getElementById('customPeringatan');
                    if (customAlert && !customAlert.contains(document.activeElement)) {
                        this.catatPelanggaran();
                    }
                }
            }, 150);
        });
    },

    disableRightClick() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.tampilkanAlert("<b>Peringatan Proctor:</b><br>Klik kanan dilarang selama berada di sistem ujian!");
        });
    },

    disableDevToolsKeys() {
        document.addEventListener('keydown', (e) => {
            const isF12 = e.keyCode === 123 || e.key === 'F12';
            const isInspectShortcut = e.ctrlKey && e.shiftKey && [73, 74, 67, 85].includes(e.keyCode);
            const isViewSource = e.ctrlKey && (e.keyCode === 85 || e.key.toUpperCase() === 'U');

            if (isF12 || isInspectShortcut || isViewSource) {
                e.preventDefault();
                this.tampilkanAlert("<b>Peringatan Proctor:</b><br>Akses Developer Tools / Inspeksi Elemen dilarang!");
                return false;
            }
        });
    },

    disableCopyPaste() {
        ['copy', 'cut', 'paste', 'selectstart'].forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                const tag = e.target.tagName;
                if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                    e.preventDefault();
                }
            });
        });
    },

    blockExam() {
        this.isBlocked = true;
        sessionStorage.setItem('cbt_is_blocked', 'true');

        this.tutupPeringatan();

        const blockScreen = document.getElementById('blockScreen');
        if (blockScreen) {
            blockScreen.style.display = 'flex';
        } else {
            document.body.innerHTML = "<h1 style='color:red; text-align:center; padding-top:100px;'>AKSES UJIAN DIBLOKIR</h1>";
        }
        document.body.style.overflow = "hidden";

        if (window.timerInterval) clearInterval(window.timerInterval);
    },

    tampilkanAlert(pesan) {
        const modalPeringatan = document.getElementById('customPeringatan');
        const textEl = document.getElementById('peringatanText');

        if (modalPeringatan && textEl) {
            textEl.innerHTML = pesan;
            modalPeringatan.style.display = 'flex';
            
            const box = modalPeringatan.querySelector('.peringatan-box');
            if (box) {
                box.style.animation = 'none';
                void box.offsetWidth;
                box.style.animation = '';
            }
        } else if (typeof UI !== 'undefined' && typeof UI.showAlert === 'function') {
            UI.showAlert(pesan);
        } else {
            alert(pesan.replace(/<[^>]*>?/gm, ''));
        }
    },

    tutupPeringatan() {
        const modalPeringatan = document.getElementById('customPeringatan');
        if (modalPeringatan) {
            modalPeringatan.style.display = 'none';
        }
        this.lastViolationTime = Date.now();
    },

    // Reset Ujian Rahasia (Desktop & Mobile)
    initAdminReset() {
        // Shortcut Desktop: Ctrl + Shift + 9
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && (e.keyCode === 57 || e.key === '(')) {
                e.preventDefault();
                this.verifikasiReset();
            }
        });

        // Trigger Long Press Mobile (Tahan 5 Detik di BlockScreen / Logo)
        const setupLongPress = (elem) => {
            if (!elem) return;
            elem.addEventListener('touchstart', () => {
                this.pressTimer = setTimeout(() => this.verifikasiReset(), 5000);
            }, { passive: true });

            const cancel = () => { if (this.pressTimer) clearTimeout(this.pressTimer); };
            elem.addEventListener('touchend', cancel);
            elem.addEventListener('touchmove', cancel);
        };

        document.addEventListener('DOMContentLoaded', () => {
            setupLongPress(document.getElementById('blockScreen'));
            document.querySelectorAll('img').forEach(setupLongPress);
        });
    },

    verifikasiReset() {
        const pass = prompt("PASSWORD RESET ADMIN:");
        const config = this.getConfig();
        if (pass === config.passwordReset) {
            sessionStorage.clear();
            localStorage.clear();
            alert("Sistem berhasil di-reset!");
            location.reload();
        } else if (pass) {
            alert("Password Salah!");
        }
    }
};

// Fungsi Global untuk Tombol "Saya Mengerti" pada Modal
window.tutupPeringatan = () => Proctor.tutupPeringatan();

// Inisialisasi Otomatis saat DOM Siap
document.addEventListener('DOMContentLoaded', () => Proctor.init());
