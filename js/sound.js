/* =======================================================================
   SOUND EFFECTS — E-Modul TITL
   Semua bunyi dibuat langsung lewat Web Audio API (bukan file audio),
   jadi tidak perlu upload file apa pun dan tidak ada masalah lisensi.
   Siswa bisa mematikan suara lewat tombol 🔊 di navbar (tersimpan per
   device di localStorage).
   ======================================================================= */

let audioCtx = null;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function isSoundOn() {
  return localStorage.getItem('emodul_sound') !== 'off';
}
function setSoundOn(on) {
  localStorage.setItem('emodul_sound', on ? 'on' : 'off');
}

function tone(freq, duration, type = 'sine', delay = 0, gainPeak = 0.09) {
  if (!isSoundOn()) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch (e) { /* audio not available, fail silently */ }
}

const sfx = {
  click: () => tone(720, 0.07, 'sine'),
  toggle: () => tone(500, 0.09, 'triangle'),
  correct: () => { tone(523, 0.12, 'sine', 0); tone(784, 0.18, 'sine', 0.1); },
  wrong: () => { tone(200, 0.18, 'sawtooth', 0); tone(140, 0.22, 'sawtooth', 0.08); },
  success: () => { tone(392, 0.12, 'sine', 0); tone(523, 0.12, 'sine', 0.1); tone(659, 0.22, 'sine', 0.2); },
  navigate: () => tone(600, 0.06, 'sine')
};

// Bunyi klik generik untuk semua tombol & elemen interaktif umum.
document.addEventListener('click', (e) => {
  const el = e.target.closest('button, .comp-card, .nav-links a, .sim-comp, .sim-slot, .check-item');
  if (el && !el.hasAttribute('data-no-sfx')) sfx.click();
}, true);

// Tombol mute/unmute di navbar, ditambahkan otomatis setelah halaman siap.
function renderSoundToggle() {
  const nav = document.querySelector('.nav-links');
  if (!nav || document.getElementById('soundToggleBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'soundToggleBtn';
  btn.setAttribute('data-no-sfx', 'true');
  btn.style.cssText = 'background:none;border:none;font-size:1.05rem;padding:9px 12px;';
  const update = () => { btn.textContent = isSoundOn() ? '🔊' : '🔈'; btn.title = isSoundOn() ? 'Matikan suara' : 'Nyalakan suara'; };
  update();
  btn.addEventListener('click', () => { setSoundOn(!isSoundOn()); sfx.toggle(); update(); });
  nav.appendChild(btn);
}

document.addEventListener('DOMContentLoaded', renderSoundToggle);
