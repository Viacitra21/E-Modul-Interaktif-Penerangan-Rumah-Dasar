/* =======================================================================
   PANDUAN ALUR BELAJAR — bilah 5 langkah di bawah navbar pada setiap halaman
   - Menunjukkan posisi siswa sekarang, tahap yang sudah dikunjungi (✓),
     dan satu kalimat instruksi "apa yang dilakukan di halaman ini".
   - Pada halaman bertab (Materi, Praktik) tab yang sudah dibuka diberi ✓
     dan jumlahnya ditampilkan di elemen #tabProgress bila ada.
   ======================================================================= */
(() => {
  const STAGES = [
    { key: 'Petunjuk', href: 'petunjuk.html', label: 'Petunjuk', todo: 'Baca kelima langkah di bawah, lalu tekan <strong>Lanjut ke Materi</strong>.' },
    { key: 'Materi', href: 'materi.html', label: 'Materi', todo: 'Buka setiap tab satu per satu (tanda ✓ muncul bila sudah dibuka). Setelah semua dibuka, tekan <strong>Lanjut ke Latihan</strong> di bagian bawah.' },
    { key: 'Latihan', href: 'latihan.html', label: 'Latihan', todo: 'Jawab 10 soal. Setelah selesai, tombol <strong>Lanjut ke Jobsheet</strong> muncul di halaman hasil.' },
    { key: 'Jobsheet', href: 'jobsheet.html', label: 'Praktik', todo: 'Kerjakan <strong>Jobsheet 1</strong> (simulasi), lalu <strong>Jobsheet 2</strong> (trainer). Setelah praktik selesai, tekan tombol <strong>Lanjut ke Evaluasi</strong> di bagian paling bawah.' },
    { key: 'Evaluasi', href: 'evaluasi.html', label: 'Evaluasi', todo: 'Baca petunjuk, lalu tekan <strong>Mulai Evaluasi</strong>. Hasil lengkap muncul di akhir.' }
  ];
  const VKEY = 'emodul_visited';
  const read = (k, d) => { try { return JSON.parse(sessionStorage.getItem(k) || d); } catch (e) { return JSON.parse(d); } };
  const write = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  document.addEventListener('DOMContentLoaded', () => {
    const page = (typeof PAGE_TAHAP !== 'undefined') ? PAGE_TAHAP : '';
    const idx = STAGES.findIndex(s => s.key === page);
    if (idx < 0) return;                                       // Beranda: tanpa bilah
    const visited = read(VKEY, '[]');
    if (!visited.includes(page)) { visited.push(page); write(VKEY, visited); }

    const bar = document.createElement('div');
    bar.className = 'flow-bar';
    bar.innerHTML = `<div class="wrap">
      <nav class="flow-steps" aria-label="Alur belajar">` +
      STAGES.map((s, i) => `<a href="${s.href}" class="${i === idx ? 'now' : (visited.includes(s.key) && i < idx ? 'done' : '')}" ${i === idx ? 'aria-current="step"' : ''}><b>${visited.includes(s.key) && i < idx ? '✓' : i + 1}</b>${s.label}</a>`).join('') +
      `</nav><p class="flow-hint"><strong>Langkah ${idx + 1} dari ${STAGES.length}.</strong> ${STAGES[idx].todo}</p></div>`;
    const header = document.querySelector('.site-header');
    if (header) header.insertAdjacentElement('afterend', bar);
    const cur = bar.querySelector('.now'); if (cur && cur.scrollIntoView) { try { cur.parentNode.scrollLeft = cur.offsetLeft - 16; } catch (e) {} }

    // tab yang sudah dibuka
    const tabs = document.querySelectorAll('.tabs .tab-btn');
    if (tabs.length) {
      const TK = 'emodul_tabs_' + page;
      const seen = new Set(read(TK, '[]'));
      const paint = () => {
        tabs.forEach(b => b.classList.toggle('visited', seen.has(b.dataset.tab)));
        const el = document.getElementById('tabProgress');
        if (el) el.textContent = `${seen.size} dari ${tabs.length} bagian sudah dibuka`;
      };
      const active = document.querySelector('.tabs .tab-btn.active'); if (active) seen.add(active.dataset.tab);
      document.addEventListener('tabchange', e => { seen.add(e.detail); write(TK, [...seen]); paint(); });
      paint();
    }
  });
})();
