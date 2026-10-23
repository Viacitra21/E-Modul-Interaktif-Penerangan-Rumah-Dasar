/* =======================================================================
   DIAGRAM INTERAKTIF + NARATOR SUARA PEREMPUAN
   - Narasi per langkah, diagram menyorot komponen & arus bergerak.
   - Suara: (1) file rekaman assets/audio/narasi/<rangkaian>-<n>.mp3 bila ada,
            (2) jika tidak ada, suara perempuan bahasa Indonesia dari browser
                (Web Speech API). Teks selalu tampil sebagai keterangan.
   ======================================================================= */
const Diagram = (() => {
  const NS = 'http://www.w3.org/2000/svg';

  const CIRCUITS = {
    satu: {
      nama: '1 lampu', vb: '0 0 520 410',
      wires: { w1: 'M260 34 L260 70', w2: 'M260 110 L260 160', w3: 'M260 200 L260 248', w4: 'M260 312 L260 372' },
      comps: [
        { id: 'mcb', type: 'rect', x: 200, y: 70, w: 120, h: 40, t: 'MCB' },
        { id: 'sk', type: 'rect', x: 200, y: 160, w: 120, h: 40, t: 'SAKLAR' },
        { id: 'lamp', type: 'lamp', cx: 260, cy: 280, r: 32, t: 'LAMPU' }],
      labels: [{ id: 'L', x: 260, y: 24, t: 'L (fasa)' }, { id: 'N', x: 260, y: 394, t: 'N (netral)' }],
      steps: [
        { chip: 'Sumber', focus: ['L'], live: ['w1'], dots: ['w1'], lamp: false,
          text: 'Mari kita ikuti perjalanan arus listrik. Arus berasal dari sumber melalui penghantar fasa, yang biasa ditulis huruf L.' },
        { chip: 'MCB', focus: ['mcb'], live: [], dots: [], lamp: false,
          text: 'Arus pertama kali tiba di MCB. MCB adalah pengaman otomatis. Jika terjadi hubung singkat atau beban berlebih, MCB akan memutus arus supaya instalasi dan kita tetap aman.' },
        { chip: 'Saklar', focus: ['sk'], live: ['w2'], dots: ['w2'], lamp: false,
          text: 'Dari MCB, arus mengalir ke saklar. Saklar bertugas menyambung dan memutus aliran arus menuju lampu. Saat saklar OFF, arus berhenti di sini dan lampu tidak menyala.' },
        { chip: 'Lampu', focus: ['lamp'], live: ['w3'], dots: ['w3'], lamp: true,
          text: 'Ketika saklar ON, arus diteruskan ke lampu. Lampu mengubah energi listrik menjadi cahaya, sehingga lampu pun menyala.' },
        { chip: 'Netral', focus: ['N'], live: ['w4'], dots: ['w4'], lamp: true,
          text: 'Setelah melewati lampu, arus kembali ke sumber melalui penghantar netral, atau huruf N. Dengan begitu rangkaian menjadi tertutup dan arus dapat terus mengalir.' },
        { chip: 'K3', focus: ['sk'], live: [], dots: [], lamp: true,
          text: 'Satu hal penting untuk keselamatan: saklar selalu dipasang pada penghantar fasa, bukan netral. Dengan begitu, saat saklar OFF, lampu dan fittingnya benar-benar tidak bertegangan.' }]
    },
    dua: {
      nama: '2 lampu paralel', vb: '0 0 600 460',
      wires: { w1: 'M300 34 L300 70', w2: 'M300 110 L300 150', w3: 'M300 190 L300 232',
        w4a: 'M300 266 L300 288 L170 288 L170 306', w4b: 'M300 266 L300 288 L430 288 L430 306',
        w5a: 'M170 370 L170 408 L300 408', w5b: 'M430 370 L430 408 L300 408', wn: 'M300 408 L300 428' },
      comps: [
        { id: 'mcb', type: 'rect', x: 240, y: 70, w: 120, h: 40, t: 'MCB' },
        { id: 'sk', type: 'rect', x: 240, y: 150, w: 120, h: 40, t: 'SAKLAR' },
        { id: 'ks', type: 'rect', x: 245, y: 232, w: 110, h: 34, t: 'KOTAK SAMBUNG' },
        { id: 'l1', type: 'lamp', cx: 170, cy: 338, r: 32, t: 'LAMPU 1' },
        { id: 'l2', type: 'lamp', cx: 430, cy: 338, r: 32, t: 'LAMPU 2' }],
      labels: [{ id: 'L', x: 300, y: 24, t: 'L (fasa)' }, { id: 'N', x: 300, y: 448, t: 'N (netral)' }],
      steps: [
        { chip: 'Sumber', focus: ['L'], live: ['w1'], dots: ['w1'], lamp: false,
          text: 'Ini rangkaian satu saklar untuk dua lampu, seperti pada trainer di laboratorium. Arus berasal dari sumber melalui penghantar fasa, atau L.' },
        { chip: 'MCB', focus: ['mcb'], live: [], dots: [], lamp: false,
          text: 'Arus pertama tiba di MCB, pengaman otomatis yang memutus arus saat terjadi hubung singkat atau beban berlebih.' },
        { chip: 'Saklar', focus: ['sk'], live: ['w2'], dots: ['w2'], lamp: false,
          text: 'Dari MCB arus menuju satu saklar. Saklar ini mengendalikan kedua lampu sekaligus: saat OFF keduanya padam, saat ON keduanya menyala.' },
        { chip: 'Kotak sambung', focus: ['ks'], live: ['w3'], dots: ['w3'], lamp: false,
          text: 'Dari saklar, arus masuk ke kotak sambung. Di sini jalur arus dibagi menjadi dua cabang, satu cabang untuk setiap lampu.' },
        { chip: 'Dua lampu', focus: ['l1', 'l2'], live: ['w4a', 'w4b'], dots: ['w4a', 'w4b'], lamp: true,
          text: 'Kedua lampu dipasang paralel. Karena itu setiap lampu mendapat tegangan penuh, dan keduanya menyala sama terang.' },
        { chip: 'Netral', focus: ['N'], live: ['w5a', 'w5b', 'wn'], dots: ['w5a', 'w5b', 'wn'], lamp: true,
          text: 'Arus dari kedua lampu bertemu lagi, lalu kembali ke sumber melalui penghantar netral, atau N. Rangkaian pun tertutup.' },
        { chip: 'Paralel & K3', focus: ['l1', 'l2', 'sk'], live: [], dots: [], lamp: true,
          text: 'Karena paralel, jika satu lampu putus, lampu yang lain tetap menyala. Dan ingat selalu: saklar dipasang pada penghantar fasa demi keselamatan.' }]
    }
  };

  let root, cid = 'satu', cur = -1, playing = false, runToken = 0, flowStop = null, voice = null, rate = 1;
  const audioExists = {};

  /* ---------- suara ---------- */
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    const vs = speechSynthesis.getVoices().filter(v => /^(id|in)([-_]|$)/i.test(v.lang));
    if (!vs.length) return null;
    const female = vs.find(v => /gadis|damayanti|female|perempuan|wanita|google bahasa/i.test(v.name) && !/ardi|male|pria|laki/i.test(v.name));
    return female || vs.find(v => !/ardi|\bmale\b|pria|laki/i.test(v.name)) || vs[0];
  }
  function refreshVoice() {
    voice = pickVoice();
    const n = root && root.querySelector('#voiceNote'); if (!n) return;
    if (!('speechSynthesis' in window)) n.textContent = 'Browser ini belum mendukung suara otomatis. Baca keterangan teks di atas.';
    else if (!voice) n.textContent = 'Suara bahasa Indonesia belum tersedia di perangkat ini, jadi narator memakai suara bawaan. Keterangan teks tetap tampil.';
    else n.textContent = 'Suara narator: ' + voice.name + (/gadis|damayanti|google bahasa|female/i.test(voice.name) ? ' (perempuan)' : '');
  }
  async function hasAudio(src) {
    if (src in audioExists) return audioExists[src];
    try { const r = await fetch(src, { method: 'HEAD' }); audioExists[src] = r.ok && /audio/i.test(r.headers.get('content-type') || 'audio'); }
    catch (e) { audioExists[src] = false; }
    return audioExists[src];
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function say(text, i, token) {
    const src = `assets/audio/narasi/${cid}-${i + 1}.mp3`;
    if (await hasAudio(src)) {
      return new Promise(res => {
        const a = new Audio(src); a.playbackRate = rate; currentAudio = a;
        a.onended = a.onerror = () => res(); a.play().catch(() => res());
      });
    }
    if (!('speechSynthesis' in window)) return sleep(Math.max(2500, text.split(' ').length * 380 / rate));
    return new Promise(res => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID'; if (voice) u.voice = voice; u.rate = 0.95 * rate; u.pitch = voice && /female|perempuan|gadis|damayanti|google/i.test(voice.name) ? 1 : 1.15;
      let done = false;
      const readMs = text.split(' ').length * 400 / rate;      // perkiraan tempo baca
      const t0 = Date.now();
      const finish = () => {
        if (done) return;
        const spoke = Date.now() - t0;
        // jika suara gagal berbunyi (error seketika), tetap beri waktu baca agar tidak "lari"
        if (spoke < 700 && runToken === token) { done = true; clearTimeout(guard); setTimeout(res, readMs); return; }
        done = true; clearTimeout(guard); res();
      };
      // batas cadangan: jika browser tidak pernah memicu 'selesai bicara', lanjut otomatis
      const guard = setTimeout(() => { if (!done) { done = true; res(); } }, text.split(' ').length * 650 / rate + 3500);
      u.onend = u.onerror = finish;
      speechSynthesis.speak(u);
    });
  }
  let currentAudio = null;
  function silence() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  }

  /* ---------- gambar diagram ---------- */
  function svgEl(n, a = {}, p) { const e = document.createElementNS(NS, n); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); if (p) p.appendChild(e); return e; }
  function drawCircuit() {
    const C = CIRCUITS[cid], svg = root.querySelector('#diagSvg');
    svg.setAttribute('viewBox', C.vb); svg.innerHTML = '';
    Object.entries(C.wires).forEach(([id, d]) => { const p = svgEl('path', { d, class: 'dg-wire', id: 'dw-' + id }, svg); });
    C.labels.forEach(l => { const t = svgEl('text', { x: l.x, y: l.y, class: 'dg-label', id: 'dl-' + l.id }, svg); t.textContent = l.t; });
    C.comps.forEach((c, i) => {
      const g = svgEl('g', { class: 'dg-comp', id: 'dc-' + c.id, tabindex: 0, role: 'button', 'aria-label': c.t }, svg);
      if (c.type === 'lamp') {
        svgEl('circle', { cx: c.cx, cy: c.cy, r: c.r + 14, class: 'dg-glow', id: 'dgl-' + c.id }, g);
        svgEl('circle', { cx: c.cx, cy: c.cy, r: c.r, class: 'body' }, g);
        const t = svgEl('text', { x: c.cx, y: c.cy + 4 }, g); t.textContent = c.t;
      } else {
        svgEl('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 8 }, g);
        const t = svgEl('text', { x: c.x + c.w / 2, y: c.y + c.h / 2 + 4 }, g); t.textContent = c.t;
      }
      const act = () => { if (playing) stop(); const idx = C.steps.findIndex(s => s.focus.includes(c.id)); if (idx >= 0) { showStep(idx); runOnce(idx); } };
      g.addEventListener('click', act); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
    const dots = svgEl('g', { id: 'dgDots' }, svg);
  }

  function showStep(i) {
    const C = CIRCUITS[cid], s = C.steps[i]; cur = i;
    root.querySelectorAll('.dg-comp').forEach(n => n.classList.remove('focus'));
    root.querySelectorAll('.dg-label').forEach(n => n.classList.remove('focus'));
    s.focus.forEach(f => { const c = root.querySelector('#dc-' + f); if (c) c.classList.add('focus'); const l = root.querySelector('#dl-' + f); if (l) l.classList.add('focus'); });
    const live = new Set(); for (let k = 0; k <= i; k++) C.steps[k].live.forEach(w => live.add(w));
    Object.keys(C.wires).forEach(w => root.querySelector('#dw-' + w).classList.toggle('live', live.has(w)));
    C.comps.filter(c => c.type === 'lamp').forEach(c => root.querySelector('#dgl-' + c.id).classList.toggle('on', s.lamp));
    root.querySelectorAll('.step-chip').forEach((b, k) => { b.classList.toggle('active', k === i); b.classList.toggle('done', k < i); });
    root.querySelector('#narrCaption').innerHTML = `<span class="cap-tag">${playing ? '<span class="speaking-dot"></span>' : ''}Langkah ${i + 1} dari ${C.steps.length} · ${s.chip}</span><br>${s.text}`;
    stopFlow(); if (s.dots.length) startFlow(s.dots);
  }

  function startFlow(ids) {
    const layer = root.querySelector('#dgDots'); layer.innerHTML = '';
    const items = ids.map(id => { const p = root.querySelector('#dw-' + id), d = svgEl('circle', { r: 6, class: 'dg-dot' }, layer); return { p, d, len: p.getTotalLength() }; });
    let stopped = false, t0 = null;
    function frame(ts) {
      if (stopped) return; if (t0 === null) t0 = ts;
      const k = ((ts - t0) % 1500) / 1500;
      items.forEach(it => { const pt = it.p.getPointAtLength(it.len * k); it.d.setAttribute('cx', pt.x); it.d.setAttribute('cy', pt.y); });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    flowStop = () => { stopped = true; layer.innerHTML = ''; };
  }
  function stopFlow() { if (flowStop) { flowStop(); flowStop = null; } }

  /* ---------- kendali narator ---------- */
  function setPlayingUI(on) {
    playing = on;
    const b = root.querySelector('#narrPlay');
    b.textContent = on ? '⏹ Berhenti' : '▶ Dengarkan penjelasan';
    root.querySelector('#narrCaption').querySelector('.speaking-dot')?.remove();
  }
  async function runFrom(start) {
    const token = ++runToken, C = CIRCUITS[cid];
    setPlayingUI(true); musicDuck(true);
    for (let i = start; i < C.steps.length; i++) {
      if (token !== runToken) return;
      showStep(i);
      await say(C.steps[i].text, i, token);
      if (token !== runToken) return;
      await sleep(350);
    }
    if (token === runToken) { setPlayingUI(false); musicDuck(false); sfx.success(); }
  }
  async function runOnce(i) {
    const token = ++runToken; musicDuck(true);
    await say(CIRCUITS[cid].steps[i].text, i, token);
    if (token === runToken) musicDuck(false);
  }
  function stop() { runToken++; silence(); setPlayingUI(false); musicDuck(false); }

  function buildChips() {
    const C = CIRCUITS[cid], box = root.querySelector('#stepChips'); box.innerHTML = '';
    C.steps.forEach((s, i) => {
      const b = document.createElement('button'); b.className = 'step-chip'; b.textContent = i + 1; b.title = s.chip; b.setAttribute('data-no-sfx', 'true');
      b.onclick = () => { stop(); sfx.tick(); showStep(i); runOnce(i); };
      box.appendChild(b);
    });
  }
  function setCircuit(id) {
    stop(); cid = id; drawCircuit(); buildChips();
    root.querySelectorAll('.seg button').forEach(b => b.classList.toggle('active', b.dataset.c === id));
    root.querySelector('#narrCaption').innerHTML = '<span class="cap-tag">Siap</span><br>Tekan <b>Dengarkan penjelasan</b>, atau klik komponen/angka langkah untuk mendengar bagian tertentu.';
    cur = -1;
  }

  function init(id) {
    root = document.getElementById(id);
    root.innerHTML = `
      <div class="circuit-panel">
        <div class="circuit-svg-wrap"><svg id="diagSvg" width="100%" role="img" aria-label="Diagram rangkaian penerangan"></svg></div>
        <div class="circuit-info">
          <div class="seg"><button data-c="satu" class="active">1 lampu</button><button data-c="dua">2 lampu paralel</button></div>
          <h3>Dari diagram ke pemahaman</h3>
          <p>Dengarkan penjelasan narator sambil mengikuti arus pada diagram. Kamu juga bisa klik komponen atau nomor langkah.</p>
          <div class="narr-controls">
            <button class="btn btn-pink btn-sm" id="narrPlay" data-no-sfx="true">▶ Dengarkan penjelasan</button>
            <select id="narrRate" aria-label="Kecepatan suara"><option value="0.85">Pelan</option><option value="1" selected>Normal</option><option value="1.2">Cepat</option></select>
          </div>
          <div class="step-chips" id="stepChips"></div>
          <div class="narr-caption" id="narrCaption" aria-live="polite"></div>
          <div class="narr-note" id="voiceNote"></div>
        </div>
      </div>`;
    root.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => { sfx.tab(); setCircuit(b.dataset.c); }));
    root.querySelector('#narrPlay').addEventListener('click', () => { if (playing) { stop(); sfx.close(); } else runFrom(0); });
    root.querySelector('#narrRate').addEventListener('change', e => { rate = parseFloat(e.target.value); });
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = refreshVoice;
    refreshVoice(); setCircuit('satu');
    window.addEventListener('pagehide', silence);
  }
  return { init, stop, CIRCUITS };
})();
