// Small UI helpers games can use.

/**
 * Replace el's HTML without wiping what the user is typing.
 * Games re-render on every state change (e.g. when another player submits),
 * so any <input id="..."> keeps its value, focus and cursor position.
 */
export function setHtmlKeepingInputs(el, html) {
  const saved = {};
  el.querySelectorAll('input[id], textarea[id], select[id]').forEach((i) => (saved[i.id] = i.value));
  const active = document.activeElement;
  const focusId = active && el.contains(active) ? active.id : null;
  const sel = focusId ? [active.selectionStart, active.selectionEnd] : null;

  el.innerHTML = html;

  for (const [id, value] of Object.entries(saved)) {
    const input = el.querySelector(`#${CSS.escape(id)}`);
    if (input && !input.dataset.reset) input.value = value;
  }
  if (focusId) {
    const input = el.querySelector(`#${CSS.escape(focusId)}`);
    if (input) {
      input.focus();
      try { input.setSelectionRange(...sel); } catch { /* not a text input */ }
    }
  }
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function nameOf(id, players) {
  if (id === 'cpu') return 'Computer';
  return players.find((p) => p.id === id)?.name || 'Player';
}

/** Adds a <style> tag once per key. */
const injected = new Set();
export function injectStyles(key, css) {
  if (injected.has(key)) return;
  injected.add(key);
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
}

export function shuffle(array, random = Math.random) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Makes 4 single-letter <input>s act like one room-code field. Returns a getter for the code. */
export function wireTileInput(container, initial = '') {
  const inputs = [...container.querySelectorAll('input')];
  inputs.forEach((input, i) => {
    input.value = (initial[i] || '').toUpperCase();
    input.addEventListener('input', () => {
      const letters = input.value.toUpperCase().replace(/[^A-Z]/g, '');
      if (letters.length > 1) {
        // pasted or autofilled several letters
        letters.split('').slice(0, inputs.length - i).forEach((ch, k) => (inputs[i + k].value = ch));
        inputs[Math.min(i + letters.length, inputs.length - 1)].focus();
        return;
      }
      input.value = letters;
      if (letters && inputs[i + 1]) inputs[i + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && inputs[i - 1]) {
        inputs[i - 1].value = '';
        inputs[i - 1].focus();
        e.preventDefault();
      }
    });
    input.addEventListener('focus', () => input.select());
  });
  return () => inputs.map((x) => x.value).join('');
}

export const tileInputHtml = (label = 'Room code') => `
  <div class="tile-input" role="group" aria-label="${label}">
    ${[1, 2, 3, 4].map((n) => `<input maxlength="4" inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Letter ${n}">`).join('')}
  </div>`;

/**
 * Countdown timers: any element with data-deadline="<epoch ms>" shows the seconds left.
 * Engines store a deadline in state; views just render <span data-deadline="..."></span>.
 */
if (typeof document !== 'undefined' && !globalThis.__feltTimer) {
  globalThis.__feltTimer = setInterval(() => {
    document.querySelectorAll('[data-deadline]').forEach((el) => {
      const left = Math.max(0, Math.ceil((Number(el.dataset.deadline) - Date.now()) / 1000));
      el.textContent = left;
      el.classList.toggle('urgent', left <= 5);
    });
  }, 250);
}

export const countdown = (deadline) =>
  deadline ? `<span class="timer" data-deadline="${deadline}">${Math.max(0, Math.ceil((deadline - Date.now()) / 1000))}</span>` : '';

/** Shared scoreboard markup: [{ name, score }] */
export function scoreboard(rows) {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  return `<ol class="scoreboard">${sorted.map((r, i) => `<li class="${i === 0 && r.score > 0 ? 'lead' : ''}"><span>${esc(r.name)}</span><strong>${r.score}</strong></li>`).join('')}</ol>`;
}
