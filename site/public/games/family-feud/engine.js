// Family Feud rules. Runs on the host screen.
// Round: face-off -> the winning team guesses (3 strikes) -> the other team gets one steal -> points.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import { SURVEYS } from './surveys.js';

const TEAMS = ['red', 'blue'];
const other = (t) => (t === 'red' ? 'blue' : 'red');
const MULTS = [1, 1, 2, 3];
const FM_GOAL = 200;
const FM_TOTAL = 60000;           // one 60-second clock shared by both players
const FM_MIN_P2 = 10000;          // player 2 always gets at least this much
const FM_REVEAL_MS = 1300;        // pause between each point total being revealed

// ---------- surveys this TV has already shown ----------
const SEEN_KEY = 'ff-seen';
function seenSurveys() { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } }
function markSeen(q) {
  try {
    const seen = [...seenSurveys().add(q)];
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen.length > SURVEYS.length - 6 ? seen.slice(-20) : seen));   // start over when nearly all are used
  } catch { /* no storage: fine */ }
}

// ---------- answer matching ----------
const FILLER = new Set(['a', 'an', 'the', 'my', 'your', 'some', 'to', 'of', 'go']);
function norm(s) {
  return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter((w) => w && !FILLER.has(w))
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
}
/** Edit distance, counting a swapped pair of letters as one typo. */
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
const typos = (n) => (n >= 9 ? 2 : n >= 4 ? 1 : 0);   // how many slips we forgive for a word this long
const squash = (x) => x.replace(/ /g, '');
/** How well a guess matches one way of saying an answer: 0 = no, higher = better. */
function score(g, a) {
  if (!g || !a) return 0;
  if (g === a || squash(g) === squash(a)) return 1000;
  const pad = (x) => ` ${x} `;
  if ((a.length >= 3 && pad(g).includes(pad(a))) || (g.length >= 4 && pad(a).includes(pad(g)))) return 100 + Math.min(g.length, a.length);
  // the whole thing, with a typo or two ("mashed potatos", "turkye")
  const whole = lev(squash(g), squash(a));
  if (whole <= typos(squash(a).length)) return 60 - whole;
  // one key word, with a typo ("cranbery" for "cranberry sauce")
  const gw = g.split(' '), aw = a.split(' ').filter((w) => w.length >= 5);
  for (const w of aw) for (const x of gw) if (x.length >= 4 && lev(w, x) <= typos(w.length)) return 20;
  return 0;
}
/** Index of the answer that best matches the guess, or -1. */
export function matchAnswer(guess, answers) {
  const g = norm(guess);
  let best = -1, bestScore = 0;
  answers.forEach((ans, i) => {
    for (const x of [ans.text, ...ans.alts]) {
      const sc = score(g, norm(x));
      if (sc > bestScore) { best = i; bestScore = sc; }
    }
  });
  return best;
}

export default class FamilyFeudEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',   // lobby | setup | faceoff | play | steal | reveal | over
      teams: { red: [], blue: [] },
      scores: { red: 0, blue: 0 },
      round: 0, rounds: MULTS.length, mult: 1,
      question: '', board: [],         // board[i] = { text, points } once revealed, else null
      faceoff: null,                   // { red: id, blue: id, done: [ids] }
      control: '', strikes: 0, bank: 0,
      current: '',                     // whose turn it is to guess (their character waves)
      waiting: [],                     // who still needs to answer (their character thinks)
      next: { red: 0, blue: 0 },
      last: null,                      // { by, text, hit: bool, already: bool }
      roundWinner: '', winner: '', message: '', error: '',
      names: { red: 'Red family', blue: 'Blue family' },
      fm: null,                        // Fast Money (see startFastMoney)
    };
    this.secret = { deck: [], answers: [], faceoff: {}, fm: [] };
  }

  tn(t) { return this.state.names?.[t] || (t === 'red' ? 'Red family' : 'Blue family'); }

  teamOf(id) { return TEAMS.find((t) => this.state.teams[t].includes(id)) || ''; }

  removeFromTeams(id) {
    for (const t of TEAMS) this.state.teams[t] = this.state.teams[t].filter((x) => x !== id);
  }

  pick(team) {
    const s = this.state;
    const list = s.teams[team];
    if (!list.length) return '';
    const id = list[s.next[team] % list.length];
    s.next[team] += 1;
    return id;
  }

  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.teams = { red: [], blue: [] };
    shuffle([...this.players]).forEach((p, i) => s.teams[i % 2 ? 'blue' : 'red'].push(p.id));
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
    this.removeFromTeams(id);
    s.waiting = s.waiting.filter((x) => x !== id);
    if (s.current === id && s.phase === 'play') s.current = this.pick(s.control);
    if (s.phase === 'faceoff' && s.faceoff && TEAMS.some((t) => s.faceoff[t] === id)) this.startFaceoff();
    this.sync();
  }

  // ---------- round flow ----------
  newGame() {
    const s = this.state;
    const extra = this.extraItems('survey').map((x) => {
      const answers = String(x.answers || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8);
      const total = 100;
      return { q: x.text, answers: answers.map((text, i) => ({ text, points: Math.max(2, Math.round((total * (answers.length - i)) / ((answers.length * (answers.length + 1)) / 2))), alts: [] })) };
    }).filter((x) => x.q && x.answers.length >= 3);
    this.secret.deck = this.freshDeck(extra);
    Object.assign(s, { scores: { red: 0, blue: 0 }, round: 0, winner: '', roundWinner: '' });
    this.startRound();
  }

  /** Surveys this TV hasn't shown yet go on top; ones you've already played go to the bottom. */
  freshDeck(extra = []) {
    const seen = seenSurveys();
    const all = shuffle([...SURVEYS, ...extra]);
    return [...all.filter((x) => seen.has(x.q)), ...all.filter((x) => !seen.has(x.q))];   // pop() takes from the end
  }

  startRound() {
    const s = this.state;
    if (!this.secret.deck.length) this.secret.deck = this.freshDeck();
    const survey = this.secret.deck.pop();
    markSeen(survey.q);
    this.secret.answers = survey.answers;
    s.round += 1;
    s.mult = MULTS[Math.min(s.round, MULTS.length) - 1];
    Object.assign(s, {
      question: survey.q, board: survey.answers.map(() => null),
      control: '', strikes: 0, bank: 0, last: null, roundWinner: '', message: '',
    });
    this.startFaceoff();
  }

  startFaceoff() {
    const s = this.state;
    s.faceoff = { red: this.pick('red'), blue: this.pick('blue'), done: [], turn: '', missed: '' };
    this.secret.faceoff = {};
    s.phase = 'faceoff';
    s.current = '';
    s.waiting = TEAMS.map((t) => s.faceoff[t]).filter(Boolean);
  }

  reveal(i) {
    const s = this.state;
    if (s.board[i]) return 0;
    const a = this.secret.answers[i];
    s.board[i] = { text: a.text, points: a.points };
    s.bank += a.points;
    return a.points;
  }

  boardCleared() { return this.state.board.every(Boolean); }

  winFaceoff(win, text) {
    const s = this.state;
    s.control = win;
    s.message = `${this.tn(win)} wins the face-off with "${text}"!`;
    if (this.boardCleared()) return this.endRound(win);
    s.phase = 'play';
    s.waiting = [];
    s.current = this.pick(win);
  }

  resolveFaceoff() {
    const s = this.state;
    const f = this.secret.faceoff;
    const hits = TEAMS.map((t) => ({ t, ...f[t] })).filter((x) => x.rank >= 0);
    s.last = null;
    if (!hits.length) {
      s.message = `Neither "${f.red?.text || '…'}" nor "${f.blue?.text || '…'}" is on the board. Next pair!`;
      this.startFaceoff();
      return;
    }
    hits.forEach((h) => this.reveal(h.rank));
    hits.sort((a, b) => a.rank - b.rank || a.at - b.at);
    const win = hits[0].t;
    s.control = win;
    s.message = `${this.tn(win)} wins the face-off with "${hits[0].text}"!`;
    if (this.boardCleared()) return this.endRound(win);
    s.phase = 'play';
    s.waiting = [];
    s.current = this.pick(win);
  }

  strike() {
    const s = this.state;
    s.strikes += 1;
    if (s.strikes >= 3) {
      s.phase = 'steal';
      s.current = '';
      s.waiting = [...s.teams[other(s.control)]];
      s.message = `Three strikes! ${this.tn(other(s.control))} can steal with one answer.`;
    } else {
      s.current = this.pick(s.control);
    }
  }

  endRound(team) {
    const s = this.state;
    const won = s.bank * s.mult;
    s.roundWinner = team;
    s.scores[team] += won;
    s.board = this.secret.answers.map((a, i) => s.board[i] ? { ...s.board[i] } : { text: a.text, points: a.points, late: true });
    s.message = `${this.tn(team)} takes ${won} point${won === 1 ? '' : 's'}${s.mult > 1 ? ` (${s.mult}x round)` : ''}!`;
    s.phase = s.round >= s.rounds ? 'over' : 'reveal';
    s.current = '';
    s.waiting = [];
    if (s.phase === 'over') {
      s.winner = s.scores.red === s.scores.blue ? 'tie' : s.scores.red > s.scores.blue ? 'red' : 'blue';
    }
  }

  // ---------- Fast Money ----------
  // Two players from the winning family answer the same 5 questions. Player 1 has 20 seconds while
  // player 2 looks away; player 2 then has 25 seconds and can't repeat player 1's answers. 200 points wins.
  startFastMoney() {
    const s = this.state;
    if (!this.secret.deck.length || this.secret.deck.length < 5) this.secret.deck = shuffle([...SURVEYS]);
    const qs = this.secret.deck.splice(-5, 5);
    this.secret.fm = qs.map((q) => q.answers);
    s.phase = 'fm';
    s.current = ''; s.waiting = []; s.strikes = 0;
    s.fm = {
      step: 'pick', team: s.winner, p1: '', p2: '',
      qs: qs.map((q) => q.question || q.q),
      a: [Array(5).fill(null), Array(5).fill(null)],   // a[turn][q] = { text, points }
      order: [], endsAt: 0, left: FM_TOTAL, shown: [0, 0], dup: null, total: 0, won: false,
    };
    const fam = s.teams[s.winner] || [];
    if (fam.length === 1) { s.fm.p1 = s.fm.p2 = fam[0]; s.fm.step = 'ready1'; }
    s.waiting = s.fm.step === 'pick' ? [...fam] : [s.fm.p1];
  }

  fmTurn() { return this.state.fm.step.endsWith('2') ? 1 : 0; }

  fmStart() {
    const s = this.state;
    const t = this.fmTurn();
    s.fm.step = `play${t + 1}`;
    s.fm.order = [0, 1, 2, 3, 4];
    const time = t ? Math.max(FM_MIN_P2, s.fm.left) : FM_TOTAL;
    s.fm.endsAt = Date.now() + time;
    s.fm.dup = null;
    s.current = t ? s.fm.p2 : s.fm.p1;
    s.waiting = [];
    clearTimeout(this.fmTimer);
    this.fmTimer = setTimeout(() => { if (s.fm?.step === `play${t + 1}`) { this.fmReveal(); this.sync(); } }, time + 600);
  }

  fmAnswer(qi, text) {
    const s = this.state;
    const t = this.fmTurn();
    const fm = s.fm;
    if (fm.order[0] !== qi) return;
    if (!text) { fm.order.push(fm.order.shift()); fm.dup = null; return; }   // pass: come back to it later
    const answers = this.secret.fm[qi];
    const i = matchAnswer(text, answers);
    if (t === 1 && i >= 0 && fm.a[0][qi]?.idx === i) {   // same answer as player 1
      fm.dup = { q: qi, text, k: (fm.dup?.k || 0) + 1 };
      return;
    }
    fm.dup = null;
    fm.a[t][qi] = { text, points: i >= 0 ? answers[i].points : 0, idx: i };
    fm.order.shift();
    if (!fm.order.length) this.fmReveal();
  }

  fmReveal() {
    const s = this.state;
    const t = this.fmTurn();
    const fm = s.fm;
    clearTimeout(this.fmTimer);
    if (t === 0) fm.left = Math.max(0, fm.endsAt - Date.now());   // whatever player 1 didn't use goes to player 2
    fm.a[t] = fm.a[t].map((x) => x || { text: '', points: 0, idx: -1 });
    fm.step = `reveal${t + 1}`;
    fm.order = []; fm.dup = null;
    s.current = '';
    const tick = () => {
      if (!s.fm || s.fm.step !== `reveal${t + 1}`) return;
      fm.shown[t] += 1;
      fm.total += fm.a[t][fm.shown[t] - 1].points;
      if (fm.shown[t] >= 5) {
        if (t === 0) {
          fm.step = fm.total >= FM_GOAL ? 'done' : 'ready2';
          fm.won = fm.total >= FM_GOAL;
          s.waiting = fm.step === 'ready2' ? [fm.p2] : [];
        } else { fm.step = 'done'; fm.won = fm.total >= FM_GOAL; }
        this.sync();
        return;
      }
      this.sync();
      this.fmTimer = setTimeout(tick, FM_REVEAL_MS);
    };
    this.fmTimer = setTimeout(tick, FM_REVEAL_MS);
  }

  destroy() { clearTimeout(this.fmTimer); super.destroy?.(); }

  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const host = meta.isBoard || meta.isVip;
    const text = String(p?.text || '').trim().slice(0, 40);
    s.error = '';

    switch (type) {
      case 'game:join-team':
        if (s.phase !== 'setup' || !TEAMS.includes(p.team) || meta.isBoard) return;
        this.removeFromTeams(me);
        s.teams[p.team].push(me);
        break;
      case 'game:team-name': {
        const team = this.teamOf(me);
        const name = String(p?.name || '').replace(/\s+/g, ' ').trim().slice(0, 20);
        if (!team) return;
        s.names[team] = name || (team === 'red' ? 'Red family' : 'Blue family');
        break;
      }
      case 'game:begin':
        if (s.phase !== 'setup' || !host) return;
        if (!s.teams.red.length || !s.teams.blue.length) { s.error = 'Each team needs at least one player.'; break; }
        this.newGame();
        break;

      case 'game:faceoff': {
        if (s.phase !== 'faceoff' || !text) return;
        const team = TEAMS.find((t) => s.faceoff[t] === me);
        if (!team || this.secret.faceoff[team]) return;
        if (s.faceoff.turn && s.faceoff.turn !== team) return;   // the other family already missed: not your turn
        // Fastest answer decides. On the board: that family takes control. Not on it: the other family gets a try.
        const rank = matchAnswer(text, this.secret.answers);
        this.secret.faceoff[team] = { text, rank };
        s.faceoff.done.push(me);
        s.waiting = s.waiting.filter((x) => x !== me);
        const rival = other(team);
        if (rank >= 0) {
          this.reveal(rank);
          s.last = { team, text, ok: true, points: this.secret.answers[rank].points };
          this.winFaceoff(team, text);
        } else if (!s.faceoff.turn && s.faceoff[rival]) {
          s.last = { team, text, ok: false };
          s.faceoff.turn = rival;
          s.faceoff.missed = team;
          s.waiting = [s.faceoff[rival]];
          s.message = `"${text}" isn't on the board! ${this.tn(rival)}, it's your chance.`;
        } else {
          s.last = { team, text, ok: false };
          s.message = `Nobody found one. "${this.secret.faceoff[rival]?.text || '…'}" and "${text}" aren't on the board. Next pair!`;
          this.startFaceoff();
        }
        break;
      }

      case 'game:guess': {
        if (s.phase !== 'play' || me !== s.current || !text) return;
        const i = matchAnswer(text, this.secret.answers);
        if (i >= 0 && s.board[i]) { s.last = { by: me, text, hit: false, already: true }; break; }
        if (i >= 0) {
          this.reveal(i);
          s.last = { by: me, text, hit: true };
          if (this.boardCleared()) { this.endRound(s.control); break; }
          s.current = this.pick(s.control);
        } else {
          s.last = { by: me, text, hit: false };
          this.strike();
        }
        break;
      }

      case 'game:steal': {
        if (s.phase !== 'steal' || this.teamOf(me) !== other(s.control) || !text) return;
        const i = matchAnswer(text, this.secret.answers);
        s.last = { by: me, text, hit: i >= 0 && !s.board[i] };
        if (s.last.hit) { this.reveal(i); this.endRound(other(s.control)); } else this.endRound(s.control);
        break;
      }

      // TV / VIP controls
      case 'game:time-up':
        if (s.phase !== 'play' || !host) return;
        s.last = { by: s.current, text: '(time ran out)', hit: false };
        this.strike();
        break;
      case 'game:undo-strike':
        if (s.phase !== 'play' || !host || s.strikes < 1) return;
        s.strikes -= 1;
        s.message = 'Strike taken back.';
        break;
      case 'game:skip-faceoff': {
        if (s.phase !== 'faceoff' || !host) return;
        // Someone is stuck: bring up a fresh pair.
        s.message = 'New face-off pair!';
        this.startFaceoff();
        break;
      }
      case 'game:skip-survey':   // TV: "we've seen this one" (only before anyone answers)
        if (s.phase !== 'faceoff' || !host || s.board.some(Boolean)) return;
        if (!this.secret.deck.length) this.secret.deck = this.freshDeck();
        {
          const survey = this.secret.deck.pop();
          markSeen(survey.q);
          this.secret.answers = survey.answers;
          Object.assign(s, { question: survey.q, board: survey.answers.map(() => null), message: 'New survey!', last: null });
          this.startFaceoff();
        }
        break;
      case 'game:next-round':
        if (s.phase !== 'reveal' || !host) return;
        this.startRound();
        break;
      case 'game:new-game':
        if (!(s.phase === 'over' || (s.phase === 'fm' && s.fm?.step === 'done')) || !host) return;
        clearTimeout(this.fmTimer);
        s.phase = 'setup'; s.fm = null;
        break;

      // Fast Money
      case 'game:fast-money':
        if (s.phase !== 'over' || s.winner === 'tie' || !host) return;
        this.startFastMoney();
        break;
      case 'game:fm-join': {
        const fm = s.fm;
        if (s.phase !== 'fm' || fm.step !== 'pick' || this.teamOf(me) !== fm.team) return;
        if (!fm.p1) fm.p1 = me;
        else if (fm.p1 !== me && !fm.p2) fm.p2 = me;
        else return;
        if (fm.p1 && fm.p2) { fm.step = 'ready1'; s.waiting = [fm.p1]; } else s.waiting = s.waiting.filter((x) => x !== me);
        break;
      }
      case 'game:fm-start': {
        const fm = s.fm;
        if (s.phase !== 'fm' || !['ready1', 'ready2'].includes(fm.step)) return;
        const who = fm.step === 'ready1' ? fm.p1 : fm.p2;
        if (me !== who && !host) return;
        this.fmStart();
        break;
      }
      case 'game:fm-answer': {
        const fm = s.fm;
        if (s.phase !== 'fm' || !['play1', 'play2'].includes(fm.step) || me !== s.current) return;
        if (Date.now() > fm.endsAt + 1500) return;
        this.fmAnswer(p.q | 0, text);
        break;
      }
      case 'game:fm-stop':   // TV/VIP: end the turn early (the player is stuck)
        if (s.phase !== 'fm' || !['play1', 'play2'].includes(s.fm.step) || !host) return;
        this.fmReveal();
        break;
      default:
        return;
    }
    this.sync();
  }
}
