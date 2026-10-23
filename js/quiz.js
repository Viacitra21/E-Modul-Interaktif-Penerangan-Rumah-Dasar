/* =======================================================================
   QUIZ ENGINE — dipakai oleh Latihan (formatif) dan Evaluasi (sumatif)
   Level kognitif Bloom C1–C6. Tipe soal: mc, tf, identify, order.
   mode 'practice'   : ada petunjuk, verifikasi + penjelasan per soal
   mode 'assessment' : tanpa verifikasi per soal; hasil di akhir
   ======================================================================= */
const BLOOM = {
  1: { kode: 'C1', nama: 'Mengingat',    saran: 'Ulangi tab Komponen dan Kenali Simbol di halaman Materi.' },
  2: { kode: 'C2', nama: 'Memahami',     saran: 'Baca lagi fungsi tiap komponen dan dengarkan penjelasan diagram di tab Pahami Rangkaian.' },
  3: { kode: 'C3', nama: 'Menerapkan',   saran: 'Latih dengan Simulasi Trainer Virtual dan hitung daya/arus sederhana (I = P / V).' },
  4: { kode: 'C4', nama: 'Menganalisis', saran: 'Pelajari panduan Troubleshooting di halaman Praktik dan telusuri penyebab gangguan.' },
  5: { kode: 'C5', nama: 'Mengevaluasi', saran: 'Bandingkan rancangan dengan aturan K3: saklar di fasa, sambungan rapi dan berisolasi.' },
  6: { kode: 'C6', nama: 'Mencipta',     saran: 'Coba Simulasi Level 2, rancang sendiri rangkaian dua lampu dan urutan kerjanya.' }
};
const BLOOM_COLOR = { 1: '#159E93', 2: '#4A7FD6', 3: '#7A5BD6', 4: '#D9678F', 5: '#E8A23D', 6: '#C94B4B' };

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function startQuiz(cfg) {
  const root = document.getElementById(cfg.root);
  const practice = cfg.mode === 'practice';
  const Q = cfg.questions.map(q => ({ ...q }));
  let idx = 0, results = [], answered = false, current = null;

  function chip(level) {
    const b = BLOOM[level];
    return `<span class="bloom-chip" style="background:${BLOOM_COLOR[level]}1A;color:${BLOOM_COLOR[level]};border-color:${BLOOM_COLOR[level]}55">${b.kode} · ${b.nama}</span>`;
  }

  function render() {
    answered = false; current = null;
    const q = Q[idx];
    const done = results.filter(r => r.ok).length;
    root.innerHTML = `
      <div class="quiz-progress"><span>Soal ${idx + 1} / ${Q.length}</span>${practice ? `<span>Benar: ${done}</span>` : `<span>${q.cat || ''}</span>`}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${(idx / Q.length) * 100}%"></div></div>
      <div class="quiz-card">
        <div class="quiz-meta">${chip(q.level)}<span class="quiz-type-tag">${{ mc: 'Pilihan Ganda', tf: 'Benar / Salah', identify: 'Identifikasi Gambar', order: 'Urutkan' }[q.type]}</span></div>
        <div class="quiz-question">${esc(q.q)}</div>
        <div id="qBody"></div>
        <div class="quiz-feedback" id="qFeedback"></div>
        <div class="btn-row" style="margin-top:20px;">
          <button class="btn btn-primary" id="qNext" style="display:none;" data-no-sfx="true"></button>
        </div>
      </div>`;
    const body = root.querySelector('#qBody');
    if (practice && q.hint) {
      const hb = document.createElement('button'); hb.className = 'hint-btn'; hb.setAttribute('data-no-sfx', 'true'); hb.textContent = '💡 Butuh petunjuk?';
      const hx = document.createElement('div'); hx.className = 'hint-box'; hx.textContent = q.hint;
      hb.onclick = () => { hx.classList.toggle('show'); hb.textContent = hx.classList.contains('show') ? '💡 Sembunyikan petunjuk' : '💡 Butuh petunjuk?'; if (hx.classList.contains('show')) sfx.hint(); };
      body.append(hb, hx);
    }
    if (q.type === 'mc' || q.type === 'identify') renderChoices(q, body);
    if (q.type === 'tf') renderTF(q, body);
    if (q.type === 'order') renderOrder(q, body);
    const next = root.querySelector('#qNext');
    next.textContent = idx === Q.length - 1 ? 'Lihat Hasil →' : (practice ? 'Soal berikutnya →' : 'Lanjut →');
    next.onclick = () => { sfx.navigate(); advance(); };
    if (!practice) { next.style.display = 'inline-flex'; next.disabled = true; }
  }

  function renderChoices(q, body) {
    if (q.type === 'identify') {
      const w = document.createElement('div'); w.className = 'symbol-view';
      w.innerHTML = `<svg viewBox="0 0 40 40" width="100%">${q.symbol}</svg>`; body.appendChild(w);
    }
    const opts = q.options.map((t, i) => ({ t, i }));
    const list = document.createElement('div'); list.className = 'quiz-options';
    shuffle(opts).forEach(o => {
      const b = document.createElement('button'); b.className = 'quiz-opt'; b.setAttribute('data-no-sfx', 'true'); b.textContent = o.t;
      b.onclick = () => choose(o.i === q.correct, b, list, q);
      list.appendChild(b);
    });
    body.appendChild(list);
  }
  function renderTF(q, body) {
    const list = document.createElement('div'); list.className = 'quiz-options';
    [['Benar', true], ['Salah', false]].forEach(([t, v]) => {
      const b = document.createElement('button'); b.className = 'quiz-opt'; b.setAttribute('data-no-sfx', 'true'); b.textContent = t;
      b.onclick = () => choose(v === q.correct, b, list, q);
      list.appendChild(b);
    });
    body.appendChild(list);
  }
  function choose(ok, btn, list, q) {
    if (practice) {
      if (answered) return; answered = true;
      [...list.children].forEach(b => b.disabled = true);
      btn.classList.add(ok ? 'correct' : 'wrong');
      finishQuestion(ok, q);
    } else {
      [...list.children].forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected'); sfx.click();
      current = ok;
      const n = root.querySelector('#qNext'); n.disabled = false;
    }
  }

  function renderOrder(q, body) {
    const wrap = document.createElement('div'); wrap.className = 'order-wrap';
    wrap.innerHTML = `<div class="order-col"><h5>Pilihan langkah (klik untuk memilih)</h5><div class="order-pool"></div></div>
                      <div class="order-col"><h5>Urutanmu</h5><ol class="order-answer"></ol></div>`;
    body.appendChild(wrap);
    const pool = wrap.querySelector('.order-pool'), ans = wrap.querySelector('.order-answer');
    let chosen = [];
    const items = shuffle(q.items.map((t, i) => ({ t, i })));
    function redraw() {
      pool.innerHTML = ''; ans.innerHTML = '';
      items.filter(it => !chosen.includes(it.i)).forEach(it => {
        const b = document.createElement('button'); b.className = 'order-item'; b.setAttribute('data-no-sfx', 'true'); b.textContent = it.t;
        b.onclick = () => { if (answered) return; chosen.push(it.i); sfx.tick(); redraw(); }; pool.appendChild(b);
      });
      chosen.forEach((ci, pos) => {
        const li = document.createElement('li'); const b = document.createElement('button'); b.className = 'order-item picked'; b.setAttribute('data-no-sfx', 'true');
        b.textContent = q.items[ci];
        b.onclick = () => { if (answered) return; chosen.splice(pos, 1); sfx.unplug(); redraw(); };
        li.appendChild(b); ans.appendChild(li);
      });
      const full = chosen.length === q.items.length;
      const act = root.querySelector('#orderAct');
      if (act) act.disabled = !full;
      if (!practice) { root.querySelector('#qNext').disabled = !full; current = full ? chosen.every((c, p) => c === p) : null; }
    }
    redraw();
    if (practice) {
      const act = document.createElement('button'); act.className = 'btn btn-pink btn-sm'; act.id = 'orderAct'; act.textContent = 'Periksa urutan'; act.disabled = true; act.setAttribute('data-no-sfx', 'true');
      act.onclick = () => {
        if (answered) return; answered = true;
        const ok = chosen.every((c, p) => c === p);
        ans.querySelectorAll('.order-item').forEach((b, p) => b.classList.add(chosen[p] === p ? 'correct' : 'wrong'));
        act.style.display = 'none';
        finishQuestion(ok, q, 'Urutan yang benar: ' + q.items.map((t, i) => `${i + 1}) ${t}`).join('  '));
      };
      body.appendChild(act);
      const orig = redraw;
    }
  }

  function finishQuestion(ok, q, extra) {
    ok ? sfx.correct() : sfx.wrong();
    results[idx] = { ok, level: q.level, cat: q.cat };
    const fb = root.querySelector('#qFeedback');
    fb.textContent = (ok ? '✔ Benar! ' : '✘ Belum tepat. ') + q.explain + (extra ? ' ' + extra : '');
    fb.style.background = ok ? '#E4F6E9' : '#FBE7E7'; fb.style.color = ok ? '#1D5E36' : '#8C2F2F';
    fb.classList.add('show');
    const sc = root.querySelector('.quiz-progress span:last-child'); if (sc) sc.textContent = 'Benar: ' + results.filter(r => r && r.ok).length;
    root.querySelector('#qNext').style.display = 'inline-flex';
  }

  function advance() {
    if (!practice) results[idx] = { ok: current === true, level: Q[idx].level, cat: Q[idx].cat };
    idx++;
    idx >= Q.length ? showResult() : render();
  }

  function bars(groups, title) {
    return `<h4 class="res-h">${title}</h4><div class="indicator-list">` + groups.map(g =>
      `<div class="indicator-row"><span>${g.label}</span><div class="indicator-track"><div class="indicator-fill" style="width:${g.pct}%"></div></div><span>${g.pct}%</span></div>`).join('') + '</div>';
  }

  function showResult() {
    const total = results.filter(r => r.ok).length, pct = Math.round(total / Q.length * 100);
    const byLevel = {}, byCat = {};
    results.forEach(r => {
      (byLevel[r.level] = byLevel[r.level] || { c: 0, t: 0 }); byLevel[r.level].t++; if (r.ok) byLevel[r.level].c++;
      if (r.cat) { (byCat[r.cat] = byCat[r.cat] || { c: 0, t: 0 }); byCat[r.cat].t++; if (r.ok) byCat[r.cat].c++; }
    });
    const lv = Object.keys(byLevel).sort().map(l => ({ lvl: +l, label: `${BLOOM[l].kode} ${BLOOM[l].nama}`, pct: Math.round(byLevel[l].c / byLevel[l].t * 100) }));
    const ct = Object.keys(byCat).map(c => ({ label: c, pct: Math.round(byCat[c].c / byCat[c].t * 100) }));
    const low = lv.slice().sort((a, b) => a.pct - b.pct)[0];
    const lulus = pct >= (cfg.passPct || 70);
    sfx.success();
    root.innerHTML = `
      <div class="score-panel">
        <div style="color:rgba(255,255,255,.7);font-weight:600;">${cfg.title}</div>
        <div class="score-num">${practice ? total + ' / ' + Q.length : pct}</div>
        ${practice ? '' : `<div style="color:rgba(255,255,255,.7);">dari 100</div>`}
        ${bars(lv, 'Capaian per level kognitif')}
        ${ct.length ? bars(ct, 'Capaian per indikator') : ''}
      </div>
      <p class="center" style="margin-top:20px;font-size:1.05rem;font-weight:600;color:${lulus ? '#227A47' : '#8A5A11'}">
        ${lulus ? '✅ ' + cfg.passMsg : `📘 Fokus perkuat level ${BLOOM[low.lvl].kode} (${BLOOM[low.lvl].nama}). ${BLOOM[low.lvl].saran}`}</p>
      ${lulus && low.pct < 60 ? `<p class="center muted" style="margin-top:-6px;">Catatan: level ${BLOOM[low.lvl].kode} (${BLOOM[low.lvl].nama}) masih rendah. ${BLOOM[low.lvl].saran}</p>` : ''}
      <div class="btn-row" style="justify-content:center;margin-top:8px;">
        <button class="btn btn-ghost" onclick="location.reload()" data-no-sfx="true">Ulangi</button>
        ${cfg.nextHref ? `<a href="${cfg.nextHref}" class="btn btn-primary">${cfg.nextLabel}</a>` : ''}
      </div>`;
    const detail = practice ? `Benar ${total} dari ${Q.length} soal`
      : lv.map(l => `${BLOOM[l.lvl].kode}: ${l.pct}%`).join(', ') + ' | ' + ct.map(c => `${c.label}: ${c.pct}%`).join(', ');
    logEvent(cfg.logName, detail, practice ? total : pct);
  }

  render();
}
