/**
 * SCORING ENGINE - Kalkulasi Skor CBT (Dengan Skor Parsial / Proporsional)
 */
const Scoring = {
    hitung: function(daftarSoal, rekapJawaban) {
        let totalPoin = 0;
        const totalSoal = daftarSoal.length;

        daftarSoal.forEach((soal, index) => {
            const kunci = soal.kunci_jawaban;
            const jwb = rekapJawaban[index];

            if (!jwb || jwb === "-" || kunci === undefined || kunci === null) return;

            // 1. Pilihan Ganda (PG) - 1 Poin Utuh
            if (typeof kunci === 'string') {
                if (String(jwb).trim().toUpperCase() === kunci.trim().toUpperCase()) {
                    totalPoin += 1;
                }
            } 
            // 2. Pilihan Ganda Kompleks (PGK) - Skor Parsial + Penalti Opsi Salah
            else if (Array.isArray(kunci)) {
                const userArr = String(jwb).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
                const kunciArr = kunci.map(s => String(s).trim().toUpperCase());
                
                if (kunciArr.length > 0) {
                    let opsiBenarDipilih = 0;
                    let opsiSalahDipilih = 0;

                    userArr.forEach(opsi => {
                        if (kunciArr.includes(opsi)) {
                            opsiBenarDipilih++;
                        } else {
                            opsiSalahDipilih++;
                        }
                    });

                    // Hitung poin bersih (mencegah siswa centang semua pilihan)
                    let poinBersih = opsiBenarDipilih - opsiSalahDipilih;
                    if (poinBersih < 0) poinBersih = 0;

                    totalPoin += (poinBersih / kunciArr.length);
                }
            }
            // 3. Benar / Salah (BS) - Skor Parsial Per Sub-Pernyataan
            else if (typeof kunci === 'object' && kunci !== null) {
                const userValues = String(jwb).split(',').map(s => s.trim().toUpperCase());
                const kunciKeys = Object.keys(kunci).sort((a, b) => Number(a) - Number(b));
                const totalSub = kunciKeys.length;

                if (totalSub > 0) {
                    let subBenar = 0;
                    kunciKeys.forEach((k, i) => {
                        const userAns = userValues[i] || "-";
                        const kunciAns = String(kunci[k]).trim().toUpperCase();
                        if (userAns === kunciAns) {
                            subBenar++;
                        }
                    });

                    totalPoin += (subBenar / totalSub);
                }
            }
        });

        // Mengembalikan nilai sebagai tipe Number murni
        const skorAktual = totalSoal > 0 ? Number(((totalPoin / totalSoal) * 100).toFixed(2)) : 0;
        const salah = totalSoal - totalPoin;

        return {
            benar: Number(totalPoin.toFixed(2)),
            salah: Number(salah.toFixed(2)),
            skor: skorAktual
        };
    }
};
