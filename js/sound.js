/* =======================================================================
   SOUND — E-Modul TITL
   Semua suara dibuat langsung lewat Web Audio API (tanpa file audio),
   jadi ringan dan bebas masalah lisensi.
   - Efek suara (sfx): klik, benar/salah, pasang kabel, MCB trip, dst.
   - Musik latar: musik santai (lo-fi) yang dibangkitkan otomatis agar
     siswa tidak bosan. Bisa dimatikan lewat tombol 🎵 di menu.
   - musicDuck(): musik otomatis mengecil saat narator berbicara.
   ======================================================================= */
let audioCtx = null, masterGain = null, sfxBus = null, musicBus = null;
const MUSIC_VOL = 0.55;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain(); masterGain.gain.value = 1; masterGain.connect(audioCtx.destination);
    sfxBus = audioCtx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(masterGain);
    musicBus = audioCtx.createGain(); musicBus.gain.value = 0.0001; musicBus.connect(masterGain);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
const isSoundOn = () => localStorage.getItem('emodul_sound') !== 'off';
const setSoundOn = (on) => localStorage.setItem('emodul_sound', on ? 'on' : 'off');
const isMusicPref = () => localStorage.getItem('emodul_music') !== 'off';
const setMusicPref = (on) => localStorage.setItem('emodul_music', on ? 'on' : 'off');

function tone(freq, dur, type = 'sine', delay = 0, peak = 0.09, slideTo = null) {
  if (!isSoundOn()) return;
  try {
    const ctx = getCtx(), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    const t0 = ctx.currentTime + delay;
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(sfxBus);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  } catch (e) {}
}
function noiseBurst(dur = 0.15, peak = 0.08, delay = 0, hp = 1200) {
  if (!isSoundOn()) return;
  try {
    const ctx = getCtx(), len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.value = peak;
    src.connect(f).connect(g).connect(sfxBus);
    src.start(ctx.currentTime + delay);
  } catch (e) {}
}

const sfx = {
  click:   () => tone(720, 0.07, 'sine'),
  toggle:  () => tone(500, 0.09, 'triangle'),
  tab:     () => { tone(660, 0.05, 'sine'); tone(880, 0.06, 'sine', 0.05, 0.06); },
  pop:     () => tone(520, 0.12, 'sine', 0, 0.08, 880),
  close:   () => tone(700, 0.1, 'sine', 0, 0.07, 400),
  tick:    () => tone(980, 0.04, 'square', 0, 0.03),
  hint:    () => { tone(784, 0.18, 'sine', 0, 0.07); tone(1175, 0.25, 'sine', 0.08, 0.05); },
  navigate:() => tone(600, 0.06, 'sine'),
  pageIn:  () => { tone(523, 0.14, 'sine', 0, 0.05); tone(659, 0.14, 'sine', 0.1, 0.05); tone(784, 0.2, 'sine', 0.2, 0.05); },
  correct: () => { tone(523, 0.12, 'sine', 0); tone(784, 0.2, 'sine', 0.1); },
  wrong:   () => { tone(200, 0.18, 'sawtooth', 0); tone(140, 0.22, 'sawtooth', 0.08); },
  success: () => { tone(392, 0.12, 'sine', 0); tone(523, 0.12, 'sine', 0.1); tone(659, 0.12, 'sine', 0.2); tone(784, 0.3, 'sine', 0.3); },
  level:   () => { [523,659,784,1047].forEach((f,i)=>tone(f,0.16,'triangle',i*0.09,0.07)); },
  plug:    () => { tone(300, 0.06, 'square', 0, 0.05); tone(900, 0.1, 'sine', 0.05, 0.07); },
  unplug:  () => { tone(700, 0.08, 'sine', 0, 0.06, 250); },
  switchOn:() => { tone(260, 0.05, 'square', 0, 0.06); tone(520, 0.08, 'triangle', 0.04, 0.07); },
  switchOff:() => { tone(520, 0.05, 'square', 0, 0.06); tone(240, 0.09, 'triangle', 0.04, 0.07); },
  bulbOn:  () => { tone(440, 0.35, 'sine', 0, 0.06, 1100); noiseBurst(0.08, 0.03, 0, 3000); },
  trip:    () => { noiseBurst(0.25, 0.12, 0, 400); tone(120, 0.4, 'sawtooth', 0, 0.1, 50); },
  spark:   () => { noiseBurst(0.12, 0.1, 0, 2500); }
};
window.sfx = sfx;

// Bunyi klik umum untuk elemen interaktif (kecuali ada data-no-sfx)
document.addEventListener('click', (e) => {
  const el = e.target.closest('button, .comp-card, .nav-links a, .check-item, a.btn');
  if (el && !el.hasAttribute('data-no-sfx')) sfx.click();
}, true);

/* ---------------- MUSIK LATAR (generatif, santai) ---------------- */
const BPM = 76, BEAT = 60 / BPM;
const CHORDS = [
  { root: 48, tones: [60, 64, 67, 71] },   // Cmaj7
  { root: 45, tones: [57, 60, 64, 67] },   // Am7
  { root: 41, tones: [53, 57, 60, 64] },   // Fmaj7
  { root: 43, tones: [55, 59, 62, 64] }    // G6
];
const PENTA = [72, 74, 76, 79, 81, 84];
const ARP = [0, null, 1, null, 2, null, 3, 2];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let musicRunning = false, schedTimer = null, nextTime = 0, stepIdx = 0;

function padNote(freqs, t, dur) {
  const ctx = getCtx(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.9);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  freqs.forEach((fr, i) => {
    const o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine';
    o.frequency.value = fr; o.detune.value = (i - 1.5) * 4;
    o.connect(f); o.start(t); o.stop(t + dur + 0.1);
  });
  f.connect(g).connect(musicBus);
}
function pluck(freq, t, peak = 0.07, len = 0.7) {
  const ctx = getCtx(), o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = freq;
  f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(500, t + len);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(f).connect(g).connect(musicBus);
  o.start(t); o.stop(t + len + 0.05);
}
function bass(freq, t, len) {
  const ctx = getCtx(), o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.1, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(musicBus); o.start(t); o.stop(t + len + 0.05);
}
function scheduleStep(s, t) {
  const chord = CHORDS[Math.floor(s / 8) % 4], within = s % 8;
  if (within === 0) {
    padNote(chord.tones.map(mtof), t, BEAT * 4.2);
    bass(mtof(chord.root - 12), t, BEAT * 1.8);
  }
  if (within === 4) bass(mtof(chord.root - 5), t, BEAT * 1.2);
  if (ARP[within] !== null) pluck(mtof(chord.tones[ARP[within]] + 12), t, 0.055);
  if ((within === 3 || within === 6) && Math.random() < 0.4)
    pluck(mtof(PENTA[Math.floor(Math.random() * PENTA.length)]), t, 0.04, 0.9);
}
function scheduler() {
  const ctx = getCtx();
  while (nextTime < ctx.currentTime + 0.3) {
    scheduleStep(stepIdx, nextTime);
    nextTime += BEAT / 2;
    stepIdx = (stepIdx + 1) % 32;
  }
}
function startMusic() {
  if (musicRunning || !isMusicPref()) return;
  try {
    const ctx = getCtx();
    musicRunning = true;
    stepIdx = (parseInt(sessionStorage.getItem('emodul_step') || '0', 10) || 0) % 32;
    nextTime = ctx.currentTime + 0.15;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    musicBus.gain.exponentialRampToValueAtTime(MUSIC_VOL, ctx.currentTime + 2.5);
    schedTimer = setInterval(scheduler, 100);
  } catch (e) { musicRunning = false; }
  updateAudioButtons();
}
function stopMusic() {
  if (!musicRunning) return;
  musicRunning = false; clearInterval(schedTimer);
  try {
    const ctx = getCtx();
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), ctx.currentTime);
    musicBus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
  } catch (e) {}
  updateAudioButtons();
}
function musicDuck(on) {
  if (!audioCtx || !musicRunning) return;
  const ctx = audioCtx;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), ctx.currentTime);
  musicBus.gain.exponentialRampToValueAtTime(on ? 0.12 : MUSIC_VOL, ctx.currentTime + 0.5);
}
window.musicDuck = musicDuck; window.startMusic = startMusic; window.stopMusic = stopMusic;

window.addEventListener('pagehide', () => {
  sessionStorage.setItem('emodul_step', String(Math.ceil(stepIdx / 8) * 8 % 32));
});
document.addEventListener('visibilitychange', () => {
  if (!audioCtx || !musicRunning) return;
  document.hidden ? audioCtx.suspend() : audioCtx.resume();
});
// Musik mulai pada interaksi pertama (aturan autoplay browser)
['pointerdown', 'keydown'].forEach(ev =>
  document.addEventListener(ev, () => { if (isMusicPref()) startMusic(); }, { once: true, capture: true }));

/* ---------------- Tombol audio di navbar ---------------- */
function updateAudioButtons() {
  const s = document.getElementById('soundToggleBtn'), m = document.getElementById('musicToggleBtn');
  if (s) { s.textContent = isSoundOn() ? '🔊' : '🔈'; s.title = isSoundOn() ? 'Matikan efek suara' : 'Nyalakan efek suara'; }
  if (m) { m.textContent = isMusicPref() ? '🎵' : '🔇'; m.title = isMusicPref() ? 'Matikan musik latar' : 'Nyalakan musik latar'; m.classList.toggle('muted', !isMusicPref()); }
}
function renderAudioButtons() {
  const nav = document.querySelector('.nav-links');
  if (!nav || document.getElementById('soundToggleBtn')) return;
  const mk = (id) => { const b = document.createElement('button'); b.id = id; b.className = 'nav-icon-btn'; b.setAttribute('data-no-sfx', 'true'); return b; };
  const s = mk('soundToggleBtn'), m = mk('musicToggleBtn');
  s.addEventListener('click', () => { setSoundOn(!isSoundOn()); sfx.toggle(); updateAudioButtons(); });
  m.addEventListener('click', () => {
    setMusicPref(!isMusicPref());
    if (isMusicPref()) startMusic(); else stopMusic();
    updateAudioButtons();
  });
  nav.appendChild(m); nav.appendChild(s);
  updateAudioButtons();
}
document.addEventListener('DOMContentLoaded', renderAudioButtons);
