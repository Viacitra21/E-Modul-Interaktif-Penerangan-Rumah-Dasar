// Nav toggle (mobile)
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }

  // Highlight active nav link based on current file
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === current) a.classList.add('active');
  });
});

// Generic modal open/close helper used across pages
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); if (window.sfx) sfx.pop(); }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); if (window.sfx) sfx.close(); }
}
document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// Scroll-reveal: elemen dengan class .reveal muncul dengan animasi fade-up
// saat pertama kali masuk viewport (dipakai untuk kartu, section-head, dll).
document.addEventListener('DOMContentLoaded', () => {
  const targets = document.querySelectorAll('.info-card, .section-head, .rail-step, .comp-card, .symbol-card, .goal-list li, .trouble-card');
  targets.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach(el => io.observe(el));
});

// Tabs helper
function initTabs(tabsSelector) {
  document.querySelectorAll(tabsSelector + ' .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.tabs');
      const target = btn.dataset.tab;
      group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === target);
      });
      if (window.sfx) sfx.tab();
      document.dispatchEvent(new CustomEvent('tabchange', { detail: target }));
    });
  });
}
