// Just One rules. Runs on the host screen. Co-op: the whole group shares one score.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import { WORDS } from './words.js';

const DECK_SIZE = 13;

/** "Pizza!" -> "pizza" */
export function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z]/g, '');
}

/** True if two words count as the same clue (ignores case, punctuation and simple plurals). */
export function sameWord(a, b) {
  a = normalize(a); b = normalize(b);
  if (!a || !b) return false;
  if (a === b) return true;
  const plural = (x, y) => y === x + 's' || y === x + 'es' || (x.endsWith('y') && y === x.slice(0, -1) + 'ies');
  return plural(a, b) || plural(b, a);
}

export default class JustOneEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',          // lobby | clues | review | guess | result | over
      cardsLeft: 0, round: 0, total: DECK_SIZE,
      guesserIndex: -1, guesser: '',
      word: '',                // only filled in once the round is over
      clues: {},               // playerId -> clue text
      removed: {},             // playerId -> 'duplicate' | 'word' | 'manual'
      guess: '', outcome: '',  // correct | wrong | skip
      score: 0,
      history: [],             // { word, guess, outcome }
    };
  }

  onGameStart() {
    super.onGameStart();
    this.secret.deck = shuffle([...WORDS, ...this.extraItems('word').map((x) => x.text)]).slice(0, DECK_SIZE);
    Object.assign(this.state, { score: 0, history: [], round: 0, guesserIndex: -1 });
    this.nextRound();
  }

  /** Clue-givers see the word on their phones; the guesser never receives it. */
  sync() {
    const s = this.state;
    s.cardsLeft = this.secret.deck?.length || 0;
    const live = ['clues', 'review', 'guess'].includes(s.phase);
    for (const p of this.players) this.setPrivate(p.id, live && p.id !== s.guesser ? { word: this.secret.word } : {});
    super.sync();
  }

  get clueGivers() {
    return this.players.filter((p) => p.id !== this.state.guesser);
  }

  nextRound() {
    const s = this.state;
    if (!this.secret.deck.length) { s.phase = 'over'; this.sync(); return; }
    const players = this.players;
    s.guesserIndex = (s.guesserIndex + 1) % Math.max(players.length, 1);
    this.secret.word = this.secret.deck.shift();
    Object.assign(s, {
      phase: 'clues', round: s.round + 1,
      guesser: players[s.guesserIndex]?.id || '',
      word: '',
      clues: {}, removed: {}, guess: '', outcome: '',
    });
    this.sync();
  }

  startReview() {
    const s = this.state;
    const entries = Object.entries(s.clues);
    s.removed = {};
    for (const [id, c] of entries) {
      if (!normalize(c) || sameWord(c, this.secret.word)) s.removed[id] = 'word';
      else if (entries.some(([other, c2]) => other !== id && sameWord(c, c2))) s.removed[id] = 'duplicate';
    }
    s.phase = 'review';
  }

  finishRound(outcome, guess = '') {
    const s = this.state;
    s.outcome = outcome;
    s.guess = guess;
    s.word = this.secret.word; // safe to show now
    if (outcome === 'correct') s.score += 1;
    // Like the board game: a wrong guess also costs the next card.
    if (outcome === 'wrong' && this.secret.deck.length) this.secret.deck.shift();
    s.history.push({ word: s.word, guess, outcome });
    s.phase = 'result';
  }

  onPlayerLeave(id) {
    const s = this.state;
    delete s.clues[id];
    delete s.removed[id];
    if (!this.hasStarted) return;
    if (id === s.guesser && ['clues', 'review', 'guess'].includes(s.phase)) {
      s.guesserIndex -= 1; // so the next person in line guesses next
      this.finishRound('skip');
    } else if (s.phase === 'clues') {
      this.maybeAllIn();
    }
    this.sync();
  }

  maybeAllIn() {
    const s = this.state;
    const givers = this.clueGivers.filter((p) => p.connected);
    if (givers.length && givers.every((p) => s.clues[p.id])) this.startReview();
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const isGuesser = me === s.guesser;

    switch (type) {
      case 'game:clue': {
        if (s.phase !== 'clues' || isGuesser || meta.isBoard) return;
        const clue = String(p.text || '').trim().split(/\s+/)[0].slice(0, 24);
        if (!clue) return;
        s.clues[me] = clue;
        this.maybeAllIn();
        break;
      }
      case 'game:force-review':
        if (s.phase !== 'clues' || !Object.keys(s.clues).length) return;
        if (!(meta.isBoard || meta.isVip) || isGuesser) return;
        this.startReview();
        break;
      case 'game:toggle-clue': {
        if (s.phase !== 'review' || isGuesser || !s.clues[p.id]) return;
        if (s.removed[p.id] === 'manual') delete s.removed[p.id];
        else if (!s.removed[p.id]) s.removed[p.id] = 'manual';
        break;
      }
      case 'game:show-clues':
        if (s.phase !== 'review' || isGuesser) return;
        s.phase = 'guess';
        break;
      case 'game:guess': {
        if (s.phase !== 'guess' || !isGuesser) return;
        const guess = String(p.text || '').trim().slice(0, 40);
        if (!guess) return;
        this.finishRound(sameWord(guess, this.secret.word) ? 'correct' : 'wrong', guess);
        break;
      }
      case 'game:skip':
        if (s.phase !== 'guess' || !isGuesser) return;
        this.finishRound('skip');
        break;
      case 'game:next':
        if (s.phase !== 'result') return;
        this.nextRound();
        return; // nextRound already synced
      case 'game:play-again':
        if (s.phase !== 'over' || !(meta.isBoard || meta.isVip)) return;
        this.onGameStart();
        return;
      default:
        return;
    }
    this.sync();
  }
}

export function rating(score) {
  if (score >= 13) return 'All 13. Flawless.';
  if (score >= 11) return 'Mind-readers, every one of you.';
  if (score >= 9) return 'Great teamwork.';
  if (score >= 7) return 'Solid. Run it back?';
  if (score >= 4) return 'Warming up. Try another deck.';
  return 'Rough one. Shuffle and try again.';
}
