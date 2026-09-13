/**
 * SCORING ENGINE - Kalkulasi Skor CBT
 */
const Scoring = {
    hitung: function(daftarSoal, rekapJawaban) {
        let benar = 0;
        const totalSoal = daftarSoal.length;

        daftarSoal.forEach((soal, index) => {
            const kunci = soal.kunci_jawaban;
            const jwb = rekapJawaban[index];

            if (!jwb || jwb === "-" || kunci === undefined || kunci === null) return;

            // 1. Pilihan Ganda (PG)
            if (typeof kunci === 'string') {
                if (String(jwb).trim().toUpperCase() === kunci.trim().toUpperCase()) {
                    benar++;
                }
            } 
            // 2. Pilihan Ganda Kompleks (PGK) / Benar Salah (BS)
            else if (Array.isArray(kunci)) {
                const userArr = String(jwb).split(',').map(s => s.trim().toUpperCase()).sort().join(',');
                const kunciArr = kunci.map(s => String(s).trim().toUpperCase()).sort().join(',');
                if (userArr === kunciArr) benar++;
            }
        });

        const salah = totalSoal - benar;
        const skorAktual = totalSoal > 0 ? ((benar / totalSoal) * 100).toFixed(2) : "0.00";

        return {
            benar: benar,
            salah: salah,
            skor: skorAktual
        };
    }
};
