// A small, complete Tetris that runs on one phone.
export const W = 10, H = 20;
export const COLORS = { I: '#36c2e0', O: '#f2c230', T: '#a35bd6', S: '#5bc26a', Z: '#e0574e', J: '#4a7fd6', L: '#f0923a', G: '#7c8a86' };
const SHAPES = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};
const LINE_PTS = [0, 100, 300, 500, 800];

function rotate(blocks, kind) {
  if (kind === 'O') return blocks;
  const size = kind === 'I' ? 4 : 3;
  return blocks.map(([x, y]) => [size - 1 - y, x]);
}

export class Tetris {
  constructor({ onLock, onClear, onTopOut, random = Math.random } = {}) {
    this.grid = Array.from({ length: H }, () => Array(W).fill(''));
    this.bag = [];
    this.random = random;
    this.score = 0; this.lines = 0; this.level = 1;
    this.over = false;
    this.onLock = onLock || (() => {}); this.onClear = onClear || (() => {}); this.onTopOut = onTopOut || (() => {});
    this.next = this.draw();
    this.spawn();
  }

  draw() {
    if (!this.bag.length) {
      this.bag = Object.keys(SHAPES);
      for (let i = this.bag.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]; }
    }
    return this.bag.pop();
  }

  spawn() {
    const kind = this.next;
    this.next = this.draw();
    this.piece = { kind, blocks: SHAPES[kind].map((b) => [...b]), x: 3, y: kind === 'I' ? -1 : 0 };
    if (!this.fits(this.piece.blocks, this.piece.x, this.piece.y)) { this.over = true; this.onTopOut(); }
  }

  fits(blocks, px, py) {
    return blocks.every(([x, y]) => {
      const gx = px + x, gy = py + y;
      return gx >= 0 && gx < W && gy < H && (gy < 0 || !this.grid[gy][gx]);
    });
  }

  move(dx) { if (!this.over && this.fits(this.piece.blocks, this.piece.x + dx, this.piece.y)) { this.piece.x += dx; return true; } return false; }

  rotate() {
    if (this.over) return;
    const r = rotate(this.piece.blocks, this.piece.kind);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (this.fits(r, this.piece.x + kick, this.piece.y)) { this.piece.blocks = r; this.piece.x += kick; return; }
    }
  }

  /** Move down one row; lock if it can't. Returns false when it locked. */
  step() {
    if (this.over) return false;
    if (this.fits(this.piece.blocks, this.piece.x, this.piece.y + 1)) { this.piece.y += 1; return true; }
    this.lock();
    return false;
  }

  hardDrop() {
    if (this.over) return;
    let n = 0;
    while (this.fits(this.piece.blocks, this.piece.x, this.piece.y + 1)) { this.piece.y += 1; n += 1; }
    this.score += n * 2;
    this.lock();
  }

  ghostY() {
    let y = this.piece.y;
    while (this.fits(this.piece.blocks, this.piece.x, y + 1)) y += 1;
    return y;
  }

  lock() {
    const { blocks, x, y, kind } = this.piece;
    let above = false;
    blocks.forEach(([bx, by]) => { if (y + by < 0) above = true; else this.grid[y + by][x + bx] = kind; });
    if (above) { this.over = true; this.onTopOut(); return; }
    const full = this.grid.map((row, i) => (row.every(Boolean) ? i : -1)).filter((i) => i >= 0);
    if (full.length) {
      this.grid = this.grid.filter((_, i) => !full.includes(i));
      while (this.grid.length < H) this.grid.unshift(Array(W).fill(''));
      this.lines += full.length;
      this.score += LINE_PTS[full.length] * this.level;
      this.level = 1 + Math.floor(this.lines / 10);
      this.onClear(full.length);
    }
    this.spawn();
    this.onLock();
  }

  /** Push junk rows up from the bottom, each with one gap. */
  addJunk(n) {
    for (let k = 0; k < n; k++) {
      const gap = Math.floor(this.random() * W);
      this.grid.shift();
      this.grid.push(Array.from({ length: W }, (_, i) => (i === gap ? '' : 'G')));
    }
    while (!this.over && !this.fits(this.piece.blocks, this.piece.x, this.piece.y)) {
      this.piece.y -= 1;
      if (this.piece.y < -3) { this.over = true; this.onTopOut(); }
    }
  }

  get interval() { return Math.max(90, 800 - (this.level - 1) * 70); }

  /** Board including the falling piece, as a 200-character string ('.' for empty). */
  snapshot() {
    const g = this.grid.map((r) => [...r]);
    if (!this.over) this.piece.blocks.forEach(([bx, by]) => { const yy = this.piece.y + by; if (yy >= 0) g[yy][this.piece.x + bx] = this.piece.kind; });
    return g.map((r) => r.map((c) => c || '.').join('')).join('');
  }
}

/** One block with a classic 3D bevel: light top and left edges, dark bottom and right. */
export function bevel(ctx, x, y, w, h, color) {
  const b = Math.max(2, Math.round(Math.min(w, h) * 0.16));
  const x0 = x + 0.5, y0 = y + 0.5, x1 = x + w - 0.5, y1 = y + h - 0.5;
  ctx.fillStyle = color;
  ctx.fillRect(x0, y0, w - 1, h - 1);
  const face = (pts, fill) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const q of pts.slice(1)) ctx.lineTo(...q); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  face([[x0, y0], [x1, y0], [x1 - b, y0 + b], [x0 + b, y0 + b]], 'rgba(255,255,255,.55)');   // top
  face([[x0, y0], [x0 + b, y0 + b], [x0 + b, y1 - b], [x0, y1]], 'rgba(255,255,255,.30)');   // left
  face([[x1, y0], [x1, y1], [x1 - b, y1 - b], [x1 - b, y0 + b]], 'rgba(0,0,0,.30)');         // right
  face([[x0, y1], [x1, y1], [x1 - b, y1 - b], [x0 + b, y1 - b]], 'rgba(0,0,0,.45)');         // bottom
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, w - 1, h - 1);
}

/** Draw a 200-char board onto a canvas. */
export function paint(canvas, cells, { ghost = null, dim = false } = {}) {
  const ctx = canvas.getContext('2d');
  const cw = canvas.width / W, ch = canvas.height / H;
  ctx.fillStyle = '#0f2f24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,.05)';
  for (let x = 1; x < W; x++) { ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, canvas.height); ctx.stroke(); }
  if (ghost) {
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ghost.forEach(([gx, gy]) => gy >= 0 && ctx.fillRect(gx * cw + 1, gy * ch + 1, cw - 2, ch - 2));
  }
  for (let i = 0; i < W * H; i++) {
    const c = cells[i];
    if (c === '.' || !c) continue;
    const x = (i % W) * cw, y = Math.floor(i / W) * ch;
    bevel(ctx, x, y, cw, ch, COLORS[c] || '#999');
  }
  if (dim) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
}
