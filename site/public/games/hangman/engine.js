// Hangman rules. Runs on the host screen.
// Each round one player sets a secret word; everyone else takes turns guessing letters or solving.
import { BaseGameEngine } from '../../js/engine-base.js';

export const MAX_MISSES = 6;
const LETTER_PTS = 10, SOLVE_PTS = 50, MISS_PTS = 10, STUMP_PTS = 50;
const clean = (t) => String(t || '').toLowerCase().replace(/[^a-z' -]/g, '').replace(/\s+/g, ' ').trim();
const lettersIn = (t) => [...new Set(t.replace(/[^a-z]/g, ''))];

export default class HangmanEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',     // lobby | pick | guess | result | over
      round: 0, rounds: 0,
      order: [], setter: '', current: '', waiting: [],
      category: '', mask: [], guessed: [], misses: 0, maxMisses: MAX_MISSES,
      scores: {}, last: null, answer: '', solvedBy: '', winner: '', error: '',
    };
    this.secret = { word: '' };
  }

  guessers() { return this.state.order.filter((id) => id !== this.state.setter && this.players.some((p) => p.id === id)); }

  nextGuesser() {
    const g = this.guessers();
    if (!g.length) return '';
    const i = g.indexOf(this.state.current);
    return g[(i + 1) % g.length];
  }

  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.order = this.players.map((p) => p.id);
    s.scores = Object.fromEntries(s.order.map((id) => [id, 0]));
    s.rounds = s.order.length;
    s.round = 0;
    this.startRound();
    this.sync();
  }

  onPlayerJoin(id) {
    const s = this.state;
    if (!this.hasStarted || s.order.includes(id)) return;
    s.order.push(id);
    s.scores[id] = 0;
    this.sync();
  }

  onPlayerLeave(id) {
    const s = this.state;
    if (s.phase === 'pick' && s.setter === id) { s.round -= 1; this.startRound(); }
    else if (s.phase === 'guess' && s.current === id) s.current = this.nextGuesser();
    this.sync();
  }

  startRound() {
    const s = this.state;
    s.round += 1;
    if (s.round > s.rounds) return this.finish();
    s.setter = s.order[(s.round - 1) % s.order.length];
    Object.assign(s, { phase: 'pick', current: '', waiting: [s.setter], category: '', mask: [], guessed: [], misses: 0, last: null, answer: '', solvedBy: '', error: '' });
    this.secret.word = '';
  }

  begin(word, category) {
    const s = this.state;
    this.secret.word = word;
    s.category = category;
    s.mask = [...word].map((c) => (/[a-z]/.test(c) ? '' : c));
    s.phase = 'guess';
    s.waiting = [];
    // The person after the setter goes first.
    const order = s.order, i = order.indexOf(s.setter);
    s.current = [...order.slice(i + 1), ...order.slice(0, i)].find((id) => this.guessers().includes(id)) || '';
  }

  reveal(letter) {
    let n = 0;
    [...this.secret.word].forEach((c, i) => { if (c === letter) { this.state.mask[i] = c; n += 1; } });
    return n;
  }

  solved() { return this.state.mask.every((c, i) => c || !/[a-z]/.test(this.secret.word[i])); }

  miss() {
    const s = this.state;
    s.misses += 1;
    s.scores[s.setter] = (s.scores[s.setter] || 0) + MISS_PTS;
    if (s.misses >= MAX_MISSES) {
      s.scores[s.setter] += STUMP_PTS;
      return this.endRound('');
    }
    s.current = this.nextGuesser();
  }

  endRound(solver) {
    const s = this.state;
    s.solvedBy = solver;
    s.answer = this.secret.word;
    s.mask = [...this.secret.word];
    s.phase = 'result';
    s.current = '';
  }

  finish() {
    const s = this.state;
    s.phase = 'over';
    s.current = '';
    s.waiting = [];
    const top = Math.max(0, ...Object.values(s.scores));
    const leaders = Object.keys(s.scores).filter((id) => s.scores[id] === top);
    s.winner = leaders.length === 1 ? leaders[0] : leaders;
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const host = meta.isBoard || meta.isVip;
    s.error = '';

    switch (type) {
      case 'game:set-word': {
        if (s.phase !== 'pick' || me !== s.setter) return;
        const word = clean(p.text);
        if (word.replace(/[^a-z]/g, '').length < 3 || lettersIn(word).length < 2 || word.length > 30) { s.error = 'Use a word or phrase with at least 3 letters (30 characters max).'; break; }
        this.begin(word, String(p.category || '').trim().slice(0, 24));
        break;
      }
      case 'game:letter': {
        if (s.phase !== 'guess' || me !== s.current) return;
        const letter = String(p.letter || '').toLowerCase();
        if (!/^[a-z]$/.test(letter) || s.guessed.includes(letter)) return;
        s.guessed.push(letter);
        const n = this.reveal(letter);
        s.last = { by: me, text: letter.toUpperCase(), hit: n > 0, count: n };
        if (n) {
          s.scores[me] = (s.scores[me] || 0) + n * LETTER_PTS;
          if (this.solved()) { s.scores[me] += SOLVE_PTS; this.endRound(me); break; }
          s.current = this.nextGuesser();
        } else this.miss();
        break;
      }
      case 'game:solve': {
        if (s.phase !== 'guess' || me !== s.current) return;
        const guess = clean(p.text);
        if (!guess) return;
        const right = guess.replace(/[^a-z]/g, '') === this.secret.word.replace(/[^a-z]/g, '');
        s.last = { by: me, text: guess, hit: right, solve: true };
        if (right) {
          const hidden = this.state.mask.filter((c, i) => !c && /[a-z]/.test(this.secret.word[i])).length;
          s.scores[me] = (s.scores[me] || 0) + SOLVE_PTS + hidden * LETTER_PTS;
          this.endRound(me);
        } else this.miss();
        break;
      }
      case 'game:skip-turn':
        if (s.phase !== 'guess' || !host) return;
        s.current = this.nextGuesser();
        break;
      case 'game:next-round':
        if (s.phase !== 'result' || !host) return;
        this.startRound();
        break;
      case 'game:play-again':
        if (s.phase !== 'over' || !host) return;
        s.scores = Object.fromEntries(s.order.map((id) => [id, 0]));
        s.round = 0;
        s.winner = '';
        this.startRound();
        break;
      default:
        return;
    }
    this.sync();
  }
}
