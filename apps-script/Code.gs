/**
 * E-MODUL TITL — LOGGING & REKAP KE GOOGLE SHEETS
 * -------------------------------------------------
 * Tempel kode ini di Apps Script yang terhubung ke Google Sheet kamu
 * (Extensions > Apps Script). Lihat README.md di folder ini untuk
 * panduan deploy langkah-per-langkah.
 *
 * Membuat 2 sheet otomatis:
 *  - "Log"   : catatan mentah setiap aktivitas (backup lengkap / audit trail)
 *  - "Rekap" : satu baris per siswa, terus di-update (sesuai desain revisi)
 *              Nama | Kelas | Petunjuk | Materi | Latihan | Jobsheet | Skor | Progres | Terakhir
 */

const LOG_SHEET_NAME = "Log";
const REKAP_SHEET_NAME = "Rekap";

// Kolom tahap yang dihitung untuk Progres (harus sama persis dengan PAGE_TAHAP di tracking.js)
const TAHAP_COLUMNS = { "Petunjuk": 3, "Materi": 4, "Latihan": 5, "Jobsheet": 6 };
const REKAP_HEADERS = ["Nama", "Kelas", "Petunjuk", "Materi", "Latihan", "Jobsheet", "Skor", "Progres", "Terakhir"];

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  appendLog(data);
  upsertRekap(data);

  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput("E-Modul TITL logging endpoint aktif.");
}

/* ---------- LOG MENTAH (backup lengkap, tidak pernah ditimpa) ---------- */
function appendLog(data) {
  const sheet = getOrCreateSheet(LOG_SHEET_NAME,
    ["Waktu", "Nama", "Kelas", "Halaman", "Tahap", "Aktivitas", "Detail", "Skor"]);
  sheet.appendRow([
    data.waktu || new Date().toISOString(),
    data.nama || "",
    data.kelas || "",
    data.halaman || "",
    data.tahap || "",
    data.aktivitas || "",
    data.detail || "",
    data.skor || ""
  ]);
}

/* ---------- REKAP (satu baris per siswa, terus diperbarui) ---------- */
function upsertRekap(data) {
  if (!data.nama) return;
  const sheet = getOrCreateSheet(REKAP_SHEET_NAME, REKAP_HEADERS);

  const lastRow = sheet.getLastRow();
  let rowIndex = -1;
  if (lastRow > 1) {
    const namaKelas = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < namaKelas.length; i++) {
      if (namaKelas[i][0] === data.nama && namaKelas[i][1] === data.kelas) {
        rowIndex = i + 2; // +2: offset header (baris 1) & index 0-based
        break;
      }
    }
  }
  if (rowIndex === -1) {
    sheet.appendRow([data.nama, data.kelas, "-", "-", "-", "-", "-", "0%", ""]);
    rowIndex = sheet.getLastRow();
  }

  // Tandai tahap yang sudah diakses
  if (data.tahap && TAHAP_COLUMNS[data.tahap]) {
    sheet.getRange(rowIndex, TAHAP_COLUMNS[data.tahap]).setValue("✓");
  }

  // Skor otomatis dari hasil Latihan (mis. "Benar 5 dari 6 soal" -> "5/6")
  if (data.aktivitas === "Selesai Latihan" && data.detail) {
    const match = String(data.detail).match(/(\d+)\s*dari\s*(\d+)/i);
    if (match) sheet.getRange(rowIndex, 7).setValue(match[1] + "/" + match[2]);
  }

  // Hitung ulang Progres = jumlah tahap tercentang / 4 tahap
  let count = 0;
  Object.values(TAHAP_COLUMNS).forEach(col => {
    if (sheet.getRange(rowIndex, col).getValue() === "✓") count++;
  });
  const pct = Math.round((count / Object.keys(TAHAP_COLUMNS).length) * 100);
  sheet.getRange(rowIndex, 8).setValue(pct + "%");

  // Update tanggal aktivitas terakhir, format "10 Sep 2026"
  const tgl = Utilities.formatDate(
    data.waktu ? new Date(data.waktu) : new Date(),
    Session.getScriptTimeZone(),
    "d MMM yyyy"
  );
  sheet.getRange(rowIndex, 9).setValue(tgl);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
