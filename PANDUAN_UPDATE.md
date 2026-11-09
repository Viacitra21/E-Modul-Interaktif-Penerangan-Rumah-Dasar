# Revisi Kedua: Petunjuk Alur, Asisten AI, Pencatatan Aktivitas, Wiring/Simulasi Mobile

| # | Revisi | Di mana |
|---|---|---|
| 1 | Bilah **Langkah 1-5** di setiap halaman + instruksi "setelah ini apa", petunjuk lengkap di `petunjuk.html`, tab Materi bertanda ✓, tombol **Lanjut ke Evaluasi** di bawah halaman Praktik (muncul menyorot setelah pengujian berhasil), petunjuk sebelum Evaluasi | `js/guide.js`, `petunjuk.html`, `materi.html`, `jobsheet.html`, `latihan.html`, `evaluasi.html` |
| 2 | **Asisten AI** (tombol 🤖 pojok kanan bawah: Tanya AI, Riwayat, Aktivitas) | `js/chat.js`, `apps-script/Code.gs` |
| 3 | **Pencatatan aktivitas**: waktu mulai sesi, durasi tiap halaman, buka tiap bagian, praktikum, per soal & durasi latihan/evaluasi, interaksi AI; antrean offline; jam perangkat + jam server | `js/tracking.js`, `js/quiz.js`, `apps-script/Code.gs` |
| 4 | **Zoom + geser + area sentuh besar** pada Trainer Virtual dan Diagram | `js/zoompan.js`, `js/simulator.js`, `js/diagram.js`, `css/extra.css` |
| 5 | **4 Contoh Rangkaian** pre-built (saklar tunggal, 2 lampu paralel, 2 saklar terpisah, saklar tukar) | `js/sim-presets.js`, `js/sim-engine.js`, `js/simulator.js` |

## Langkah memasang
1. Salin semua file hasil revisi ke proyek (jangan hapus `assets/` dan `js/config.js` milikmu).
2. **WAJIB untuk fitur AI & pencatatan baru**: ikuti bagian *Mengaktifkan Asisten AI* di `apps-script/README.md` (tempel `Code.gs` baru, isi `GROQ_API_KEY`, deploy **New version**). Sebelum ini dilakukan, e-modul tetap berjalan normal, hanya AI yang menampilkan pesan "belum diaktifkan".
3. Uji di HP: login, buka Materi > Simulasi > Contoh Rangkaian, coba cubit/geser, ketuk terminal, buka 🤖.
4. `git add . ; git commit ; git push`. Semua file memakai `?v=2` agar browser siswa memuat versi baru.

---

# Panduan Memasang Update (Revisi Oktober 2026)

## Yang berubah
| # | Revisi | Di mana |
|---|---|---|
| 1 | Jobsheet PDF masuk web (2 jobsheet) | `jobsheet.html`, folder `assets/jobsheet/` |
| 2 | Login Nama + Kelas + Password (dicek di Apps Script), rekap privat | `js/tracking.js`, `js/config.js`, `apps-script/Code.gs` |
| 3 | Musik latar + lebih banyak efek suara (tombol 🎵 dan 🔊 di menu) | `js/sound.js` |
| 4 | Simulasi jadi Trainer Virtual (pasang kabel, ON/OFF MCB & saklar, hubung singkat, K3) | `js/sim-engine.js`, `js/simulator.js` |
| 5 | Diagram bersuara perempuan, arus bergerak, 2 rangkaian | `js/diagram.js` |
| 6 | Soal Latihan (10) dan Evaluasi (10) berbeda, level C1-C6 | `js/quiz.js`, `latihan.html`, `evaluasi.html` |

## Langkah memasang (urut)
1. **Salin URL Apps Script lamamu** dari `js/tracking.js` lama (baris `SHEET_WEBAPP_URL = "..."`), simpan sementara.
2. Ekstrak ZIP update ini, lalu **salin & timpa** ke folder proyekmu (VS Code):
   - semua file `.html` (index, petunjuk, materi, jobsheet, latihan, evaluasi)
   - folder `js/` (file lama `tracking.js`, `sound.js`, `main.js` ikut tertimpa; ada file baru)
   - file `css/extra.css` (BARU; `css/style.css` TIDAK diubah)
   - folder `apps-script/`
   - folder `assets/jobsheet/` dan `assets/audio/` (hanya berisi README)
   **Jangan menghapus** `assets/img/` dan `assets/video/` milikmu, tidak tersentuh update ini.
3. Buka **`js/config.js`**, tempel URL dari langkah 1.
4. Ikuti **`apps-script/README.md`**: tempel `Code.gs` baru, atur `PASSWORD`, deploy versi baru.
5. Taruh dua PDF jobsheet di `assets/jobsheet/` dengan nama persis:
   `jobsheet-1-proteus.pdf` dan `jobsheet-2-trainer.pdf`
6. Uji lokal (Live Server): login, buka tab Pahami Rangkaian dan Simulasi, coba Latihan.
7. `git add .` > `git commit -m "Revisi: login, simulasi, diagram bersuara, soal C1-C6, jobsheet PDF"` > `git push`.

## Catatan penting
- **Komponen Stop Kontak** sebelumnya hilang dari daftar di `materi.html`-mu; sudah dikembalikan (foto `assets/img/stop kontak.jpg`).
- Periksa nama file fotomu: di kode tertulis `kotaksambung.jpe` (kemungkinan typo, mungkin maksudnya `.jpg`/`.jpeg`) dan `kwh meter.jpg` (ada spasi). Nama harus sama persis dengan file asli.
- Narator memakai suara perempuan bahasa Indonesia bawaan browser. Bila suaranya kurang bagus di perangkat siswa, rekam sendiri lewat panduan di `assets/audio/narasi/README.md`.
- Musik mulai setelah siswa login (aturan browser), dan bisa dimatikan lewat tombol 🎵.
