/**
 * MODUL SHUFFLE - Pengacak Soal CBT
 */
const Shuffle = {
    soal: function(daftarSoal) {
        if (!Array.isArray(daftarSoal)) return daftarSoal;
        
        // Buat salinan array agar data asli di memori tidak berubah
        const shuffled = [...daftarSoal];
        
        // Algoritma Fisher-Yates
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled;
    }
};
