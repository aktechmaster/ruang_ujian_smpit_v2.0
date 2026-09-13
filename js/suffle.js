/**
 * SHUFFLE MODULE - Pengacak Soal CBT
 */
const Shuffle = {
    /**
     * Mengacak array bank soal tanpa mengubah data aslinya
     * @param {Array} daftarSoal - Array bank_soal dari JSON
     * @returns {Array} Array baru dengan urutan teracak
     */
    soal: function(daftarSoal) {
        if (!Array.isArray(daftarSoal)) return daftarSoal;

        // Salin array agar tidak mengubah data master di memory
        const shuffled = [...daftarSoal];

        // Algoritma Fisher-Yates Shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }
};
