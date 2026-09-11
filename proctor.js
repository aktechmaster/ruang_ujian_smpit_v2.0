const Proctor = {
    tabSwitchCount: 0,

    init() {
        if (typeof CONFIG === 'undefined' || !CONFIG.PROCTOR) return;

        // Load hitungan lama dari sessionStorage
        this.tabSwitchCount = parseInt(sessionStorage.getItem('cbt_tab_switches')) || 0;
        this.updateDisplay(); // Tampilkan hitungan awal di layar

        if (CONFIG.PROCTOR.ENABLE_DISABLE_RIGHT_CLICK) this.disableRightClick();
        if (CONFIG.PROCTOR.ENABLE_DISABLE_DEVTOOLS_KEYS) this.disableDevToolsKeys();
        if (CONFIG.PROCTOR.ENABLE_ANTI_TAB_SWITCH) this.initTabSwitchMonitoring();
    },

    // Fungsi memperbarui teks pelanggaran di layar
    updateDisplay() {
        const elem = document.getElementById('infoPelanggaran');
        if (elem) {
            elem.innerText = `Pelanggaran: ${this.tabSwitchCount} kali`;
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

    initTabSwitchMonitoring() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.tabSwitchCount++;
                sessionStorage.setItem('cbt_tab_switches', this.tabSwitchCount);
                
                // Update tampilan angka di layar
                this.updateDisplay();

                const max = (CONFIG.PROCTOR && CONFIG.PROCTOR.MAX_TAB_SWITCH_WARNINGS) || 3;
                
                if (this.tabSwitchCount >= max) {
                    this.tampilkanAlert(`PERINGATAN KERAS PROCTOR!\nAnda telah meninggalkan halaman ujian sebanyak ${this.tabSwitchCount} kali.\nTindakan ini dicatat sebagai pelanggaran!`);
                } else {
                    this.tampilkanAlert(`PERINGATAN PROCTOR (${this.tabSwitchCount}/${max}):\nDilarang berpindah tab atau membuka aplikasi lain!`);
                }
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
