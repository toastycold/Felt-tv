// Dots and Boxes rules. Runs on the host screen.
// Edges: horizontal h[r*C + c] (r in 0..R, c in 0..C-1), vertical v[r*(C+1) + c] (r in 0..R-1, c in 0..C).
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';

export const COLORS = ['#e0574e', '#4a8ad6', '#f2c230', '#5bc26a', '#a35bd6', '#f0923a'];
const sizeFor = (n) => (n <= 2 ? 5 : n <= 4 ? 6 : 7);

export default class DotsEngine extends BaseGameEngine {
  onInit() {
    this.state = { phase: 'lobby', R: 0, C: 0, h: [], v: [], boxes: [], seats: [], turn: 0, scores: {}, last: null, winner: '', round: 0 };
  }

  newBoard() {
    const s = this.state;
    s.seats = shuffle(this.players.map((p) => p.id)).slice(0, 6);
    s.R = s.C = sizeFor(s.seats.length);
    s.h = Array((s.R + 1) * s.C).fill(-1);
    s.v = Array(s.R * (s.C + 1)).fill(-1);
    s.boxes = Array(s.R * s.C).fill(-1);
    s.turn = 0;
    s.scores = Object.fromEntries(s.seats.map((id) => [id, 0]));
    Object.assign(s, { phase: 'play', last: null, winner: '' });
    s.round += 1;
  }

  onGameStart() { super.onGameStart(); this.newBoard(); this.sync(); }

  onPlayerLeave(id) {
    const s = this.state;
    if (s.phase !== 'play' || s.seats[s.turn] !== id) return;
    this.advance();
    this.sync();
  }

  advance() {
    const s = this.state;
    const here = new Set(this.players.map((p) => p.id));
    for (let k = 0; k < s.seats.length; k++) {
      s.turn = (s.turn + 1) % s.seats.length;
      if (here.has(s.seats[s.turn])) return;
    }
  }

  /** Boxes touching an edge: [boxIndex, ...] */
  boxesOf(kind, i) {
    const { R, C } = this.state;
    if (kind === 'h') {
      const r = Math.floor(i / C), c = i % C, out = [];
      if (r > 0) out.push((r - 1) * C + c);
      if (r < R) out.push(r * C + c);
      return out;
    }
    const r = Math.floor(i / (C + 1)), c = i % (C + 1), out = [];
    if (c > 0) out.push(r * C + c - 1);
    if (c < C) out.push(r * C + c);
    return out;
  }

  closed(b) {
    const { C, h, v } = this.state;
    const r = Math.floor(b / C), c = b % C;
    return h[r * C + c] >= 0 && h[(r + 1) * C + c] >= 0 && v[r * (C + 1) + c] >= 0 && v[r * (C + 1) + c + 1] >= 0;
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    switch (type) {
      case 'game:line': {
        if (s.phase !== 'play' || s.seats[s.turn] !== me) return;
        const kind = p.kind === 'h' ? 'h' : p.kind === 'v' ? 'v' : '';
        const arr = s[kind];
        if (!arr || !Number.isInteger(p.i) || p.i < 0 || p.i >= arr.length || arr[p.i] >= 0) return;
        arr[p.i] = s.turn;
        let made = 0;
        for (const b of this.boxesOf(kind, p.i)) {
          if (s.boxes[b] < 0 && this.closed(b)) { s.boxes[b] = s.turn; made += 1; }
        }
        s.scores[me] += made;
        s.last = { kind, i: p.i, by: me, made };
        if (s.boxes.every((b) => b >= 0)) {
          s.phase = 'over';
          const top = Math.max(...Object.values(s.scores));
          const w = s.seats.filter((id) => s.scores[id] === top);
          s.winner = w.length === 1 ? w[0] : w;
        } else if (!made) this.advance();
        break;
      }
      case 'game:skip':
        if (s.phase !== 'play' || !(meta.isBoard || meta.isVip)) return;
        this.advance();
        break;
      case 'game:again':
        if (s.phase !== 'over' || !(meta.isBoard || meta.isVip)) return;
        this.newBoard();
        break;
      default:
        return;
    }
    this.sync();
  }
}
