const UI = {
    elements: {
        get kelasSelect() { return document.getElementById('pilihKelas'); },
        get siswaSelect() { return document.getElementById('pilihSiswa'); },
        get mapelSelect() { return document.getElementById('pilihMapel'); },
        get loadingText() { return document.getElementById('loadingSiswa'); },
        get form() { return document.getElementById('loginForm'); },
        get submitBtn() { return document.getElementById('btnSubmit'); },
        get tokenInput() { return document.getElementById('tokenUjian'); },
        get toggleToken() { return document.getElementById('toggleToken'); },
        get kelasContainer() { return document.getElementById('kelasContainer'); },
        get mapelContainer() { return document.getElementById('mapelContainer'); },
        get alertModal() { return document.getElementById('exambroAlertModal'); },
        get alertMessage() { return document.getElementById('exambroAlertMessage'); },
        get emailInput() { return document.getElementById('emailSiswa'); },
        // Elemen tambahan untuk menampilkan judul ujian aktif
        get examTitle() { return document.getElementById('examTitle') || document.querySelector('.exam-title'); }
    },

    initUI() {
        // 1. Toggle password/token visibility
        if (this.elements.toggleToken && this.elements.tokenInput) {
            this.elements.toggleToken.addEventListener('click', () => {
                const isPassword = this.elements.tokenInput.getAttribute('type') === 'password';
                this.elements.tokenInput.setAttribute('type', isPassword ? 'text' : 'password');
                this.elements.toggleToken.textContent = isPassword ? '🙈' : '👁️';
            });
        }

        // 2. Override window.alert bawaan browser ke modal custom
        window.alert = (message) => this.showAlert(message);

        // 3. Tampilkan Nama Ujian Aktif di Header jika elemen tersedia
        this.updateExamTitle();
    },

    // Menampilkan nama ujian aktif dari CONFIG
    updateExamTitle() {
        if (typeof CONFIG !== 'undefined' && typeof CONFIG.getUjianAktif === 'function') {
            const ujianAktif = CONFIG.getUjianAktif();
            if (this.elements.examTitle) {
                this.elements.examTitle.textContent = ujianAktif.nama;
            }
        }
    },

    // Fungsi penghubung kompatibilitas app.js
    populateKelas(kelasList, onSelectCallback) {
        this.renderKelasOptions(kelasList, onSelectCallback);
    },

    // Fungsi penghubung kompatibilitas app.js
    populateMapel(mapelList) {
        this.renderMapelOptions(mapelList);
    },

    renderKelasOptions(kelasList, onSelectCallback) {
        const container = this.elements.kelasContainer;
        if (!container) return;

        container.innerHTML = '';
        if (kelasList && kelasList.length > 0) {
            kelasList.forEach(kelas => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn-opsi';
                btn.textContent = kelas;
                
                btn.onclick = () => {
                    document.querySelectorAll('#kelasContainer .btn-opsi').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    if (this.elements.kelasSelect) this.elements.kelasSelect.value = kelas;
                    sessionStorage.setItem('cbt_kelas', kelas);
                    if (onSelectCallback) onSelectCallback(kelas);
                };
                container.appendChild(btn);
            });
        }
    },

    renderMapelOptions(mapelList) {
        const container = this.elements.mapelContainer;
        if (!container) return;

        container.innerHTML = '';
        if (mapelList && mapelList.length > 0) {
            mapelList.forEach(mapel => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn-opsi';
                btn.textContent = mapel;

                btn.onclick = () => {
                    document.querySelectorAll('#mapelContainer .btn-opsi').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    if (this.elements.mapelSelect) this.elements.mapelSelect.value = mapel;
                    sessionStorage.setItem('cbt_mapel', mapel);
                };
                container.appendChild(btn);
            });
        }
    },

    updateSiswaDatalist(siswaList) {
        const inputSiswa = this.elements.siswaSelect;
        let datalist = document.getElementById('listSiswa');

        // 1. Buat datalist di HTML jika belum ada
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'listSiswa';
            document.body.appendChild(datalist);
        }

        // 2. Hubungkan input ke datalist
        if (inputSiswa) {
            inputSiswa.setAttribute('list', 'listSiswa');
        }

        datalist.innerHTML = '';

        // 3. Ekstraksi fleksibel berbagai format JSON Google Sheets
        let rawArray = [];
        if (Array.isArray(siswaList)) {
            rawArray = siswaList;
        } else if (siswaList && typeof siswaList === 'object') {
            rawArray = siswaList.data || siswaList.siswa || siswaList.result || [];
        }

        const cleanList = [];
        rawArray.forEach(item => {
            if (!item) return;
            
            let nama = '';
            if (typeof item === 'string') {
                nama = item;
            } else if (Array.isArray(item)) {
                nama = item[0]; // Jika format 2D Array [[nama], [nama]]
            } else if (typeof item === 'object') {
                nama = item.nama || item.Nama || item.nama_siswa || item['Nama Siswa'] || Object.values(item)[0];
            }

            // Abaikan judul kolom header ("Nama" / "Nama Siswa")
            if (nama && typeof nama === 'string' && nama.toLowerCase() !== 'nama' && nama.toLowerCase() !== 'nama siswa') {
                cleanList.push(nama.trim());
            }
        });

        // 4. Masukkan nama siswa ke dalam <datalist>
        if (cleanList.length > 0) {
            cleanList.forEach(nama => {
                const option = document.createElement('option');
                option.value = nama;
                datalist.appendChild(option);
            });

            if (inputSiswa) {
                inputSiswa.placeholder = "Ketik nama / pilih dari daftar...";
                inputSiswa.disabled = false;
            }
        } else {
            if (inputSiswa) {
                inputSiswa.placeholder = "Data siswa kosong / tidak ditemukan";
            }
        }
    },

    setLoadingSiswa(isLoading, message = "Memuat data siswa dari server...") {
        if (this.elements.siswaSelect) {
            this.elements.siswaSelect.value = '';
            this.elements.siswaSelect.placeholder = message;
            this.elements.siswaSelect.disabled = isLoading;
        }
        if (this.elements.loadingText) {
            this.elements.loadingText.style.display = isLoading ? 'block' : 'none';
        }
    },

    setSubmitButtonState(disabled, text) {
        if (this.elements.submitBtn) {
            this.elements.submitBtn.disabled = disabled;
            this.elements.submitBtn.textContent = text;
        }
    },

    showAlert(message) {
        if (this.elements.alertMessage && this.elements.alertModal) {
            this.elements.alertMessage.innerText = message;
            this.elements.alertModal.style.display = 'flex';
        } else {
            console.log("Alert:", message);
        }
    },

    hideAlert() {
        if (this.elements.alertModal) {
            this.elements.alertModal.style.display = 'none';
        }
    }
};

// Fungsi penutup modal alert
function tutupExambroAlert() {
    UI.hideAlert();
}
