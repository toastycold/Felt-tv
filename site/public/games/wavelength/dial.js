// SVG half-dial shared by the TV and phones.
import { esc, injectStyles } from '../../js/ui.js';

const CX = 200, CY = 200, R = 180;
export const pt = (v, r = R) => {
  const a = Math.PI - (Math.max(0, Math.min(100, v)) / 100) * Math.PI;
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
};
const wedge = (from, to, fill) => {
  from = Math.max(0, from); to = Math.min(100, to);
  if (to <= from) return '';
  const [x1, y1] = pt(from), [x2, y2] = pt(to);
  return `<path d="M${CX} ${CY} L${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${fill}"/>`;
};
const needleSvg = (v, color, width, cls = '') => {
  const [x, y] = pt(v, R - 8);
  return `<line class="${cls}" x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
};

/**
 * opts:
 *  spectrum: [left, right]
 *  target: show the scoring bands (number) or not (null)
 *  needle: the main needle (dark)
 *  team: the team's average needle (gold), drawn under the main one
 *  marks: [{ value, html }] dots on the rim with a little picture (a character) above each
 *  drag: the main needle can be dragged (phones)
 */
export function dialSvg({ target = null, needle = null, team = null, marks = [], spectrum, drag = false }) {
  let bands = '';
  if (target !== null) {
    bands = wedge(target - 20, target + 20, '#f2c230') + wedge(target - 12, target + 12, '#e58a3a') + wedge(target - 4, target + 4, '#d6453d');
  }
  const dots = marks.map((m) => { const [x, y] = pt(m.value, R - 22); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#2f6fb5" stroke="#f7f0dc" stroke-width="2"/>`; }).join('');
  const pics = marks.map((m) => {
    const [x, y] = pt(m.value, R + 18);
    return `<div class="wl-mark" style="left:${(x / 400 * 100).toFixed(2)}%;top:${((y + 45) / 260 * 100).toFixed(2)}%">${m.html}</div>`;
  }).join('');
  return `
    <div class="wl-dial ${drag ? 'drag' : ''}">
      <div class="wl-dialbox">
        <svg viewBox="0 -45 400 260" role="img" aria-label="${esc(spectrum[0])} to ${esc(spectrum[1])} dial">
          <path d="M20 200 A180 180 0 0 1 380 200 Z" fill="#f7f0dc"/>
          ${bands}${dots}
          ${team !== null ? needleSvg(team, '#2f6fb5', 9, 'wl-team') : ''}
          ${needle !== null ? needleSvg(needle, '#22201b', 7, 'wl-needle') : ''}
          ${needle !== null && drag ? (() => { const [x, y] = pt(needle, R - 8); return `<circle class="wl-knob" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="#22201b" stroke="#f2c230" stroke-width="3"/>`; })() : ''}
          <circle cx="${CX}" cy="${CY}" r="14" fill="#22201b"/>
          <rect x="10" y="200" width="380" height="15" rx="4" fill="#d9cba3"/>
        </svg>
        ${pics}
      </div>
      <div class="wl-ends"><span>${esc(spectrum[0])}</span><span>${esc(spectrum[1])}</span></div>
    </div>`;
}

/** Make the needle draggable. onMove(value) while dragging, onDone(value) on release. */
export function wireDrag(root, value, onMove, onDone) {
  const svg = root.querySelector('.wl-dial.drag svg');
  if (!svg) return;
  let v = value;
  const draw = () => {
    const [x, y] = pt(v, R - 8);
    for (const el of svg.querySelectorAll('.wl-needle')) { el.setAttribute('x2', x.toFixed(1)); el.setAttribute('y2', y.toFixed(1)); }
    const k = svg.querySelector('.wl-knob');
    if (k) { k.setAttribute('cx', x.toFixed(1)); k.setAttribute('cy', y.toFixed(1)); }
  };
  const toValue = (e) => {
    const r = svg.getBoundingClientRect();
    // viewBox is 400 wide, 260 tall starting at y = -45
    const x = ((e.clientX - r.left) / r.width) * 400, y = ((e.clientY - r.top) / r.height) * 260 - 45;
    let a = Math.atan2(CY - y, x - CX);           // 0 = right, π = left
    if (a < 0) a = x < CX ? Math.PI : 0;          // below the hinge: clamp to the nearest end
    return Math.round(100 - (a / Math.PI) * 100);
  };
  let dragging = false;
  svg.addEventListener('pointerdown', (e) => { dragging = true; svg.setPointerCapture(e.pointerId); v = toValue(e); draw(); onMove(v); e.preventDefault(); });
  svg.addEventListener('pointermove', (e) => { if (!dragging) return; v = toValue(e); draw(); onMove(v); });
  const end = () => { if (!dragging) return; dragging = false; onDone(v); };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}

export function wavelengthStyles() {
  injectStyles('wavelength', `
    .wl { text-align: center; }
    .wl-dial { max-width: min(640px, 92vw); margin: 0 auto .6rem; }
    .wl-dialbox { position: relative; }
    .wl-dial svg { width: 100%; display: block; }
    .wl-dial.drag svg { touch-action: none; cursor: grab; }
    .wl-mark { position: absolute; transform: translate(-50%, -85%); pointer-events: none; display: flex; flex-direction: column; align-items: center; }
    .wl-mark .wl-init { display: grid; place-items: center; width: 1.7rem; height: 1.7rem; border-radius: 50%; background: #2f6fb5; color: #fff; font: 800 .85rem var(--display); border: 2px solid #f7f0dc; }
    .wl-mark small { font: 700 .7rem var(--body); background: rgba(0,0,0,.45); border-radius: 6px; padding: 0 .3rem; margin-top: -.2rem; }
    .wl-ends { display: flex; justify-content: space-between; gap: 1rem; font: 800 clamp(1.1rem, 2.4vw, 1.8rem) var(--display); margin-top: .4rem; }
    .wl-ends span:last-child { text-align: right; }
    .wl-clue { display: inline-block; background: var(--gold); color: var(--ink); padding: .4rem 1.3rem; border-radius: 14px; font: 800 clamp(1.4rem, 4vw, 2.6rem) var(--display); box-shadow: 0 5px 0 var(--gold-edge); margin: .2rem 0 .6rem; }
    .wl-who { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin: .6rem 0; }
    .wl-who span { padding: .3rem .8rem; border-radius: 99px; background: var(--felt-deep); font-weight: 700; }
    .wl-who span.in { background: var(--gold); color: var(--ink); }
    .wl-legend { font-weight: 700; opacity: .85; }
    .wl-legend b { color: var(--gold); }
    .wl-legend b.wl-blue { color: #8fbaf0; }
  `);
}
