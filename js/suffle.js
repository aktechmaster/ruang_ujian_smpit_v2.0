/**
 * MODUL SHUFFLE - Pengacak Soal CBT
 */
const Shuffle = {
    acak: function(daftarSoal) {
        if (!Array.isArray(daftarSoal) || daftarSoal.length <= 1) {
            return daftarSoal;
        }

        // Duplikasi array agar tidak mengubah array master di memori
        const arrayTeracak = [...daftarSoal];

        // Algoritma Fisher-Yates Shuffle
        for (let i = arrayTeracak.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arrayTeracak[i], arrayTeracak[j]] = [arrayTeracak[j], arrayTeracak[i]];
        }

        return arrayTeracak;
    }
};
