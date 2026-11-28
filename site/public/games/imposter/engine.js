// Imposter rules. The host screen runs this. Everyone gets the secret word except the Imposter.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import { WORDS } from './words.js';

export const ROUNDS = 5;
const clean = (t) => String(t || '').trim().slice(0, 30);
const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export default class ImposterEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',     // lobby | clues | vote | guess | reveal | over
      round: 0, total: ROUNDS,
      category: '',
      order: [], turn: 0, // clue order and whose turn it is
      clues: {},          // id -> one-word clue (public, shown on the TV)
      leans: {}, votes: {}, // tapped vs locked-in votes
      accused: '',        // who the town picked
      imposter: '', word: '', guess: '', result: '',   // filled in at the reveal
      scores: {},
    };
  }

  onGameStart() {
    super.onGameStart();
    const extra = this.extraItems('word').map((x) => ({ word: x.text, category: x.category || 'Anything' })).filter((x) => x.word);
    this.secret = { deck: shuffle([...WORDS, ...extra]), lastImposter: '' };
    Object.assign(this.state, { round: 0, scores: Object.fromEntries(this.players.map((p) => [p.id, 0])) });
    this.nextRound();
  }

  nextRound() {
    const s = this.state;
    if (s.round >= s.total) { s.phase = 'over'; this.sync(); return; }
    if (!this.secret.deck.length) this.secret.deck = shuffle([...WORDS]);
    const card = this.secret.deck.pop();
    const ids = this.players.map((p) => p.id);
    // Pick the Imposter at random, but not the same person twice in a row.
    const pool = ids.length > 2 ? ids.filter((id) => id !== this.secret.lastImposter) : ids;
    const imposter = pool[Math.floor(Math.random() * pool.length)];
    Object.assign(this.secret, { word: card.word, imposter, lastImposter: imposter, guessed: {}, notes: {} });
    s.round += 1;
    // The first clue never comes from the Imposter (they'd have nothing to go on).
    let order = shuffle([...ids]);
    if (order[0] === imposter && order.length > 1) order = [...order.slice(1), order[0]];
    Object.assign(s, { phase: 'clues', category: card.category, order, turn: 0, clues: {}, leans: {}, votes: {}, accused: '', imposter: '', word: '', guess: '', result: '' });
    this.sync();
  }

  /** Each phone gets the word, or the Imposter screen. */
  sync() {
    const s = this.state;
    const live = ['clues', 'vote', 'guess'].includes(s.phase);
    for (const p of this.players) {
      if (!live || !s.order.includes(p.id)) this.setPrivate(p.id, {});
      else if (p.id === this.secret.imposter) this.setPrivate(p.id, { imposter: true, category: s.category });
      else this.setPrivate(p.id, { word: this.secret.word, category: s.category, guessed: this.secret.guessed?.[p.id] || '', note: this.secret.notes?.[p.id] || '' });
    }
    super.sync();
  }

  alive() { return this.state.order.filter((id) => this.players.some((p) => p.id === id)); }

  checkVotes() {
    const s = this.state;
    const voters = this.alive();
    const tally = {};
    for (const t of Object.values(s.votes)) if (t !== '-') tally[t] = (tally[t] || 0) + 1;
    const need = Math.floor(voters.length / 2) + 1;
    const top = Object.entries(tally).find(([, c]) => c >= need);
    if (!top && !voters.every((id) => s.votes[id])) return;
    // Majority picks them; if everyone voted and nobody has a majority, the most votes wins (a tie lets the Imposter escape).
    let accused = top?.[0] || '';
    if (!accused) {
      const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
      if (sorted.length && (sorted.length === 1 || sorted[0][1] > sorted[1][1])) accused = sorted[0][0];
    }
    s.accused = accused;
    if (accused && accused === this.secret.imposter) s.phase = 'guess';
    else this.finishRound(accused ? 'wrong' : 'tie');
  }

  finishRound(result) {
    const s = this.state;
    const imp = this.secret.imposter;
    s.imposter = imp; s.word = this.secret.word; s.result = result;
    // Points: the Imposter gets 2 for escaping or guessing the word; everyone else gets 1 for catching them.
    if (result === 'caught' || result === 'blurted') for (const id of s.order) { if (id !== imp) s.scores[id] = (s.scores[id] || 0) + 1; }
    else s.scores[imp] = (s.scores[imp] || 0) + 2;
    s.phase = 'reveal';
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const host = meta.isBoard;
    switch (type) {
      case 'game:clue': {
        if (s.phase !== 'clues' || s.order[s.turn] !== me) return;
        const clue = clean(p.text).split(/\s+/)[0];
        if (!clue) return;
        const parts = [this.secret.word, ...this.secret.word.split(/\s+/).filter((w) => w.length >= 3)].map(norm);
        if (me !== this.secret.imposter && parts.includes(norm(clue))) { (this.secret.notes ||= {})[me] = "That's the word itself! Try a different clue."; break; }
        s.clues[me] = clue;
        if (this.secret.notes) delete this.secret.notes[me];
        s.turn += 1;
        if (s.turn >= s.order.length) s.phase = 'vote';
        break;
      }
      case 'game:skip-turn': // TV: someone's stuck or left
        if (s.phase !== 'clues' || !host) return;
        s.turn += 1;
        if (s.turn >= s.order.length) s.phase = 'vote';
        break;
      case 'game:lean':
        if (s.phase !== 'vote' || !s.order.includes(me) || s.votes[me] || p.id === me || !s.order.includes(p.id)) return;
        s.leans[me] = p.id;
        break;
      case 'game:vote':
        if (s.phase !== 'vote' || !s.order.includes(me) || s.votes[me] || p.id === me || !s.order.includes(p.id)) return;
        s.votes[me] = p.id;
        delete s.leans[me];
        this.checkVotes();
        break;
      case 'game:close-vote':
        if (s.phase !== 'vote' || !host) return;
        for (const [id, t] of Object.entries(s.leans)) if (!s.votes[id]) s.votes[id] = t;
        if (!Object.keys(s.votes).length) return;
        {
          const voters = this.alive();
          for (const id of voters) if (!s.votes[id]) s.votes[id] = '-';
        }
        this.checkVotes();
        break;
      case 'game:guess': {
        // Every phone has the guess box (so nobody stands out), but only the Imposter's guess counts.
        // They can try any time: right ends the round with an Imposter win, wrong ends it with a town win.
        if (!['clues', 'vote', 'guess'].includes(s.phase) || !s.order.includes(me)) return;
        if (me !== this.secret.imposter) { (this.secret.guessed ||= {})[me] = clean(p.text); break; }
        const g = clean(p.text);
        if (!g) return;
        s.guess = g;
        const w = norm(this.secret.word), x = norm(g);
        const close = x === w || (x.length >= 4 && (w.includes(x) || x.includes(w))) || x === w + 's' || w === x + 's';
        if (s.phase !== 'guess') s.accused = '';   // guessed before anyone voted
        this.finishRound(close ? 'guessed' : s.phase === 'guess' ? 'caught' : 'blurted');
        break;
      }
      case 'game:next':
        if (s.phase !== 'reveal' || !host) return;
        this.nextRound();
        return;
      case 'game:again':
        if (s.phase !== 'over' || !(host || meta.isVip)) return;
        this.onGameStart();
        return;
      default:
        return;
    }
    this.sync();
  }

  onPlayerLeave(id) {
    const s = this.state;
    if (s.phase === 'clues' && s.order[s.turn] === id) { s.turn += 1; if (s.turn >= s.order.length) s.phase = 'vote'; }
    if (s.phase === 'vote') this.checkVotes();
    this.sync();
  }
}
