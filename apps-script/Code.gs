/**
 * E-MODUL TITL — LOGIN, LOGGING & REKAP (Google Apps Script)
 * ----------------------------------------------------------
 * Tempel di Apps Script yang terhubung ke Google Sheet milik guru/pembuat.
 * Panduan lengkap: apps-script/README.md
 *
 * SEBELUM DEPLOY, atur password (JANGAN ditulis di kode):
 *   Project Settings (ikon gerigi) > Script properties > Add script property
 *   Property: PASSWORD    Value: (password yang kamu bagikan ke siswa)
 *
 * Sheet yang dibuat otomatis:
 *  - "Log"   : catatan mentah semua aktivitas (backup / audit trail)
 *  - "Rekap" : satu baris per siswa
 *              Nama | Kelas | Petunjuk | Materi | Latihan | Jobsheet | Skor | Progres | Terakhir | Evaluasi
 */
const LOG_SHEET_NAME = "Log";
const REKAP_SHEET_NAME = "Rekap";
const TAHAP_COLUMNS = { "Petunjuk": 3, "Materi": 4, "Latihan": 5, "Jobsheet": 6 };
const REKAP_HEADERS = ["Nama", "Kelas", "Petunjuk", "Materi", "Latihan", "Jobsheet", "Skor", "Progres", "Terakhir", "Evaluasi"];
const MAX_GAGAL = 5;          // batas salah password
const BLOKIR_DETIK = 300;     // diblokir sementara (5 menit)

function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); }
  catch (err) { return json({ ok: false, error: "Permintaan tidak valid." }); }

  if (data.action === "login") return handleLogin(data);

  // Selain login, wajib membawa token yang sah
  if (!validToken(data)) return json({ ok: false, error: "unauthorized" });
  appendLog(data);
  upsertRekap(data);
  return json({ ok: true });
}

function doGet(e) {
  // Sengaja tidak menampilkan data apa pun
  return ContentService.createTextOutput("E-Modul TITL endpoint aktif.");
}

/* ---------------- LOGIN ---------------- */
function handleLogin(d) {
  const pw = PropertiesService.getScriptProperties().getProperty("PASSWORD");
  if (!pw) return json({ ok: false, error: "Password belum diatur oleh guru (Script properties > PASSWORD)." });

  const nama = String(d.nama || "").trim(), kelas = String(d.kelas || "").trim();
  if (!nama || !kelas) return json({ ok: false, error: "Nama dan kelas wajib diisi." });

  const cache = CacheService.getScriptCache();
  const key = "gagal_" + nama.toLowerCase();
  const gagal = parseInt(cache.get(key) || "0", 10);
  if (gagal >= MAX_GAGAL) return json({ ok: false, error: "Terlalu banyak percobaan salah. Tunggu 5 menit lalu coba lagi." });

  if (String(d.password || "") !== pw) {
    cache.put(key, String(gagal + 1), BLOKIR_DETIK);
    appendLog({ waktu: new Date().toISOString(), nama: nama, kelas: kelas, halaman: "Login", tahap: "", aktivitas: "Login GAGAL (password salah)", detail: "", skor: "" });
    return json({ ok: false, error: "Password salah. Tanyakan ke gurumu." });
  }

  cache.remove(key);
  const token = makeToken(nama, kelas, pw);
  const entry = { waktu: new Date().toISOString(), nama: nama, kelas: kelas, halaman: "Login", tahap: "", aktivitas: "Login", detail: "", skor: "" };
  appendLog(entry);
  upsertRekap(entry);
  return json({ ok: true, token: token });
}

function makeToken(nama, kelas, pw) {
  const sig = Utilities.computeHmacSha256Signature(nama + "|" + kelas, pw);
  return Utilities.base64EncodeWebSafe(sig);
}
function validToken(d) {
  const pw = PropertiesService.getScriptProperties().getProperty("PASSWORD");
  if (!pw || !d.nama || !d.kelas || !d.token) return false;
  return makeToken(String(d.nama).trim(), String(d.kelas).trim(), pw) === d.token;
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- LOG MENTAH ---------------- */
function appendLog(data) {
  const sheet = getOrCreateSheet(LOG_SHEET_NAME, ["Waktu", "Nama", "Kelas", "Halaman", "Tahap", "Aktivitas", "Detail", "Skor"]);
  sheet.appendRow([data.waktu || new Date().toISOString(), data.nama || "", data.kelas || "", data.halaman || "",
                   data.tahap || "", data.aktivitas || "", data.detail || "", data.skor || ""]);
}

/* ---------------- REKAP PER SISWA ---------------- */
function upsertRekap(data) {
  if (!data.nama) return;
  const sheet = getOrCreateSheet(REKAP_SHEET_NAME, REKAP_HEADERS);
  if (sheet.getRange(1, 10).getValue() !== "Evaluasi") sheet.getRange(1, 10).setValue("Evaluasi"); // sheet versi lama

  const lastRow = sheet.getLastRow();
  let rowIndex = -1;
  if (lastRow > 1) {
    const vals = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < vals.length; i++) {
      if (vals[i][0] === data.nama && vals[i][1] === data.kelas) { rowIndex = i + 2; break; }
    }
  }
  if (rowIndex === -1) {
    sheet.appendRow([data.nama, data.kelas, "-", "-", "-", "-", "-", "0%", "", "-"]);
    rowIndex = sheet.getLastRow();
  }

  if (data.tahap && TAHAP_COLUMNS[data.tahap]) sheet.getRange(rowIndex, TAHAP_COLUMNS[data.tahap]).setValue("✓");

  if (data.aktivitas === "Selesai Latihan" && data.detail) {
    const m = String(data.detail).match(/(\d+)\s*dari\s*(\d+)/i);
    if (m) sheet.getRange(rowIndex, 7).setValue(m[1] + "/" + m[2]);
  }
  if (data.aktivitas === "Selesai Evaluasi" && data.skor !== "" && data.skor !== undefined) {
    sheet.getRange(rowIndex, 10).setValue(data.skor);
  }

  let count = 0;
  Object.values(TAHAP_COLUMNS).forEach(col => { if (sheet.getRange(rowIndex, col).getValue() === "✓") count++; });
  sheet.getRange(rowIndex, 8).setValue(Math.round(count / Object.keys(TAHAP_COLUMNS).length * 100) + "%");

  sheet.getRange(rowIndex, 9).setValue(Utilities.formatDate(
    data.waktu ? new Date(data.waktu) : new Date(), Session.getScriptTimeZone(), "d MMM yyyy"));
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) { sheet.appendRow(headers); sheet.setFrozenRows(1); }
  return sheet;
}

/** Jalankan manual sekali (Run) untuk mengecek apakah PASSWORD sudah terpasang. */
function cekKonfigurasi() {
  const pw = PropertiesService.getScriptProperties().getProperty("PASSWORD");
  Logger.log(pw ? "OK: PASSWORD sudah diatur (" + pw.length + " karakter)." : "BELUM: PASSWORD belum diatur di Script properties.");
}
