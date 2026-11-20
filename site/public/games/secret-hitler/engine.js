// Secret Hitler rules. Roles, the policy deck and votes live in this.secret;
// each phone only receives its own role, hand and investigation results.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';

const FASCISTS_FOR = { 5: 1, 6: 1, 7: 2, 8: 2, 9: 3, 10: 3 };
/** Presidential power unlocked by the Nth fascist policy, by player count. */
export function powerFor(playerCount, fascistPolicies) {
  const table = playerCount <= 6
    ? [null, null, 'peek', 'execute', 'execute']
    : playerCount <= 8
      ? [null, 'investigate', 'special-election', 'execute', 'execute']
      : ['investigate', 'investigate', 'special-election', 'execute', 'execute'];
  return table[fascistPolicies - 1] || null;
}

export default class SecretHitlerEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby', // lobby | roles | nominate | vote | vote-result | president | chancellor | veto | power | over
      seats: [], dead: [],
      president: '', chancellor: '', nextPresidentSeat: 0,
      lastPresident: '', lastChancellor: '',
      liberal: 0, fascist: 0, tracker: 0,
      voted: [], votes: null, voteResult: '',
      lastVote: null,   // { president, chancellor, votes, result } stays visible until the next vote
      power: '', investigated: [],
      vetoAsked: false,
      deckCount: 17, discardCount: 0,
      ready: [],
      winner: '', winReason: '', roles: null,
      log: [],
    };
  }

  destroy() { clearTimeout(this.timer); }
  nameOf(id) { return this.players.find((p) => p.id === id)?.name || 'Someone'; }
  log(t) { this.state.log.unshift(t); this.state.log.length = Math.min(this.state.log.length, 6); }
  alive() { return this.state.seats.filter((id) => !this.state.dead.includes(id)); }

  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.seats = this.players.slice(0, 10).map((p) => p.id);
    const n = s.seats.length;
    const roles = shuffle(['hitler', ...Array(FASCISTS_FOR[n] || 1).fill('fascist'), ...Array(n - 1 - (FASCISTS_FOR[n] || 1)).fill('liberal')]);
    this.secret = {
      roles: Object.fromEntries(s.seats.map((id, i) => [id, roles[i]])),
      deck: shuffle([...Array(6).fill('L'), ...Array(11).fill('F')]),
      discard: [], votes: {}, hand: [],
    };
    Object.assign(s, {
      phase: 'roles', dead: [], president: '', chancellor: '', lastPresident: '', lastChancellor: '',
      nextPresidentSeat: Math.floor(Math.random() * n),
      liberal: 0, fascist: 0, tracker: 0, voted: [], votes: null, voteResult: '',
      power: '', investigated: [], vetoAsked: false, ready: [], winner: '', winReason: '', roles: null, log: [], lastVote: null,
    });
    // Everyone learns their role. Fascists see their team; Hitler only does in 5–6 player games.
    for (const id of s.seats) {
      const role = this.secret.roles[id];
      const team = s.seats.filter((x) => x !== id && this.secret.roles[x] !== 'liberal')
        .map((x) => ({ id: x, role: this.secret.roles[x] }));
      const knows = role === 'fascist' || (role === 'hitler' && n <= 6);
      this.setPrivate(id, { role, team: knows ? team : [] });
    }
    this.sync();
  }

  sync() {
    const s = this.state;
    s.deckCount = this.secret.deck?.length ?? 0;
    s.discardCount = this.secret.discard?.length ?? 0;
    super.sync();
  }

  updatePrivate(id, patch) {
    this.setPrivate(id, { ...(this.private[id] || {}), ...patch });
  }

  // ---------- flow ----------
  startNomination(presidentId) {
    const s = this.state;
    if (!presidentId) {
      // Normal rotation: next living player clockwise.
      let i = s.nextPresidentSeat;
      while (s.dead.includes(s.seats[i % s.seats.length])) i++;
      presidentId = s.seats[i % s.seats.length];
      s.nextPresidentSeat = (i + 1) % s.seats.length;
    }
    Object.assign(s, { phase: 'nominate', president: presidentId, chancellor: '', voted: [], votes: null, voteResult: '', power: '', vetoAsked: false });
    this.secret.votes = {};
  }

  eligibleChancellors() {
    const s = this.state;
    const alive = this.alive();
    return alive.filter((id) => id !== s.president && id !== s.lastChancellor && !(alive.length > 5 && id === s.lastPresident));
  }

  draw(n) {
    if (this.secret.deck.length < n) {
      this.secret.deck = shuffle([...this.secret.deck, ...this.secret.discard]);
      this.secret.discard = [];
    }
    return this.secret.deck.splice(0, n);
  }

  enact(policy, { chaos = false } = {}) {
    const s = this.state;
    if (policy === 'L') s.liberal += 1; else s.fascist += 1;
    s.tracker = 0;
    this.log(`${chaos ? 'The frustrated people' : 'The government'} passed a ${policy === 'L' ? 'Liberal' : 'Fascist'} policy`);
    if (s.liberal >= 5) return this.finish('liberal', 'Five Liberal policies were passed.');
    if (s.fascist >= 6) return this.finish('fascist', 'Six Fascist policies were passed.');
    if (this.secret.deck.length < 3) { this.secret.deck = shuffle([...this.secret.deck, ...this.secret.discard]); this.secret.discard = []; }
    if (chaos) { s.lastPresident = ''; s.lastChancellor = ''; return this.startNomination(); }
    const power = policy === 'F' ? powerFor(s.seats.length, s.fascist) : null;
    if (power) {
      s.phase = 'power';
      s.power = power;
      if (power === 'peek') this.updatePrivate(s.president, { peek: this.secret.deck.slice(0, 3) });
      return;
    }
    this.startNomination();
  }

  failElection() {
    const s = this.state;
    s.tracker += 1;
    if (s.tracker >= 3) {
      this.log('Three failed elections! The top policy is passed automatically.');
      this.enact(this.draw(1)[0], { chaos: true });
    } else this.startNomination();
  }

  finish(winner, reason) {
    const s = this.state;
    clearTimeout(this.timer);
    Object.assign(s, { phase: 'over', winner, winReason: reason, roles: this.secret.roles });
  }

  // ---------- actions ----------
  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const host = meta.isBoard || meta.isVip;
    const alive = this.alive();

    switch (type) {
      case 'game:ready':
        if (s.phase !== 'roles' || !s.seats.includes(me) || s.ready.includes(me)) return;
        s.ready.push(me);
        if (s.ready.length >= s.seats.length) this.startNomination();
        break;
      case 'game:start-now':
        if (s.phase !== 'roles' || !host) return;
        this.startNomination();
        break;

      case 'game:nominate':
        if (s.phase !== 'nominate' || me !== s.president || !this.eligibleChancellors().includes(p.id)) return;
        s.chancellor = p.id;
        s.phase = 'vote';
        this.log(`${this.nameOf(me)} nominated ${this.nameOf(p.id)} for Chancellor`);
        break;

      case 'game:vote': {
        if (s.phase !== 'vote' || !alive.includes(me) || (p.vote !== 'ja' && p.vote !== 'nein')) return;
        this.secret.votes[me] = p.vote;
        if (!s.voted.includes(me)) s.voted.push(me);
        if (alive.every((id) => this.secret.votes[id])) {
          s.votes = { ...this.secret.votes };
          const ja = Object.values(s.votes).filter((v) => v === 'ja').length;
          s.voteResult = ja > alive.length / 2 ? 'passed' : 'failed';
          s.phase = 'vote-result';
          s.lastVote = { president: s.president, chancellor: s.chancellor, votes: s.votes, result: s.voteResult };
          this.log(`The vote ${s.voteResult} (${ja} Ja, ${alive.length - ja} Nein)`);
        }
        break;
      }
      case 'game:continue':
        if (s.phase !== 'vote-result' || !host) return;
        this.afterVote();
        break;

      case 'game:discard': {
        // President discards one of three
        if (s.phase !== 'president' || me !== s.president) return;
        const hand = this.secret.hand;
        const i = p.index;
        if (!Number.isInteger(i) || i < 0 || i >= hand.length) return;
        this.secret.discard.push(hand.splice(i, 1)[0]);
        this.updatePrivate(s.president, { hand: [] });
        this.updatePrivate(s.chancellor, { hand: [...hand] });
        s.phase = 'chancellor';
        break;
      }
      case 'game:enact': {
        if (s.phase !== 'chancellor' || me !== s.chancellor) return;
        const hand = this.secret.hand;
        const i = p.index;
        if (!Number.isInteger(i) || i < 0 || i >= hand.length) return;
        const [policy] = hand.splice(i, 1);
        this.secret.discard.push(...hand);
        this.secret.hand = [];
        this.updatePrivate(s.chancellor, { hand: [] });
        this.enact(policy);
        break;
      }
      case 'game:veto':
        if (s.phase !== 'chancellor' || me !== s.chancellor || s.fascist < 5 || s.vetoAsked) return;
        s.vetoAsked = true;
        s.phase = 'veto';
        this.log(`${this.nameOf(me)} wants to veto this agenda`);
        break;
      case 'game:veto-answer':
        if (s.phase !== 'veto' || me !== s.president) return;
        if (p.accept) {
          this.secret.discard.push(...this.secret.hand);
          this.secret.hand = [];
          this.updatePrivate(s.chancellor, { hand: [] });
          this.log('The President agreed to the veto');
          this.failElection();
        } else {
          s.phase = 'chancellor';
          this.log('The President refused the veto');
        }
        break;

      case 'game:power': {
        if (s.phase !== 'power' || me !== s.president) return;
        if (s.power === 'peek') {
          this.updatePrivate(me, { peek: null });
          this.startNomination();
        } else {
          const target = p.id;
          if (!alive.includes(target) || target === me) return;
          if (s.power === 'investigate') {
            if (s.investigated.includes(target)) return;
            s.investigated.push(target);
            const party = this.secret.roles[target] === 'liberal' ? 'Liberal' : 'Fascist';
            const results = { ...(this.private[me]?.investigations || {}), [target]: party };
            this.updatePrivate(me, { investigations: results });
            this.log(`${this.nameOf(me)} investigated ${this.nameOf(target)}`);
            this.startNomination();
          } else if (s.power === 'special-election') {
            this.log(`${this.nameOf(me)} chose ${this.nameOf(target)} as the next President`);
            this.startNomination(target);
          } else if (s.power === 'execute') {
            s.dead.push(target);
            this.log(`${this.nameOf(me)} executed ${this.nameOf(target)}`);
            if (this.secret.roles[target] === 'hitler') return this.finishAndSync('liberal', 'Hitler was executed.');
            this.startNomination();
          }
        }
        break;
      }

      case 'game:play-again':
        if (s.phase !== 'over' || !host) return;
        this.onGameStart();
        return;
      default:
        return;
    }
    this.sync();
  }

  finishAndSync(winner, reason) {
    this.finish(winner, reason);
    this.sync();
  }

  afterVote() {
    const s = this.state;
    clearTimeout(this.timer);
    if (s.voteResult !== 'passed') {
      this.log(`${this.nameOf(s.president)} and ${this.nameOf(s.chancellor)} were not elected`);
      return this.failElection();
    }
    s.lastPresident = s.president;
    s.lastChancellor = s.chancellor;
    s.tracker = 0;
    if (s.fascist >= 3 && this.secret.roles[s.chancellor] === 'hitler') {
      return this.finish('fascist', 'Hitler was elected Chancellor.');
    }
    this.secret.hand = this.draw(3);
    this.updatePrivate(s.president, { hand: [...this.secret.hand] });
    s.phase = 'president';
  }
}
