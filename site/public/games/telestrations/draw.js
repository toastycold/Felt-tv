// Drawing pad for phones + stroke renderer for any screen.
// Strokes are stored as { c: color, w: width, p: [x0, y0, x1, y1, ...] } on a 1000 x 750 grid.
import { injectStyles } from '../../js/ui.js';

export const W = 1000, H = 750;
export const COLORS = ['#22201b', '#d6453d', '#2f6fb5', '#2e8b57', '#f2a830', '#8a4fc7', '#ffffff'];

export function paintStrokes(canvas, strokes) {
  const ctx = canvas.getContext('2d');
  const sx = canvas.width / W, sy = canvas.height / H;
  ctx.fillStyle = '#fffdf6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const st of strokes || []) {
    const p = st.p || [];
    ctx.strokeStyle = st.c;
    ctx.lineWidth = st.w * sx;
    ctx.beginPath();
    ctx.moveTo(p[0] * sx, p[1] * sy);
    if (p.length === 2) ctx.lineTo(p[0] * sx + 0.1, p[1] * sy);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * sx, p[i + 1] * sy);
    ctx.stroke();
  }
}

/** Draw every <canvas data-media="id"> inside el, loading strokes through ctx.media(). */
export function paintAll(el, media) {
  el.querySelectorAll('canvas[data-media]').forEach((c) => {
    const strokes = media(c.dataset.media);
    if (strokes) paintStrokes(c, strokes);
    else paintStrokes(c, []);
  });
}

export function drawStyles() {
  injectStyles('telestrations', `
    .ts-pad { position: relative; width: 100%; aspect-ratio: 4 / 3; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 0 var(--card-edge); touch-action: none; }
    .ts-pad canvas, canvas.ts-art { width: 100%; height: 100%; display: block; border-radius: 12px; background: #fffdf6; }
    canvas.ts-art { aspect-ratio: 4 / 3; height: auto; box-shadow: 0 5px 0 var(--card-edge); }
    .ts-tools { display: flex; gap: .4rem; align-items: center; justify-content: space-between; margin: .6rem 0; flex-wrap: wrap; }
    .ts-swatch { width: 2.1rem; height: 2.1rem; border-radius: 50%; border: 3px solid transparent; cursor: pointer; box-shadow: inset 0 0 0 2px rgba(0,0,0,.15); }
    .ts-swatch.on { border-color: var(--gold); }
    .ts-size { background: var(--felt-deep); color: var(--cream-text); border: 2px solid var(--felt-line); border-radius: 99px; padding: .25rem .7rem; font-weight: 700; cursor: pointer; }
    .ts-size.on { background: var(--gold); color: var(--ink); border-color: var(--gold); }
    .ts-prompt { background: var(--card); color: var(--ink); border-radius: 12px; padding: .5rem 1rem; font: 800 1.5rem var(--display); display: inline-block; box-shadow: 0 4px 0 var(--card-edge); }
    .ts-reveal { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; max-width: 1100px; margin: 0 auto; }
    .ts-entry { text-align: center; }
    .ts-entry .by { margin-top: .6rem; font-weight: 700; opacity: .85; }
    .ts-entry .words { font: 800 clamp(2rem, 4.5vw, 3.4rem)/1.1 var(--display); background: var(--card); color: var(--ink); border-radius: 18px; padding: 2rem 1rem; box-shadow: 0 6px 0 var(--card-edge); }
    .ts-entry.dim { opacity: .55; transform: scale(.9); }
    .ts-chips { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin: 1rem 0; }
    .ts-chips span { padding: .35rem .85rem; border-radius: 99px; background: var(--felt-deep); font-weight: 700; }
    .ts-chips span.in { background: var(--gold); color: var(--ink); }
    @media (max-width: 800px) { .ts-reveal { grid-template-columns: 1fr; } }
  `);
}

/** A drawing pad. Keeps its strokes in `store.strokes` so a re-render doesn't lose the drawing. */
export function mountPad(container, store) {
  const canvas = container.querySelector('canvas');
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * devicePixelRatio);
    canvas.height = Math.round(r.height * devicePixelRatio);
    paintStrokes(canvas, store.strokes);
  };
  resize();
  let current = null;
  const toGrid = (e) => {
    const r = canvas.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * W), Math.round(((e.clientY - r.top) / r.height) * H)];
  };
  canvas.onpointerdown = (e) => {
    canvas.setPointerCapture(e.pointerId);
    current = { c: store.color, w: store.width, p: toGrid(e) };
    store.strokes.push(current);
    paintStrokes(canvas, store.strokes);
  };
  canvas.onpointermove = (e) => {
    if (!current) return;
    const [x, y] = toGrid(e);
    const p = current.p;
    if (Math.abs(p[p.length - 2] - x) + Math.abs(p[p.length - 1] - y) < 4) return; // skip tiny moves
    p.push(x, y);
    paintStrokes(canvas, store.strokes);
  };
  canvas.onpointerup = canvas.onpointercancel = () => { current = null; };
  return { repaint: () => paintStrokes(canvas, store.strokes), resize };
}
