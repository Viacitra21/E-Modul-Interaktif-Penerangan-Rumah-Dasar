/* =======================================================================
   ASISTEN AI — tanya jawab materi + riwayat percakapan + aktivitas saya
   - Tombol mengambang (tidak mengganggu tampilan utama), panel chat
     berubah jadi lembar penuh di HP.
   - Pertanyaan dikirim ke Google Apps Script (kunci API AI disimpan di
     server, TIDAK ada di kode web). Setiap tanya-jawab tersimpan di
     Google Sheets (tab "Chat") atas nama siswa → bisa dibuka lagi kapan saja.
   - Tab "Riwayat" menampilkan semua tanya-jawab sebelumnya dari server.
   - Tab "Aktivitas" menampilkan jejak aktivitas siswa (waktu tiap tahap).
   ======================================================================= */
(() => {
  let started = false, panel, fab, busy = false, convo = [];   // convo = [{role:'user'|'assistant', content}]
  const SUGGEST = [
    'Apa bedanya fasa dan netral?',
    'Mengapa saklar dipasang di kabel fasa?',
    'Jelaskan rangkaian paralel dengan contoh sederhana',
    'Apa yang terjadi saat terjadi hubung singkat?'
  ];
  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rich = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const fmt = (iso) => {
    const d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const cacheKey = () => { const s = getSession(); return 'emodul_chat_' + (s ? s.nama.toLowerCase() + '|' + s.kelas.toLowerCase() : ''); };
  const cacheGet = () => { try { return JSON.parse(localStorage.getItem(cacheKey()) || '[]'); } catch (e) { return []; } };
  const cacheAdd = (m) => { try { const c = cacheGet(); c.push(m); localStorage.setItem(cacheKey(), JSON.stringify(c.slice(-60))); } catch (e) {} };
  const $ = (sel) => panel.querySelector(sel);

  function build() {
    fab = document.createElement('button');
    fab.className = 'ai-fab'; fab.type = 'button'; fab.setAttribute('data-no-sfx', 'true');
    fab.setAttribute('aria-label', 'Buka asisten AI');
    fab.innerHTML = '<span class="ai-ic">🤖</span><span class="ai-lbl">Tanya AI</span>';
    panel = document.createElement('section');
    panel.className = 'ai-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Asisten AI e-modul');
    panel.innerHTML = `
      <div class="ai-head"><div><strong>🤖 Asisten Belajar</strong><small>Tanya apa saja tentang materi e-modul</small></div>
        <button type="button" id="aiClose" aria-label="Tutup" data-no-sfx="true">✕</button></div>
      <div class="ai-tabs">
        <button type="button" data-t="chat" class="active" data-no-sfx="true">💬 Tanya AI</button>
        <button type="button" data-t="hist" data-no-sfx="true">🕘 Riwayat</button>
        <button type="button" data-t="act" data-no-sfx="true">📈 Aktivitas</button>
      </div>
      <div class="ai-body active" id="aiChat"></div>
      <div class="ai-body" id="aiHist"></div>
      <div class="ai-body" id="aiAct"></div>
      <form class="ai-form" id="aiForm">
        <textarea id="aiInput" rows="1" maxlength="500" placeholder="Tulis pertanyaanmu…" aria-label="Pertanyaan"></textarea>
        <button type="submit" id="aiSend" aria-label="Kirim" data-no-sfx="true">➤</button>
      </form>
      <div class="ai-note">AI bisa keliru. Untuk praktik listrik, ikuti jobsheet & arahan guru (K3). Percakapan dicatat untuk guru.</div>`;
    document.body.appendChild(fab); document.body.appendChild(panel);

    fab.addEventListener('click', () => toggle());
    $('#aiClose').addEventListener('click', () => toggle(false));
    panel.querySelector('.ai-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showTab(b.dataset.t); });
    $('#aiForm').addEventListener('submit', e => { e.preventDefault(); send($('#aiInput').value); });
    const ta = $('#aiInput');
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(ta.value); } });
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(96, ta.scrollHeight) + 'px'; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) toggle(false); });

    // tampilkan percakapan terakhir dari perangkat ini
    cacheGet().slice(-12).forEach(m => addMsg(m.role === 'user' ? 'me' : 'bot', m.text, m.waktu, true));
    if (!$('#aiChat').children.length) welcome();
  }

  function welcome() {
    const s = getSession();
    const box = $('#aiChat');
    addMsg('bot', `Halo ${s ? s.nama.split(' ')[0] : ''}! Aku asisten belajar e-modul Penerangan Rumah Dasar. Kamu bisa bertanya tentang materi, komponen, rangkaian, simulasi, atau soal yang belum kamu pahami.`, null, true);
    const sg = document.createElement('div'); sg.className = 'ai-sugg'; sg.id = 'aiSugg';
    SUGGEST.forEach(q => { const b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.setAttribute('data-no-sfx', 'true'); b.addEventListener('click', () => send(q)); sg.appendChild(b); });
    box.appendChild(sg);
  }

  function toggle(force) {
    const open = force === undefined ? !panel.classList.contains('open') : force;
    panel.classList.toggle('open', open);
    fab.setAttribute('aria-expanded', String(open));
    if (open) {
      if (window.sfx) sfx.pop();
      logEvent('Buka Asisten AI');
      showTab('chat');
      setTimeout(() => $('#aiInput').focus(), 80);
    } else if (window.sfx) sfx.close();
  }

  function showTab(t) {
    panel.querySelectorAll('.ai-tabs button').forEach(b => b.classList.toggle('active', b.dataset.t === t));
    ['chat', 'hist', 'act'].forEach(k => $('#ai' + k.charAt(0).toUpperCase() + k.slice(1)).classList.toggle('active', k === t));
    $('#aiForm').style.display = t === 'chat' ? 'flex' : 'none';
    if (t === 'hist' || t === 'act') loadHistory(t);
    if (t === 'chat') { const c = $('#aiChat'); c.scrollTop = c.scrollHeight; }
  }

  function addMsg(who, text, waktu, noScroll) {
    const box = $('#aiChat'), d = document.createElement('div');
    d.className = 'ai-msg ' + who;
    d.innerHTML = rich(text) + (waktu ? `<span class="ai-time">${fmt(waktu)}</span>` : '');
    box.appendChild(d);
    if (!noScroll) box.scrollTop = box.scrollHeight;
    return d;
  }

  async function send(raw) {
    const text = String(raw || '').trim();
    if (!text || busy) return;
    const s = getSession(); if (!s) return;
    busy = true; $('#aiSend').disabled = true;
    const sg = $('#aiSugg'); if (sg) sg.remove();
    const input = $('#aiInput'); input.value = ''; input.style.height = 'auto';
    const waktuTanya = new Date().toISOString();
    addMsg('me', text, waktuTanya);
    const typing = document.createElement('div'); typing.className = 'ai-msg bot';
    typing.innerHTML = '<span class="ai-typing"><i></i><i></i><i></i></span>';
    $('#aiChat').appendChild(typing); $('#aiChat').scrollTop = 1e6;
    const tabAktif = document.querySelector('.tabs .tab-btn.active');
    try {
      const r = await apiPost({
        action: 'chat', nama: s.nama, kelas: s.kelas, token: s.token, waktu: waktuTanya,
        pesan: text, riwayat: convo.slice(-6),
        halaman: document.title, tahap: (typeof PAGE_TAHAP !== 'undefined') ? PAGE_TAHAP : '',
        konteks: tabAktif ? tabAktif.textContent.trim() : ''
      });
      typing.remove();
      if (r && r.error === 'unauthorized') { sessionStorage.removeItem(SESSION_KEY); alert('Sesi login berakhir. Silakan masuk kembali.'); location.reload(); return; }
      if (r && r.ok) {
        addMsg('bot', r.jawaban, r.waktu || new Date().toISOString());
        convo.push({ role: 'user', content: text }, { role: 'assistant', content: r.jawaban });
        cacheAdd({ role: 'user', text, waktu: waktuTanya }); cacheAdd({ role: 'assistant', text: r.jawaban, waktu: r.waktu || new Date().toISOString() });
        if (window.sfx) sfx.tick();
      } else {
        addMsg('err', (r && r.error) || 'AI belum bisa menjawab. Coba lagi sebentar.');
      }
    } catch (e) {
      typing.remove();
      addMsg('err', 'Tidak bisa terhubung ke server. Periksa internet lalu kirim ulang pertanyaanmu.');
    }
    busy = false; $('#aiSend').disabled = false; input.focus();
  }

  // ---- Riwayat & aktivitas dari server (tersimpan, bisa dibuka lagi) ----
  let histCache = null;
  async function loadHistory(tab) {
    const box = $(tab === 'hist' ? '#aiHist' : '#aiAct');
    box.innerHTML = '<div class="ai-empty">Memuat…</div>';
    const s = getSession();
    try {
      const r = await apiPost({ action: 'history', nama: s.nama, kelas: s.kelas, token: s.token });
      if (!r || !r.ok) throw new Error((r && r.error) || 'gagal');
      histCache = r;
    } catch (e) {
      box.innerHTML = '<div class="ai-empty">Belum bisa memuat dari server.' + (tab === 'hist' && cacheGet().length ? ' Menampilkan riwayat di perangkat ini.' : '') + '</div>';
      if (tab === 'hist') renderLocalHistory(box);
      return;
    }
    if (tab === 'hist') {
      const items = histCache.chat || [];
      if (!items.length) { box.innerHTML = '<div class="ai-empty">Belum ada riwayat percakapan.<br>Pertanyaanmu akan tersimpan di sini.</div>'; return; }
      box.innerHTML = '';
      items.slice().reverse().forEach(it => {
        const q = document.createElement('div'); q.className = 'ai-msg me'; q.innerHTML = rich(it.pertanyaan) + `<span class="ai-time">${fmt(it.waktu)}</span>`;
        const a = document.createElement('div'); a.className = 'ai-msg bot'; a.innerHTML = rich(it.jawaban);
        box.appendChild(q); box.appendChild(a);
      });
    } else {
      const items = histCache.aktivitas || [];
      if (!items.length) { box.innerHTML = '<div class="ai-empty">Belum ada aktivitas tercatat.</div>'; return; }
      box.innerHTML = '<div class="ai-act"></div>';
      const list = box.firstChild;
      items.slice().reverse().forEach(it => {
        const d = document.createElement('div'); d.className = 'ai-act-item';
        d.innerHTML = `<b>${esc(it.aktivitas)}</b>${it.detail ? esc(it.detail) + '<br>' : ''}<span>${esc(it.halaman || '')} · ${fmt(it.waktu)}</span>`;
        list.appendChild(d);
      });
    }
  }
  function renderLocalHistory(box) {
    const c = cacheGet(); if (!c.length) return;
    box.innerHTML = '';
    c.forEach(m => { const d = document.createElement('div'); d.className = 'ai-msg ' + (m.role === 'user' ? 'me' : 'bot'); d.innerHTML = rich(m.text) + `<span class="ai-time">${fmt(m.waktu)}</span>`; box.appendChild(d); });
  }

  function start() {
    if (started || !getSession() || !configured()) return;
    started = true; build();
  }
  document.addEventListener('emodul:login', start);
  document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0));   // sudah login sebelumnya di sesi ini
})();
