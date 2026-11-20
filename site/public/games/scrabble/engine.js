// Scrabble rules. The bag and every rack live in this.secret; each phone gets only its own rack.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import { SIZE, VALUES, makeBag, scoreMove } from './rules.js';

const RACK = 7;

export default class ScrabbleEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',   // lobby | play | over
      board: Array(SIZE * SIZE).fill(null),
      seats: [], turn: 0, scores: {}, rackCounts: {},
      bagCount: 0, scoreless: 0,
      lastMove: null,   // { by, words: [{ word, score }], score, positions }
      error: null, log: [], winner: '', finalAdjust: {},
    };
    this.loadDictionary();
  }

  /** The host's browser downloads the word list once (about 1 MB compressed). */
  loadDictionary() {
    if (this.dict || typeof fetch === 'undefined') return;
    this.dictPromise ||= fetch(new URL('./words.txt', import.meta.url))
      .then((r) => r.text())
      .then((text) => { this.dict = new Set(text.split('\n').map((w) => w.trim().toUpperCase()).filter(Boolean)); })
      .catch((err) => console.error('Could not load the dictionary', err));
  }

  isWord(word) {
    return this.dict ? this.dict.has(word.toUpperCase()) : true; // if the dictionary fails to load, allow everything
  }

  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.seats = this.players.slice(0, 4).map((p) => p.id);
    this.secret.bag = shuffle(makeBag());
    this.secret.racks = {};
    for (const id of s.seats) this.secret.racks[id] = this.secret.bag.splice(0, RACK);
    Object.assign(s, {
      phase: 'play', board: Array(SIZE * SIZE).fill(null), turn: Math.floor(Math.random() * s.seats.length),
      scores: Object.fromEntries(s.seats.map((id) => [id, 0])), scoreless: 0,
      lastMove: null, error: null, log: [], winner: '', finalAdjust: {},
    });
    this.sync();
  }

  sync() {
    const s = this.state;
    s.bagCount = this.secret.bag?.length ?? 0;
    s.rackCounts = Object.fromEntries(Object.entries(this.secret.racks || {}).map(([id, r]) => [id, r.length]));
    for (const id of s.seats) this.setPrivate(id, { rack: this.secret.racks?.[id] || [] });
    super.sync();
  }

  get current() { return this.state.seats[this.state.turn]; }
  nameOf(id) { return this.players.find((p) => p.id === id)?.name || 'Someone'; }
  log(t) { this.state.log.unshift(t); this.state.log.length = Math.min(this.state.log.length, 6); }
  fail(id, text) { this.state.error = { to: id, text }; }

  nextTurn() {
    const s = this.state;
    s.turn = (s.turn + 1) % s.seats.length;
  }

  endGame(outPlayer) {
    const s = this.state;
    const rackValue = (id) => this.secret.racks[id].reduce((a, l) => a + VALUES[l], 0);
    let bonus = 0;
    for (const id of s.seats) {
      const v = rackValue(id);
      s.finalAdjust[id] = -v;
      s.scores[id] -= v;
      bonus += v;
    }
    if (outPlayer) { s.finalAdjust[outPlayer] = bonus; s.scores[outPlayer] += bonus; }
    s.winner = [...s.seats].sort((a, b) => s.scores[b] - s.scores[a])[0];
    s.phase = 'over';
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    s.error = null;

    if (type === 'game:play-again') {
      if (s.phase === 'over' && (meta.isBoard || meta.isVip)) this.onGameStart();
      return;
    }
    if (type === 'game:skip' && meta.isBoard && s.phase === 'play') {
      this.log(`${this.nameOf(this.current)} was skipped`);
      this.nextTurn();
      this.sync();
      return;
    }
    if (s.phase !== 'play' || me !== this.current) return;
    const rack = this.secret.racks[me];

    switch (type) {
      case 'game:play': {
        const tiles = Array.isArray(p.tiles) ? p.tiles : [];
        const used = tiles.map((t) => t.rack);
        if (!tiles.length || new Set(used).size !== used.length || used.some((i) => !Number.isInteger(i) || i < 0 || i >= rack.length)) {
          this.fail(me, 'Those tiles aren’t on your rack.'); break;
        }
        const placed = tiles.map((t) => {
          const letter = rack[t.rack];
          const blank = letter === '?';
          const l = blank ? String(t.letter || '').toUpperCase().slice(0, 1) : letter;
          return { pos: t.pos, l, blank };
        });
        if (placed.some((t) => !/^[A-Z]$/.test(t.l))) { this.fail(me, 'Choose a letter for your blank tile.'); break; }
        if (!this.dict && this.dictPromise) { this.fail(me, 'The dictionary is still loading. Try again in a second.'); break; }
        const result = scoreMove(s.board, placed, (w) => this.isWord(w));
        if (!result.ok) { this.fail(me, result.error); break; }

        for (const t of placed) s.board[t.pos] = { l: t.l, blank: t.blank };
        this.secret.racks[me] = rack.filter((_, i) => !used.includes(i));
        this.secret.racks[me].push(...this.secret.bag.splice(0, RACK - this.secret.racks[me].length));
        s.scores[me] += result.score;
        s.scoreless = 0;
        s.lastMove = { by: me, words: result.words, score: result.score, positions: placed.map((t) => t.pos), bingo: result.bingo };
        this.log(`${this.nameOf(me)} played ${result.words.map((w) => w.word).join(', ')} for ${result.score}${result.bingo ? ' (bingo!)' : ''}`);
        if (!this.secret.racks[me].length && !this.secret.bag.length) this.endGame(me);
        else this.nextTurn();
        break;
      }
      case 'game:exchange': {
        const idx = Array.isArray(p.indices) ? [...new Set(p.indices)] : [];
        if (this.secret.bag.length < RACK) { this.fail(me, 'You can only exchange when 7 or more tiles are left in the bag.'); break; }
        if (!idx.length || idx.some((i) => !Number.isInteger(i) || i < 0 || i >= rack.length)) { this.fail(me, 'Pick the tiles to exchange.'); break; }
        const out = idx.map((i) => rack[i]);
        const keep = rack.filter((_, i) => !idx.includes(i));
        keep.push(...this.secret.bag.splice(0, out.length));
        this.secret.bag = shuffle([...this.secret.bag, ...out]);
        this.secret.racks[me] = keep;
        s.scoreless += 1;
        s.lastMove = null;
        this.log(`${this.nameOf(me)} exchanged ${out.length} tile${out.length > 1 ? 's' : ''}`);
        this.afterScoreless();
        break;
      }
      case 'game:pass':
        s.scoreless += 1;
        s.lastMove = null;
        this.log(`${this.nameOf(me)} passed`);
        this.afterScoreless();
        break;
      default:
        return;
    }
    this.sync();
  }

  afterScoreless() {
    const s = this.state;
    // Game ends after every player has had two scoreless turns in a row.
    if (s.scoreless >= s.seats.length * 2) { this.log('Too many turns without scoring. Game over!'); this.endGame(null); }
    else this.nextTurn();
  }
}
