/* =======================================================================
   SIMULATOR — Trainer Virtual (UI)
   Siswa memasang kabel antar terminal, lalu menyalakan MCB & saklar.
   Umpan balik: verifikasi (lampu menyala/padam), elaboratif (penjelasan),
   petunjuk (tombol 💡), dan K3 (peringatan memasang kabel saat MCB ON).
   ======================================================================= */
const Simulator = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const E = SimEngine;
  let root, levelNo = 1, wires = [], state = { mcb: false, sk: false }, sel = null, hinted = [];
  let flash = null, violations = 0, prevLamp = {}, completed = {};

  const lv = () => E.LEVELS[levelNo];
  const termMap = () => { const m = {}; lv().comps.forEach(c => c.terms.forEach(t => m[E.T(c.id, t.id)] = { ...t, comp: c.id })); return m; };

  function stub(t, len = 22) { return { x: t.x + (t.dir === 'r' ? len : t.dir === 'l' ? -len : 0), y: t.y + (t.dir === 'b' ? len : t.dir === 't' ? -len : 0) }; }
  function crosses(a, b, ignore) {
    const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
    return lv().comps.some(c => !ignore.includes(c.id) && a.y > c.y - 4 && a.y < c.y + c.h + 4 && x2 > c.x - 4 && x1 < c.x + c.w + 4);
  }
  function route(ta, tb, idx) {
    const A = { x: ta.x, y: ta.y }, B = { x: tb.x, y: tb.y }, a1 = stub(ta), b1 = stub(tb);
    const hz = (d) => d === 'l' || d === 'r';
    const pts = [A, a1];
    if (hz(ta.dir) && hz(tb.dir) && Math.abs(a1.y - b1.y) < 2) {
      if (crosses(a1, b1, [])) { const top = 58; pts.push({ x: a1.x, y: top }, { x: b1.x, y: top }); }
    } else {
      const lane = ta.lane || tb.lane || ((a1.y + b1.y) / 2 + ((idx % 3) - 1) * 9);
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
    const grp = el('g', {}, g);
    const body = (fill, stroke = '#2E2A5E') => el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 10, fill, stroke, 'stroke-width': 2.5 }, grp);
    if (c.type === 'source') {
      body('#2E2A5E', '#1b1840');
      txt(grp, c.x + c.w / 2, c.y + 28, c.label, { fill: '#fff', 'font-family': 'Fredoka', 'font-size': 13, 'text-anchor': 'middle' });
      txt(grp, c.x + c.w / 2, c.y + 50, 'PLN / MCB utama', { fill: '#C9C5E8', 'font-size': 10, 'text-anchor': 'middle' });
      txt(grp, c.x + c.w / 2, c.y + 150, '⚡', { 'font-size': 38, 'text-anchor': 'middle' });
    } else if (c.type === 'mcb' || c.type === 'saklar') {
      const on = c.type === 'mcb' ? state.mcb : state.sk;
      body('#F6EEDC');
      txt(grp, c.x + c.w / 2, c.y + 17, c.label, { fill: '#2E2A5E', 'font-family': 'Fredoka', 'font-size': 12, 'text-anchor': 'middle', 'pointer-events': 'none' });
      const sx = c.x + c.w / 2 - 18, sy = c.y + 24;
      el('rect', { x: sx, y: sy, width: 36, height: 44, rx: 6, fill: '#2B2438', 'pointer-events': 'none' }, grp);
      el('rect', { x: sx + 4, y: on ? sy + 4 : sy + 22, width: 28, height: 18, rx: 4, fill: on ? '#2FBF8F' : '#9A93A8', 'pointer-events': 'none' }, grp);
      txt(grp, c.x + c.w / 2, c.y + c.h - 3, on ? 'ON' : 'OFF', { fill: on ? '#159E93' : '#8A8498', 'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle', 'pointer-events': 'none' });
    } else if (c.type === 'junction') {
      body('#4A4580', '#2E2A5E');
      txt(grp, c.x + c.w / 2, c.y + 26, c.label, { fill: '#fff', 'font-family': 'Fredoka', 'font-size': 11, 'text-anchor': 'middle' });
    } else if (c.type === 'lamp') {
      body('#F6EEDC');
      const st = a.now.status[c.id] || 0, cx = c.x + c.w / 2, cy = c.y + c.h / 2 + 2;
      const glow = el('circle', { cx, cy, r: 46, fill: '#FFD54F', opacity: st === 2 ? 0.55 : st === 1 ? 0.22 : 0 }, grp); glow.style.transition = 'opacity .3s';
      el('circle', { cx, cy, r: 20, fill: st === 2 ? '#FFD54F' : st === 1 ? '#FFE9A8' : '#E6E1F0', stroke: '#2E2A5E', 'stroke-width': 2.5, class: 'lamp-bulb' }, grp);
      txt(grp, c.x + c.w / 2, c.y + 14, c.label, { fill: '#2E2A5E', 'font-family': 'Fredoka', 'font-size': 11, 'text-anchor': 'middle' });
    }
  }

  function render() {
    const A = E.analyze(lv(), wires, state);
    const nets = A.now.nets;
    const svg = root.querySelector('#simSvg'); svg.innerHTML = '';
    // papan kayu
    el('rect', { x: 8, y: 8, width: 744, height: 404, rx: 14, fill: '#D9B788' }, svg);
    for (let i = 0; i < 9; i++) el('path', { d: `M8 ${40 + i * 44} C 200 ${30 + i * 44}, 520 ${52 + i * 44}, 752 ${40 + i * 44}`, stroke: '#C69E69', 'stroke-width': 1.2, fill: 'none', opacity: .6 }, svg);
    // komponen
    lv().comps.forEach(c => drawComp(svg, c, A));
    // kabel
    const tm = termMap();
    wires.forEach((w, i) => {
      const g = el('g', { class: 'wire-g' }, svg); g.dataset.w = i;
      const d = route(tm[w.a], tm[w.b], i);
      const r = nets.find(w.a);
      const col = r === A.now.nL ? '#D9534F' : r === A.now.nN ? '#3B82C4' : '#8B8499';
      el('path', { d, class: 'wire-hit' }, g);
      const vis = el('path', { d, class: 'wire-vis' + (r === A.now.nL && state.mcb ? ' flow' : ''), stroke: col }, g);
    });
    // area klik MCB/saklar selalu di atas kabel
    lv().comps.filter(c => c.toggle).forEach(c => {
      const h = el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 10, fill: 'transparent', class: 'toggle-hit' }, svg); h.dataset.toggle = c.id;
    });
    // terminal
    Object.entries(tm).forEach(([id, t]) => {
      const g = el('g', { class: 'terminal' + (sel === id ? ' selected' : '') + (hinted.includes(id) ? ' hinted' : '') }, svg); g.dataset.t = id;
      el('circle', { cx: t.x, cy: t.y, r: 18, fill: 'transparent' }, g);
      el('circle', { cx: t.x, cy: t.y, r: 11, class: 't-ring' }, g);
      el('circle', { cx: t.x, cy: t.y, r: 8, class: 't-dot' }, g);
      if (t.label) {
        const lx = t.dir === 'r' ? t.x + 8 : t.dir === 'l' ? t.x - 8 : t.x;
        const ly = t.dir === 'b' ? t.y + 24 : t.y - 14;
        txt(g, lx, ly, t.label, { class: 't-label', 'text-anchor': t.dir === 'r' ? 'start' : t.dir === 'l' ? 'end' : 'middle' });
      }
    });
    // misi
    const ms = E.missions(lv(), wires);
    root.querySelector('#simMissions').innerHTML = ms.map(m => `<span class="mission ${m.ok ? 'ok' : ''}">${m.text}</span>`).join('');
    // status
    const fb = flash || E.feedback(lv(), wires, state, A);
    const st = root.querySelector('#simStatus'); st.className = 'sim-status ' + fb.type;
    st.innerHTML = `<strong>${fb.title}</strong>${fb.text}`;
    // suara lampu menyala
    lv().lamps.forEach(id => { const s = A.now.status[id]; if (s > 0 && !(prevLamp[id] > 0)) sfx.bulbOn(); prevLamp[id] = s; });
    root.querySelectorAll('.sim-levels button').forEach(b => { b.classList.toggle('active', +b.dataset.l === levelNo); b.classList.toggle('done', !!completed[b.dataset.l]); });
    return A;
  }

  // jalankan setelah perubahan: cek trip & keberhasilan
  function afterChange() {
    let A = E.analyze(lv(), wires, state);
    if (state.mcb && A.now.short && !A.bypass) {
      state.mcb = false; sfx.trip(); sfx.spark();
      const w = root.querySelector('.sim-board-wrap'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
      flash = { type: 'bad', title: '⚠ MCB trip — terjadi hubung singkat!', text: 'Fasa dan netral bertemu tanpa melewati lampu. MCB memutus arus untuk melindungi instalasi. Periksa kabel yang menghubungkan jalur fasa langsung ke netral, lepas kabel itu, lalu coba lagi.' };
    } else if (A.bypass) { sfx.spark(); }
    A = render();
    if (state.mcb && state.sk && A.complete && lv().lamps.every(id => A.now.status[id] === 2) && !completed[levelNo]) {
      completed[levelNo] = true; sfx.level();
      const k3 = violations ? ` Catatan K3: kamu ${violations}x mengubah kabel saat MCB ON, biasakan matikan MCB dulu.` : ' K3 aman: tidak ada kabel diubah saat MCB ON. 👏';
      flash = { type: 'ok', title: `✔ Level ${levelNo} selesai!`, text: (lv().lamps.length > 1 ? 'Kedua lampu menyala paralel.' : 'Lampu menyala dan dikendalikan saklar.') + k3 };
      render();
      logEvent(`Simulasi Level ${levelNo} Berhasil`, `Pelanggaran K3: ${violations}`);
    }
  }

  function toast(fb) { flash = fb; }

  function onBoardClick(e) {
    const t = e.target.closest('[data-t]'), w = e.target.closest('[data-w]'), tg = e.target.closest('[data-toggle]');
    flash = null; hinted = [];
    if (tg) {
      const k = tg.dataset.toggle; state[k === 'mcb' ? 'mcb' : 'sk'] = !state[k === 'mcb' ? 'mcb' : 'sk'];
      (state[k === 'mcb' ? 'mcb' : 'sk'] ? sfx.switchOn : sfx.switchOff)();
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
    sel = null; render();
  }

  function setLevel(n) {
    levelNo = n; wires = []; state = { mcb: false, sk: false }; sel = null; hinted = []; flash = null; violations = 0; prevLamp = {};
    root.querySelector('#simGoal').textContent = '🎯 ' + lv().goal;
    sfx.tab(); render();
  }
  function hint() {
    const m = E.missions(lv(), wires).find(x => !x.ok);
    sfx.hint();
    if (!m) { flash = { type: 'info', title: '💡 Petunjuk', text: 'Semua sambungan sudah lengkap. ON-kan MCB, lalu ON-kan saklar.' }; hinted = []; }
    else { flash = { type: 'info', title: '💡 Petunjuk', text: m.hint + ' (terminal yang dimaksud berkedip)' }; hinted = m.pulse; }
    render();
  }

  function init(id) {
    root = document.getElementById(id);
    root.innerHTML = `
      <div class="sim-wrap">
        <div class="sim-top">
          <div class="sim-levels"><button data-l="1">Level 1 · 1 lampu</button><button data-l="2">Level 2 · 2 lampu paralel</button></div>
          <div class="sim-actions">
            <button class="btn btn-pink btn-sm" id="simHint" data-no-sfx="true">💡 Petunjuk</button>
            <button class="btn btn-ghost btn-sm" id="simReset">↺ Ulangi</button>
          </div>
        </div>
        <div class="sim-goal" id="simGoal"></div>
        <div class="sim-board-wrap"><svg id="simSvg" viewBox="0 0 760 420" role="img" aria-label="Trainer virtual instalasi penerangan"></svg></div>
        <div class="sim-missions" id="simMissions"></div>
        <div class="sim-status info" id="simStatus"></div>
        <p class="sim-help">Cara main: klik satu terminal (titik emas), lalu klik terminal tujuan untuk memasang kabel · klik kabel untuk melepasnya · klik MCB atau saklar untuk ON/OFF. Merah = jalur fasa (hidup), biru = netral, abu-abu = tidak bertegangan.</p>
      </div>`;
    root.querySelector('#simSvg').addEventListener('click', onBoardClick);
    root.querySelectorAll('.sim-levels button').forEach(b => b.addEventListener('click', () => setLevel(+b.dataset.l)));
    root.querySelector('#simHint').addEventListener('click', hint);
    root.querySelector('#simReset').addEventListener('click', () => setLevel(levelNo));
    setLevel(1);
  }
  return { init };
})();
