// Battleship rules. Runs on the host screen.
// Two teams (or two players). Each team's phones see only their own fleet.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';

export const N = 10;
export const FLEET = [
  { name: 'Carrier', size: 5 }, { name: 'Battleship', size: 4 }, { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 }, { name: 'Destroyer', size: 2 },
];
const TEAMS = ['red', 'blue'];
const other = (t) => (t === 'red' ? 'blue' : 'red');

/** Random fleet with no ships touching, even at corners. */
export function placeFleet(random = Math.random) {
  for (;;) {
    const taken = new Set(), halo = new Set(), ships = [];
    let ok = true;
    for (const f of FLEET) {
      let placed = false;
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const across = random() < 0.5;
        const r = Math.floor(random() * (across ? N : N - f.size + 1));
        const c = Math.floor(random() * (across ? N - f.size + 1 : N));
        const cells = Array.from({ length: f.size }, (_, k) => (across ? r * N + c + k : (r + k) * N + c));
        if (cells.some((i) => halo.has(i))) continue;
        cells.forEach((i) => {
          taken.add(i);
          const rr = Math.floor(i / N), cc = i % N;
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const a = rr + dr, b = cc + dc;
            if (a >= 0 && a < N && b >= 0 && b < N) halo.add(a * N + b);
          }
        });
        ships.push({ name: f.name, size: f.size, cells });
        placed = true;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return ships;
  }
}

export default class BattleshipEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',   // lobby | setup | play | over
      locked: false,    // teams can't change once anyone starts placing ships
      teams: { red: [], blue: [] },
      ready: { red: false, blue: false },
      shots: { red: [], blue: [] },   // shots[t] = cells fired AT team t's waters: [{ i, hit }]
      sunk: { red: [], blue: [] },    // sunk[t] = ships of team t that are sunk: [{ name, cells }]
      turn: 'red', current: '', next: { red: 0, blue: 0 },
      last: null, winner: '', error: '',
    };
    this.secret = { fleets: { red: [], blue: [] } };
  }

  teamOf(id) { return TEAMS.find((t) => this.state.teams[t].includes(id)) || ''; }

  pick(team) {
    const s = this.state, list = s.teams[team];
    if (!list.length) return '';
    const id = list[s.next[team] % list.length];
    s.next[team] += 1;
    return id;
  }

  sync() {
    const s = this.state;
    for (const p of this.players) {
      const t = this.teamOf(p.id);
      // Fleets stay hidden until teams are locked, so nobody can peek at one side and then switch.
      this.setPrivate(p.id, t ? { team: t, fleet: s.locked ? this.secret.fleets[t] : null } : {});
    }
    super.sync();
  }

  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.teams = { red: [], blue: [] };
    this.players.forEach((p, i) => s.teams[i % 2 ? 'blue' : 'red'].push(p.id));
    this.secret.fleets = { red: placeFleet(), blue: placeFleet() };
    s.phase = 'setup';
    this.sync();
  }

  onPlayerJoin(id) {
    if (!this.hasStarted || this.teamOf(id)) return;
    const { teams } = this.state;
    teams[teams.red.length <= teams.blue.length ? 'red' : 'blue'].push(id);
    this.sync();
  }

  onPlayerLeave(id) {
    const s = this.state;
    for (const t of TEAMS) s.teams[t] = s.teams[t].filter((x) => x !== id);
    if (s.current === id && s.phase === 'play') s.current = this.pick(s.turn);
    this.sync();
  }

  fire(team, i) {
    const s = this.state;
    const target = other(team);
    const ship = this.secret.fleets[target].find((sh) => sh.cells.includes(i));
    s.shots[target].push({ i, hit: !!ship });
    let sunk = null;
    if (ship && ship.cells.every((c) => s.shots[target].some((x) => x.i === c))) {
      sunk = ship.name;
      s.sunk[target].push({ name: ship.name, cells: ship.cells });
    }
    s.last = { by: s.current, team, i, hit: !!ship, sunk, at: Date.now() };
    if (s.sunk[target].length === FLEET.length) {
      s.phase = 'over';
      s.winner = team;
      s.current = '';
      // Show where everything was.
      s.reveal = { red: this.secret.fleets.red, blue: this.secret.fleets.blue };
      return;
    }
    s.turn = target;
    s.current = this.pick(target);
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const myTeam = this.teamOf(me);
    const host = meta.isBoard || meta.isVip;
    s.error = '';
    switch (type) {
      case 'game:join-team':
        if (s.phase !== 'setup' || s.locked || !TEAMS.includes(p.team) || meta.isBoard || myTeam === p.team) return;
        for (const t of TEAMS) s.teams[t] = s.teams[t].filter((x) => x !== me);
        s.teams[p.team].push(me);
        s.ready = { red: false, blue: false };
        break;
      case 'game:lock':   // someone starts placing ships: teams are final from here on
        if (s.phase !== 'setup' || s.locked || !(myTeam || host)) return;
        if (!TEAMS.every((t) => s.teams[t].length)) { s.error = 'Both teams need at least one player.'; break; }
        s.locked = true;
        break;
      case 'game:shuffle':
        if (s.phase !== 'setup' || !myTeam || !s.locked) return;
        this.secret.fleets[myTeam] = placeFleet();
        s.ready[myTeam] = false;
        break;
      case 'game:ready':
        if (s.phase !== 'setup' || !myTeam || !s.locked) return;
        s.ready[myTeam] = true;
        if (TEAMS.every((t) => s.ready[t] && s.teams[t].length)) {
          s.phase = 'play';
          s.turn = Math.random() < 0.5 ? 'red' : 'blue';
          s.current = this.pick(s.turn);
        }
        break;
      case 'game:fire': {
        const i = p.index;
        if (s.phase !== 'play' || !Number.isInteger(i) || i < 0 || i >= N * N) return;
        // The shooter fires; if they've wandered off, any teammate can.
        if (myTeam !== s.turn) return;
        if (me !== s.current && this.players.some((x) => x.id === s.current)) return;
        if (s.shots[other(myTeam)].some((x) => x.i === i)) return;
        s.current = me;
        this.fire(myTeam, i);
        break;
      }
      case 'game:pass-turn':
        if (s.phase !== 'play' || !host) return;
        s.current = this.pick(s.turn);
        break;
      case 'game:new-game':
        if (s.phase !== 'over' || !host) return;
        this.secret.fleets = { red: placeFleet(), blue: placeFleet() };
        Object.assign(s, { phase: 'setup', locked: false, ready: { red: false, blue: false }, shots: { red: [], blue: [] }, sunk: { red: [], blue: [] }, last: null, winner: '', reveal: null });
        this.secret.fleets = { red: placeFleet(), blue: placeFleet() };
        break;
      default:
        return;
    }
    this.sync();
  }
}
