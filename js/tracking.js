/* =======================================================================
   TRACKING & LOGIN — E-Modul TITL
   Data akses & hasil belajar dikirim ke Google Sheets lewat Google Apps
   Script Web App. Ganti SHEET_WEBAPP_URL di bawah setelah kamu deploy
   Apps Script-nya (lihat panduan di apps-script/README.md).
   ======================================================================= */

const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzEHJCLQLAGrVIDUO6JXneBUVzyl1QfIZTZ0LMwWAuVDr5C8JzoTJbtikcuu0BJrWOVjA/exec";

function getUser() {
  const raw = localStorage.getItem('emodul_user');
  return raw ? JSON.parse(raw) : null;
}

function setUser(nama, kelas) {
  localStorage.setItem('emodul_user', JSON.stringify({ nama, kelas }));
}

function clearUser() {
  localStorage.removeItem('emodul_user');
  location.reload();
}

// Tampilkan form Nama & Kelas jika belum pernah diisi di device ini.
function ensureLogin() {
  const existing = getUser();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'loginOverlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>Sebelum mulai...</h3>
        <p class="muted" style="margin-bottom:18px;">Isi identitasmu supaya progres belajarmu bisa tercatat untuk guru.</p>
        <label style="display:block;font-weight:600;font-size:.85rem;margin-bottom:6px;color:var(--indigo);">Nama Lengkap</label>
        <input id="loginNama" type="text" placeholder="Nama kamu"
          style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid var(--line);margin-bottom:14px;font-family:inherit;font-size:.95rem;">
        <label style="display:block;font-weight:600;font-size:.85rem;margin-bottom:6px;color:var(--indigo);">Kelas</label>
        <input id="loginKelas" type="text" placeholder="mis. XI TITL 1"
          style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid var(--line);margin-bottom:20px;font-family:inherit;font-size:.95rem;">
        <button class="btn btn-primary" id="loginSubmitBtn" style="width:100%;justify-content:center;">Mulai Belajar</button>
        <p class="muted" style="font-size:.78rem;margin-top:12px;">Data ini hanya digunakan guru untuk memantau progres belajar, bukan untuk keperluan lain.</p>
      </div>`;
    document.body.appendChild(overlay);

    const submit = () => {
      const nama = overlay.querySelector('#loginNama').value.trim();
      const kelas = overlay.querySelector('#loginKelas').value.trim();
      if (!nama || !kelas) {
        alert('Nama dan kelas wajib diisi ya.');
        return;
      }
      setUser(nama, kelas);
      overlay.remove();
      resolve({ nama, kelas });
    };
    overlay.querySelector('#loginSubmitBtn').addEventListener('click', submit);
    overlay.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    });
  });
}

// Kirim satu baris catatan ke Google Sheets.
function logEvent(aktivitas, detail = '', skor = '') {
  const user = getUser();
  if (!user) return;
  const payload = {
    waktu: new Date().toISOString(),
    nama: user.nama,
    kelas: user.kelas,
    halaman: document.title,
    tahap: (typeof PAGE_TAHAP !== 'undefined') ? PAGE_TAHAP : '',
    aktivitas,
    detail,
    skor
  };
  if (!SHEET_WEBAPP_URL || SHEET_WEBAPP_URL.startsWith('GANTI_')) {
    console.warn('[tracking] SHEET_WEBAPP_URL belum diisi — data tidak dikirim.', payload);
    return;
  }
  // mode 'no-cors' dipakai karena Apps Script Web App tidak mengirim header
  // CORS untuk permintaan lintas origin; kita tidak perlu membaca responsnya.
  fetch(SHEET_WEBAPP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

// Tampilkan chip "Masuk sebagai ..." di footer setiap halaman.
function renderUserChip() {
  const user = getUser();
  if (!user) return;
  const footer = document.querySelector('.site-footer .wrap');
  if (!footer) return;
  const chip = document.createElement('div');
  chip.style.cssText = 'margin-top:8px;font-size:.8rem;';
  chip.innerHTML = `Masuk sebagai <strong>${user.nama}</strong> (${user.kelas}) · <a href="#" id="gantiPenggunaLink" style="text-decoration:underline;">Ganti pengguna</a>`;
  footer.appendChild(chip);
  document.getElementById('gantiPenggunaLink').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Ganti pengguna? Kamu perlu mengisi nama & kelas lagi di halaman ini.')) clearUser();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await ensureLogin();
  renderUserChip();
  logEvent('Akses Halaman');
});
