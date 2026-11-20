// Wavelength rules (co-op). Everyone writes a clue for their own secret spectrum at the same time,
// then the group guesses each clue in turn. Targets and guesses are 0–100 along the spectrum.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import { SPECTRUMS } from './spectrums.js';

/** Points for a guess this far from the target. Bands are 8 wide, like the board game's wheel. */
export function pointsFor(distance) {
  if (distance <= 4) return 4;
  if (distance <= 12) return 3;
  if (distance <= 20) return 2;
  return 0;
}

const randTarget = () => 5 + Math.floor(Math.random() * 91);

export default class WavelengthEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',     // lobby | clues | guess | reveal | over
      round: 0, total: 0, cycle: 0, cycles: 0,
      written: [],        // who has written their clue this cycle
      queue: [],          // ids whose clues are waiting to be guessed, in order
      psychic: '', spectrum: ['', ''], clue: '', target: null,
      guesses: {},        // playerId -> { value, locked }
      teamGuess: null, points: 0,
      next: '',           // who may start the next round (plus the TV)
      score: 0, history: [],
    };
    this.secret = { deck: [], cards: {} }; // cards: id -> { spectrum, target, clue, skipped }
  }

  onGameStart() {
    super.onGameStart();
    const s = this.state;
    const n = Math.max(this.players.length, 1);
    s.cycles = 2;                                   // everyone gives two clues a game
    const pool = [...SPECTRUMS, ...this.extraItems('spectrum').filter((x) => x.left && x.right).map((x) => [x.left, x.right])];
    this.secret.deck = shuffle(pool);
    Object.assign(s, { cycle: 0, round: 0, score: 0, history: [] });
    this.startCycle();
    this.sync();
  }

  draw() {
    if (!this.secret.deck.length) this.secret.deck = shuffle([...SPECTRUMS]);
    return this.secret.deck.pop();
  }

  startCycle() {
    const s = this.state;
    s.cycle += 1;
    const ids = this.players.map((p) => p.id);
    this.secret.cards = Object.fromEntries(ids.map((id) => [id, { spectrum: this.draw(), target: randTarget(), clue: '', skipped: false }]));
    Object.assign(s, {
      phase: 'clues', written: [], queue: [], psychic: '', spectrum: ['', ''], clue: '', target: null,
      guesses: {}, teamGuess: null, points: 0, next: '',
      total: s.history.length + ids.length * (s.cycles - s.cycle + 1),
    });
    for (const id of ids) this.giveCard(id);
  }

  giveCard(id) {
    const c = this.secret.cards[id];
    this.setPrivate(id, c ? { spectrum: c.spectrum, target: c.target, clue: c.clue, skipped: c.skipped } : {});
  }

  /** Everyone has written (or the TV moved on): line the clues up and start guessing. */
  beginGuessing() {
    const s = this.state;
    s.queue = shuffle(s.written.slice());
    if (!s.queue.length) return;
    this.nextClue();
  }

  nextClue() {
    const s = this.state;
    const id = s.queue.shift();
    if (!id) {
      if (s.cycle < s.cycles) this.startCycle();
      else { s.phase = 'over'; s.next = ''; }
      return;
    }
    const c = this.secret.cards[id];
    s.round += 1;
    Object.assign(s, { phase: 'guess', psychic: id, spectrum: c.spectrum, clue: c.clue, target: null, guesses: {}, teamGuess: null, points: 0, next: '' });
  }

  guessers() {
    return this.players.filter((p) => p.id !== this.state.psychic && p.connected);
  }

  maybeReveal() {
    const s = this.state;
    const g = this.guessers();
    if (g.length && g.every((p) => s.guesses[p.id]?.locked)) this.reveal();
  }

  reveal() {
    const s = this.state;
    const values = Object.values(s.guesses).map((g) => g.value);
    if (!values.length) return;
    s.target = this.secret.cards[s.psychic].target;
    s.teamGuess = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    s.points = pointsFor(Math.abs(s.teamGuess - s.target));
    s.score += s.points;
    s.history.push({ spectrum: s.spectrum, clue: s.clue, points: s.points });
    s.phase = 'reveal';
    // The next clue-giver starts the next round (or the VIP, when a new set of clues is next).
    s.next = s.queue[0] || (this.players[0]?.id ?? '');
  }

  onPlayerLeave(id) {
    const s = this.state;
    delete s.guesses[id];
    if (!this.hasStarted) return;
    s.queue = s.queue.filter((x) => x !== id);
    if (s.phase === 'clues') {
      delete this.secret.cards[id];
      if (this.players.every((p) => s.written.includes(p.id))) this.beginGuessing();
    } else if (s.phase === 'guess') {
      if (id === s.psychic) this.nextClue();
      else this.maybeReveal();
    } else if (s.phase === 'reveal' && s.next === id) {
      s.next = s.queue[0] || (this.players[0]?.id ?? '');
    }
    this.sync();
  }

  onPlayerJoin(id) {
    const s = this.state;
    if (!this.hasStarted || s.phase !== 'clues' || this.secret.cards[id]) return;
    this.secret.cards[id] = { spectrum: this.draw(), target: randTarget(), clue: '', skipped: false };
    this.giveCard(id);
    this.sync();
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const host = meta.isBoard;
    switch (type) {
      case 'game:clue': {
        const c = this.secret.cards[me];
        if (s.phase !== 'clues' || !c) return;
        const clue = String(p.text || '').trim().slice(0, 60);
        if (!clue) return;
        c.clue = clue;
        if (!s.written.includes(me)) s.written.push(me);
        this.giveCard(me);
        if (this.players.every((x) => s.written.includes(x.id))) this.beginGuessing();
        break;
      }
      case 'game:skip-card': {
        const c = this.secret.cards[me];
        if (s.phase !== 'clues' || !c || c.skipped || s.written.includes(me)) return;
        Object.assign(c, { spectrum: this.draw(), target: randTarget(), skipped: true });
        this.giveCard(me);
        break;
      }
      case 'game:start-guessing': // TV moves on without slow writers
        if (s.phase !== 'clues' || !(host || meta.isVip) || !s.written.length) return;
        this.beginGuessing();
        break;
      case 'game:dial': {
        if (s.phase !== 'guess' || me === s.psychic || meta.isBoard) return;
        const value = Math.max(0, Math.min(100, Math.round(Number(p.value))));
        if (Number.isNaN(value)) return;
        s.guesses[me] = { value, locked: !!p.lock };
        if (p.lock) this.maybeReveal();
        break;
      }
      case 'game:reveal':
        if (s.phase !== 'guess' || !(host || me === s.psychic)) return;
        this.reveal();
        break;
      case 'game:next':
        if (s.phase !== 'reveal' || !(host || me === s.next)) return;
        this.nextClue();
        break;
      case 'game:play-again':
        if (s.phase !== 'over' || !(host || meta.isVip)) return;
        this.onGameStart();
        return;
      default:
        return;
    }
    this.sync();
  }
}
