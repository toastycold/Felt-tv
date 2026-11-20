// Skyjo rules. Face-down card values live in this.secret, so nobody's phone can peek.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';

const END_SCORE = 100;
// Grid is 4 columns x 3 rows; index = row * 4 + col
const COLUMNS = [0, 1, 2, 3].map((c) => [c, c + 4, c + 8]);

export function makeDeck() {
  const deck = [...Array(5).fill(-2), ...Array(10).fill(-1), ...Array(15).fill(0)];
  for (let v = 1; v <= 12; v++) deck.push(...Array(10).fill(v));
  return shuffle(deck);
}

export default class SkyjoEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',   // lobby | setup | play | round-over | over
      round: 0,
      seats: [],
      grids: {},        // id -> [{ v: number|null, gone: bool }]  (v null = face down)
      discard: [],      // visible discard pile (top is last)
      deckCount: 0,
      turn: 0,
      step: 'choose',   // choose | deck | discard
      drawn: null,      // value of the card in hand (everyone can see it)
      closer: '', lastTurns: 0,
      totals: {}, roundScores: {},
      starter: 0,
      log: [],
    };
  }

  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.seats = this.players.map((p) => p.id);
    s.totals = Object.fromEntries(s.seats.map((id) => [id, 0]));
    s.round = 0;
    s.starter = 0;
    this.deal();
  }

  deal() {
    const s = this.state;
    const deck = makeDeck();
    this.secret.values = {};
    for (const id of s.seats) {
      this.secret.values[id] = deck.splice(0, 12);
      s.grids[id] = Array.from({ length: 12 }, () => ({ v: null, gone: false }));
    }
    s.discard = [deck.shift()];
    this.secret.deck = deck;
    Object.assign(s, {
      phase: 'setup', round: s.round + 1, step: 'choose', drawn: null,
      closer: '', lastTurns: 0, roundScores: {}, log: [],
    });
    this.sync();
  }

  sync() {
    this.state.deckCount = this.secret.deck?.length || 0;
    super.sync();
  }

  get current() { return this.state.seats[this.state.turn]; }
  nameOf(id) { return this.players.find((p) => p.id === id)?.name || 'Someone'; }
  log(t) { this.state.log.unshift(t); this.state.log.length = Math.min(this.state.log.length, 5); }

  flipCell(id, i) {
    const cell = this.state.grids[id][i];
    cell.v = this.secret.values[id][i];
    return cell.v;
  }

  drawFromDeck() {
    if (!this.secret.deck.length) {
      // Reshuffle the discard pile (keeping the top card) into a new deck.
      const top = this.state.discard.pop();
      this.secret.deck = shuffle(this.state.discard);
      this.state.discard = [top];
    }
    return this.secret.deck.shift();
  }

  clearColumns(id) {
    const grid = this.state.grids[id];
    for (const col of COLUMNS) {
      const cells = col.map((i) => grid[i]);
      if (cells.every((c) => !c.gone && c.v !== null) && cells.every((c) => c.v === cells[0].v)) {
        cells.forEach((c) => (c.gone = true));
        this.state.discard.push(cells[0].v, cells[0].v, cells[0].v);
        this.log(`${this.nameOf(id)} cleared a column of ${cells[0].v}s`);
      }
    }
  }

  allRevealed(id) {
    return this.state.grids[id].every((c) => c.gone || c.v !== null);
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;

    if (type === 'game:next-round') {
      if (s.phase === 'round-over' && (meta.isBoard || meta.isVip)) this.deal();
      return;
    }
    if (type === 'game:play-again') {
      if (s.phase === 'over' && (meta.isBoard || meta.isVip)) this.onGameStart();
      return;
    }

    // Setup: everyone flips two cards, in any order.
    if (s.phase === 'setup' && type === 'game:flip') {
      const grid = s.grids[me];
      if (!grid || grid.filter((c) => c.v !== null).length >= 2) return;
      const i = p.index;
      if (!Number.isInteger(i) || i < 0 || i > 11 || grid[i].v !== null) return;
      this.flipCell(me, i);
      if (s.seats.every((id) => s.grids[id].filter((c) => c.v !== null).length >= 2)) {
        if (s.round === 1) {
          // Highest two-card total starts the first round.
          const sum = (id) => s.grids[id].reduce((a, c) => a + (c.v ?? 0), 0);
          s.starter = s.seats.reduce((best, id, idx) => (sum(id) > sum(s.seats[best]) ? idx : best), 0);
        }
        s.turn = s.starter;
        s.phase = 'play';
      }
      this.sync();
      return;
    }

    if (type === 'game:skip' && meta.isBoard && s.phase === 'play') {
      // Host skips a player who left. A card in hand goes to the discard pile.
      if (s.drawn !== null) s.discard.push(s.drawn);
      this.log(`${this.nameOf(this.current)} was skipped`);
      s.drawn = null; s.step = 'choose';
      if (s.closer) s.lastTurns -= 1;
      if (s.closer && s.lastTurns <= 0) this.endRound();
      else s.turn = (s.turn + 1) % s.seats.length;
      this.sync();
      return;
    }
    if (s.phase !== 'play' || me !== this.current) return;
    const grid = s.grids[me];
    const validCell = (i) => Number.isInteger(i) && i >= 0 && i < 12 && !grid[i].gone;

    switch (type) {
      case 'game:draw-deck':
        if (s.step !== 'choose') return;
        s.drawn = this.drawFromDeck();
        s.step = 'deck';
        break;
      case 'game:take-discard':
        if (s.step !== 'choose' || !s.discard.length) return;
        s.drawn = s.discard.pop();
        s.step = 'discard';
        break;
      case 'game:swap': {
        if (s.step !== 'deck' && s.step !== 'discard') return;
        if (!validCell(p.index)) return;
        const i = p.index;
        const old = this.secret.values[me][i];
        this.secret.values[me][i] = s.drawn;
        grid[i].v = s.drawn;
        s.discard.push(old);
        this.log(`${this.nameOf(me)} swapped in a ${s.drawn}, tossed a ${old}`);
        this.endTurn(me);
        break;
      }
      case 'game:toss-and-flip': {
        if (s.step !== 'deck' || !validCell(p.index) || grid[p.index].v !== null) return;
        s.discard.push(s.drawn);
        const v = this.flipCell(me, p.index);
        this.log(`${this.nameOf(me)} tossed a ${s.drawn} and flipped a ${v}`);
        this.endTurn(me);
        break;
      }
      default:
        return;
    }
    this.sync();
  }

  endTurn(id) {
    const s = this.state;
    s.drawn = null;
    s.step = 'choose';
    this.clearColumns(id);
    if (s.closer) {
      s.lastTurns -= 1;
    } else if (this.allRevealed(id)) {
      s.closer = id;
      s.lastTurns = s.seats.length - 1;
      this.log(`${this.nameOf(id)} revealed everything! Everyone gets one last turn.`);
    }
    if (s.closer && s.lastTurns <= 0) return this.endRound();
    s.turn = (s.turn + 1) % s.seats.length;
  }

  endRound() {
    const s = this.state;
    for (const id of s.seats) {
      s.grids[id].forEach((c, i) => { if (!c.gone && c.v === null) c.v = this.secret.values[id][i]; });
      this.clearColumns(id);
    }
    const raw = Object.fromEntries(s.seats.map((id) => [id, s.grids[id].reduce((a, c) => a + (c.gone ? 0 : c.v), 0)]));
    const scores = { ...raw };
    const closerScore = raw[s.closer];
    const othersLowest = Math.min(...s.seats.filter((id) => id !== s.closer).map((id) => raw[id]));
    // The player who ended the round doubles a positive score unless they're strictly lowest.
    if (closerScore > 0 && closerScore >= othersLowest) scores[s.closer] = closerScore * 2;
    s.roundScores = scores;
    for (const id of s.seats) s.totals[id] += scores[id];
    s.starter = s.seats.indexOf(s.closer);
    s.phase = s.seats.some((id) => s.totals[id] >= END_SCORE) ? 'over' : 'round-over';
  }

  onPlayerLeave() {
    this.sync();
  }
}
