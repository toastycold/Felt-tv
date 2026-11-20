// Mafia rules. Roles and night choices live in this.secret; each phone only gets its own role,
// its teammates (Mafia only) and the Detective's results.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';

export const ROLE = { mafia: 'Mafia', doctor: 'Doctor', detective: 'Detective', villager: 'Villager' };
/** 'a Villager', 'the Doctor', 'Mafia' */
export const roleWithArticle = (r) => ({ mafia: 'Mafia', villager: 'a Villager', doctor: 'the Doctor', detective: 'the Detective' })[r] || '';

export function mafiaCount(n) {
  if (n <= 6) return 1;
  if (n <= 9) return 2;
  if (n <= 12) return 3;
  return 4;
}

export default class MafiaEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',    // lobby | setup | roles | night | morning | day | verdict | over
      narrator: '',      // a player who runs the game instead of playing (optional)
      shown: true,       // with a narrator, morning/verdict news waits until they put it on the TV
      seats: [], dead: [], ready: [],
      day: 0,
      nightDone: [],     // who has finished their night task (everyone taps something, so nobody stands out)
      morning: null,     // { killed: id | '', role, saved: bool }
      votes: {},         // day votes, public: id -> target id | 'skip'
      verdict: null,     // { out: id | '', role, tally }
      reveals: {},       // id -> role, shown once someone is dead
      winner: '', roles: null, log: [],
    };
  }

  destroy() { clearTimeout(this.timer); }
  nameOf(id) { return this.players.find((p) => p.id === id)?.name || 'Someone'; }
  alive() { return this.state.seats.filter((id) => !this.state.dead.includes(id) && !(this.secret.pending || []).includes(id)); }
  /** Death is public right away, or held back until the narrator reveals it. */
  kill(id) { if (this.state.narrator) (this.secret.pending ||= []).push(id); else this.state.dead.push(id); }
  revealDeaths() { const p = this.secret.pending || []; this.state.dead.push(...p.filter((x) => !this.state.dead.includes(x))); this.secret.pending = []; this.state.shown = true; }
  roleOf(id) { return this.secret.roles?.[id]; }

  onGameStart() {
    super.onGameStart();
    Object.assign(this.state, { phase: 'setup', seats: [], dead: [], log: [] });
    this.sync();
  }

  /** Narrator sees everything: roles, tonight's picks and the Detective's results. */
  sync() {
    const s = this.state;
    if (s.narrator && this.secret.roles) {
      const n = this.secret.night || {};
      this.setPrivate(s.narrator, {
        narrator: true, roles: this.secret.roles, mafiaPicks: { ...(n.mafia || {}) }, save: n.save || '', check: n.check || '',
        lastSaved: this.secret.lastSaved || '', suspects: { ...(n.suspects || {}) },
      });
    } else if (s.narrator) this.setPrivate(s.narrator, { narrator: true });
    super.sync();
  }

  deal() {
    const s = this.state;
    s.seats = this.players.filter((p) => p.id !== s.narrator).slice(0, 16).map((p) => p.id);
    const n = s.seats.length;
    const m = mafiaCount(n);
    const deck = shuffle(['doctor', 'detective', ...Array(m).fill('mafia'), ...Array(Math.max(0, n - m - 2)).fill('villager')]).slice(0, n);
    this.secret = { roles: Object.fromEntries(s.seats.map((id, i) => [id, deck[i]])), night: {}, lastSaved: '' };
    Object.assign(s, { phase: 'roles', shown: true, dead: [], ready: [], day: 0, nightDone: [], morning: null, votes: {}, verdict: null, reveals: {}, winner: '', roles: null, log: [] });
    const mafia = s.seats.filter((id) => this.roleOf(id) === 'mafia');
    for (const id of s.seats) {
      this.setPrivate(id, { role: this.roleOf(id), team: this.roleOf(id) === 'mafia' ? mafia.filter((x) => x !== id) : [], checks: {} });
    }
    this.sync();
  }

  updatePrivate(id, patch) { this.setPrivate(id, { ...(this.private[id] || {}), ...patch }); }

  // ---------- night ----------
  startNight() {
    const s = this.state;
    this.revealDeaths();
    s.phase = 'night';
    s.day += 1;
    s.nightDone = [];
    s.votes = {};
    s.verdict = null;
    this.secret.night = { mafia: {}, save: '', check: '', suspects: {} };
    // Every living phone gets a task so nobody can tell who has a real one.
    const alive = this.alive();
    for (const id of s.seats) {
      const role = this.roleOf(id);
      let task = 'none';
      if (alive.includes(id)) task = role === 'mafia' ? 'kill' : role === 'doctor' ? 'save' : role === 'detective' ? 'check' : 'suspect';
      this.updatePrivate(id, { task, pick: '', night: s.day, mafiaPicks: {} });
    }
  }

  nightTaskDone(id) {
    const s = this.state;
    if (!s.nightDone.includes(id)) s.nightDone.push(id);
    // With a narrator, the night ends when they say so.
    if (!s.narrator && this.alive().every((x) => s.nightDone.includes(x))) this.endNight();
  }

  endNight() {
    const s = this.state;
    const n = this.secret.night;
    // Mafia victim: most-picked target (ties broken at random).
    const tally = {};
    for (const t of Object.values(n.mafia)) tally[t] = (tally[t] || 0) + 1;
    const top = Math.max(0, ...Object.values(tally));
    const victim = shuffle(Object.keys(tally).filter((t) => tally[t] === top))[0] || '';
    const saved = !!victim && n.save === victim;
    this.secret.lastSaved = n.save;
    if (victim && !saved) {
      this.kill(victim);
      s.reveals[victim] = this.roleOf(victim);
      this.log(`${this.nameOf(victim)} was found dead. They were ${roleWithArticle(this.roleOf(victim))}.`);
    } else {
      this.log(saved ? 'The Doctor saved someone last night!' : 'Nobody died last night.');
    }
    s.shown = !s.narrator;
    s.morning = { killed: saved ? '' : victim, role: saved || !victim ? '' : this.roleOf(victim), saved };
    for (const id of s.seats) this.updatePrivate(id, { task: 'none', pick: '' });
    if (!this.checkWin()) s.phase = 'morning';
  }

  // ---------- day ----------
  startDay() {
    const s = this.state;
    this.revealDeaths();
    s.phase = 'day';
    s.votes = {};
    s.verdict = null;
  }

  tallyVotes() {
    const s = this.state;
    const tally = {};
    for (const t of Object.values(s.votes)) tally[t] = (tally[t] || 0) + 1;
    const candidates = Object.entries(tally).filter(([t]) => t !== 'skip').sort((a, b) => b[1] - a[1]);
    const skip = tally.skip || 0;
    let out = '';
    // The top name goes only if they beat every other name and the "skip" votes.
    if (candidates.length && candidates[0][1] > skip && (candidates.length === 1 || candidates[0][1] > candidates[1][1])) out = candidates[0][0];
    if (out) {
      this.kill(out);
      s.reveals[out] = this.roleOf(out);
      this.log(`The town voted out ${this.nameOf(out)}. They were ${roleWithArticle(this.roleOf(out))}.`);
    } else this.log('The town couldn’t agree. Nobody was voted out.');
    s.shown = !s.narrator;
    s.verdict = { out, role: out ? this.roleOf(out) : '', tally };
    if (!this.checkWin()) s.phase = 'verdict';
  }

  checkWin() {
    const s = this.state;
    const alive = this.alive();
    const mafia = alive.filter((id) => this.roleOf(id) === 'mafia').length;
    if (mafia === 0) return this.finish('town');
    if (mafia >= alive.length - mafia) return this.finish('mafia');
    return false;
  }

  finish(winner) {
    const s = this.state;
    clearTimeout(this.timer);
    this.revealDeaths();
    Object.assign(s, { phase: 'over', winner, roles: this.secret.roles });
    return true;
  }

  log(t) { this.state.log.unshift(t); this.state.log.length = Math.min(this.state.log.length, 6); }

  // ---------- actions ----------
  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const host = meta.isBoard || (s.narrator ? me === s.narrator : meta.isVip);
    const alive = this.alive();
    const living = alive.includes(me);

    switch (type) {
      case 'game:narrate': // tap to become the narrator, tap again to step down
        if (s.phase !== 'setup' || !me) return;
        s.narrator = s.narrator === me ? '' : me;
        break;
      case 'game:no-narrator':
        if (s.phase !== 'setup' || !(meta.isBoard || meta.isVip)) return;
        s.narrator = '';
        break;
      case 'game:deal': {
        if (s.phase !== 'setup' || !(meta.isBoard || meta.isVip || me === s.narrator)) return;
        const n = this.players.filter((p) => p.id !== s.narrator).length;
        if (n < 4) { s.error = `Mafia needs at least 4 players${s.narrator ? ' besides the narrator' : ''}.`; break; }
        s.error = '';
        this.deal();
        break;
      }
      case 'game:show':
        if (!['morning', 'verdict'].includes(s.phase) || !host) return;
        this.revealDeaths();
        break;
      case 'game:ready':
        if (s.phase !== 'roles' || !s.seats.includes(me) || s.ready.includes(me)) return;
        s.ready.push(me);
        if (s.ready.length >= s.seats.length) this.startNight();
        break;
      case 'game:start-now':
        if (s.phase !== 'roles' || !host) return;
        this.startNight();
        break;

      case 'game:night': {
        if (s.phase !== 'night' || !living || s.nightDone.includes(me)) return;
        const role = this.roleOf(me);
        const target = p.id;
        if (!alive.includes(target)) return;
        const n = this.secret.night;
        if (role === 'mafia') {
          if (this.roleOf(target) === 'mafia') return; // can't target your own team
          n.mafia[me] = target;
          // Show teammates each other's picks.
          const team = alive.filter((id) => this.roleOf(id) === 'mafia');
          for (const id of team) this.updatePrivate(id, { mafiaPicks: { ...n.mafia } });
          this.updatePrivate(me, { pick: target });
        } else if (role === 'doctor') {
          if (target === this.secret.lastSaved) return; // not the same person two nights running
          n.save = target;
          this.updatePrivate(me, { pick: target });
        } else if (role === 'detective') {
          if (target === me) return;
          n.check = target;
          const checks = { ...(this.private[me]?.checks || {}), [target]: this.roleOf(target) === 'mafia' ? 'Mafia' : 'Not Mafia' };
          this.updatePrivate(me, { pick: target, checks });
        } else {
          n.suspects[me] = target;
          this.updatePrivate(me, { pick: target }); // villagers' "suspect" tap is just cover
        }
        this.nightTaskDone(me);
        break;
      }
      case 'game:wake-up': // host skips anyone who's taking too long
        if (s.phase !== 'night' || !host) return;
        this.endNight();
        break;

      case 'game:start-day':
        if (s.phase !== 'morning' || !host) return;
        this.startDay();
        break;
      case 'game:vote':
        if (s.phase !== 'day' || !living) return;
        if (p.id !== 'skip' && (!alive.includes(p.id) || p.id === me)) return;
        s.votes[me] = p.id;
        if (alive.every((id) => s.votes[id])) this.tallyVotes();
        break;
      case 'game:close-vote':
        if (s.phase !== 'day' || !host || !Object.keys(s.votes).length) return;
        this.tallyVotes();
        break;
      case 'game:next-night':
        if (s.phase !== 'verdict' || !host) return;
        this.startNight();
        break;

      case 'game:play-again':
        if (s.phase !== 'over' || !host) return;
        Object.assign(s, { phase: 'setup', seats: [], dead: [], log: [], roles: null, winner: '' });
        this.secret = {};
        for (const p of this.players) this.setPrivate(p.id, {});
        break;
      default:
        return;
    }
    this.sync();
  }

  onPlayerLeave() {
    const s = this.state;
    if (s.phase === 'night' && !s.narrator && this.alive().every((x) => s.nightDone.includes(x) || !this.players.some((p) => p.id === x && p.connected))) this.endNight();
    this.sync();
  }
}
