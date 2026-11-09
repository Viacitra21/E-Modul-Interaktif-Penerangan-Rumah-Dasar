/* =======================================================================
   SIMULATOR — Trainer Virtual (UI)
   Dua mode:
   1) "Rakit Sendiri" (Level 1–2): siswa memasang kabel antar terminal.
   2) "Contoh Rangkaian" (4 pre-built): rangkaian sudah terpasang, siswa
      menyalakan/mematikan saklar, mencoba percobaan, dan melihat hubungan
      antar-komponen. Kabel tetap bisa dilepas/dipasang untuk bereksperimen.
   Umpan balik: verifikasi (lampu menyala/padam), elaboratif (penjelasan),
   petunjuk (tombol 💡), dan K3 (peringatan memasang kabel saat MCB ON).
   Mobile: zoom (+/−/cubit), geser (pan), area sentuh terminal diperbesar.
   ======================================================================= */
const Simulator = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const E = SimEngine;
  const VB_W = 760, VB_H = 420;
  let root, svg, zp, mode = 'level', levelNo = 1, presetKey = 'p1';
  let wires = [], state = { mcb: false, sk: false }, sel = null, hinted = [];
  let flash = null, violations = 0, prevLamp = {}, completed = {}, expDone = {};

  const cur = () => (mode === 'level' ? E.LEVELS[levelNo] : E.PRESETS[presetKey]);
  const presetNo = (k) => k.replace('p', '');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const termMap = () => { const m = {}; cur().comps.forEach(c => c.terms.forEach(t => m[E.T(c.id, t.id)] = { ...t, comp: c.id })); return m; };

  function stub(t, len = 22) { return { x: t.x + (t.dir === 'r' ? len : t.dir === 'l' ? -len : 0), y: t.y + (t.dir === 'b' ? len : t.dir === 't' ? -len : 0) }; }
  function crosses(a, b, ignore) {
    const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
    return cur().comps.some(c => !ignore.includes(c.id) && a.y > c.y - 4 && a.y < c.y + c.h + 4 && x2 > c.x - 4 && x1 < c.x + c.w + 4);
  }
  function route(ta, tb, idx, w) {
    const A = { x: ta.x, y: ta.y }, B = { x: tb.x, y: tb.y }, a1 = stub(ta), b1 = stub(tb);
    const hz = (d) => d === 'l' || d === 'r';
    const pts = [A, a1];
    if (hz(ta.dir) && hz(tb.dir) && Math.abs(a1.y - b1.y) < 2) {
      if (crosses(a1, b1, [])) { const top = 58; pts.push({ x: a1.x, y: top }, { x: b1.x, y: top }); }
    } else {
      // jalur (lane) tiap kabel dibedakan agar tidak bertumpuk
      const lane = (w && w.lane) || ta.lane || tb.lane || ((a1.y + b1.y) / 2 + ((idx % 4) - 1.5) * 10);
      pts.push({ x: a1.x, y: lane }, { x: b1.x, y: lane });
    }
    pts.push(b1, B);
    return 'M' + pts.map(p => `${p.x} ${p.y}`).join(' L');
  }

  function el(name, attrs = {}, parent) {
    const n = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, x, y, s, attrs = {}) { const t = el('text', { x, y, ...attrs }, parent); t.textContent = s; return t; }

  function drawComp(g, c, a) {
    const grp = el('g', { class: 'sim-comp' }, g); grp.dataset.comp = c.id;
    const body = (fill, stroke = '#2E2A5E') => el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 10, fill, stroke, 'stroke-width': 2.5 }, grp);
    const on = c.toggle ? !!state[c.id] : false;
    if (c.type === 'source') {
      body('#2E2A5E', '#1b1840');
      txt(grp, c.x + c.w / 2, c.y + 28, c.label, { fill: '#fff', 'font-family': 'Fredoka', 'font-size': 13, 'text-anchor': 'middle' });
      txt(grp, c.x + c.w / 2, c.y + 50, 'PLN / MCB utama', { fill: '#C9C5E8', 'font-size': 10, 'text-anchor': 'middle' });
      txt(grp, c.x + c.w / 2, c.y + 150, '⚡', { 'font-size': 38, 'text-anchor': 'middle' });
    } else if (c.type === 'mcb' || c.type === 'saklar') {
      body('#F6EEDC');
      txt(grp, c.x + c.w / 2, c.y + 17, c.label, { fill: '#2E2A5E', 'font-family': 'Fredoka', 'font-size': 12, 'text-anchor': 'middle', 'pointer-events': 'none' });
      const sx = c.x + c.w / 2 - 18, sy = c.y + 24;
      el('rect', { x: sx, y: sy, width: 36, height: 44, rx: 6, fill: '#2B2438', 'pointer-events': 'none' }, grp);
      el('rect', { x: sx + 4, y: on ? sy + 4 : sy + 22, width: 28, height: 18, rx: 4, fill: on ? '#2FBF8F' : '#9A93A8', 'pointer-events': 'none' }, grp);
      txt(grp, c.x + c.w / 2, c.y + c.h - 3, on ? 'ON' : 'OFF', { fill: on ? '#159E93' : '#8A8498', 'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle', 'pointer-events': 'none' });
    } else if (c.type === 'saklar2') {
      // saklar tukar: COM di satu sisi, dua jalur di sisi lain; tuas menunjuk jalur aktif
      body('#F6EEDC');
      txt(grp, c.x + c.w / 2, c.y + 17, c.label, { fill: '#2E2A5E', 'font-family': 'Fredoka', 'font-size': 12, 'text-anchor': 'middle', 'pointer-events': 'none' });
      const comX = c.flip ? c.x + c.w - 16 : c.x + 16, thX = c.flip ? c.x + 16 : c.x + c.w - 16;
      const cy = c.y + 54, y1 = c.y + 30, y2 = c.y + 78;
      el('rect', { x: c.x + 8, y: c.y + 24, width: c.w - 16, height: 60, rx: 6, fill: '#2B2438', 'pointer-events': 'none' }, grp);
      el('line', { x1: comX, y1: cy, x2: thX, y2: on ? y1 : y2, stroke: '#2FBF8F', 'stroke-width': 4, 'stroke-linecap': 'round', 'pointer-events': 'none' }, grp);
      [[comX, cy, '#fff'], [thX, y1, on ? '#2FBF8F' : '#9A93A8'], [thX, y2, on ? '#9A93A8' : '#2FBF8F']].forEach(([x, y, f]) => el('circle', { cx: x, cy: y, r: 4.5, fill: f, 'pointer-events': 'none' }, grp));
      txt(grp, c.x + c.w / 2, c.y + c.h - 4, 'posisi ' + (on ? '1' : '2'), { fill: '#159E93', 'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle', 'pointer-events': 'none' });
    } else if (c.type === 'junction') {
      body('#4A4580', '#2E2A5E');
      txt(grp, c.x + c.w / 2, c.y + 26, c.label, { fill: '#fff', 'font-family': 'Fredoka', 'font-size': 11, 'text-anchor': 'middle' });
    } else if (c.type === 'lamp') {
      body('#F6EEDC');
      const st = a.now.status[c.id] || 0, cx = c.x + c.w / 2, cy = c.y + c.h / 2 + 2;
      const glow = el('circle', { cx, cy, r: 46, fill: '#FFD54F', opacity: st === 2 ? 0.55 : st === 1 ? 0.22 : 0, 'pointer-events': 'none' }, grp); glow.style.transition = 'opacity .3s';
      el('circle', { cx, cy, r: 20, fill: st === 2 ? '#FFD54F' : st === 1 ? '#FFE9A8' : '#E6E1F0', stroke: '#2E2A5E', 'stroke-width': 2.5, class: 'lamp-bulb' }, grp);
      txt(grp, c.x + c.w / 2, c.y + 14, c.label, { fill: '#2E2A5E', 'font-family': 'Fredoka', 'font-size': 11, 'text-anchor': 'middle' });
    }
  }

  // nama terminal yang mudah dibaca untuk daftar sambungan
  function termName(id) {
    const [cid, tid] = id.split('.'), c = cur().comps.find(x => x.id === cid), t = c.terms.find(x => x.id === tid);
    const nice = { in: 'masuk', out: 'keluar', a: 'terminal a', b: 'terminal b', j1: 'masuk', j2: 'cabang 1', j3: 'cabang 2', com: 'COM', a1: 'jalur 1', a2: 'jalur 2' };
    const part = (t && t.label && !/^[ab]$/.test(t.label) && t.label !== '1' && t.label !== '2') ? t.label : (nice[tid] || tid);
    return `${c.label.replace(/ 220 V/, '')} · ${part}`;
  }
  function neighbors(cid) {
    const s = new Set();
    wires.forEach(w => { const ca = w.a.split('.')[0], cb = w.b.split('.')[0]; if (ca === cid && cb !== cid) s.add(cb); if (cb === cid && ca !== cid) s.add(ca); });
    return [...s].map(id => cur().comps.find(c => c.id === id).label);
  }

  function render() {
    const lvl = cur();
    const A = E.analyze(lvl, wires, state);
    const nets = A.now.nets;
    svg.innerHTML = '';
    const ppu = zp.pxPerUnit() || 1;                              // 1 satuan SVG = berapa piksel layar
    const hitR = clamp(22 / ppu, 18, 30), dotR = clamp(7 / ppu, 8, 12), fs = clamp(10 / ppu, 11, 15);
    // papan kayu
    el('rect', { x: 8, y: 8, width: 744, height: 404, rx: 14, fill: '#D9B788' }, svg);
    for (let i = 0; i < 9; i++) el('path', { d: `M8 ${40 + i * 44} C 200 ${30 + i * 44}, 520 ${52 + i * 44}, 752 ${40 + i * 44}`, stroke: '#C69E69', 'stroke-width': 1.2, fill: 'none', opacity: .6 }, svg);
    // komponen
    lvl.comps.forEach(c => drawComp(svg, c, A));
    // kabel
    const tm = termMap();
    wires.forEach((w, i) => {
      const g = el('g', { class: 'wire-g' }, svg); g.dataset.w = i;
      const d = route(tm[w.a], tm[w.b], i, w);
      const r = nets.find(w.a);
      const col = r === A.now.nL ? '#D9534F' : r === A.now.nN ? '#3B82C4' : '#8B8499';
      el('path', { d, class: 'wire-hit' }, g);
      el('path', { d, class: 'wire-vis' + (r === A.now.nL && state.mcb ? ' flow' : ''), stroke: col }, g);
    });
    // area klik MCB/saklar selalu di atas kabel
    lvl.comps.filter(c => c.toggle).forEach(c => {
      const h = el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 10, fill: 'transparent', class: 'toggle-hit' }, svg); h.dataset.toggle = c.id;
    });
    // terminal (area sentuh menyesuaikan zoom/ukuran layar)
    Object.entries(tm).forEach(([id, t]) => {
      const g = el('g', { class: 'terminal' + (sel === id ? ' selected' : '') + (hinted.includes(id) ? ' hinted' : '') }, svg); g.dataset.t = id;
      el('circle', { cx: t.x, cy: t.y, r: hitR, fill: 'transparent' }, g);
      el('circle', { cx: t.x, cy: t.y, r: dotR + 3, class: 't-ring' }, g);
      el('circle', { cx: t.x, cy: t.y, r: dotR, class: 't-dot' }, g);
      if (t.label) {
        const lx = t.dir === 'r' ? t.x + 8 : t.dir === 'l' ? t.x - 8 : t.x;
        const ly = t.dir === 'b' ? t.y + 24 : t.y - 14 - (dotR - 8);
        txt(g, lx, ly, t.label, { class: 't-label', 'font-size': fs, 'text-anchor': t.dir === 'r' ? 'start' : t.dir === 'l' ? 'end' : 'middle' });
      }
    });

    // misi (rakit sendiri) atau percobaan (contoh rangkaian)
    const ctx = { S: state, A, wires, orig: mode === 'contoh' ? lvl.wires.length : 0 };
    const mis = root.querySelector('#simMissions');
    if (mode === 'level') {
      const ms = E.missions(lvl, wires);
      mis.className = 'sim-missions';
      mis.innerHTML = ms.map(m => `<span class="mission ${m.ok ? 'ok' : ''}">${m.text}</span>`).join('');
    } else {
      const done = expDone[presetKey] || new Set();
      mis.className = 'sim-exp';
      mis.innerHTML = `<h4>🔬 Percobaan (${done.size}/${lvl.experiments.length})</h4><ol>` +
        lvl.experiments.map((x, i) => `<li class="${done.has(i) ? 'ok' : ''}">${x.text}</li>`).join('') + '</ol>';
    }
    // alur & daftar sambungan (hubungan antar-komponen)
    const info = root.querySelector('#simExplore');
    info.hidden = mode !== 'contoh';
    if (mode === 'contoh') {
      root.querySelector('#simChain').textContent = lvl.chain;
      root.querySelector('#simWireList').innerHTML = wires.map(w => {
        const r = nets.find(w.a), cls = r === A.now.nL ? 'l' : r === A.now.nN ? 'n' : 'x';
        return `<li><i class="wd ${cls}"></i>${termName(w.a)} <b>⟷</b> ${termName(w.b)}</li>`;
      }).join('') || '<li>Belum ada kabel terpasang.</li>';
    }
    // status
    let fb = flash;
    if (!fb) {
      if (mode === 'level') fb = E.feedback(lvl, wires, state, A);
      else fb = (A.bypass || A.now.short) ? E.feedback(lvl, wires, state, A) : lvl.explain(ctx);
    }
    const st = root.querySelector('#simStatus'); st.className = 'sim-status ' + fb.type;
    st.innerHTML = `<strong>${fb.title}</strong>${fb.text}`;
    // suara lampu menyala
    lvl.lamps.forEach(id => { const s = A.now.status[id]; if (s > 0 && !(prevLamp[id] > 0)) sfx.bulbOn(); prevLamp[id] = s; });
    // tombol pilihan
    root.querySelectorAll('.sim-levels button').forEach(b => {
      b.classList.toggle('active', b.dataset.k === (mode === 'level' ? String(levelNo) : presetKey));
      b.classList.toggle('done', !!completed[(mode === 'level' ? 'L' : 'P') + b.dataset.k]);
    });
    root.querySelectorAll('.sim-mode button').forEach(b => b.classList.toggle('active', b.dataset.m === mode));
    return A;
  }

  // jalankan setelah perubahan: cek trip, keberhasilan level, dan percobaan
  function afterChange() {
    let A = E.analyze(cur(), wires, state);
    if (state.mcb && A.now.short && !A.bypass) {
      state.mcb = false; sfx.trip(); sfx.spark();
      const w = root.querySelector('.sim-board-wrap'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
      flash = { type: 'bad', title: '⚠ MCB trip — terjadi hubung singkat!', text: 'Fasa dan netral bertemu tanpa melewati lampu. MCB memutus arus untuk melindungi instalasi. Periksa kabel yang menghubungkan jalur fasa langsung ke netral, lepas kabel itu, lalu coba lagi.' };
      logEvent('Simulasi: MCB Trip (hubung singkat)', mode === 'level' ? `Level ${levelNo}` : `Contoh ${presetNo(presetKey)}`);
    } else if (A.bypass) { sfx.spark(); }
    A = render();
    const lvl = cur();
    if (mode === 'level') {
      if (state.mcb && state.sk && A.complete && lvl.lamps.every(id => A.now.status[id] === 2) && !completed['L' + levelNo]) {
        completed['L' + levelNo] = true; sfx.level();
        const k3 = violations ? ` Catatan K3: kamu ${violations}x mengubah kabel saat MCB ON, biasakan matikan MCB dulu.` : ' K3 aman: tidak ada kabel diubah saat MCB ON. 👏';
        flash = { type: 'ok', title: `✔ Level ${levelNo} selesai!`, text: (lvl.lamps.length > 1 ? 'Kedua lampu menyala paralel.' : 'Lampu menyala dan dikendalikan saklar.') + k3 };
        render();
        logEvent(`Simulasi Level ${levelNo} Berhasil`, `Pelanggaran K3: ${violations}`);
      }
    } else {
      const done = (expDone[presetKey] = expDone[presetKey] || new Set());
      const ctx = { S: state, A, wires, orig: lvl.wires.length };
      let added = false;
      lvl.experiments.forEach((x, i) => {
        if (!done.has(i) && x.test(ctx)) {
          done.add(i); added = true;
          logEvent(`Simulasi Contoh ${presetNo(presetKey)} Percobaan ${i + 1}`, x.text);
        }
      });
      if (added) {
        if (done.size === lvl.experiments.length && !completed['P' + presetKey]) {
          completed['P' + presetKey] = true; sfx.level();
          flash = { type: 'ok', title: `🎉 Contoh ${presetNo(presetKey)} selesai!`, text: `Semua percobaan sudah kamu lakukan. ${lvl.tujuan} Lanjut ke contoh berikutnya atau kembali ke mode Rakit Sendiri.` };
          logEvent(`Simulasi Contoh ${presetNo(presetKey)} Selesai`, lvl.nama);
        } else sfx.success();
        render();
      }
    }
  }

  function toast(fb) { flash = fb; }
  // Layar sempit (HP): mulai dengan tampilan diperbesar agar kabel & terminal terbaca; layar lebar: tampilkan seluruh papan.
  function homeView() { if (window.innerWidth < 600) zp.focus(1.7, 0, 30); else zp.reset(); }

  function onBoardClick(e) {
    if (zp.wasDrag()) return;                                      // geser/cubit bukan ketukan
    const t = e.target.closest('[data-t]'), w = e.target.closest('[data-w]'), tg = e.target.closest('[data-toggle]'), cp = e.target.closest('[data-comp]');
    flash = null; hinted = [];
    if (tg) {
      const k = tg.dataset.toggle; state[k] = !state[k];
      (state[k] ? sfx.switchOn : sfx.switchOff)();
      const c = cur().comps.find(x => x.id === k);
      logEvent('Simulasi: ' + c.label + (state[k] ? ' ON' : ' OFF'), mode === 'level' ? `Level ${levelNo}` : `Contoh ${presetNo(presetKey)}`);
      return afterChange();
    }
    if (w) {
      if (state.mcb) { violations++; toast({ type: 'warn', title: '⚠ K3: kabel dilepas saat MCB ON', text: 'Selalu matikan MCB sebelum memasang atau melepas kabel agar tidak tersengat.' }); }
      wires.splice(+w.dataset.w, 1); sfx.unplug(); return afterChange();
    }
    if (t) {
      const id = t.dataset.t;
      if (!sel) { sel = id; sfx.tick(); return render(); }
      if (sel === id) { sel = null; return render(); }
      if (wires.some(x => (x.a === sel && x.b === id) || (x.a === id && x.b === sel))) { sel = null; toast({ type: 'info', title: 'Kabel sudah ada', text: 'Dua terminal itu sudah terhubung. Klik kabelnya jika ingin melepas.' }); return render(); }
      if (state.mcb) { violations++; toast({ type: 'warn', title: '⚠ K3: kabel dipasang saat MCB ON', text: 'Selalu matikan MCB sebelum memasang atau melepas kabel agar tidak tersengat.' }); }
      wires.push({ a: sel, b: id }); sel = null; sfx.plug(); return afterChange();
    }
    sel = null;
    if (cp) {                                                      // ketuk komponen → jelaskan fungsi & hubungannya
      const c = cur().comps.find(x => x.id === cp.dataset.comp);
      if (c && c.info) {
        const nb = neighbors(c.id);
        sfx.tick();
        flash = { type: 'info', title: 'ℹ ' + c.label, text: c.info + (nb.length ? ' Terhubung langsung ke: ' + nb.join(', ') + '.' : ' Belum ada kabel yang terhubung ke komponen ini.') };
      }
    }
    render();
  }

  function buildButtons() {
    const box = root.querySelector('.sim-levels');
    if (mode === 'level') box.innerHTML = '<button data-k="1">Level 1 · 1 lampu</button><button data-k="2">Level 2 · 2 lampu paralel</button>';
    else box.innerHTML = Object.keys(E.PRESETS).map(k => `<button data-k="${k}">${E.PRESETS[k].nama}</button>`).join('');
  }

  // pilih mode/level/contoh lalu reset papan
  function select(m, key, user) {
    const modeChanged = m !== mode;
    mode = m;
    if (m === 'level') levelNo = key; else presetKey = key;
    if (modeChanged) buildButtons();
    const c = cur();
    wires = mode === 'level' ? [] : c.wires.map(w => ({ ...w }));
    state = mode === 'level' ? { mcb: false, sk: false } : { ...c.init };
    sel = null; hinted = []; flash = null; violations = 0; prevLamp = {};
    if (mode === 'contoh') expDone[presetKey] = new Set();
    root.querySelector('#simGoal').textContent = '🎯 ' + (mode === 'level' ? c.goal : c.tujuan);
    root.querySelector('#simReset').textContent = mode === 'level' ? '↺ Ulangi' : '↺ Kembalikan';
    homeView();
    if (user) sfx.tab();
    render();
    if (user) logEvent(mode === 'level' ? `Simulasi Level ${levelNo} Dibuka` : `Simulasi Contoh ${presetNo(presetKey)} Dibuka`, c.nama || '');
  }
  function hint() {
    sfx.hint();
    if (mode === 'level') {
      const m = E.missions(cur(), wires).find(x => !x.ok);
      if (!m) { flash = { type: 'info', title: '💡 Petunjuk', text: 'Semua sambungan sudah lengkap. ON-kan MCB, lalu ON-kan saklar.' }; hinted = []; }
      else { flash = { type: 'info', title: '💡 Petunjuk', text: m.hint + ' (terminal yang dimaksud berkedip)' }; hinted = m.pulse; }
    } else {
      const done = expDone[presetKey] || new Set(), i = cur().experiments.findIndex((x, k) => !done.has(k));
      flash = i < 0 ? { type: 'info', title: '💡 Petunjuk', text: 'Semua percobaan sudah selesai. Coba lepas kabel lalu amati lampu, atau pilih contoh lain.' }
        : { type: 'info', title: '💡 Petunjuk — percobaan ' + (i + 1), text: cur().experiments[i].hint };
      hinted = [];
    }
    logEvent('Simulasi: Minta Petunjuk', mode === 'level' ? `Level ${levelNo}` : `Contoh ${presetNo(presetKey)}`);
    render();
  }

  function init(id) {
    root = document.getElementById(id);
    root.innerHTML = `
      <div class="sim-wrap">
        <div class="sim-mode" role="tablist" aria-label="Mode simulasi">
          <button data-m="level" class="active">🧩 Rakit Sendiri</button>
          <button data-m="contoh">📚 Contoh Rangkaian (4)</button>
        </div>
        <div class="sim-top">
          <div class="sim-levels"></div>
          <div class="sim-actions">
            <button class="btn btn-pink btn-sm" id="simHint" data-no-sfx="true">💡 Petunjuk</button>
            <button class="btn btn-ghost btn-sm" id="simReset">↺ Ulangi</button>
          </div>
        </div>
        <div class="sim-goal" id="simGoal"></div>
        <div class="sim-board-wrap"><svg id="simSvg" viewBox="0 0 ${VB_W} ${VB_H}" role="img" aria-label="Trainer virtual instalasi penerangan"></svg></div>
        <div class="sim-missions" id="simMissions"></div>
        <div class="sim-status info" id="simStatus"></div>
        <div id="simExplore" hidden>
          <div class="sim-chain"><b>Alur arus:</b> <span id="simChain"></span></div>
          <details class="sim-wirelist"><summary>📋 Lihat daftar sambungan kabel (hubungan antar-komponen)</summary>
            <ol id="simWireList"></ol>
            <p class="muted" style="font-size:.8rem;margin:6px 0 0;"><i class="wd l"></i> jalur fasa (hidup) · <i class="wd n"></i> netral · <i class="wd x"></i> tidak bertegangan</p>
          </details>
        </div>
        <p class="sim-help" id="simHelp">Cara main: klik satu terminal (titik emas), lalu klik terminal tujuan untuk memasang kabel · klik kabel untuk melepasnya · klik MCB atau saklar untuk ON/OFF · ketuk komponen lain untuk melihat fungsinya. Merah = jalur fasa (hidup), biru = netral, abu-abu = tidak bertegangan.</p>
      </div>`;
    svg = root.querySelector('#simSvg');
    zp = ZoomPan.attach(svg, { onChange: () => { clearTimeout(init._t); init._t = setTimeout(() => svg.firstChild && render(), 120); } });
    zp.setBase(VB_W, VB_H);
    root.querySelector('.sim-board-wrap').insertAdjacentElement('beforebegin', zp.toolbar());
    svg.addEventListener('click', onBoardClick);
    root.querySelector('.sim-levels').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      select(mode, mode === 'level' ? +b.dataset.k : b.dataset.k, true);
    });
    root.querySelector('.sim-mode').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.dataset.m === mode) return;
      select(b.dataset.m, b.dataset.m === 'level' ? levelNo : presetKey, true);
    });
    root.querySelector('#simHint').addEventListener('click', hint);
    root.querySelector('#simReset').addEventListener('click', () => select(mode, mode === 'level' ? levelNo : presetKey, true));
    // gambar ulang saat tab Simulasi dibuka atau layar berubah (ukuran sentuh mengikuti lebar layar)
    document.addEventListener('tabchange', e => { if (e.detail === 'tab-simulasi') render(); });
    window.addEventListener('resize', () => { clearTimeout(init._r); init._r = setTimeout(render, 150); });
    buildButtons();
    select('level', 1, false);
  }
  return { init };
})();
