/**
 * E-MODUL TITL — LOGIN, LOGGING, REKAP & ASISTEN AI (Google Apps Script)
 * ---------------------------------------------------------------------
 * Tempel di Apps Script yang terhubung ke Google Sheet milik guru/pembuat.
 * Panduan lengkap: apps-script/README.md
 *
 * SEBELUM DEPLOY, atur di Project Settings (ikon gerigi) > Script properties:
 *   PASSWORD            (wajib)  password yang dibagikan ke siswa
 *   ANTHROPIC_API_KEY   (untuk fitur AI)  kunci API dari console.anthropic.com
 *   AI_MODEL            (opsional) default: claude-haiku-5-5
 * JANGAN menulis kunci/password di kode ini.
 *
 * Sheet yang dibuat otomatis:
 *  - "Log"   : catatan mentah SEMUA aktivitas (tiap baris punya Waktu perangkat & Waktu Server)
 *  - "Chat"  : semua tanya-jawab siswa dengan AI
 *  - "Rekap" : satu baris per siswa
 *              Nama | Kelas | Petunjuk | Materi | Latihan | Jobsheet | Skor | Progres | Terakhir | Evaluasi
 *              | Mulai Akses | Praktikum | Tanya AI | Total Waktu (menit) | Durasi Evaluasi (detik)
 */
const LOG_SHEET_NAME = "Log";
const CHAT_SHEET_NAME = "Chat";
const REKAP_SHEET_NAME = "Rekap";
const TAHAP_COLUMNS = { "Petunjuk": 3, "Materi": 4, "Latihan": 5, "Jobsheet": 6 };
const REKAP_HEADERS = ["Nama", "Kelas", "Petunjuk", "Materi", "Latihan", "Jobsheet", "Skor", "Progres", "Terakhir", "Evaluasi",
                       "Mulai Akses", "Praktikum", "Tanya AI", "Total Waktu (menit)", "Durasi Evaluasi (detik)"];
const LOG_HEADERS = ["Waktu", "Nama", "Kelas", "Halaman", "Tahap", "Aktivitas", "Detail", "Skor", "Waktu Server"];
const CHAT_HEADERS = ["Waktu", "Nama", "Kelas", "Halaman", "Tahap", "Pertanyaan", "Jawaban", "Waktu Server"];
const MAX_GAGAL = 5;          // batas salah password
const BLOKIR_DETIK = 300;     // diblokir sementara (5 menit)
const CHAT_MAKS_PER_JAM = 30; // batas pertanyaan AI per siswa per jam
const DEFAULT_AI_MODEL = "claude-haiku-5-5";

function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); }
  catch (err) { return json({ ok: false, error: "Permintaan tidak valid." }); }

  if (data.action === "login") return handleLogin(data);

  // Selain login, wajib membawa token yang sah
  if (!validToken(data)) return json({ ok: false, error: "unauthorized" });

  if (data.action === "chat") return handleChat(data);
  if (data.action === "history") return handleHistory(data);

  withLock(function () { appendLog(data); upsertRekap(data); });
  return json({ ok: true });
}

function doGet(e) {
  // Sengaja tidak menampilkan data apa pun
  return ContentService.createTextOutput("E-Modul TITL endpoint aktif.");
}

/* ---------------- UTIL ---------------- */
function withLock(fn) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { /* tetap lanjut: lebih baik tercatat daripada hilang */ }
  try { return fn(); } finally { try { lock.releaseLock(); } catch (e) {} }
}
function nowStr() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"); }
function stamp(data) { return data.waktu ? Utilities.formatDate(new Date(data.waktu), Session.getScriptTimeZone(), "d MMM yyyy HH:mm:ss") : nowStr(); }
function toIso(v) { return v instanceof Date ? v.toISOString() : String(v || ""); }

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
    withLock(function () { appendLog({ waktu: new Date().toISOString(), nama: nama, kelas: kelas, halaman: "Login", tahap: "", aktivitas: "Login GAGAL (password salah)", detail: "", skor: "" }); });
    return json({ ok: false, error: "Password salah. Tanyakan ke gurumu." });
  }

  cache.remove(key);
  const token = makeToken(nama, kelas, pw);
  const entry = { waktu: new Date().toISOString(), nama: nama, kelas: kelas, halaman: "Login", tahap: "", aktivitas: "Login", detail: "", skor: "" };
  withLock(function () { appendLog(entry); upsertRekap(entry); });
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
function ensureHeaders(sheet, headers) {
  const have = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  for (let i = 0; i < headers.length; i++) if (have[i] !== headers[i]) sheet.getRange(1, i + 1).setValue(headers[i]);   // sheet versi lama
}
function appendLog(data) {
  const sheet = getOrCreateSheet(LOG_SHEET_NAME, LOG_HEADERS);
  ensureHeaders(sheet, LOG_HEADERS);
  sheet.appendRow([data.waktu || new Date().toISOString(), data.nama || "", data.kelas || "", data.halaman || "",
                   data.tahap || "", data.aktivitas || "", data.detail || "", data.skor || "", nowStr()]);
}

/* ---------------- ASISTEN AI ---------------- */
const SYSTEM_PROMPT = [
  "Kamu adalah Asisten Belajar pada e-modul 'Instalasi Penerangan Rumah Dasar' untuk siswa SMK kelas XI TITL (Teknik Instalasi Tenaga Listrik) di SMKN 2 Pemangkat.",
  "Materi e-modul: konsep dasar instalasi penerangan rumah; komponen (lampu, fitting, kWh meter, saklar, stop kontak, MCB, kabel, steker, kotak sambung, terminal); simbol; alur arus sumber -> MCB -> saklar -> lampu -> netral; rangkaian 1 lampu dan 2 lampu paralel dengan 1 saklar lewat kotak sambung; saklar tukar; hubung singkat; K3; Jobsheet 1 (simulasi Proteus) dan Jobsheet 2 (praktikum trainer); Trainer Virtual; latihan & evaluasi bertingkat C1-C6.",
  "ATURAN:",
  "1) Jawab dalam Bahasa Indonesia yang sederhana, ramah, dan ringkas (maksimal sekitar 150 kata). Pakai contoh sehari-hari bila membantu. Boleh pakai **tebal** dan daftar bernomor singkat.",
  "2) Bantu siswa MEMAHAMI. Jelaskan konsep dan alasan, lalu bila cocok akhiri dengan satu pertanyaan pemantik. Jika siswa menempelkan soal latihan/evaluasi, jangan langsung memberi kunci jawaban; bimbing dengan konsep dan petunjuk.",
  "3) Keselamatan (K3) selalu utama: jangan pernah menyarankan bekerja pada instalasi yang masih bertegangan. Ingatkan MCB OFF, cek dengan tespen, dan praktik di bawah pengawasan guru.",
  "4) Hanya bahas topik yang berkaitan dengan e-modul dan dasar kelistrikan. Untuk topik lain, tolak dengan sopan dan arahkan kembali ke materi.",
  "5) Jika tidak yakin atau pertanyaan berisiko, katakan terus terang dan sarankan bertanya ke guru. Jangan mengarang fakta."
].join("\n");

function handleChat(d) {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty("ANTHROPIC_API_KEY");
  if (!key) return json({ ok: false, error: "Fitur AI belum diaktifkan guru (Script properties > ANTHROPIC_API_KEY)." });

  const pesan = String(d.pesan || "").trim().slice(0, 500);
  if (!pesan) return json({ ok: false, error: "Pertanyaan kosong." });

  // batas pemakaian per siswa
  const cache = CacheService.getScriptCache();
  const ck = "chat_" + String(d.nama).toLowerCase() + "|" + String(d.kelas).toLowerCase();
  const n = parseInt(cache.get(ck) || "0", 10);
  if (n >= CHAT_MAKS_PER_JAM) return json({ ok: false, error: "Kamu sudah banyak bertanya dalam 1 jam terakhir. Istirahat sebentar atau tanyakan ke gurumu ya." });
  cache.put(ck, String(n + 1), 3600);

  // susun riwayat (harus mulai dari 'user' dan bergantian)
  const msgs = [];
  (Array.isArray(d.riwayat) ? d.riwayat : []).slice(-6).forEach(function (m) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return;
    const c = String(m.content || "").slice(0, 1200); if (!c) return;
    if (!msgs.length && m.role !== "user") return;
    if (msgs.length && msgs[msgs.length - 1].role === m.role) return;
    msgs.push({ role: m.role, content: c });
  });
  if (msgs.length && msgs[msgs.length - 1].role === "user") msgs.pop();
  msgs.push({ role: "user", content: pesan });

  const konteks = "Siswa sedang membuka halaman: " + String(d.halaman || "-").slice(0, 80) + (d.konteks ? " (bagian: " + String(d.konteks).slice(0, 60) + ")" : "") + ".";
  let jawaban = "";
  try {
    const res = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
      method: "post", contentType: "application/json", muteHttpExceptions: true,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      payload: JSON.stringify({
        model: props.getProperty("AI_MODEL") || DEFAULT_AI_MODEL,
        max_tokens: 700,
        system: SYSTEM_PROMPT + "\n\n" + konteks,
        messages: msgs
      })
    });
    const code = res.getResponseCode(), body = JSON.parse(res.getContentText() || "{}");
    if (code !== 200) {
      Logger.log("AI error " + code + ": " + res.getContentText());
      return json({ ok: false, error: code === 429 ? "AI sedang sibuk. Coba lagi sebentar." : "AI belum bisa menjawab sekarang (kode " + code + "). Hubungi gurumu bila berulang." });
    }
    jawaban = (body.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n").trim();
  } catch (err) {
    Logger.log("AI exception: " + err);
    return json({ ok: false, error: "Tidak bisa menghubungi layanan AI. Coba lagi." });
  }
  if (!jawaban) return json({ ok: false, error: "AI tidak memberi jawaban. Coba ulangi dengan kalimat lain." });

  const waktuJawab = new Date().toISOString();
  withLock(function () {
    const sheet = getOrCreateSheet(CHAT_SHEET_NAME, CHAT_HEADERS);
    sheet.appendRow([d.waktu || waktuJawab, d.nama, d.kelas, d.halaman || "", d.tahap || "", pesan, jawaban, nowStr()]);
    const ev = { waktu: d.waktu || waktuJawab, nama: d.nama, kelas: d.kelas, halaman: d.halaman || "", tahap: d.tahap || "", aktivitas: "Tanya AI", detail: pesan.slice(0, 200), skor: "" };
    appendLog(ev); upsertRekap(ev);
  });
  return json({ ok: true, jawaban: jawaban, waktu: waktuJawab });
}

function lastRows(sheet, maxRows) {
  const last = sheet.getLastRow(); if (last < 2) return [];
  const start = Math.max(2, last - maxRows + 1);
  return sheet.getRange(start, 1, last - start + 1, sheet.getLastColumn()).getValues();
}

// Riwayat chat + jejak aktivitas milik siswa yang sedang login (hanya miliknya sendiri)
function handleHistory(d) {
  const nama = String(d.nama).trim(), kelas = String(d.kelas).trim();
  const mine = function (r) { return String(r[1]).trim() === nama && String(r[2]).trim() === kelas; };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chatSheet = ss.getSheetByName(CHAT_SHEET_NAME), logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  const chat = chatSheet ? lastRows(chatSheet, 600).filter(mine).slice(-60).map(function (r) {
    return { waktu: toIso(r[0]), halaman: r[3], pertanyaan: String(r[5]), jawaban: String(r[6]) };
  }) : [];
  const aktivitas = logSheet ? lastRows(logSheet, 1500).filter(mine).filter(function (r) { return r[5] !== "Durasi Halaman"; }).slice(-80).map(function (r) {
    return { waktu: toIso(r[0]), halaman: r[3], tahap: r[4], aktivitas: String(r[5]), detail: String(r[6]) };
  }) : [];
  return json({ ok: true, chat: chat, aktivitas: aktivitas });
}

/* ---------------- REKAP PER SISWA ---------------- */
function upsertRekap(data) {
  if (!data.nama) return;
  const sheet = getOrCreateSheet(REKAP_SHEET_NAME, REKAP_HEADERS);
  ensureHeaders(sheet, REKAP_HEADERS);

  const lastRow = sheet.getLastRow();
  let rowIndex = -1;
  if (lastRow > 1) {
    const vals = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < vals.length; i++) {
      if (vals[i][0] === data.nama && vals[i][1] === data.kelas) { rowIndex = i + 2; break; }
    }
  }
  if (rowIndex === -1) {
    sheet.appendRow([data.nama, data.kelas, "-", "-", "-", "-", "-", "0%", "", "-", stamp(data), "-", 0, 0, ""]);
    rowIndex = sheet.getLastRow();
  }
  if (!sheet.getRange(rowIndex, 11).getValue()) sheet.getRange(rowIndex, 11).setValue(stamp(data));   // baris lama belum punya waktu mulai

  if (data.tahap && TAHAP_COLUMNS[data.tahap]) sheet.getRange(rowIndex, TAHAP_COLUMNS[data.tahap]).setValue("✓");

  if (data.aktivitas === "Selesai Latihan" && data.detail) {
    const m = String(data.detail).match(/(\d+)\s*dari\s*(\d+)/i);
    if (m) sheet.getRange(rowIndex, 7).setValue(m[1] + "/" + m[2]);
  }
  if (data.aktivitas === "Selesai Evaluasi" && data.skor !== "" && data.skor !== undefined) {
    sheet.getRange(rowIndex, 10).setValue(data.skor);
  }
  if (data.aktivitas === "Selesai Jobsheet 2 (Trainer)" || data.aktivitas === "Praktikum Selesai - Lanjut Evaluasi") {
    sheet.getRange(rowIndex, 12).setValue("✓");
  }
  if (data.aktivitas === "Tanya AI") {
    sheet.getRange(rowIndex, 13).setValue((parseInt(sheet.getRange(rowIndex, 13).getValue(), 10) || 0) + 1);
  }
  if (data.aktivitas === "Durasi Halaman") {
    const sec = parseInt(String(data.detail), 10) || 0;
    const prev = parseFloat(sheet.getRange(rowIndex, 14).getValue()) || 0;
    sheet.getRange(rowIndex, 14).setValue(Math.round((prev + sec / 60) * 10) / 10);
  }
  if (data.aktivitas === "Durasi Evaluasi") {
    sheet.getRange(rowIndex, 15).setValue(parseInt(String(data.detail), 10) || "");
  }

  let count = 0;
  Object.values(TAHAP_COLUMNS).forEach(col => { if (sheet.getRange(rowIndex, col).getValue() === "✓") count++; });
  sheet.getRange(rowIndex, 8).setValue(Math.round(count / Object.keys(TAHAP_COLUMNS).length * 100) + "%");

  sheet.getRange(rowIndex, 9).setValue(Utilities.formatDate(
    data.waktu ? new Date(data.waktu) : new Date(), Session.getScriptTimeZone(), "d MMM yyyy HH:mm"));
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) { sheet.appendRow(headers); sheet.setFrozenRows(1); }
  return sheet;
}

/** Jalankan manual sekali (Run) untuk mengecek konfigurasi. */
function cekKonfigurasi() {
  const p = PropertiesService.getScriptProperties();
  const pw = p.getProperty("PASSWORD"), ai = p.getProperty("ANTHROPIC_API_KEY");
  Logger.log(pw ? "OK: PASSWORD sudah diatur (" + pw.length + " karakter)." : "BELUM: PASSWORD belum diatur di Script properties.");
  Logger.log(ai ? "OK: ANTHROPIC_API_KEY sudah diatur. Model: " + (p.getProperty("AI_MODEL") || DEFAULT_AI_MODEL) : "BELUM: ANTHROPIC_API_KEY belum diatur (fitur AI nonaktif).");
  Logger.log("Zona waktu script: " + Session.getScriptTimeZone() + " (ubah di Project Settings bila bukan WIB / Asia/Jakarta).");
}
