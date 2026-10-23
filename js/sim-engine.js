/* =======================================================================
   SIM ENGINE — logika rangkaian untuk Simulasi Trainer Virtual
   (murni logika, tanpa DOM, supaya mudah diuji)
   ======================================================================= */
const SimEngine = (() => {
  const T = (c, t) => `${c}.${t}`;

  // ----- definisi level (posisi dalam viewBox 760 x 420) -----
  const SRC = { id: 'src', type: 'source', x: 24, y: 70, w: 112, h: 290, label: 'SUMBER 220 V',
    terms: [{ id: 'L', x: 136, y: 130, dir: 'r', label: 'L (fasa)' }, { id: 'N', x: 80, y: 360, dir: 'b', label: 'N (netral)', lane: 395 }] };
  const MCB = { id: 'mcb', type: 'mcb', x: 210, y: 92, w: 100, h: 76, label: 'MCB', toggle: true,
    terms: [{ id: 'in', x: 210, y: 130, dir: 'l', label: '' }, { id: 'out', x: 310, y: 130, dir: 'r', label: '' }] };
  const SK = { id: 'sk', type: 'saklar', x: 380, y: 92, w: 90, h: 76, label: 'SAKLAR', toggle: true,
    terms: [{ id: 'in', x: 380, y: 130, dir: 'l', label: '' }, { id: 'out', x: 470, y: 130, dir: 'r', label: '' }] };

  const LEVELS = {
    1: {
      nama: 'Level 1 · 1 lampu + 1 saklar',
      goal: 'Rangkai kabel agar lampu menyala saat saklar ON dan padam saat saklar OFF. Pasang kabel saat MCB masih OFF!',
      comps: [SRC, MCB, SK,
        { id: 'l1', type: 'lamp', x: 560, y: 92, w: 110, h: 76, label: 'LAMPU',
          terms: [{ id: 'a', x: 560, y: 130, dir: 'l', label: 'a' }, { id: 'b', x: 670, y: 130, dir: 'r', label: 'b', lane: 395 }] }],
      lamps: ['l1']
    },
    2: {
      nama: 'Level 2 · 2 lampu paralel + 1 saklar (seperti trainer di lab)',
      goal: 'Satu saklar harus mengendalikan dua lampu yang dipasang paralel lewat kotak sambung. Kedua lampu harus menyala sama terang.',
      comps: [SRC, MCB, SK,
        { id: 'ks', type: 'junction', x: 490, y: 170, w: 130, h: 44, label: 'KOTAK SAMBUNG', internal: true,
          terms: [{ id: 'j1', x: 555, y: 170, dir: 't', label: '' }, { id: 'j2', x: 530, y: 214, dir: 'b', label: '' }, { id: 'j3', x: 580, y: 214, dir: 'b', label: '' }] },
        { id: 'l1', type: 'lamp', x: 300, y: 290, w: 100, h: 60, label: 'LAMPU 1',
          terms: [{ id: 'a', x: 300, y: 320, dir: 'l', label: 'a' }, { id: 'b', x: 400, y: 320, dir: 'r', label: 'b', lane: 395 }] },
        { id: 'l2', type: 'lamp', x: 520, y: 290, w: 100, h: 60, label: 'LAMPU 2',
          terms: [{ id: 'a', x: 520, y: 320, dir: 'l', label: 'a' }, { id: 'b', x: 620, y: 320, dir: 'r', label: 'b', lane: 395 }] }],
      lamps: ['l1', 'l2']
    }
  };

  // ----- jaring (union-find) -----
  function makeNets(level, wires, closed) {
    const parent = {};
    const find = (x) => { if (parent[x] === undefined) parent[x] = x; while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
    level.comps.forEach(c => {
      c.terms.forEach(t => find(T(c.id, t.id)));
      if (c.internal) for (let i = 1; i < c.terms.length; i++) union(T(c.id, c.terms[0].id), T(c.id, c.terms[i].id));
    });
    wires.forEach(w => union(w.a, w.b));
    if (closed.mcb) union('mcb.in', 'mcb.out');
    if (closed.sk) union('sk.in', 'sk.out');
    return { find, same: (a, b) => find(a) === find(b) };
  }

  // ----- evaluasi aliran arus pada keadaan saklar tertentu -----
  function evaluate(level, wires, state) {
    const nets = makeNets(level, wires, { mcb: state.mcb, sk: state.sk });
    const nL = nets.find('src.L'), nN = nets.find('src.N');
    const lampEdges = level.lamps.map(id => ({ id, na: nets.find(T(id, 'a')), nb: nets.find(T(id, 'b')) }));
    const status = {}; level.lamps.forEach(id => status[id] = 0);   // 0 padam, 1 redup, 2 terang
    const short = nL === nN;
    if (!short) {
      const found = [];
      (function dfs(net, used, visited) {
        if (net === nN && used.length) { found.push(used); return; }
        lampEdges.forEach(e => {
          if (used.includes(e.id) || e.na === e.nb) return;
          let next = null;
          if (e.na === net) next = e.nb; else if (e.nb === net) next = e.na;
          if (next !== null && !visited.has(next)) dfs(next, used.concat(e.id), new Set([...visited, next]));
        });
      })(nL, [], new Set([nL]));
      found.forEach(path => path.forEach(id => { status[id] = Math.max(status[id], path.length === 1 ? 2 : 1); }));
    }
    const hotTerms = [];
    level.comps.filter(c => c.type === 'lamp').forEach(c => c.terms.forEach(t => { if (nets.find(T(c.id, t.id)) === nL) hotTerms.push(T(c.id, t.id)); }));
    return { status, short, nL, nN, nets, hot: hotTerms.length > 0 };
  }

  // ----- analisis lengkap untuk keadaan saat ini -----
  function analyze(level, wires, state) {
    const now = evaluate(level, wires, state);
    const on = evaluate(level, wires, { mcb: true, sk: true });
    const off = evaluate(level, wires, { mcb: true, sk: false });
    const bypass = evaluate(level, wires, { mcb: false, sk: true }).short;   // L bertemu N tanpa lewat MCB
    const allFull = (r) => level.lamps.every(id => r.status[id] === 2);
    const circuitOk = allFull(on) && !on.short;
    const switchControls = !off.hot && !off.short && level.lamps.every(id => off.status[id] === 0);
    return { now, on, off, bypass, circuitOk, switchControls, complete: circuitOk && switchControls && !bypass };
  }

  // ----- checklist misi (berdasarkan sambungan kabel saja) -----
  function missions(level, wires) {
    const n = makeNets(level, wires, { mcb: false, sk: false });
    const L = 'src.L', Nn = 'src.N';
    const mcbLoad = n.same('mcb.in', L) ? 'mcb.out' : (n.same('mcb.out', L) ? 'mcb.in' : null);
    const c1 = n.same('mcb.in', L) || n.same('mcb.out', L);
    const c2 = !!mcbLoad && (n.same(mcbLoad, 'sk.in') || n.same(mcbLoad, 'sk.out'));
    const skLoad = c2 ? (n.same(mcbLoad, 'sk.in') ? 'sk.out' : 'sk.in') : null;
    const lampOn = (id) => n.same(skLoad, T(id, 'a')) || n.same(skLoad, T(id, 'b'));
    const c3 = !!skLoad && level.lamps.every(lampOn);
    const lampN = (id) => n.same(Nn, T(id, 'a')) || n.same(Nn, T(id, 'b'));
    const c4 = level.lamps.every(lampN);
    const plural = level.lamps.length > 1;
    return [
      { ok: c1, text: 'Fasa (L) → MCB', hint: 'Hubungkan terminal L pada sumber ke salah satu terminal MCB.', pulse: ['src.L', 'mcb.in'] },
      { ok: c2, text: 'MCB → Saklar', hint: 'Sambungkan terminal MCB yang belum terpakai ke salah satu terminal saklar.', pulse: ['mcb.out', 'sk.in'] },
      { ok: c3, text: plural ? 'Saklar → kotak sambung → kedua lampu' : 'Saklar → Lampu',
        hint: plural ? 'Sambungkan terminal saklar yang belum terpakai ke terminal atas kotak sambung, lalu dari dua terminal bawah kotak sambung ke terminal a tiap lampu.' : 'Sambungkan terminal saklar yang belum terpakai ke terminal a lampu.',
        pulse: plural ? ['sk.out', 'ks.j1'] : ['sk.out', 'l1.a'] },
      { ok: c4, text: plural ? 'Kedua lampu → Netral (N)' : 'Lampu → Netral (N)',
        hint: 'Sambungkan terminal b lampu ke terminal N pada sumber agar rangkaian tertutup.', pulse: plural ? ['l1.b', 'l2.b', 'src.N'] : ['l1.b', 'src.N'] }
    ];
  }

  // ----- umpan balik elaboratif -----
  function feedback(level, wires, state, a) {
    if (a.bypass) return { type: 'bad', title: '⚠ Hubung singkat tanpa pengaman!', text: 'Fasa (L) bertemu netral (N) tanpa melewati MCB, sehingga MCB tidak bisa memutus arus. Dalam praktik ini bisa menyebabkan kebakaran. Lepaskan kabel yang menghubungkan L langsung ke N (klik kabelnya).' };
    if (!wires.length) return { type: 'info', title: 'Mulai merangkai', text: 'Klik satu terminal (titik emas), lalu klik terminal tujuan untuk memasang kabel. Klik kabel untuk melepasnya.' };
    if (a.now.short) return { type: 'bad', title: '⚠ Hubung singkat!', text: 'Fasa dan netral bertemu tanpa melewati lampu. MCB trip untuk melindungi instalasi. Periksa kabel yang menghubungkan jalur fasa langsung ke netral.' };
    const lit = level.lamps.filter(id => a.now.status[id] > 0);
    const full = level.lamps.every(id => a.now.status[id] === 2);
    if (lit.length && a.now.hot && !a.switchControls && a.circuitOk)
      return { type: 'warn', title: 'Lampu menyala, tetapi belum aman', text: 'Saat saklar OFF fitting masih bertegangan. Pastikan saklar berada di jalur fasa: L → MCB → saklar → lampu, bukan di netral dan bukan dilewati.' };
    if (full && a.complete) return { type: 'ok', title: '✔ Berhasil! Rangkaian benar dan aman', text: level.lamps.length > 1 ? 'Kedua lampu menyala sama terang karena dipasang paralel. Jika satu lampu putus, lampu lain tetap menyala.' : 'Arus mengalir L → MCB → saklar → lampu → N. Coba OFF-kan saklar: lampu padam dan bagian setelah saklar tidak bertegangan.' };
    if (lit.length && !full) return { type: 'warn', title: 'Lampu menyala redup', text: 'Lampu terhubung seri sehingga tegangan terbagi. Untuk menyala terang, pasang tiap lampu langsung antara jalur fasa (setelah saklar) dan netral (paralel).' };
    if (!state.mcb) return { type: 'info', title: 'MCB masih OFF', text: a.circuitOk ? 'Rangkaianmu sudah tertutup. Naikkan tuas MCB ke ON lalu ON-kan saklar.' : 'Lengkapi kabel sesuai misi di bawah. Ingat: pasang kabel hanya saat MCB OFF.' };
    if (!state.sk) return { type: 'info', title: 'Saklar masih OFF', text: 'Lampu padam karena jalur terputus di saklar. Klik saklar untuk ON.' };
    const m = missions(level, wires).find(x => !x.ok);
    return { type: 'bad', title: 'Lampu belum menyala', text: m ? 'Periksa: ' + m.text + '. ' + m.hint : 'Periksa kembali semua sambungan.' };
  }

  return { LEVELS, evaluate, analyze, missions, feedback, makeNets, T };
})();
if (typeof module !== 'undefined') module.exports = SimEngine;
