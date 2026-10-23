# Setup Login Password + Rekap ke Google Sheets (sekali saja, ±10 menit)

## Cara kerjanya
1. Siswa membuka e-modul, diminta **Nama, Kelas, Password**.
2. Password diperiksa oleh **Google Apps Script** (bukan oleh kode web), jadi tidak bisa diintip lewat "View Source".
3. Bila benar, siswa masuk dan semua aktivitasnya direkap ke Google Sheet milik guru/pembuat web.
4. Setiap membuka e-modul baru (tab/browser baru), siswa harus login lagi.
5. Salah password 5x -> diblokir sementara 5 menit.

## Langkah setup

1. **Buat Google Sheet baru** (sheets.google.com), mis. "Data E-Modul TITL".
   Sheet ini **privat secara bawaan**: hanya akun pemilik dan akun yang kamu undang (tombol *Share*) yang bisa melihat.
   Untuk "hanya guru dan pembuat web": klik *Share* lalu undang **akun Google guru** saja. Jangan pilih "Anyone with the link".
2. Menu **Extensions > Apps Script**. Hapus kode bawaan, tempel seluruh isi `apps-script/Code.gs`, simpan.
3. **Atur password** (jangan tulis di kode):
   ikon gerigi **Project Settings** > bagian **Script properties** > **Add script property**
   - Property: `PASSWORD`
   - Value: password yang akan dibagikan ke siswa
   Klik **Save script properties**.
4. (Opsional) Pilih fungsi `cekKonfigurasi` di dropdown lalu **Run** untuk memastikan password terpasang.
5. **Deploy**: tombol *Deploy* > *New deployment* > ikon gerigi > **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   Klik Deploy, izinkan akses (Advanced > Go to ... > Allow), lalu **salin Web App URL**.
6. Buka **`js/config.js`** di proyek web, tempel URL tadi:
   ```js
   const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/XXXX/exec";
   ```
7. Commit & push ke GitHub (Vercel otomatis memperbarui).

> "Anyone" di langkah 5 hanya berarti web e-modul boleh mengirim data ke script. **Isi spreadsheet tetap privat**, dan alamat script tidak menampilkan data apa pun saat dibuka.

## Sudah pernah setup versi lama?
- Tempel ulang `Code.gs` yang baru, atur `PASSWORD` (langkah 3), lalu **Deploy > Manage deployments > pensil > Version: New version > Deploy**. URL tetap sama.
- Kolom baru **Evaluasi** otomatis ditambahkan di tab Rekap.
- Pindahkan URL lama dari `tracking.js` ke `js/config.js`.

## Mengganti password
Ubah nilai `PASSWORD` di Script properties. Semua sesi lama otomatis tidak berlaku, siswa diminta login ulang dengan password baru.

## Isi Sheet
**Tab Rekap** (satu baris per siswa): `Nama | Kelas | Petunjuk | Materi | Latihan | Jobsheet | Skor | Progres | Terakhir | Evaluasi`
**Tab Log** (catatan mentah): Login, Login GAGAL, Akses Halaman, Selesai Latihan (skor/10), Selesai Evaluasi (skor + capaian C1-C6 + indikator), Simulasi Level 1/2 Berhasil (+ pelanggaran K3), Buka/Unduh Jobsheet, Checklist, Logout.
Backup ke Excel: **File > Download > Microsoft Excel (.xlsx)**.

## Batas keamanan (jujur)
Ini pengaman tingkat kelas: mencegah orang luar mengisi data dan membatasi akses ke siswa yang tahu password. Halaman web itu sendiri tetap file publik di internet; untuk menyembunyikan seluruh isi web dari orang luar, gunakan fitur *Password Protection* Vercel (berbayar) atau hosting khusus.
