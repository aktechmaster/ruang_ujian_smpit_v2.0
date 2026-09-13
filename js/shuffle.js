// Di dalam document.addEventListener("DOMContentLoaded", async function() { ...

try {
    const data = await API.fetchSoal(tingkatKelas, mapelUjian);
    let daftarSoal = data?.bank_soal || data?.soal || data?.data || (Array.isArray(data) ? data : []);

    if (!daftarSoal || daftarSoal.length === 0) {
        throw new Error(`Berkas soal kosong.`);
    }

    // --- INTEGRASI MODUL SHUFFLE ---
    let orderKey = `cbt_soal_order_${mapelUjian}`;
    let savedOrder = sessionStorage.getItem(orderKey);

    if (!savedOrder) {
        // Acak soal pertama kali jika belum ada urutan tersimpan
        daftarSoal = Shuffle.soal(daftarSoal);
        // Simpan urutan id_soal ke sessionStorage
        let orderIds = daftarSoal.map(s => s.id_soal);
        sessionStorage.setItem(orderKey, JSON.stringify(orderIds));
    } else {
        // Susun ulang daftarSoal sesuai urutan yang sudah tersimpan sebelumnya
        let orderIds = JSON.parse(savedOrder);
        let soalMap = new Map(daftarSoal.map(s => [s.id_soal, s]));
        daftarSoal = orderIds.map(id => soalMap.get(id)).filter(Boolean);
    }

    // Simpan ke variabel global untuk reference scoring & autosave
    bankSoalData = daftarSoal;

    initTimer(data, mapelUjian);
    renderSoal(daftarSoal);
    StorageManager.initAutosave();

} catch (error) {
    // ...
}
