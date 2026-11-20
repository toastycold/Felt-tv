// Codenames rules. Runs on the host screen.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import { WORDS } from './words.js';

const other = (t) => (t === 'red' ? 'blue' : 'red');
const TEAMS = ['red', 'blue'];

export default class CodenamesEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',            // lobby | setup | clue | guess | over
      teams: { red: [], blue: [] },
      spymasters: { red: '', blue: '' },
      words: [], keyShown: [], revealed: [],   // keyShown: colors of revealed cards only
      turn: 'red', starter: 'red',
      clue: null,                // { word, number }
      guessesLeft: 0,
      winner: '', reason: '',
      wins: { red: 0, blue: 0 },
      log: [],
      error: '',
    };
  }

  // ---------- helpers ----------
  teamOf(id) {
    return TEAMS.find((t) => this.state.teams[t].includes(id)) || '';
  }

  remaining(team) {
    const s = this.state;
    return (this.secret.key || []).filter((k, i) => k === team && !s.revealed[i]).length;
  }

  addToSmallerTeam(id) {
    const { teams } = this.state;
    const team = teams.red.length <= teams.blue.length ? 'red' : 'blue';
    teams[team].push(id);
    return team;
  }

  removeFromTeams(id) {
    const s = this.state;
    for (const t of TEAMS) {
      s.teams[t] = s.teams[t].filter((x) => x !== id);
      if (s.spymasters[t] === id) s.spymasters[t] = s.teams[t][0] || '';
    }
  }

  setupProblem() {
    const s = this.state;
    for (const t of TEAMS) {
      const label = t === 'red' ? 'Red' : 'Blue';
      if (!s.spymasters[t]) return `${label} team needs a spymaster.`;
      if (s.teams[t].filter((id) => id !== s.spymasters[t]).length < 1) return `${label} team needs at least one guesser.`;
    }
    return '';
  }

  deal() {
    const s = this.state;
    const starter = Math.random() < 0.5 ? 'red' : 'blue';
    const key = shuffle([
      ...Array(9).fill(starter),
      ...Array(8).fill(other(starter)),
      ...Array(7).fill('neutral'),
      'assassin',
    ]);
    this.secret.key = key; // the full key is never in public state
    Object.assign(s, {
      words: shuffle([...new Set([...WORDS, ...this.extraItems('word').map((x) => x.text.split(/\s+/)[0].toLowerCase())])]).slice(0, 25).map((w) => w.toUpperCase()),
      keyShown: Array(25).fill(''),
      revealed: Array(25).fill(false),
      starter, turn: starter,
      clue: null, guessesLeft: 0, winner: '', reason: '', log: [], error: '',
    });
  }

  /** Spymasters get the key on their phone; everyone else gets nothing private. */
  sync() {
    const s = this.state;
    const live = s.phase === 'clue' || s.phase === 'guess';
    s.left = { red: this.remaining('red'), blue: this.remaining('blue') };
    for (const p of this.players) {
      const spy = live && (s.spymasters.red === p.id || s.spymasters.blue === p.id);
      this.setPrivate(p.id, spy ? { key: this.secret.key } : {});
    }
    super.sync();
  }

  // ---------- lifecycle ----------
  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.teams = { red: [], blue: [] };
    this.players.forEach((p, i) => s.teams[i % 2 === 0 ? 'red' : 'blue'].push(p.id));
    s.spymasters = { red: s.teams.red[0] || '', blue: s.teams.blue[0] || '' };
    s.phase = 'setup';
    this.sync();
  }

  onPlayerJoin(id) {
    if (!this.hasStarted || this.teamOf(id)) return;
    const team = this.addToSmallerTeam(id);
    if (!this.state.spymasters[team]) this.state.spymasters[team] = id;
    this.sync();
  }

  onPlayerLeave(id) {
    const s = this.state;
    const wasSpymaster = TEAMS.some((t) => s.spymasters[t] === id);
    this.removeFromTeams(id);
    if (wasSpymaster && s.phase !== 'setup' && s.phase !== 'over') {
      s.log.unshift(`A spymaster left — ${s.spymasters[s.turn] ? 'a teammate took over' : 'game paused'}.`);
    }
    this.sync();
  }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const myTeam = this.teamOf(me);
    s.error = '';

    switch (type) {
      // ----- setup -----
      case 'game:join-team': {
        if (s.phase !== 'setup' || !TEAMS.includes(p.team) || meta.isBoard) return;
        if (myTeam === p.team) return;
        this.removeFromTeams(me);
        s.teams[p.team].push(me);
        break;
      }
      case 'game:become-spymaster':
        if (s.phase !== 'setup' || !myTeam) return;
        s.spymasters[myTeam] = me;
        break;
      case 'game:begin': {
        if (s.phase !== 'setup' || !(meta.isBoard || meta.isVip)) return;
        const problem = this.setupProblem();
        if (problem) { s.error = problem; break; }
        this.deal();
        s.phase = 'clue';
        break;
      }

      // ----- play -----
      case 'game:clue': {
        if (s.phase !== 'clue' || s.spymasters[s.turn] !== me) return;
        const word = String(p.word || '').trim().toUpperCase();
        const number = Math.max(0, Math.min(9, parseInt(p.number, 10) || 0));
        if (!/^[A-Z'-]{1,24}$/.test(word)) { s.error = 'Clue must be one word (letters only).'; break; }
        if (s.words.some((w, i) => !s.revealed[i] && (w.includes(word) || word.includes(w)))) {
          s.error = "Clue can't be (or contain) a word on the board."; break;
        }
        s.clue = { word, number };
        s.guessesLeft = number === 0 ? 25 : number + 1;
        s.phase = 'guess';
        s.log.unshift(`${s.turn.toUpperCase()} clue: ${word} ${number}`);
        break;
      }
      case 'game:guess': {
        const i = p.index;
        if (s.phase !== 'guess' || myTeam !== s.turn || s.spymasters[s.turn] === me) return;
        if (!Number.isInteger(i) || i < 0 || i > 24 || s.revealed[i]) return;
        this.reveal(i);
        break;
      }
      case 'game:end-turn':
        if (s.phase !== 'guess') return;
        if (!(meta.isBoard || (myTeam === s.turn && s.spymasters[s.turn] !== me))) return;
        this.endTurn();
        break;

      case 'game:new-game':
        if (s.phase !== 'over' || !(meta.isBoard || meta.isVip)) return;
        // Next spymaster on each team = the next person in line.
        for (const t of TEAMS) {
          const list = s.teams[t];
          const idx = list.indexOf(s.spymasters[t]);
          s.spymasters[t] = list.length ? list[(idx + 1) % list.length] : '';
        }
        s.phase = 'setup';
        s.clue = null;
        break;

      default:
        return;
    }
    this.sync();
  }

  reveal(i) {
    const s = this.state;
    s.revealed[i] = true;
    const card = this.secret.key[i];
    s.keyShown[i] = card;
    s.log.unshift(`${s.turn.toUpperCase()} picked ${s.words[i]} → ${card === 'assassin' ? 'ASSASSIN' : card}`);

    if (card === 'assassin') return this.finish(other(s.turn), `${s.turn === 'red' ? 'Red' : 'Blue'} hit the assassin!`);
    for (const t of TEAMS) {
      if (this.remaining(t) === 0) return this.finish(t, `${t === 'red' ? 'Red' : 'Blue'} found all their words!`);
    }
    if (card !== s.turn) return this.endTurn();
    s.guessesLeft -= 1;
    if (s.guessesLeft <= 0) this.endTurn();
  }

  endTurn() {
    const s = this.state;
    s.turn = other(s.turn);
    s.clue = null;
    s.guessesLeft = 0;
    s.phase = 'clue';
  }

  finish(winner, reason) {
    const s = this.state;
    Object.assign(s, { phase: 'over', winner, reason, keyShown: [...this.secret.key] });
    s.wins[winner] += 1;
  }
}
