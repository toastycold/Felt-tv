// Test bots. A bot is a hidden phone (play.html?bot=1) that joins like a real player and then
// taps around its own screen: it fills in text boxes, picks things and presses buttons.
// It doesn't play well, but it works in every game, so one person can try anything out.

const WORDS = ['turkey', 'pumpkin', 'banana', 'rocket', 'castle', 'pickle', 'tiger', 'cloud', 'pizza', 'river', 'robot',
  'mittens', 'llama', 'waffle', 'thunder', 'cactus', 'noodle', 'bubble', 'dragon', 'muffin', 'sock', 'gravy', 'sled'];
const PHRASES = ['A very sleepy bear', 'Grandma at the buffet', 'Too many cooks', 'The dog ate it', 'Socks with sandals',
  'Pie for breakfast', 'Lost the remote again', 'A moose in a hat'];
const AVOID = /leave|quit|end game|change my guess|never mind|i'll narrate|suggest|log out|sign out/i;

let lastKey = '', repeats = 0;           // the same button pressed over and over means it isn't working
const keyOf = (el) => el.id || (el.textContent || '').trim().slice(0, 30);
function press(el) {
  const k = keyOf(el);
  repeats = k === lastKey ? repeats + 1 : 0;
  lastKey = k;
  tap(el);
}
const rand = (n) => Math.floor(Math.random() * n);
const pick = (list) => list[rand(list.length)];
const visible = (el) => {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const st = getComputedStyle(el);
  return st.visibility !== 'hidden' && st.display !== 'none' && st.pointerEvents !== 'none';
};

function pointer(el, type, x, y) {
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true }));
}

function tap(el) {
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  pointer(el, 'pointerdown', x, y);
  pointer(el, 'pointerup', x, y);
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
}

/** Scribble on a drawing canvas (Telestrations). */
function scribble(canvas) {
  const r = canvas.getBoundingClientRect();
  for (let s = 0; s < 3; s++) {
    let x = r.left + r.width * (0.2 + Math.random() * 0.6), y = r.top + r.height * (0.2 + Math.random() * 0.6);
    pointer(canvas, 'pointerdown', x, y);
    for (let k = 0; k < 12; k++) {
      x += (Math.random() - 0.5) * r.width * 0.15; y += (Math.random() - 0.5) * r.height * 0.15;
      pointer(canvas, 'pointermove', x, y);
    }
    pointer(canvas, 'pointerup', x, y);
  }
  canvas.dataset.botDrew = '1';
}

// Boggle: find real words on the grid, so bots actually score sometimes.
let dict = null;
async function boggleWord(root) {
  const faces = [...root.querySelectorAll('.bg-die')].map((d) => d.textContent.trim().toUpperCase());
  if (faces.length !== 16) return null;
  if (!dict) {
    dict = [];
    const words = (await (await fetch('games/scrabble/words.txt')).text()).split('\n').map((w) => w.trim().toUpperCase()).filter((w) => w.length >= 3 && w.length <= 6);
    dict = words;
  }
  const near = (i, j) => i !== j && Math.abs((i >> 2) - (j >> 2)) <= 1 && Math.abs((i & 3) - (j & 3)) <= 1;
  const fits = (w) => faces.some((_, i) => (function go(i, pos, used) {
    if (!w.startsWith(faces[i], pos)) return false;
    const n = pos + faces[i].length;
    if (n === w.length) return true;
    used.add(i);
    const ok = faces.some((_, j) => near(i, j) && !used.has(j) && go(j, n, used));
    used.delete(i);
    return ok;
  })(i, 0, new Set()));
  const letters = new Set(faces.join(''));
  for (let k = 0; k < 4000; k++) {
    const w = dict[rand(dict.length)];
    if ([...w].every((c) => letters.has(c)) && fits(w)) return w;
  }
  return null;
}

function fill(input) {
  if (input.type === 'number' || input.type === 'range') {
    const min = Number(input.min || 0), max = Number(input.max || 100);
    input.value = String(min + rand(Math.max(1, max - min + 1)));
  } else {
    const max = Number(input.maxLength) > 0 ? Number(input.maxLength) : 40;
    let v = max <= 1 ? 'abcdefghijklmnopqrstuvwxyz'[rand(26)] : max < 12 ? pick(WORDS) : Math.random() < 0.5 ? pick(PHRASES) : pick(WORDS);
    if (input.dataset.botTries) v = pick(WORDS) + rand(10);
    input.value = v.slice(0, max);
    input.dataset.botTries = String(Number(input.dataset.botTries || 0) + 1);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function step() {
  const root = document.querySelector('#controller');
  if (!root) return;

  // 1. Draw on any blank canvas meant for drawing.
  const canvas = [...root.querySelectorAll('canvas')].find((c) => visible(c) && !c.dataset.botDrew && c.width > 150 && !c.closest('.tt-phone'));
  if (canvas && Math.random() < 0.7) { scribble(canvas); return; }

  // Boggle gets real words.
  const bw = root.querySelector('#bg-word');
  if (bw && !bw.value && !bw.dataset.botBusy) {
    bw.dataset.botBusy = '1';
    boggleWord(root).then((w) => {
      delete bw.dataset.botBusy;
      if (!w || !document.body.contains(bw)) return;
      bw.value = w;
      bw.dispatchEvent(new Event('input', { bubbles: true }));
      bw.form?.requestSubmit();
    });
    return;
  }

  // 2. Fill empty text boxes.
  const input = [...root.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([disabled]), textarea:not([disabled])')]
    .find((i) => visible(i) && !i.value);
  if (input) { fill(input); return; }

  // 3. Drag a dial (Wavelength): tap somewhere along it.
  const dial = root.querySelector('.wl-dial.drag svg');
  if (dial && Math.random() < 0.5 && !dial.dataset.botSet) {
    const r = dial.getBoundingClientRect();
    const x = r.left + r.width * (0.1 + Math.random() * 0.8), y = r.top + r.height * 0.35;
    pointer(dial, 'pointerdown', x, y); pointer(dial, 'pointerup', x, y);
    dial.dataset.botSet = '1';
    return;
  }

  // 4. Tap something: buttons, plus the clickable bits some games use (cells, lines, map cities).
  const clickable = [...root.querySelectorAll('button:not([disabled]), [role=button], .db-edge-hit, [data-city]')]
    .filter((el) => visible(el) || el instanceof SVGElement)
    .filter((el) => !AVOID.test(el.textContent || '') && !AVOID.test(el.getAttribute('aria-label') || '') && !/unlock|narrate/.test(el.id || ''));
  if (!clickable.length) return;
  const stuck = repeats >= 3;
  const fresh = stuck ? clickable.filter((el) => keyOf(el) !== lastKey) : clickable;
  const pass = fresh.filter((el) => /pass|skip|swap|take back|cancel/i.test(el.textContent || ''));
  if (stuck && pass.length && Math.random() < 0.7) { press(pick(pass)); return; }
  // Confirm what was just picked (Fire, Draw line, Lock in, Play word…) before picking something else.
  const primary = fresh.filter((el) => el.classList.contains('btn-primary') || el.type === 'submit');
  if (primary.length && Math.random() < 0.65) { press(pick(primary)); return; }
  if (pass.length && Math.random() < 0.08) { press(pick(pass)); return; }
  const weighted = fresh.flatMap((el) => (el.classList.contains('btn-primary') || el.type === 'submit' ? [el, el, el] : [el]));
  if (weighted.length) press(pick(weighted));
}

export function startBot() {
  window.confirm = () => true;
  window.alert = () => {};
  window.prompt = () => pick(WORDS);
  const loop = () => {
    try { step(); } catch (err) { console.warn('bot', err); }
    setTimeout(loop, 700 + rand(1100));
  };
  setTimeout(loop, 1500);
}
