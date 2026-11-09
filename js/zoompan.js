/* =======================================================================
   ZOOM + GESER (PAN) untuk gambar SVG — dipakai Trainer Virtual & Diagram
   - Tombol +, −, "Pas" (reset); cubit 2 jari (pinch) di layar sentuh;
     seret 1 jari/mouse untuk menggeser saat sudah di-zoom; Ctrl + roda mouse.
   - Pada zoom 1x halaman tetap bisa di-scroll normal dengan jari.
   - Memakai atribut viewBox, jadi gambar tetap tajam di zoom berapa pun.
   ======================================================================= */
const ZoomPan = (() => {
  function attach(svg, opts = {}) {
    const MAX = opts.max || 3.5, STEP = 1.4;
    let bw = 760, bh = 420, zoom = 1, vx = 0, vy = 0, dragged = false;
    const ptrs = new Map();
    let pan = null, pinch = null, bar = null, label = null;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function apply() {
      const w = bw / zoom, h = bh / zoom;
      vx = clamp(vx, 0, bw - w); vy = clamp(vy, 0, bh - h);
      svg.setAttribute('viewBox', `${vx} ${vy} ${w} ${h}`);
      svg.style.touchAction = zoom > 1.001 ? 'none' : 'pan-y';
      svg.classList.toggle('zoomed', zoom > 1.001);
      if (label) label.textContent = Math.round(zoom * 100) + '%';
      if (opts.onChange) opts.onChange(zoom);
    }
    // titik layar → koordinat SVG
    function toSvg(cx, cy) {
      const r = svg.getBoundingClientRect(), w = bw / zoom, h = bh / zoom;
      const sc = Math.min(r.width / w, r.height / h);               // preserveAspectRatio meet
      const ox = (r.width - w * sc) / 2, oy = (r.height - h * sc) / 2;
      return { x: vx + (cx - r.left - ox) / sc, y: vy + (cy - r.top - oy) / sc, sc };
    }
    function zoomAt(nz, cx, cy) {                                    // cx,cy = titik layar yang dipertahankan
      nz = clamp(nz, 1, MAX);
      const p = toSvg(cx, cy), ratioX = (p.x - vx) / (bw / zoom), ratioY = (p.y - vy) / (bh / zoom);
      zoom = nz; vx = p.x - ratioX * (bw / zoom); vy = p.y - ratioY * (bh / zoom);
      apply();
    }
    function zoomCenter(f) { const r = svg.getBoundingClientRect(); zoomAt(zoom * f, r.left + r.width / 2, r.top + r.height / 2); }

    svg.addEventListener('pointerdown', e => {
      dragged = false; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }; pan = null; dragged = true;
      } else if (ptrs.size === 1) pan = { x: e.clientX, y: e.clientY, vx, vy, active: false };
    });
    svg.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch.d > 0) zoomAt(pinch.z * d / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
        dragged = true; return;
      }
      if (pan && zoom > 1.001) {
        const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (!pan.active && Math.hypot(dx, dy) < 6) return;
        pan.active = true; dragged = true;
        const sc = toSvg(0, 0).sc;
        vx = pan.vx - dx / sc; vy = pan.vy - dy / sc; apply();
      }
    });
    const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) pan = null; };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); zoomAt(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); }, { passive: false });

    const api = {
      setBase(w, h) { bw = w; bh = h; zoom = 1; vx = 0; vy = 0; apply(); },
      reset() { zoom = 1; vx = 0; vy = 0; apply(); },
      focus(z, x, y) { zoom = clamp(z, 1, MAX); vx = x; vy = y; apply(); },     // tampilan awal diperbesar (layar kecil)
      zoomIn() { zoomCenter(STEP); }, zoomOut() { zoomCenter(1 / STEP); },
      get zoom() { return zoom; },
      wasDrag() { return dragged; },                                  // true bila sentuhan terakhir = geser/cubit, bukan ketukan
      // ukuran 1 satuan SVG dalam piksel layar (untuk menyesuaikan area sentuh)
      pxPerUnit() { return toSvg(0, 0).sc; },
      toolbar() {
        bar = document.createElement('div'); bar.className = 'zp-bar';
        bar.innerHTML = `<button type="button" data-z="in" aria-label="Perbesar" data-no-sfx="true">＋</button>
          <button type="button" data-z="out" aria-label="Perkecil" data-no-sfx="true">－</button>
          <button type="button" data-z="reset" aria-label="Lihat seluruh gambar" title="Lihat seluruh gambar" data-no-sfx="true">⤢</button>
          <span class="zp-label">100%</span>`;
        label = bar.querySelector('.zp-label');
        bar.addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
          if (b.dataset.z === 'in') api.zoomIn(); else if (b.dataset.z === 'out') api.zoomOut(); else api.reset();
        });
        return bar;
      }
    };
    return api;
  }
  return { attach };
})();
