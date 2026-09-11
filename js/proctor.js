const Proctor = {
    tabSwitchCount: 0,

    init() {
        if (typeof CONFIG === 'undefined' || !CONFIG.PROCTOR) return;

        // Load hitungan lama dari sessionStorage
        this.tabSwitchCount = parseInt(sessionStorage.getItem('cbt_tab_switches'), 10) || 0;
        this.updateDisplay();

        if (CONFIG.PROCTOR.ENABLE_DISABLE_RIGHT_CLICK) this.disableRightClick();
        if (CONFIG.PROCTOR.ENABLE_DISABLE_DEVTOOLS_KEYS) this.disableDevToolsKeys();
        if (CONFIG.PROCTOR.ENABLE_ANTI_TAB_SWITCH) this.initTabSwitchMonitoring();
        if (CONFIG.PROCTOR.ENABLE_DISABLE_COPY_PASTE) this.disableCopyPaste();
    },

    // Memperbarui teks dan warna status pelanggaran di layar
    updateDisplay() {
        const elem = document.getElementById('infoPelanggaran');
        if (elem) {
            elem.innerText = `Pelanggaran: ${this.tabSwitchCount} kali`;
            if (this.tabSwitchCount > 0) {
                elem.style.color = '#dc2626';
                elem.style.fontWeight = 'bold';
            }
        }
    },

    disableRightClick() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.tampilkanAlert("Peringatan Proctor:\nKlik kanan dilarang selama berada di sistem ujian!");
        });
    },

    disableDevToolsKeys() {
        document.addEventListener('keydown', (e) => {
            const isF12 = e.key === 'F12';
            const isInspectShortcut = e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase());
            const isViewSource = e.ctrlKey && e.key.toUpperCase() === 'U';

            if (isF12 || isInspectShortcut || isViewSource) {
                e.preventDefault();
                this.tampilkanAlert("Peringatan Proctor:\nAkses Developer Tools / Inspeksi Elemen dilarang!");
            }
        });
    },

    disableCopyPaste() {
        ['copy', 'cut', 'paste', 'selectstart'].forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                const tag = e.target.tagName;
                // Tetap izinkan salin-tempel jika siswa mengetik di kolom input/textarea biasa
                if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                    e.preventDefault();
                }
            });
        });
    },

    initTabSwitchMonitoring() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) return;

            this.tabSwitchCount++;
            sessionStorage.setItem('cbt_tab_switches', this.tabSwitchCount);
            this.updateDisplay();

            const max = CONFIG.PROCTOR?.MAX_TAB_SWITCH_WARNINGS || 3;

            if (this.tabSwitchCount >= max) {
                this.tampilkanAlert(`PERINGATAN KERAS PROCTOR!\nAnda telah meninggalkan halaman ujian sebanyak ${this.tabSwitchCount} kali.\nTindakan ini dicatat sebagai pelanggaran berat!`);
                
                // Otomatis kumpulkan jawaban jika opsi aktif di CONFIG
                if (CONFIG.PROCTOR.AUTO_SUBMIT_ON_MAX_VIOLATION && typeof selesaiUjian === 'function') {
                    selesaiUjian();
                }
            } else {
                this.tampilkanAlert(`PERINGATAN PROCTOR (${this.tabSwitchCount}/${max}):\nDilarang berpindah tab atau membuka aplikasi lain!`);
            }
        });
    },

    tampilkanAlert(pesan) {
        if (typeof UI !== 'undefined' && typeof UI.showAlert === 'function') {
            UI.showAlert(pesan);
        } else {
            alert(pesan);
        }
    }
};
