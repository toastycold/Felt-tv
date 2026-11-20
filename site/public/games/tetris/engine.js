// Tetris battle. Each phone runs its own game; the host collects snapshots for the TV
// and passes junk rows between players.
import { BaseGameEngine } from '../../js/engine-base.js';

export const W = 10, H = 20;
const GARBAGE = [0, 0, 1, 2, 4]; // lines cleared at once -> junk rows sent

export default class TetrisEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',   // lobby | countdown | play | over
      startAt: 0, round: 0,
      boards: {},       // id -> { cells: 200-char string, score, lines, level }
      junk: {},         // id -> total junk rows sent to them so far (phones apply the difference)
      dead: [], places: {}, winner: '', solo: false, log: [],
    };
  }

  start() {
    const s = this.state;
    const ids = this.players.map((p) => p.id);
    s.round += 1;
    s.boards = Object.fromEntries(ids.map((id) => [id, { cells: '.'.repeat(W * H), score: 0, lines: 0, level: 1 }]));
    s.junk = Object.fromEntries(ids.map((id) => [id, 0]));
    Object.assign(s, { phase: 'countdown', startAt: Date.now() + 3500, dead: [], places: {}, winner: '', solo: ids.length === 1, log: [] });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { if (s.phase === 'countdown') { s.phase = 'play'; this.sync(); } }, 3500);
  }

  onGameStart() { super.onGameStart(); this.start(); this.sync(); }

  onPlayerLeave(id) {
    const s = this.state;
    if (s.phase === 'play' && !s.dead.includes(id) && s.boards[id]) { this.knockOut(id); this.sync(); }
  }

  alive() { return Object.keys(this.state.boards).filter((id) => !this.state.dead.includes(id)); }

  knockOut(id) {
    const s = this.state;
    s.dead.push(id);
    s.places[id] = this.alive().length + 1;
    const left = this.alive();
    if (s.solo ? left.length === 0 : left.length <= 1) {
      s.phase = 'over';
      if (s.solo) s.winner = id;
      else { s.winner = left[0] || id; s.places[s.winner] = 1; }
    }
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    switch (type) {
      case 'game:snap': {
        if (s.phase !== 'play' || !s.boards[me] || s.dead.includes(me)) return;
        const cells = String(p.cells || '');
        if (cells.length !== W * H) return;
        s.boards[me] = { cells, score: Math.max(0, p.score | 0), lines: Math.max(0, p.lines | 0), level: Math.max(1, p.level | 0) };
        break;
      }
      case 'game:cleared': {
        if (s.phase !== 'play' || !s.boards[me]) return;
        const n = Math.min(4, Math.max(0, p.lines | 0));
        const send = GARBAGE[n];
        const targets = this.alive().filter((id) => id !== me);
        if (!send || !targets.length) return;
        const to = targets[Math.floor(Math.random() * targets.length)];
        s.junk[to] = (s.junk[to] || 0) + send;
        const name = (id) => this.players.find((x) => x.id === id)?.name || 'someone';
        s.log.unshift(`${name(me)} sent ${send} junk row${send > 1 ? 's' : ''} to ${name(to)}${n === 4 ? ' with a TETRIS!' : '!'}`);
        s.log = s.log.slice(0, 3);
        break;
      }
      case 'game:topout':
        if (s.phase !== 'play' || !s.boards[me] || s.dead.includes(me)) return;
        if (p && typeof p.score === 'number') s.boards[me].score = Math.max(0, p.score | 0);
        this.knockOut(me);
        break;
      case 'game:again':
        if (s.phase !== 'over' || !(meta.isBoard || meta.isVip)) return;
        this.start();
        break;
      default:
        return;
    }
    this.sync();
  }

  destroy() { clearTimeout(this.timer); }
}
