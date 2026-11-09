/* =======================================================================
   LOGIN + PENCATATAN — E-Modul TITL
   - Siswa wajib mengisi Nama, Kelas, dan Password (dibuat guru) setiap
     kali membuka e-modul baru (sesi hilang saat tab/browser ditutup).
   - Password DIPERIKA di Google Apps Script (tidak ada di kode web ini).
   - Setelah login, aktivitas direkap ke Google Sheets (hanya terbaca guru).
   URL Apps Script diatur di js/config.js
   ======================================================================= */
const SESSION_KEY = 'emodul_session';

function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
}
function getUser() { return getSession(); }          // kompatibel dengan kode lama
function clearUser() { sessionStorage.removeItem(SESSION_KEY); location.reload(); }
function configured() { return SHEET_WEBAPP_URL && !SHEET_WEBAPP_URL.startsWith('GANTI_'); }

async function apiPost(payload) {
  const res = await fetch(SHEET_WEBAPP_URL, {
    method: 'POST', keepalive: true,        // tetap terkirim walau halaman langsung berpindah
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function ensureLogin() {
  const existing = getSession();
  if (existing && existing.token) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const last = (() => { try { return JSON.parse(localStorage.getItem('emodul_last') || '{}'); } catch (e) { return {}; } })();
    const screen = document.createElement('div');
    screen.className = 'login-screen';
    screen.innerHTML = `
      <div class="login-card">
        <div class="login-brand">
          <svg viewBox="0 0 24 24" fill="none" width="34" height="34"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.6 10.8c.6.45 1.1 1.2 1.1 2.2h5c0-1 .5-1.75 1.1-2.2A6 6 0 0012 3z" stroke="#D9678F" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>E-Modul TITL</span>
        </div>
        <h2>Masuk dulu ya</h2>
        <p class="muted">Gunakan nama asli dan password yang diberikan gurumu.</p>
        <label for="loginNama">Nama Lengkap</label>
        <input id="loginNama" type="text" autocomplete="name" placeholder="Nama kamu" value="${(last.nama || '').replace(/"/g, '&quot;')}">
        <label for="loginKelas">Kelas</label>
        <input id="loginKelas" type="text" placeholder="mis. XI TITL 1" value="${(last.kelas || '').replace(/"/g, '&quot;')}">
        <label for="loginPass">Password</label>
        <div class="pass-row">
          <input id="loginPass" type="password" autocomplete="off" placeholder="Password dari guru">
          <button type="button" id="passEye" data-no-sfx="true" aria-label="Tampilkan password">👁</button>
        </div>
        <div class="login-msg" id="loginMsg" role="alert"></div>
        <button class="btn btn-primary" id="loginSubmitBtn" style="width:100%;justify-content:center;">Masuk</button>
        <p class="muted" style="font-size:.78rem;margin:12px 0 0;">Aktivitas belajarmu dicatat untuk guru. Data hanya dapat dilihat guru dan pembuat e-modul.</p>
      </div>`;
    document.body.appendChild(screen);
    const $ = (id) => screen.querySelector(id);
    const msg = $('#loginMsg'), btn = $('#loginSubmitBtn');
    const showMsg = (t) => { msg.textContent = t; msg.classList.toggle('show', !!t); };

    $('#passEye').addEventListener('click', () => {
      const i = $('#loginPass'); i.type = i.type === 'password' ? 'text' : 'password';
    });

    async function submit() {
      const nama = $('#loginNama').value.trim(), kelas = $('#loginKelas').value.trim(), password = $('#loginPass').value;
      if (!nama || !kelas || !password) { showMsg('Nama, kelas, dan password wajib diisi.'); if (window.sfx) sfx.wrong(); return; }
      if (!configured()) { showMsg('Alamat server (Apps Script) belum diatur. Guru/pembuat web perlu mengisi js/config.js.'); return; }
      btn.disabled = true; btn.textContent = 'Memeriksa…'; showMsg('');
      try {
        const r = await apiPost({ action: 'login', nama, kelas, password });
        if (r && r.ok) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nama, kelas, token: r.token }));
          localStorage.setItem('emodul_last', JSON.stringify({ nama, kelas }));
          screen.remove();
          if (window.sfx) sfx.pageIn();
          if (window.startMusic && window.isMusicPref && isMusicPref()) startMusic();
          resolve({ nama, kelas, token: r.token });
        } else {
          showMsg((r && r.error) || 'Login gagal. Periksa kembali datamu.');
          if (window.sfx) sfx.wrong();
        }
      } catch (e) {
        showMsg('Tidak bisa terhubung ke server. Periksa internet lalu coba lagi.');
      }
      btn.disabled = false; btn.textContent = 'Masuk';
    }
    btn.addEventListener('click', submit);
    screen.querySelectorAll('input').forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
    setTimeout(() => (last.nama ? $('#loginPass') : $('#loginNama')).focus(), 50);
  });
}

/* ---------- antrean offline: aktivitas tidak hilang bila sinyal HP putus ---------- */
const QUEUE_KEY = 'emodul_queue';
function queueGet() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) { return []; } }
function queueSet(q) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-300))); } catch (e) {} }
function queuePush(p) { const q = queueGet(); q.push(p); queueSet(q); }
let flushing = false;
async function flushQueue() {
  if (flushing) return;
  const s = getSession(); if (!s || !s.token || !configured()) return;
  flushing = true;
  try {
    let q = queueGet();
    while (q.length) {
      const p = q[0];
      if (p.nama !== s.nama || p.kelas !== s.kelas) { q.shift(); queueSet(q); continue; }   // milik siswa lain
      p.token = s.token;
      const r = await apiPost(p);
      if (r && r.error === 'unauthorized') { q = []; queueSet(q); break; }
      q.shift(); queueSet(q);
    }
  } catch (e) { /* masih offline, coba lagi nanti */ }
  flushing = false;
}
window.addEventListener('online', flushQueue);

function buildPayload(aktivitas, detail, skor) {
  const s = getSession();
  return {
    action: 'log',
    waktu: new Date().toISOString(),                 // jam perangkat saat kejadian (server menambah jam server)
    nama: s.nama, kelas: s.kelas, token: s.token,
    halaman: document.title,
    tahap: (typeof PAGE_TAHAP !== 'undefined') ? PAGE_TAHAP : '',
    aktivitas, detail, skor
  };
}

// Catat satu aktivitas ke Google Sheets (butuh token hasil login)
function logEvent(aktivitas, detail = '', skor = '') {
  const s = getSession();
  if (!s || !s.token || !configured()) return;
  const payload = buildPayload(aktivitas, detail, skor);
  apiPost(payload).then(r => {
    if (r && r.error === 'unauthorized') {          // password diganti guru → login ulang
      sessionStorage.removeItem(SESSION_KEY);
      alert('Sesi login berakhir. Silakan masuk kembali.');
      location.reload();
    }
  }).catch(() => { queuePush(payload); });          // gagal kirim → simpan dulu, kirim ulang nanti
}

// Dipakai saat halaman ditutup/disembunyikan (fetch biasa bisa terpotong)
function logEventBeacon(aktivitas, detail = '', skor = '') {
  const s = getSession();
  if (!s || !s.token || !configured()) return;
  const payload = buildPayload(aktivitas, detail, skor);
  let ok = false;
  try { ok = navigator.sendBeacon(SHEET_WEBAPP_URL, new Blob([JSON.stringify(payload)], { type: 'text/plain;charset=UTF-8' })); } catch (e) {}
  if (!ok) queuePush(payload);
}

/* ---------- durasi aktif di setiap halaman ---------- */
let activeSince = document.hidden ? null : Date.now(), activeMs = 0;
function pauseActive() { if (activeSince) { activeMs += Date.now() - activeSince; activeSince = null; } }
function reportDuration() {
  pauseActive();
  const sec = Math.round(activeMs / 1000); activeMs = 0;
  if (sec >= 2) logEventBeacon('Durasi Halaman', sec + ' detik');
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) reportDuration(); else activeSince = Date.now();
});
window.addEventListener('pagehide', reportDuration);

// Pindah tab/bagian di halaman (Materi: Dasar, Komponen, Simulasi, dst.). Jobsheet punya log sendiri.
document.addEventListener('tabchange', e => {
  if (typeof PAGE_TAHAP !== 'undefined' && PAGE_TAHAP === 'Jobsheet') return;
  const btn = document.querySelector(`.tab-btn[data-tab="${e.detail}"]`);
  logEvent('Buka Bagian', btn ? btn.textContent.trim() : e.detail);
});

function renderUserChip() {
  const s = getSession();
  const footer = document.querySelector('.site-footer .wrap');
  if (!s || !footer) return;
  const chip = document.createElement('div');
  chip.style.cssText = 'margin-top:8px;font-size:.8rem;';
  chip.innerHTML = `Masuk sebagai <strong>${s.nama.replace(/</g, '&lt;')}</strong> (${s.kelas.replace(/</g, '&lt;')}) · <a href="#" id="keluarLink" style="text-decoration:underline;">Keluar</a>`;
  footer.appendChild(chip);
  document.getElementById('keluarLink').addEventListener('click', (e) => {
    e.preventDefault();
    logEvent('Logout');
    setTimeout(clearUser, 150);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await ensureLogin();
  document.dispatchEvent(new Event('emodul:login'));   // memberi tahu chat.js dll bahwa siswa sudah masuk
  renderUserChip();
  // waktu pertama kali siswa mulai mengakses e-modul pada sesi ini
  try {
    if (!sessionStorage.getItem('emodul_mulai')) {
      sessionStorage.setItem('emodul_mulai', new Date().toISOString());
      const dev = (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'HP/tablet' : 'Komputer') + ' ' + window.innerWidth + 'x' + window.innerHeight;
      logEvent('Mulai Sesi Belajar', dev);
    }
  } catch (e) {}
  logEvent('Akses Halaman');
  flushQueue();
});
