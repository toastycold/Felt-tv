// Trolley Problem rules. Score = correct predictions of the majority.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import { DILEMMAS } from './dilemmas.js';

const ROUNDS = 8;

export default class TrolleyEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',   // lobby | vote | reveal | over
      round: 0, total: ROUNDS,
      deck: [], dilemma: null,
      votes: {},        // playerId -> { choice: 'stay'|'pull', predict: 'stay'|'pull' }
      majority: '',     // 'stay' | 'pull' | 'tie'
      scores: {},
    };
  }

  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.deck = shuffle([...DILEMMAS, ...this.extraItems('dilemma').filter((d) => d.stay && d.pull)]).slice(0, ROUNDS);
    s.scores = Object.fromEntries(this.players.map((p) => [p.id, 0]));
    s.round = 0;
    this.nextRound();
  }

  onPlayerJoin(id) {
    if (!this.hasStarted) return;
    this.state.scores[id] ??= 0;
    this.sync();
  }

  onPlayerLeave(id) {
    delete this.state.votes[id];
    if (this.state.phase === 'vote') this.maybeReveal();
    this.sync();
  }

  nextRound() {
    const s = this.state;
    if (s.round >= s.deck.length) { s.phase = 'over'; this.sync(); return; }
    Object.assign(s, { phase: 'vote', dilemma: s.deck[s.round], round: s.round + 1, votes: {}, majority: '' });
    this.sync();
  }

  maybeReveal() {
    const active = this.players.filter((p) => p.connected);
    if (active.length && active.every((p) => this.state.votes[p.id])) this.reveal();
  }

  reveal() {
    const s = this.state;
    const all = Object.values(s.votes);
    const pulls = all.filter((v) => v.choice === 'pull').length;
    const stays = all.length - pulls;
    s.majority = pulls > stays ? 'pull' : stays > pulls ? 'stay' : 'tie';
    for (const [id, v] of Object.entries(s.votes)) {
      if (s.majority === 'tie' || v.predict === s.majority) s.scores[id] = (s.scores[id] || 0) + 1;
    }
    s.phase = 'reveal';
  }

  processAction(type, p, meta) {
    const s = this.state;
    switch (type) {
      case 'game:vote': {
        if (s.phase !== 'vote' || meta.isBoard) return;
        const ok = (x) => x === 'stay' || x === 'pull';
        if (!ok(p.choice) || !ok(p.predict)) return;
        s.votes[meta.playerId] = { choice: p.choice, predict: p.predict };
        s.scores[meta.playerId] ??= 0;
        this.maybeReveal();
        break;
      }
      case 'game:reveal':
        if (s.phase !== 'vote' || !(meta.isBoard || meta.isVip) || !Object.keys(s.votes).length) return;
        this.reveal();
        break;
      case 'game:next':
        if (s.phase !== 'reveal' || !(meta.isBoard || meta.isVip)) return;
        this.nextRound();
        return;
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
