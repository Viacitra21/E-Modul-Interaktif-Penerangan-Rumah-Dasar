# Setup: Data Pengguna & Hasil Belajar ke Google Sheets

Setelah setup, Google Sheet kamu akan otomatis punya **2 tab**:

### Tab "Rekap" — ringkasan per siswa (sesuai desain revisi)
Satu baris per siswa, terus diperbarui setiap kali ada aktivitas baru:

| Nama | Kelas | Petunjuk | Materi | Latihan | Jobsheet | Skor | Progres | Terakhir |
|---|---|---|---|---|---|---|---|---|
| Via | XI TITL 1 | ✓ | ✓ | ✓ | - | 5/6 | 75% | 10 Sep 2026 |

- ✓ = halaman tersebut sudah pernah dibuka siswa, `-` = belum.
- **Skor** = hasil Latihan otomatis (jumlah jawaban benar dari total soal). Jobsheet dinilai terpisah oleh guru, belum masuk skor ini.
- **Progres** = persentase tahap yang sudah diakses (Petunjuk, Materi, Latihan, Jobsheet) dari total 4 tahap.
- **Terakhir** = tanggal aktivitas terakhir siswa di e-modul.

Ini yang paling praktis untuk dibuka guru sehari-hari atau didownload jadi Excel.

### Tab "Log" — catatan mentah lengkap (backup / audit trail)
Setiap kejadian dicatat sebagai satu baris terpisah (Waktu, Nama, Kelas, Halaman, Tahap, Aktivitas, Detail, Skor), termasuk:
- **Akses Halaman** — setiap kali siswa membuka salah satu halaman
- **Selesai Latihan** — skor latihan (mis. "Benar 5 dari 6 soal")
- **Checklist Pemeriksaan Selesai** & **Selesai Jobsheet 01 / Perlu Troubleshooting** — progres praktik
- **Selesai Evaluasi** — skor akhir + persentase per indikator (Komponen, Simbol, Rangkaian, Keselamatan)

Tab ini tidak pernah menimpa data lama — cocok sebagai backup riwayat lengkap kalau sewaktu-waktu tab Rekap perlu dihitung ulang.

## Langkah setup (± 10 menit, sekali saja)

1. **Buat Google Sheet baru**
   Buka [sheets.google.com](https://sheets.google.com) → buat sheet kosong → beri nama misalnya `Data E-Modul TITL`.

2. **Buka editor Apps Script**
   Di Google Sheet: menu `Extensions` (Ekstensi) → `Apps Script`.

3. **Tempel kode backend**
   Hapus semua kode default di editor, lalu salin seluruh isi file `apps-script/Code.gs` (di folder proyek ini) ke sana. Simpan (`Ctrl+S`).

4. **Deploy sebagai Web App**
   - Klik tombol **Deploy** (kanan atas) → **New deployment**.
   - Klik ikon gerigi di sebelah "Select type" → pilih **Web app**.
   - Isi:
     - **Execute as**: `Me` (akun Google kamu)
     - **Who has access**: `Anyone`
   - Klik **Deploy**. Google mungkin minta izin akses — klik **Authorize access**, pilih akun kamu, lalu klik **Advanced** → **Go to (nama project) (unsafe)** → **Allow**. (Ini normal untuk script buatan sendiri.)
   - Setelah selesai, **copy Web App URL** yang muncul (bentuknya seperti `https://script.google.com/macros/s/XXXXXXX/exec`).

5. **Tempel URL ke website**
   Buka file `js/tracking.js` di proyek e-modul, cari baris ini di paling atas:
   ```js
   const SHEET_WEBAPP_URL = "GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT_KAMU";
   ```
   Ganti dengan URL yang kamu copy tadi, lalu simpan.

6. **Selesai — coba tes**
   Buka `index.html` di browser, isi nama & kelas saat diminta, lalu buka-buka beberapa halaman. Cek Google Sheet kamu — baris baru akan otomatis muncul di sheet bernama `Log`.

## Sudah pernah setup versi sebelumnya?
Kalau kamu sudah pernah deploy Apps Script versi lama (yang cuma punya tab "Log"), tinggal:
1. Buka Apps Script yang sama (`Extensions > Apps Script` dari Sheet yang sama).
2. Hapus semua kode lama, tempel ulang isi `Code.gs` yang baru ini.
3. Deploy ulang lewat `Deploy > Manage deployments` → edit (ikon pensil) → Version: `New version` → Deploy.
   URL Web App tetap sama, jadi **tidak perlu** mengubah apa pun di `js/tracking.js`.
4. Tab "Rekap" akan otomatis muncul begitu ada aktivitas baru dari siswa.

## Kalau kamu mengubah kode Apps Script nanti

Setiap kali kamu mengedit `Code.gs` di Apps Script, kamu perlu men-deploy ulang supaya perubahan aktif:
`Deploy` → `Manage deployments` → klik ikon pensil pada deployment yang ada → ubah **Version** ke `New version` → **Deploy**. URL-nya tetap sama, tidak perlu diganti lagi di `tracking.js`.

## Backup ke Excel

Data sudah otomatis tersimpan real-time di Google Sheets. Untuk backup sebagai file Excel kapan saja:
`File` → `Download` → `Microsoft Excel (.xlsx)` pada Google Sheet kamu.

Kamu juga bisa membuat filter/pivot table langsung di Sheet itu untuk melihat, misalnya, siapa saja yang belum mengerjakan Evaluasi, atau rata-rata skor per kelas.

## Catatan privasi

Karena `Who has access` di-set `Anyone`, siapa pun yang tahu URL Web App bisa mengirim data ke sheet ini — cukup aman untuk kebutuhan kelas/sekolah, tapi jangan bagikan URL tersebut secara publik di luar keperluan e-modul ini. Sheet itu sendiri tetap privat sesuai pengaturan berbagi Google Drive kamu.
