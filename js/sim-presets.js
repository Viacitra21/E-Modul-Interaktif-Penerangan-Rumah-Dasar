/* =======================================================================
   SIM PRESETS — 4 contoh rangkaian siap pakai (pre-built) untuk Trainer Virtual
   Setiap contoh: komponen + kabel sudah terpasang, punya tujuan belajar,
   daftar "percobaan" yang harus dicoba siswa, dan penjelasan yang berubah
   mengikuti kondisi rangkaian. Siswa tetap bisa melepas/memasang kabel.
   Dimuat SETELAH sim-engine.js.
   ======================================================================= */
(() => {
  const E = (typeof SimEngine !== 'undefined') ? SimEngine : require('./sim-engine.js');

  const SRC = { id: 'src', type: 'source', x: 24, y: 70, w: 112, h: 290, label: 'SUMBER 220 V', info: 'Sumber listrik PLN 1 fasa. Terminal L membawa fasa (hidup), terminal N adalah netral jalur kembali arus.',
    terms: [{ id: 'L', x: 136, y: 130, dir: 'r', label: 'L (fasa)' }, { id: 'N', x: 80, y: 360, dir: 'b', label: 'N (netral)', lane: 395 }] };
  const mcb = (x, w = 100) => ({ id: 'mcb', type: 'mcb', x, y: 92, w, h: 76, label: 'MCB', toggle: true, info: 'Pengaman otomatis sekaligus saklar utama. Fasa dari sumber selalu masuk ke MCB lebih dulu.',
    terms: [{ id: 'in', x, y: 130, dir: 'l', label: '' }, { id: 'out', x: x + w, y: 130, dir: 'r', label: '' }] });
  const sw = (id, label, x, y, w = 90) => ({ id, type: 'saklar', x, y, w, h: 76, label, toggle: true, info: 'Saklar memutus/menyambung jalur fasa menuju lampu.',
    terms: [{ id: 'in', x, y: y + 38, dir: 'l', label: '' }, { id: 'out', x: x + w, y: y + 38, dir: 'r', label: '' }] });
  const lamp = (id, label, x, y, w = 110, h = 76, lane = 395) => ({ id, type: 'lamp', x, y, w, h, label, info: 'Beban: mengubah listrik menjadi cahaya. Menyala bila terminal a mendapat fasa dan terminal b terhubung ke netral.',
    terms: [{ id: 'a', x, y: y + h / 2, dir: 'l', label: 'a' }, { id: 'b', x: x + w, y: y + h / 2, dir: 'r', label: 'b', lane }] });
  const W = (a, b, lane) => (lane ? { a, b, lane } : { a, b });

  const lit = (A, id) => A.now.status[id] === 2;
  const dim = (A, id) => A.now.status[id] === 1;

  const PRESETS = {
    p1: {
      nama: '1 · Saklar tunggal + 1 lampu',
      tujuan: 'Memahami urutan dasar: sumber → MCB → saklar → lampu → netral, dan mengapa saklar dipasang di jalur fasa.',
      comps: [SRC, mcb(210), sw('sk', 'SAKLAR', 380, 92), lamp('l1', 'LAMPU', 560, 92)],
      lamps: ['l1'],
      wires: [W('src.L', 'mcb.in'), W('mcb.out', 'sk.in'), W('sk.out', 'l1.a'), W('l1.b', 'src.N')],
      init: { mcb: false, sk: false },
      chain: 'Sumber (L) → MCB → Saklar → Lampu → Sumber (N)',
      experiments: [
        { text: 'ON-kan MCB lalu saklar: lampu menyala', hint: 'Klik MCB (ON), kemudian klik saklar (ON).', test: c => c.S.mcb && c.S.sk && lit(c.A, 'l1') },
        { text: 'OFF-kan saklar saat MCB ON: lampu padam', hint: 'Dengan MCB tetap ON, klik saklar sampai OFF.', test: c => c.S.mcb && !c.S.sk && !lit(c.A, 'l1') },
        { text: 'Lepas satu kabel (klik kabelnya): lampu padam walau semua ON', hint: 'OFF-kan MCB dulu (K3!), klik salah satu kabel, ON-kan MCB dan saklar. Lalu tekan ↺ Kembalikan.', test: c => c.S.mcb && c.S.sk && c.wires.length < c.orig && !lit(c.A, 'l1') }
      ],
      explain: c => {
        if (!c.S.mcb) return { type: 'info', title: 'MCB masih OFF', text: 'Seluruh rangkaian belum bertegangan. Jalur fasa terputus di MCB, jadi arus belum bisa mengalir ke mana pun.' };
        if (!c.S.sk) return { type: 'info', title: 'Arus berhenti di saklar', text: 'MCB ON sehingga fasa sudah sampai di saklar (kabel merah). Namun saklar OFF memutus jalur, jadi lampu dan fittingnya tidak bertegangan. Inilah alasan saklar dipasang pada fasa.' };
        if (lit(c.A, 'l1')) return { type: 'ok', title: '✔ Rangkaian tertutup: lampu menyala', text: 'Arus mengalir L → MCB → saklar → lampu → N. Lampu hanya menyala bila seluruh jalur tertutup tanpa terputus.' };
        return { type: 'bad', title: 'Lampu padam padahal MCB dan saklar ON', text: 'Ada jalur yang terputus (kabel terlepas). Telusuri dari sumber ke lampu: bagian mana yang tidak berwarna merah/biru?' };
      }
    },

    p2: {
      nama: '2 · 1 saklar + 2 lampu paralel',
      tujuan: 'Memahami rangkaian paralel: kotak sambung membagi fasa ke dua lampu sehingga keduanya sama terang dan tidak saling bergantung.',
      comps: [SRC, mcb(210), sw('sk', 'SAKLAR', 380, 92),
        { id: 'ks', type: 'junction', x: 490, y: 170, w: 130, h: 44, label: 'KOTAK SAMBUNG', internal: true, info: 'Tempat percabangan kabel. Semua terminal di dalamnya tersambung, sehingga satu jalur fasa terbagi menjadi dua cabang.',
          terms: [{ id: 'j1', x: 555, y: 170, dir: 't', label: '' }, { id: 'j2', x: 530, y: 214, dir: 'b', label: '' }, { id: 'j3', x: 580, y: 214, dir: 'b', label: '' }] },
        lamp('l1', 'LAMPU 1', 300, 290, 100, 60), lamp('l2', 'LAMPU 2', 520, 290, 100, 60)],
      lamps: ['l1', 'l2'],
      wires: [W('src.L', 'mcb.in'), W('mcb.out', 'sk.in'), W('sk.out', 'ks.j1'), W('ks.j2', 'l1.a'), W('ks.j3', 'l2.a'), W('l1.b', 'src.N'), W('l2.b', 'src.N')],
      init: { mcb: false, sk: false },
      chain: 'Sumber (L) → MCB → Saklar → Kotak sambung → (Lampu 1 + Lampu 2) → Sumber (N)',
      experiments: [
        { text: 'Nyalakan: kedua lampu menyala sama terang', hint: 'ON-kan MCB lalu saklar.', test: c => c.S.mcb && c.S.sk && lit(c.A, 'l1') && lit(c.A, 'l2') },
        { text: 'OFF-kan saklar: kedua lampu padam bersamaan', hint: 'Saat MCB ON, klik saklar sampai OFF. Satu saklar mengendalikan dua lampu.', test: c => c.S.mcb && !c.S.sk && !lit(c.A, 'l1') && !lit(c.A, 'l2') },
        { text: 'Putuskan Lampu 2 (lepas kabel a atau b-nya): Lampu 1 tetap menyala', hint: 'OFF-kan MCB, klik kabel yang masuk ke Lampu 2, lalu ON-kan MCB dan saklar. Inilah sifat paralel.', test: c => c.S.mcb && c.S.sk && lit(c.A, 'l1') && !lit(c.A, 'l2') && c.wires.length < c.orig }
      ],
      explain: c => {
        if (!c.S.mcb) return { type: 'info', title: 'MCB masih OFF', text: 'Belum ada arus. Naikkan MCB, lalu ON-kan saklar untuk melihat pembagian arus di kotak sambung.' };
        if (!c.S.sk) return { type: 'info', title: 'Arus berhenti di saklar', text: 'Fasa sudah sampai di saklar, tetapi kotak sambung dan kedua lampu belum bertegangan karena saklar OFF.' };
        const a = lit(c.A, 'l1'), b = lit(c.A, 'l2');
        if (a && b) return { type: 'ok', title: '✔ Dua lampu paralel', text: 'Di kotak sambung fasa terbagi dua cabang. Masing-masing lampu mendapat tegangan penuh 220 V dari fasa ke netral, sehingga sama terang.' };
        if (a !== b) return { type: 'ok', title: '✔ Satu lampu putus, yang lain tetap menyala', text: 'Karena paralel, tiap lampu punya jalur sendiri. Kerusakan atau terlepasnya satu lampu tidak memutus lampu lainnya.' };
        return { type: 'bad', title: 'Kedua lampu padam', text: 'Jalur utama terputus sebelum kotak sambung (mis. kabel dari saklar atau sumber terlepas).' };
      }
    },

    p3: {
      nama: '3 · 2 saklar + 2 lampu (kendali terpisah)',
      tujuan: 'Memahami pengendalian beban secara terpisah: tiap lampu punya saklar sendiri, sedangkan MCB mengamankan keduanya sekaligus.',
      comps: [SRC, mcb(170, 90),
        sw('sk1', 'SAKLAR 1', 360, 48), sw('sk2', 'SAKLAR 2', 360, 196),
        lamp('l1', 'LAMPU 1', 540, 48), lamp('l2', 'LAMPU 2', 540, 196)],
      lamps: ['l1', 'l2'],
      wires: [W('src.L', 'mcb.in'), W('mcb.out', 'sk1.in', 108), W('mcb.out', 'sk2.in', 180), W('sk1.out', 'l1.a'), W('sk2.out', 'l2.a'), W('l1.b', 'src.N'), W('l2.b', 'src.N')],
      init: { mcb: false, sk1: false, sk2: false },
      chain: 'Sumber (L) → MCB → bercabang: [Saklar 1 → Lampu 1] dan [Saklar 2 → Lampu 2] → Sumber (N)',
      experiments: [
        { text: 'Nyalakan hanya Lampu 1 (Lampu 2 tetap padam)', hint: 'ON-kan MCB dan Saklar 1 saja.', test: c => c.S.mcb && c.S.sk1 && !c.S.sk2 && lit(c.A, 'l1') && !lit(c.A, 'l2') },
        { text: 'Nyalakan hanya Lampu 2 (Lampu 1 tetap padam)', hint: 'OFF-kan Saklar 1, ON-kan Saklar 2.', test: c => c.S.mcb && c.S.sk2 && !c.S.sk1 && lit(c.A, 'l2') && !lit(c.A, 'l1') },
        { text: 'Nyalakan keduanya, lalu OFF-kan MCB: keduanya padam', hint: 'ON-kan kedua saklar, kemudian klik MCB sampai OFF. MCB adalah pemutus utama.', test: c => !c.S.mcb && c.S.sk1 && c.S.sk2 && !lit(c.A, 'l1') && !lit(c.A, 'l2') }
      ],
      explain: c => {
        const a = lit(c.A, 'l1'), b = lit(c.A, 'l2');
        if (!c.S.mcb) return { type: 'info', title: 'MCB OFF: semua mati', text: c.S.sk1 || c.S.sk2 ? 'Meski saklar sudah ON, tidak ada lampu menyala karena MCB memutus fasa untuk seluruh rangkaian.' : 'Naikkan MCB, lalu pilih saklar mana yang ingin kamu ON-kan.' };
        if (a && b) return { type: 'ok', title: '✔ Kedua lampu menyala', text: 'Fasa dari MCB bercabang ke dua saklar. Masing-masing saklar menyambung jalur ke lampunya sendiri.' };
        if (a) return { type: 'ok', title: 'Hanya Lampu 1 menyala', text: 'Saklar 1 ON menyambung jalur ke Lampu 1. Jalur Lampu 2 terputus di Saklar 2 (OFF), jadi tidak mempengaruhi Lampu 1.' };
        if (b) return { type: 'ok', title: 'Hanya Lampu 2 menyala', text: 'Saklar 2 ON menyambung jalur ke Lampu 2. Lampu 1 padam karena Saklar 1 masih OFF.' };
        return { type: 'info', title: 'Semua saklar OFF', text: 'MCB ON, fasa sudah sampai di kedua saklar (kabel merah) namun belum diteruskan ke lampu.' };
      }
    },

    p4: {
      nama: '4 · Saklar tukar (1 lampu, 2 tempat)',
      tujuan: 'Memahami saklar tukar (hotel/two-way): satu lampu dapat dinyalakan dan dimatikan dari dua lokasi, misalnya ujung atas dan bawah tangga.',
      comps: [SRC, mcb(170, 80),
        { id: 'swa', type: 'saklar2', x: 290, y: 80, w: 90, h: 100, label: 'SAKLAR A', toggle: true, info: 'Saklar tukar: terminal COM menyambung ke jalur 1 atau jalur 2 (bukan memutus). Dipasang di lokasi pertama.',
          terms: [{ id: 'com', x: 290, y: 130, dir: 'l', label: 'COM' }, { id: 'a1', x: 380, y: 105, dir: 'r', label: '1' }, { id: 'a2', x: 380, y: 155, dir: 'r', label: '2' }] },
        { id: 'swb', type: 'saklar2', x: 450, y: 80, w: 90, h: 100, label: 'SAKLAR B', toggle: true, flip: true, info: 'Saklar tukar kedua di lokasi lain. Dua kabel penghubung (jalur 1 dan 2) menghubungkan Saklar A dengan Saklar B.',
          terms: [{ id: 'a1', x: 450, y: 105, dir: 'l', label: '1' }, { id: 'a2', x: 450, y: 155, dir: 'l', label: '2' }, { id: 'com', x: 540, y: 130, dir: 'r', label: 'COM' }] },
        lamp('l1', 'LAMPU', 610, 92)],
      lamps: ['l1'],
      wires: [W('src.L', 'mcb.in'), W('mcb.out', 'swa.com'), W('swa.a1', 'swb.a1'), W('swa.a2', 'swb.a2'), W('swb.com', 'l1.a'), W('l1.b', 'src.N')],
      init: { mcb: false, swa: true, swb: true },
      chain: 'Sumber (L) → MCB → Saklar A (COM) → 2 kabel penghubung → Saklar B → Lampu → Sumber (N)',
      experiments: [
        { text: 'Nyalakan lampu dengan kedua saklar sejajar (A dan B sama-sama posisi 1)', hint: 'ON-kan MCB. Pastikan Saklar A dan B sama-sama di posisi atas (1).', test: c => c.S.mcb && c.S.swa && c.S.swb && lit(c.A, 'l1') },
        { text: 'Pindahkan Saklar A saja: lampu padam', hint: 'Klik Saklar A sehingga posisinya berbeda dari Saklar B.', test: c => c.S.mcb && c.S.swa !== c.S.swb && !lit(c.A, 'l1') },
        { text: 'Pindahkan Saklar B juga (keduanya posisi 2): lampu menyala lagi', hint: 'Kedua saklar harus sejajar kembali, kali ini di posisi bawah (2).', test: c => c.S.mcb && !c.S.swa && !c.S.swb && lit(c.A, 'l1') }
      ],
      explain: c => {
        if (!c.S.mcb) return { type: 'info', title: 'MCB masih OFF', text: 'ON-kan MCB dahulu. Lalu klik Saklar A atau B untuk memindahkan tuasnya antara posisi 1 dan 2.' };
        if (lit(c.A, 'l1')) return { type: 'ok', title: '✔ Lampu menyala', text: 'Kedua saklar berada di posisi yang sama, sehingga jalur fasa tersambung lewat salah satu kabel penghubung sampai ke lampu.' };
        if (c.S.swa !== c.S.swb) return { type: 'info', title: 'Lampu padam: posisi saklar berbeda', text: 'Saklar A mengalirkan fasa ke satu kabel penghubung, sedangkan Saklar B menunggu di kabel yang lain. Jalur terputus; pindahkan salah satu saklar mana pun untuk menyalakan lagi.' };
        return { type: 'bad', title: 'Lampu padam walau saklar sejajar', text: 'Ada kabel yang terlepas atau salah sambung. Pastikan kabel penghubung 1↔1 dan 2↔2 terpasang.' };
      }
    }
  };

  E.PRESETS = PRESETS;
})();
