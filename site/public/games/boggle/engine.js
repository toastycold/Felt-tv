// Boggle rules. Runs on the host screen.
// Everyone hunts the same grid at once. Words two or more people found don't score.
import { BaseGameEngine } from '../../js/engine-base.js';
import { rollBoard, onBoard, points } from './rules.js';

const ROUND_MS = 3 * 60 * 1000;

export default class BoggleEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',   // lobby | play | over (after each round)
      board: [], deadline: 0, round: 0,
      counts: {},        // id -> number of words so far (public, so the TV can show progress)
      results: null,     // { [id]: [{ word, pts, shared }] } after the round
      missed: [],        // a few great words nobody found
      scores: {}, winner: '', waiting: [],
    };
    this.secret = { words: {} };
    this.dict = null;
    this.loadDict();
  }

  loadDict() {
    if (this.dict || typeof fetch === 'undefined') return;
    this.dictPromise ||= fetch(new URL('../scrabble/words.txt', import.meta.url))
      .then((r) => r.text())
      .then((text) => { this.dict = new Set(text.split('\n').map((w) => w.trim().toUpperCase()).filter(Boolean)); })
      .catch((err) => console.error('Could not load the dictionary', err));
  }

  isWord(w) { return this.dict ? this.dict.has(w) : true; }

  onGameStart() {
    super.onGameStart();
    this.state.scores = Object.fromEntries(this.players.map((p) => [p.id, 0]));
    this.startRound();
    this.sync();
  }

  onPlayerJoin(id) {
    if (!this.hasStarted) return;
    this.state.scores[id] ??= 0;
    this.secret.words[id] ??= [];
    this.sync();
  }

  startRound() {
    const s = this.state;
    s.round += 1;
    s.board = rollBoard();
    s.deadline = Date.now() + ROUND_MS;
    s.phase = 'play';
    s.results = null;
    s.missed = [];
    s.winner = '';
    this.secret.words = Object.fromEntries(this.players.map((p) => [p.id, []]));
    s.counts = Object.fromEntries(this.players.map((p) => [p.id, 0]));
    s.waiting = this.players.map((p) => p.id);
    for (const p of this.players) this.setPrivate(p.id, { found: [], note: '' });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.endRound(); this.sync(); }, ROUND_MS + 500);
  }

  endRound() {
    const s = this.state;
    if (s.phase !== 'play') return;
    clearTimeout(this.timer);
    const all = this.secret.words;
    const tally = {};
    Object.values(all).forEach((list) => list.forEach((w) => { tally[w] = (tally[w] || 0) + 1; }));
    s.results = {};
    for (const [id, list] of Object.entries(all)) {
      s.results[id] = list.map((w) => ({ word: w, pts: tally[w] > 1 ? 0 : points(w), shared: tally[w] > 1 }))
        .sort((a, b) => b.word.length - a.word.length || a.word.localeCompare(b.word));
      const roundPts = s.results[id].reduce((n, x) => n + x.pts, 0);
      s.scores[id] = (s.scores[id] || 0) + roundPts;
    }
    // The longest words nobody spotted.
    if (this.dict) {
      const found = new Set(Object.keys(tally));
      const letters = new Set(s.board.join(''));
      const cands = [];
      for (const w of this.dict) {
        if (w.length < 6 || w.length > 12 || found.has(w)) continue;
        if (![...w].every((ch) => letters.has(ch))) continue;
        if (onBoard(w, s.board)) cands.push(w);
      }
      s.missed = cands.sort((a, b) => b.length - a.length).slice(0, 5);
    }
    s.phase = 'over';
    s.waiting = [];
    const top = Math.max(0, ...Object.values(s.scores));
    const leaders = Object.keys(s.scores).filter((id) => s.scores[id] === top && top > 0);
    s.winner = leaders.length === 1 ? leaders[0] : leaders;
    for (const p of this.players) this.setPrivate(p.id, { found: all[p.id] || [], note: '' });
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    switch (type) {
      case 'game:word': {
        if (s.phase !== 'play' || !me) return;
        if (Date.now() > s.deadline) { this.endRound(); break; }
        const w = String(p.word || '').toUpperCase().replace(/[^A-Z]/g, '');
        const mine = (this.secret.words[me] ||= []);
        let note = '';
        if (w.length < 3) note = 'Words need at least 3 letters.';
        else if (mine.includes(w)) note = `You already have ${w}.`;
        else if (!onBoard(w, s.board)) note = `${w} isn't on the board.`;
        else if (!this.dict && this.dictPromise) note = 'The dictionary is still loading. Try again in a second.';
        else if (!this.isWord(w)) note = `${w} isn't in the dictionary.`;
        else { mine.unshift(w); s.counts[me] = mine.length; note = `✓ ${w}`; }
        this.setPrivate(me, { found: mine, note });
        break;
      }
      case 'game:end-round':
        if (s.phase !== 'play' || !(meta.isBoard || meta.isVip)) return;
        this.endRound();
        break;
      case 'game:next-round':
        if (s.phase !== 'over' || !(meta.isBoard || meta.isVip)) return;
        this.startRound();
        break;
      default:
        return;
    }
    this.sync();
  }

  destroy() { clearTimeout(this.timer); }
}
