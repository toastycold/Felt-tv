// Battleship sound effects for the TV, made on the fly with Web Audio (no sound files to load).
let ctx = null;
function audio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
// Browsers only allow sound after someone touches the page; unlock on the first tap or key press.
['pointerdown', 'keydown'].forEach((t) => addEventListener(t, () => audio(), { once: true, capture: true }));

function noiseBuffer(a, seconds) {
  const b = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** A burst of filtered noise with its own volume envelope. */
function noise(a, t, { dur, from, to, type = 'lowpass', vol = 0.6, attack = 0.005, q = 0.8 }) {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, dur);
  const f = a.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t); src.stop(t + dur + 0.05);
}

/** A pitched tone that slides from one note to another. */
function tone(a, t, { dur, from, to = from, type = 'sine', vol = 0.4, attack = 0.01 }) {
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
}

/** Cannon fires, the shell whistles in, then a splash, a hit, or a ship going down. */
export function playShot(kind) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.02;
  // cannon boom
  tone(a, t, { dur: 0.35, from: 120, to: 40, vol: 0.7 });
  noise(a, t, { dur: 0.3, from: 2500, to: 200, vol: 0.5 });
  // incoming whistle
  tone(a, t + 0.15, { dur: 0.55, from: 1500, to: 500, type: 'triangle', vol: 0.08, attack: 0.08 });
  const land = t + 0.72;
  if (kind === 'miss') {
    noise(a, land, { dur: 0.9, from: 3000, to: 400, type: 'bandpass', vol: 0.55, attack: 0.02, q: 0.6 });
    noise(a, land + 0.1, { dur: 0.7, from: 6000, to: 1500, type: 'highpass', vol: 0.15, attack: 0.05 });
  } else {
    // explosion: a deep thump plus a crackling burst
    tone(a, land, { dur: 0.7, from: 90, to: 30, vol: 0.9 });
    noise(a, land, { dur: 1.1, from: 1800, to: 80, vol: 0.85, attack: 0.003 });
    noise(a, land + 0.08, { dur: 0.6, from: 5000, to: 1200, type: 'bandpass', vol: 0.25, q: 1.2 });
    if (kind === 'sunk') {
      // second blast, then the ship groans and bubbles under
      tone(a, land + 0.45, { dur: 0.8, from: 70, to: 25, vol: 0.8 });
      noise(a, land + 0.45, { dur: 1.2, from: 1200, to: 60, vol: 0.7 });
      tone(a, land + 1.0, { dur: 1.6, from: 160, to: 55, type: 'sawtooth', vol: 0.12, attack: 0.2 });
      for (let k = 0; k < 7; k++) tone(a, land + 1.3 + k * 0.17 + Math.random() * 0.06, { dur: 0.12, from: 300 + Math.random() * 300, to: 700 + Math.random() * 400, vol: 0.07 });
    }
  }
}

/** Victory fanfare when a fleet wins. */
export function playWin() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.05;
  const notes = [392, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.5];
  const lens = [0.16, 0.16, 0.16, 0.32, 0.16, 0.16, 0.9];
  let at = t;
  notes.forEach((f, i) => {
    tone(a, at, { dur: lens[i] + 0.12, from: f, type: 'square', vol: 0.09 });
    tone(a, at, { dur: lens[i] + 0.12, from: f / 2, type: 'triangle', vol: 0.12 });
    at += lens[i];
  });
}
