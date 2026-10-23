# E-Modul Interaktif TITL — Praktik Penerangan Rumah Dasar

> **Update terbaru: lihat `PANDUAN_UPDATE.md`** (login password, simulasi trainer virtual, diagram bersuara, soal C1-C6, jobsheet PDF).


Website statis (HTML, CSS, JavaScript murni — tanpa build tools) sesuai rancangan struktur web e-modul.

## Cara membuka di VS Code
1. Ekstrak/salin folder `emodul-titl` ini ke komputer kamu.
2. Buka folder tersebut di VS Code (`File > Open Folder`).
3. Install ekstensi **Live Server** (by Ritwick Dey) dari Extensions Marketplace.
4. Klik kanan pada `index.html` → **Open with Live Server**.
   (Atau cukup buka `index.html` langsung di browser — semua halaman berfungsi tanpa server, karena tidak ada fitur backend.)

## Struktur file
```
emodul-titl/
├── index.html          → Beranda
├── petunjuk.html        → Petunjuk Penggunaan & Tujuan Pembelajaran
├── materi.html          → Materi (tab: Dasar, Komponen, Simbol, Rangkaian, Simulasi, Video)
├── jobsheet.html         → Jobsheet: langkah praktik, checklist, pengujian, troubleshooting
├── latihan.html          → Latihan interaktif (pilihan ganda, benar/salah, identifikasi gambar, hint)
├── evaluasi.html         → Evaluasi akhir dengan skor & indikator hasil
├── css/style.css        → Semua styling (tema baby pink + indigo, mobile-friendly, animasi)
├── js/main.js           → Navigasi mobile, modal, tab, dan animasi scroll-reveal
├── js/sound.js          → Efek suara klik/benar/salah (sintesis, tanpa file audio) + tombol mute
├── js/tracking.js       → Login siswa (nama & kelas) + pencatatan aktivitas ke Google Sheets
├── assets/video/        → Taruh video praktikmu di sini (lihat README di folder ini)
├── assets/img/          → Taruh foto asli komponen/trainer di sini kalau ingin ganti ilustrasi SVG
└── apps-script/
    ├── Code.gs          → Backend Google Apps Script (tulis ke tab "Log" & "Rekap")
    └── README.md        → Panduan setup Google Sheets langkah-per-langkah
```

## Data pengguna & rekap hasil belajar
Setiap siswa yang membuka e-modul akan diminta mengisi **Nama & Kelas** sekali (tersimpan di browser device-nya). Setelah itu, aktivitasnya tercatat otomatis ke Google Sheets dalam **2 tab**:

- **Rekap** — satu baris per siswa, persis seperti desain revisimu:
  `Nama | Kelas | Petunjuk | Materi | Latihan | Jobsheet | Skor | Progres | Terakhir`
  Kolom Petunjuk/Materi/Latihan/Jobsheet terisi ✓ begitu halaman itu dibuka, Skor terisi otomatis dari hasil Latihan, Progres = persentase 4 tahap yang sudah diakses, dan Terakhir = tanggal aktivitas paling baru.
- **Log** — catatan mentah lengkap tiap kejadian (backup / audit trail, tidak pernah ditimpa).

**Ini butuh setup sekali di awal** (gratis, tanpa server, ±10 menit) — ikuti panduan lengkap di **`apps-script/README.md`**. Setelah itu, semua data masuk otomatis secara real-time, dan bisa dibackup kapan saja lewat `File > Download > Microsoft Excel (.xlsx)` di Google Sheets.

> Sebelum setup selesai, `js/tracking.js` masih menunjuk ke URL placeholder — website tetap berjalan normal, hanya saja datanya belum terkirim (akan muncul peringatan di console browser).

## Yang sudah diimplementasikan
- Navbar sederhana: Beranda, Materi, Praktik, Latihan, Evaluasi (mobile: menu hamburger) + tombol 🔊 mute suara.
- Beranda dengan hero, 3 info singkat, daftar "apa yang akan dipelajari", dan alur belajar.
- Timeline interaktif untuk petunjuk penggunaan + daftar tujuan pembelajaran bernomor.
- Kartu komponen dengan **ikon vektor khusus per komponen** (bukan generik lagi) — modal berisi fungsi, pemasangan, catatan keselamatan.
- Kenali Simbol dengan ilustrasi SVG.
- Diagram rangkaian interaktif: klik komponen untuk penjelasan, animasi arus lebih halus (requestAnimationFrame), dan **lampu benar-benar menyala (efek glow)** saat arus sampai.
- Simulasi merangkai komponen ke slot yang benar — lampu menyala dengan animasi glow + suara saat rangkaian benar, buzzer saat salah.
- Tab **Video** baru di halaman Materi — otomatis menampilkan video begitu file diletakkan di `assets/video/`.
- Jobsheet step-by-step dengan tombol Sebelumnya/Lanjut, progress bar, checklist pemeriksaan, pengujian, dan troubleshooting (decision-style).
- Latihan dengan 4 jenis soal, **tombol petunjuk (hint) opsional** per soal, feedback + efek suara benar/salah.
- Evaluasi akhir 10 soal dengan skor total dan indikator per kategori (Komponen, Simbol, Rangkaian, Keselamatan), plus pesan hasil.
- Animasi halus (fade-up) saat elemen muncul di layar, dipakai di kartu info, langkah, dan komponen.
- Efek suara untuk semua tombol/interaksi utama, disintesis langsung (tanpa file audio → tidak ada masalah lisensi, dan tetap ringan).
- Rekap otomatis per siswa di Google Sheets (lihat bagian di atas).

## Masih menunggu bahan dari kamu
- **Jobsheet asli**: kirim/upload file LKPD Praktik Penerangan Rumah yang sudah kamu buat, nanti kontennya aku masukkan menggantikan Jobsheet 01 contoh yang sekarang.
- **Video interaktif**: upload file videonya, lalu taruh di `assets/video/praktik-penerangan.mp4` (ikuti nama file persis) — begitu ada, otomatis tampil di tab Video tanpa perlu ubah kode.
- **Foto asli komponen** (opsional): kalau mau ganti ilustrasi SVG dengan foto trainer asli di lab, taruh di `assets/img/` dan ikuti petunjuk di README folder tersebut.

## Tentang tombol/pop-up "hiasan"
Aku sudah tinjau ulang seluruh halaman dan setiap tombol/pop-up yang ada punya fungsi (navigasi, modal info, submit jawaban, dsb) — tidak ada yang murni dekoratif. Kalau ada elemen tertentu yang menurutmu masih terasa "hiasan doang", kasih tahu aku halaman & elemennya biar langsung aku hapus.

## Yang bisa kamu kembangkan lebih lanjut
- Tambahkan soal "Cocokkan" versi drag-and-drop bila diperlukan.
- Sesuaikan jumlah soal evaluasi menjadi 20 sesuai rancangan awal (tinggal menambah objek pada array `evalQuestions` di `evaluasi.html`).
- Tambahkan auto-backup terjadwal (Apps Script bisa diatur mengirim email berisi file Excel setiap minggu) kalau kamu mau data ter-backup tanpa perlu download manual — bilang saja kalau ini mau ditambahkan.
